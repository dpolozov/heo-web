const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const { default: axios } = require('axios');
const CircleLib = require('./circleLib');
var circleLib = new CircleLib();

class ServerLib {
    constructor(){
    }

    testingClass(){
        console.log('server library class');
    }

    handleUploadImage(req, res, S3, Sentry){
        const PARAMS = {
            Bucket: process.env.SERVER_APP_BUCKET_NAME,
            Key: process.env.SERVER_APP_IMG_DIR_NAME + '/' + req.files.myFile.name,
            Body: req.files.myFile.data
        }
        S3.upload(PARAMS, (error, data) => {
            console.log('real upload called');
            if (error) {
                Sentry.captureException(new Error(error));
                console.log(error);
                res.sendStatus(500);
            } else {
                res.send(data.Location);
            }
        });
    }

    handleDeleteImage(req, res, S3, Sentry){
        const PARAMS = {
            Bucket: process.env.SERVER_APP_BUCKET_NAME,
            Key: process.env.SERVER_APP_IMG_DIR_NAME + '/' + req.body.name,
        }
        S3.deleteObject(PARAMS, (error, data) => {
            if (error) {
                Sentry.captureException(new Error(error));
                console.log(error, error.stack);
                res.sendStatus(500);
            } else {
                res.send('complete');
            }
        }); 
    }

    async handleAddCampaign(req, res, Sentry, DB, CIRCLE_API_KEY, library){
        console.log('before circle wallet');
        let newWalletId = await library.createCircleWallet(req.body.mydata.address, CIRCLE_API_KEY,);
        console.log('after circle wallet');       
        const ITEM = {
            _id: req.body.mydata.address.toLowerCase(),
            beneficiaryId: req.body.mydata.beneficiaryId.toLowerCase(),
            ownerId: req.user.address.toLowerCase(),
            title: req.body.mydata.title,
            mainImageURL: req.body.mydata.mainImageURL,
            qrCodeImageURL: req.body.mydata.qrCodeImageURL,
            vl: req.body.mydata.vl,
            cn: req.body.mydata.cn,
            fn: req.body.mydata.fn,
            ln: req.body.mydata.ln,
            org: req.body.mydata.org,
            description: req.body.mydata.description,
            currencyName: req.body.mydata.currencyName,
            maxAmount: req.body.mydata.maxAmount,
            descriptionEditor: req.body.mydata.descriptionEditor,
            walletId: newWalletId,
            raisedAmount: 0,
            creationDate: Date.now(),
            lastDonationTime: 0,
            coins: req.body.mydata.coins,
            addresses: req.body.mydata.addresses,
            active: true
        }
        //console.log(ITEM);
        console.log('Before DB.collection');
        DB.collection('campaigns')
            .insertOne(ITEM, function (err, result) {
                if (err) {
                    Sentry.captureException(new Error(err));
                    res.sendStatus(500);
                    console.log(err);
                } else {
                    res.send('success');
                    console.log("1 entry was insterted in db");
                }
            });
        console.log('After DB.collection');
    }

