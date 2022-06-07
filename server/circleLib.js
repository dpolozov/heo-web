const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const { default: axios } = require('axios');

class CircleLib {
    constructor() {
    }

    async handleCircleNotifications(req, res, CIRCLEARN, CIRCLE_API_KEY, validator, CLIENT, DBNAME, Sentry) {
        let body = ''
        req.on('data', (data) => {
        body += data
        })
        req.on('end', () => {
            res.writeHead(200, {
            'Content-Type': 'text/html',
            })
            res.end(`POST request for ${req.url}`)
            const envelope = JSON.parse(body)
            validator.validate(envelope, async (err)=> {
            if (err) {
                console.error(err);
            } else {
                switch (envelope.Type) {
                case 'SubscriptionConfirmation': {
                    if (!CIRCLEARN.test(envelope.TopicArn)) {
                    console.error(`\nUnable to confirm the subscription as the topic arn is not expected ${envelope.TopicArn}. Valid topic arn must match ${CIRCLEARN}.`)
                    break
                    }
                    try {
                        await axios.post(envelope.SubscribeURL)
                    } catch (err) {Sentry.captureException(new Error(err));}
                    break
                    }
                case 'Notification': {
                    let messageData;
                    try{
                        messageData = JSON.parse(envelope.Message);
                        //console.log(messageData);
                    } catch(err) {console.log(err)}
                    if(messageData && messageData.notificationType === 'settlements') {
                        const url = `https://api-sandbox.circle.com/v1/payments?settlementId=${messageData.settlement.id}`;
                        const options = {
                            method: 'GET',
                            headers: {
                                Accept: 'application/json',
                                Authorization: `Bearer ${CIRCLE_API_KEY}`
                            }
                        };

                        try{
                            let response = await fetch(url, options);
                            if(response) {
                                let jsonRes = await response.json();
                                jsonRes.data.forEach(async element => {
                                    let info = {
                                        recordId: element.id, 
                                        circleFees: element.fees.amount, 
                                        amount: element.amount.amount,
                                        currency: element.amount.currency,
                                        heoWallet: element.merchantWalletId,
                                    }   
                                    try{                                      
                                    await this.transferWithinCircle(info, CIRCLE_API_KEY, CLIENT, DBNAME, Sentry);                                   
                                    let data = {
                                        paymentStatus: element.status,
                                        lastUpdated: element.updateDate
                                    }
                                    await this.updatePaymentRecord(element.id, data, CLIENT, DBNAME, Sentry)   
                                    } catch (err) {console.log(err)}                                     
                                })
                            }
                        } catch (err) {Sentry.captureException(new Error(err));}
                    } else if (messageData.notificationType === 'payments') {
                        let feesFromCircle = 0;
                        if(messageData.payment.fees) {
                            feesFromCircle = messageData.payment.fees.amount;
                        }
                        let data = {
                            paymentStatus: messageData.payment.status,
                            lastUpdated: messageData.payment.updateDate,
                            circleFees: feesFromCircle
                        }
                        try {
                            await this.updatePaymentRecord(messageData.payment.id, data, CLIENT, DBNAME, Sentry);
                        } catch (err) {Sentry.captureException(new Error(err));}
                    } else if(messageData.notificationType === 'transfers') {
                        let data = {
                            transferStatus: messageData.transfer.status
                        }
                        const DB = CLIENT.db(DBNAME);
                        const myCollection = await DB.collection('fiat_payment_records');
                        let paymentRecord = await myCollection.findOne({'transferId': messageData.transfer.id});
                        if(paymentRecord) {
                            await this.updatePaymentRecord(paymentRecord._id, data, CLIENT, DBNAME, Sentry)
                        }else{
                            console.log('could not find payment record with proper transfer id')
                        }
                    }
                    break
                    }
                default: {
                        console.error(`Message of type ${body.Type} not supported`)
                    }
                }
            }
            })
        })
    }

