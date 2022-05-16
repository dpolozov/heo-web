const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const { default: axios } = require('axios');

class CircleLib {
    constructor(){
    }

    async handleCircleNotifications(req, res, CIRCLEARN, CIRCLE_API_KEY, validator, CLIENT, DBNAME, Sentry){
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
                    if(messageData && messageData.notificationType === 'settlements'){
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
                            if(response){
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
                        let data = {
                            paymentStatus: messageData.payment.status,
                            lastUpdated: messageData.payment.updateDate,
                            circleFees: messageData.payment.fees.amount
                        }
                        try {
                            await this.updatePaymentRecord(messageData.payment.id, data, CLIENT, DBNAME, Sentry);
                        } catch (err) {Sentry.captureException(new Error(err));}
                    } else if(messageData.notificationType === 'transfers'){
                        let data = {
                            transferStatus: messageData.transfer.status
                        }
                        const DB = CLIENT.db(DBNAME);
                        const myCollection = await DB.collection('fiatPaymentRecords');
                        let paymentRecord = await myCollection.findOne({'transferId': messageData.transfer.id});
                        if(paymentRecord){
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
        } catch (err) { Sentry.captureException(new Error(err));}
        return result;
    }

    async createCircleWallet(campaignId, CIRCLE_API_KEY, Sentry){
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
            if(respone){
                let res = await respone.json();
                return res.data.walletId;
            } else {
                return null;
            }
        } catch (err) {Sentry.captureException(new Error(err));}
        
    }

    async handleCreatePayment(req, CIRCLE_API_URL, CIRCLE_API_KEY, userIP, verificationUrl, createCardResp){
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

    async transferWithinCircle(info, CIRCLE_API_KEY, CLIENT, DBNAME, Sentry){
        const DB = CLIENT.db(DBNAME);
        let paymentRecord = await DB.collection('fiatPaymentRecords').findOne({'_id': info.recordId});
        if(!paymentRecord.walletId || paymentRecord.walletId === null){
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
            if(response){
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

    //update payment record in mongodb
    async updatePaymentRecord(recordId, data, CLIENT, DBNAME, Sentry){
        const DB = CLIENT.db(DBNAME);
        try{
            const myCollection = await DB.collection('fiatPaymentRecords');
            await myCollection.updateOne({'_id': recordId}, {$set: data});
            //console.log(await DB.collection('fiatPaymentRecords').findOne({'_id': recordId}));
        }
        catch (err) {Sentry.captureException(new Error(err))}
    }
}

module.exports = CircleLib;