    async handleUpdateCampaign(req, res, Sentry, DB){
        let result = await DB.collection("campaigns").findOne({"_id" : req.body.mydata.address});
        if(!result || result.ownerId != req.user.address.toLowerCase()) {
            Sentry.captureException(new Error(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.address})`));
            res.sendStatus(500);
            console.log(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.address})`);
        } else {
            DB.collection('campaigns')
                .updateOne({'_id': req.body.mydata.address}, {$set: req.body.mydata.dataToUpdate}, (err, result) => {
                    if (err) {
                        Sentry.captureException(new Error(err));
                        res.sendStatus(500);
                        console.log(err);
                    } else {
                        res.send('success');
                    }
                });
            }
    }

    async handleDeactivateCampaign(req, res, Sentry, DB){
        let result = await DB.collection("campaigns").findOne({"_id" : req.body.id});
        if(!result || result.ownerId != req.user.address.toLowerCase()) {
            res.sendStatus(500);
            console.log(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.address})`);
        } else {
            DB.collection('campaigns')
            .updateOne({'_id': req.body.id}, {$set: {active:false}}, (err, result) => {
                if (err) {
                    Sentry.captureException(new Error(err));
                    res.sendStatus(500);
                    console.log(err);
                } else {
                    res.send('success');
                }
            });
        }
    }

    async handleLoadAllCampaigns(req, res, Sentry, DB){
        await DB.collection("campaigns").find({active: true}).sort({"lastDonationTime" : -1}).toArray(function(err, result) {
            if (err) throw err;
            Sentry.captureException(new Error(err));
            res.send(result);
        });
    }

    async handleLoadOneCampaign(req, res, Sentry, DB){
        let result = await DB.collection("campaigns").findOne({"_id" : req.body.ID});
        if(result){
            res.send(result);
        } else {
            Sentry.captureException(new Error('failed to load campaign'));
        }
    }

    async handleLoadUserCampaigns(req, res, Sentry, DB){
        await DB.collection("campaigns").find({"ownerId" : {$eq: req.user.address}}).toArray(function(err, result) {
            if (err) {
                Sentry.captureException(new Error(err));
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(result);
            }
        });
    }

    async handleLoadEnv(res, envCHAIN, Sentry, DB){
        try{
            let chain_configs = await DB.collection('chain_configs').find().toArray();        
            var chains = {};
            for (let i=0; i<chain_configs.length; i++) {
                chains[chain_configs[i]._id] = chain_configs[i];
            }
            let global_configs = await DB.collection('global_configs').find().toArray();
            res.json(
                {
                    CHAINS: chains,
                    CHAIN: envCHAIN,
                    GLOBALS: global_configs,
                });

        } catch (err){
            Sentry.captureException(new Error(err));
        }      
    }

    async handleDonateFiat(req, res, CIRCLE_API_URL, CIRCLE_API_KEY, Sentry, CLIENT, DBNAME){
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        if(userIP.indexOf(",") > 0) {
            try {
                let ips = userIP.split(",");
                userIP = ips[0];
            } catch (err) {
                console.log(`failed to parse user IP: ${userIP}`);
            }
        }

        try {
            //first create card in Circle API
            let createCardResp = await circleLib.createCircleCard(req, CIRCLE_API_URL, CIRCLE_API_KEY, userIP);

            if(createCardResp && createCardResp.status >= 200 && createCardResp.data && createCardResp.data.data && createCardResp.data.data.id) {
                let verificationUrl = req.headers.referer;
                if(verificationUrl.includes('?')){
                    verificationUrlArray = verificationUrl.split('?');
                    verificationUrl = verificationUrlArray[0];
                }

                //got card ID, can create a payment
                let paymentResp = await circleLib.handleCreatePayment(req, CIRCLE_API_URL, CIRCLE_API_KEY, userIP, verificationUrl, createCardResp);
                console.log(paymentResp.data);
 
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
                            paymentStatus: paymentResp.data.data.status                           
                        }
                        await this.createPaymentRecord(data, CLIENT, DBNAME).then(console.log('payment record made succesfully')).catch(err => console.log(err));
                    } else {
                        let data = {
                            lastUpdated: paymentResp.data.data.updateDate,
                            paymentStatus: paymentResp.data.data.status
                        }
                        await this.updatePaymentRecord(paymentResp.data.data.id, data, CLIENT, DBNAME).then(console.log('payment record update succesfully')).catch(err => console.log(err));
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
            console.log(err.response.data);
            res.status(500).send({paymentStatus: err.response.data});
        }
    }

    //create initial payment record in mongodb
    async createPaymentRecord(data, CLIENT, DBNAME){
        console.log(data);
        const DB = CLIENT.db(DBNAME);
        try {
            DB.collection('fiatPaymentRecords')
                .insertOne(data, function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("1 entry was insterted in payment records collection");
                    }
                });
        } catch (err) {
            console.log(err);
        }    
    }

    //update payment record in mongodb
    async updatePaymentRecord(recordId, data, CLIENT, DBNAME){
        const DB = CLIENT.db(DBNAME);
        await DB.collection('fiatPaymentRecords')
        .updateOne({'_id': recordId}, {$set: data}, async (err, result) => {
            if (err) {
                console.log(err);
            } else {
                console.log('payment record updated successfully');
                console.log(await DB.collection('fiatPaymentRecords').findOne({'_id': recordId}));
            }
        });
    }
    
    //transfer settled funds
    async transferWithinCircle(info, CIRCLE_API_KEY, CLIENT, DBNAME){
        const DB = CLIENT.db(DBNAME);
        let paymentRecord = await DB.collection('fiatPaymentRecords').findOne({'_id': info.recordId});
        if(!paymentRecord.walletId || paymentRecord.walletId === null){
            //check the campaign in mongo for wallet id
            //this comes up if new wallet was just created but front end state variable was not reloaded.
            let campaign = await DB.collection("campaigns").findOne({"_id" : paymentRecord.campaignId});
            if(campaign.walletId) {
                paymentRecord.walletId = campaign.walletId;
                let data = {walletId: campaign.walletId};
                this.updatePaymentRecord(info.recordId, data, CLIENT, DBNAME)
            } else {
                await circleLib.createCircleWallet(paymentRecord.campaignId, CIRCLE_API_KEY, (callback) => {
                    console.log('callback comes back as ' + callback);
                    paymentRecord.walletId = callback;
                    let data = {walletId: callback};
                    this.updatePaymentRecord(info.recordId, data, CLIENT, DBNAME);
                    DB.collection('campaigns').updateOne({_id: paymentRecord.campaignId}, {$set: data}, (err, result) =>{
                        if(err) console.log(err)
                        else console.log('wallet updated in campaign successfully');
                    });
                });
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

        await fetch(url, options)
        .then(res => res.json())
        .then(json => {
            let data = {
                transferId: json.data.id,
                transferAmount: json.data.amount.amount,
                transferCurrency: json.data.amount.currency,
                transferCreateDate: json.data.createDate,
                transferStatus: json.data.status,
            }
            this.updatePaymentRecord(info.recordId, data, CLIENT, DBNAME);
        })
        .catch(err => console.error('error:' + err));
    }
    

    authenticated(req, res, Sentry){
        if(req.user && req.user.address){
            return true;
        } else {
            Sentry.captureException(new Error('Failed 401'));
            res.sendStatus(401);
            return false;
        }
    }
}

module.exports = ServerLib;