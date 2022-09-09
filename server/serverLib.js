const { registerRequestInstrumentation } = require('@sentry/tracing');
const { default: axios } = require('axios');

class ServerLib {
    constructor() {
    }

    testingClass() {
        console.log('server library class');
    }

    handleUploadImage(req, res, S3, Sentry) {
        const PARAMS = {
            Bucket: process.env.SERVER_APP_BUCKET_NAME,
            Key: process.env.SERVER_APP_IMG_DIR_NAME + '/' + req.files.myFile.name,
            Body: req.files.myFile.data
        }
        S3.upload(PARAMS, (error, data) => {
            console.log('real upload called');
            if (error) {
                Sentry.captureException(new Error(error));
                res.sendStatus(500);
            } else {
                res.send(data.Location);
            }
        });
    }

    handleDeleteImage(req, res, S3, Sentry) {
        const PARAMS = {
            Bucket: process.env.SERVER_APP_BUCKET_NAME,
            Key: process.env.SERVER_APP_IMG_DIR_NAME + '/' + req.body.name,
        }
        S3.deleteObject(PARAMS, (error, data) => {
            if (error) {
                Sentry.captureException(new Error(error));
                res.sendStatus(500);
            } else {
                res.send('complete');
            }
        }); 
    }

    async handleAddCampaign(req, res, Sentry, DB, newWalletId) {      
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
            defaultDonationAmount: req.body.mydata.defaultDonationAmount,
            fiatPayments: req.body.mydata.fiatPayments,
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
        try {
            const myCollection = await DB.collection('campaigns');
            await myCollection.insertOne(ITEM);
            res.send('success');
        } catch (err) {
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }          
    }

    async handleUpdateCampaign(req, res, Sentry, DB) {
        let result;
        try {
            const myCollection = await DB.collection('campaigns');
            result = await myCollection.findOne({"_id" : req.body.mydata.address});
        } catch (err) { 
            Sentry.captureException(new Error(error));
        }

        if(!result || result.ownerId != req.user.address.toLowerCase()) {
            Sentry.captureException(new Error(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.address})`));
            res.sendStatus(500);
            console.log(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.address})`);
        } else {
            try{
                const myCollection = await DB.collection('campaigns');
                await myCollection.updateOne({'_id': req.body.mydata.address}, {$set: req.body.mydata.dataToUpdate});
                res.send('success');
            } catch (err) { 
                Sentry.captureException(new Error(err));
                res.sendStatus(500);
            }   
        }
    }

    async handleDeactivateCampaign(req, res, Sentry, DB) {
        let myCollection = await DB.collection("campaigns");
        let result = myCollection.findOne({"_id" : req.body.id});
        if(!result || result.ownerId != req.user.address.toLowerCase()) {
            res.sendStatus(500);
            console.log(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.address})`);
        } else {
            try {
                const myCollection = await DB.collection('campaigns');
                await myCollection.updateOne({'_id': req.body.id}, {$set: {active:false}});
                res.send('success');
            } catch (err) { 
                Sentry.captureException(new Error(err));
                res.sendStatus(500);
            }   
        }
    }

    async handleLoadAllCampaigns(req, res, Sentry, DB) {
        try{
            const myCollection = await DB.collection('campaigns');
            const campaigns = await myCollection.find({active: true});
            const sortedCampaigns = await campaigns.sort({"lastDonationTime" : -1});
            const result = await sortedCampaigns.toArray();
            res.send(result);
        } catch (err) { 
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        }   
    }

    async handleLoadOneCampaign(req, res, Sentry, DB) {
        try {
            const myCollection = await DB.collection('campaigns');
            let result = await myCollection.findOne({"_id" : req.body.ID});
            res.send(result);
        } catch (err) {Sentry.captureException(new Error(err));}   
    }

    async handleLoadUserCampaigns(req, res, Sentry, DB) {
        try{
            const myCollection = await DB.collection('campaigns');
            const campaigns = await myCollection.find({"ownerId" : {$eq: req.user.address}});
            const result = await campaigns.toArray();
            res.send(result);
        } catch (err) { 
            Sentry.captureException(new Error(err));
            res.sendStatus(500);
        } 
    }

    async handleLoadEnv(res, envCHAIN, Sentry, DB) {
        try{
            let chainCollection = await DB.collection('chain_configs');
            let chain_configsRaw = await chainCollection.find();
            let chain_configs = await chain_configsRaw.toArray();      
            var chains = {};
            for (let i=0; i<chain_configs.length; i++) {
                chains[chain_configs[i]._id] = chain_configs[i];
            }
            let globalCollection = await DB.collection('global_configs');
            let global_configsRaw = await globalCollection.find();
            let global_configs = await global_configsRaw.toArray();
            res.json(
                {
                    CHAINS: chains,
                    CHAIN: envCHAIN,
                    GLOBALS: global_configs,
                });

        } catch (err) {
            Sentry.captureException(new Error(err));
        }      
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

    authenticated(req, res, Sentry) {
        if(req.user && req.user.address) {
            return true;
        } else {
            Sentry.captureException(new Error('Failed 401'));
            res.sendStatus(401);
            return false;
        }
    }

    async handleGetFiatPaymentSettings(DB, Sentry) {
        try {
            let configCollection = await DB.collection('global_configs');
            let fiatSettingsRAW = await configCollection.find({_id : 'FIATPAYMENT'});
            let fiatSettings = await fiatSettingsRAW.toArray();
            if(fiatSettings[0].enabled) {
                if(fiatSettings[0].CIRCLE && !fiatSettings[0].PAYADMIT) {
                    return 'circleLib';
                } else if (!fiatSettings[0].CIRCLE && fiatSettings[0].PAYADMIT) {
                    return 'payadmitLib';
                }
            }
            return;
        } catch (err) {Sentry.captureException(new Error(err))};
    }
}

module.exports = ServerLib;