    async handleDonateFiat(req, res, CIRCLE_API_URL, CIRCLE_API_KEY, Sentry, CLIENT, DBNAME) {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if(userIP.indexOf(",") > 0) {
            try {
                let ips = userIP.split(",");
                userIP = ips[0];
            } catch (err) {
                console.log(`failed to parse user IP: ${userIP}`);
                Sentry.captureException(new Error(err));
            }
        }

        try {
            //first create card in Circle API
            let createCardResp;
                try{ 
                    createCardResp = await this.createCircleCard(req, CIRCLE_API_URL, CIRCLE_API_KEY, userIP, Sentry);
                } catch (err) {console.log(err)}

            if(createCardResp && createCardResp.status >= 200 && createCardResp.data && createCardResp.data.data && createCardResp.data.data.id) {
                let verificationUrl = req.headers.referer;
                if(verificationUrl.includes('?')) {
                    verificationUrlArray = verificationUrl.split('?');
                    verificationUrl = verificationUrlArray[0];
                }

                //got card ID, can create a payment
                let paymentResp = await this.handleCreatePayment(req, CIRCLE_API_URL, CIRCLE_API_KEY, userIP, verificationUrl, createCardResp);
 
                if(paymentResp && paymentResp.data && paymentResp.data.data.status) {
                    console.log(`Payment id ${paymentResp.data.data.id}, status ${paymentResp.data.data.status}`);

                    //create initial payment record
                    if(paymentResp.data.data.status === 'pending') {
                        let data = {
                            _id: paymentResp.data.data.id,
                            walletId: req.body.walletId,
                            campaignId: req.body.campaignId,
                            cardId: createCardResp.data.data.id,
                            paymentCreationDate: paymentResp.data.data.createDate,
                            paymentAmount: paymentResp.data.data.amount.amount,
                            lastUpdated: paymentResp.data.data.updateDate,
                            heoFees: '0',
                            paymentStatus: paymentResp.data.data.status,
                            provider: 'circle'                           
                        }
                        try{
                            await this.createPaymentRecord(data, CLIENT, DBNAME, Sentry);
                        } catch (err) {
                            Sentry.captureException(new Error(err));
                        }
                    } else {
                        let data = {
                            lastUpdated: paymentResp.data.data.updateDate,
                            paymentStatus: paymentResp.data.data.status
                        }
                        try {
                            await this.updatePaymentRecord(paymentResp.data.data.id, data, CLIENT, DBNAME, Sentry);
                        } catch (err) {
                            Sentry.captureException(new Error(err));
                        }
                    }
                    let respData = paymentResp.data.data;
                    let safetyCounter = 0;
                    let safetyMax = 120;
                    while(respData.status == "pending" && safetyCounter < safetyMax) {
                        try {
                            safetyCounter++;
                            await delay(1000);
                            console.log(`Checking status of payment ${respData.id}`);
                            paymentResp = await axios({
                                method: 'get',
                                baseURL: CIRCLE_API_URL,
                                url: `/v1/payments/${respData.id}`,
                                headers: {
                                    'Authorization': `Bearer ${CIRCLE_API_KEY}`
                                }
                            });
                            respData = paymentResp.data.data;
                            console.log(`Payment ${respData.id}, status ${respData.status}`);
                        } catch (err) {
                            console.log(err);
                            break;
                        }
                    }
                    if(respData.status === 'action_required') {
                        res.status(200).send({paymentStatus: 'action_required', redirectUrl: respData.requiredAction.redirectUrl});
                        return;
                    };

                    if(respData.status == "confirmed" || respData.status == "paid") {
                        res.status(200).send({paymentStatus:"success"});
                        return;
                    }

                    if(respData.status == "failed") {
                        if(respData.errorCode == "card_not_honored") {
                            res.status(200).send({paymentStatus:"card_not_honored"});
                        } else if(respData.errorCode == "payment_not_supported_by_issuer") {
                            res.status(200).send({paymentStatus:"payment_not_supported_by_issuer"});
                        } else if(respData.errorCode == "payment_not_funded") {
                            res.status(200).send({paymentStatus:"payment_not_funded"});
                        } else if(respData.errorCode == "card_invalid") {
                            res.status(200).send({paymentStatus:"card_invalid"});
                        } else if(respData.errorCode == "card_limit_violated") {
                            res.status(200).send({paymentStatus:"card_limit_violated"});
                        } else if(respData.errorCode == "payment_denied") {
                            res.status(200).send({paymentStatus:"payment_denied"});
                        } else if(respData.errorCode == "payment_fraud_detected") {
                            res.status(200).send({paymentStatus:"payment_fraud_detected"});
                        } else if(respData.errorCode == "payment_stopped_by_issuer") {
                            res.status(200).send({paymentStatus:"payment_stopped_by_issuer"});
                        } else {
                            res.status(200).send({paymentStatus:"declined"});
                        }
                        return;
                    }

                } else {
                    res.status(200).send({paymentStatus:"failed"});
                    return;
                }
            } else {
                res.status(200).send({paymentStatus:"failed"});
                return;
            }
        } catch (err) {
            Sentry.captureException(new Error('Donate Fiat Failed'));
            res.status(500).send({paymentStatus: err.response.data});
        }
    }

    async createCircleCard(req, CIRCLE_API_URL, CIRCLE_API_KEY, userIP, Sentry) {
        let cardIdempotencyKey = uuidv4();
        let result;
        try {
            result = await axios({
                method: 'post',
                baseURL: CIRCLE_API_URL,
                url: '/v1/cards',
                headers: {
                    'Authorization': `Bearer ${CIRCLE_API_KEY}`
                },
                data: {
                    billingDetails: req.body.billingDetails,
                    idempotencyKey: cardIdempotencyKey,
                    keyId: req.body.keyId,
                    encryptedData: req.body.encryptedCardData,
                    expMonth: req.body.expMonth,
                    expYear: req.body.expYear,
                    metadata: {
                        email: req.body.email,
                        phoneNumber: req.body.phoneNumber,
                        ipAddress: userIP,
                        sessionId: req.body.campaignId
                    },
                }
            });
        } catch (err) { 
            Sentry.captureException(new Error(err));
        }
        return result;
    }

    async createCircleWallet(campaignId, CIRCLE_API_KEY, Sentry) {
        console.log('actual create circle wallet called');
        const walletKey = uuidv4();
        const url = 'https://api-sandbox.circle.com/v1/wallets';
        const data = {
            idempotencyKey: walletKey,
            description: campaignId
        }
        const options = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${CIRCLE_API_KEY}`
            },
            body: JSON.stringify(data)
        }

        try {
            let respone = await fetch(url, options);
            if(respone) {
                let res = await respone.json();
                return res.data.walletId;
            } else {
                return null;
            }
        } catch (err) {
            Sentry.captureException(new Error(err));
        }
        
    }

    async handleCreatePayment(req, CIRCLE_API_URL, CIRCLE_API_KEY, userIP, verificationUrl, createCardResp) {
        let paymentIdempotencyKey = uuidv4();
        let result = {};
        try{
            result = await axios({
                method: 'post',
                baseURL: CIRCLE_API_URL,
                url: '/v1/payments',
                headers: {
                    'Authorization': `Bearer ${CIRCLE_API_KEY}`
                },
                data: {
                    amount: {amount: req.body.amount, currency: req.body.currency},
                    channel: "",
                    description: req.body.campaignId,
                    idempotencyKey: paymentIdempotencyKey,
                    keyId: req.body.keyId,
                    metadata: {
                        email: req.body.email,
                        phoneNumber: req.body.phoneNumber,
                        ipAddress: userIP,
                        sessionId: req.body.campaignId
                    },
                    source: {
                        id: createCardResp.data.data.id,
                        type: "card"
                    },
                    encryptedData: req.body.encryptedSecurityData,
                    verification: req.body.verification,
                    verificationSuccessUrl: `${verificationUrl}?fp=s`,
                    verificationFailureUrl: `${verificationUrl}?fp=f&am=${req.body.amount}`,
                }
            });
        } catch (err) {
            console.log(err);
        }
        return result;
    }

    async transferWithinCircle(info, CIRCLE_API_KEY, CLIENT, DBNAME, Sentry) {
        const DB = CLIENT.db(DBNAME);
        let paymentRecord = await DB.collection('fiat_payment_records').findOne({'_id': info.recordId});
        if(!paymentRecord.walletId || paymentRecord.walletId === null) {
            //check the campaign in mongo for wallet id
            //this comes up if new wallet was just created but front end state variable was not reloaded.
            let campaign = await DB.collection("campaigns").findOne({"_id" : paymentRecord.campaignId});
            if(campaign.walletId) {
                paymentRecord.walletId = campaign.walletId;
                let data = {walletId: campaign.walletId};
                this.updatePaymentRecord(info.recordId, data, CLIENT, DBNAME, Sentry)
            } else {
                try{
                    paymentRecord.walletId = await this.createCircleWallet(paymentRecord.campaignId, CIRCLE_API_KEY, Sentry);
                    const myCollection = await DB.collection('campaigns');
                    let data = {walletId: paymentRecord.walletId};
                    await myCollection.updateOne({_id: paymentRecord.campaignId}, {$set: data});
                } catch (err) {
                    console.log(err);
                } 
            }
        }
        let amountToTransfer = info.amount - (info.circleFees + paymentRecord.heoFees);   
        let idemKey = uuidv4();
        const url = 'https://api-sandbox.circle.com/v1/transfers';
        const options = {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${CIRCLE_API_KEY}`
            },
            body: JSON.stringify({
                source: {id: info.heoWallet, type: 'wallet'},
                destination: {id: paymentRecord.walletId, type: 'wallet'},
                amount: {amount: amountToTransfer, currency: info.currency},
                idempotencyKey: idemKey
            })
        };

        try {
            let response = await fetch(url, options);
            if(response) {
                let jsonRes =  await response.json();
                let data = {
                    transferId: jsonRes.data.id,
                    transferAmount: jsonRes.data.amount.amount,
                    transferCurrency: jsonRes.data.amount.currency,
                    transferCreateDate: jsonRes.data.createDate,
                    transferStatus: jsonRes.data.status,
                }
                this.updatePaymentRecord(info.recordId, data, CLIENT, DBNAME, Sentry);
            }
        } catch (err) {Sentry.captureException(new Error(err));}
    }

    //create initial payment record in mongodb
    async createPaymentRecord(data, CLIENT, DBNAME, Sentry) {
        console.log('creating payment record' + data);
        const DB = CLIENT.db(DBNAME);
        try {
            const myCollection = await DB.collection('fiat_payment_records');
            await myCollection.insertOne(data);
        } catch (err) {Sentry.captureException(new Error(err))}    
    }

    //update payment record in mongodb
    async updatePaymentRecord(recordId, data, CLIENT, DBNAME, Sentry) {
        const DB = CLIENT.db(DBNAME);
        try{
            const myCollection = await DB.collection('fiat_payment_records');
            await myCollection.updateOne({'_id': recordId}, {$set: data});
            //console.log(await DB.collection('fiat_payment_records').findOne({'_id': recordId}));
        }
        catch (err) {Sentry.captureException(new Error(err))}
    }
}

module.exports = CircleLib;