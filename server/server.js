const EXPRESS = require('express');
const PATH = require('path');
const AWS = require('aws-sdk');
const FILE_UPLOAD = require('express-fileupload');
const CORS = require('cors');
const { MongoClient } = require('mongodb');
const { default: axios } = require('axios');
const jwt = require('express-jwt');
const jsonwebtoken = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const ethereumutil = require("ethereumjs-util");
const { v4: uuidv4 } = require('uuid');
const fs = require("fs");
const MessageValidator = require('sns-validator')
const fetch = require('node-fetch');
const Sentry = require('@sentry/node');
const Tracing = require("@sentry/tracing");
const MessageValidator = require('sns-validator')
const fetch = require('node-fetch');
const PORT = process.env.PORT || 5000;


require('dotenv').config({path : PATH.resolve(process.cwd(), '.env')});

const APP = EXPRESS();

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ APP }),
    ],
    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: 0.1,
});
// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
APP.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
APP.use(Sentry.Handlers.tracingHandler());

APP.use(FILE_UPLOAD());
APP.use(CORS());
APP.use(EXPRESS.json());

const URL = `mongodb+srv://${process.env.MONGO_LOGIN}:${process.env.MONGODB_PWD}${process.env.MONGO_URL}`;
const DBNAME = process.env.MONGO_DB_NAME;
const CLIENT = new MongoClient(URL);
const CIRCLE_API_URL = process.env.CIRCLE_API_URL;
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const CIRCLEARN = /^arn:aws:sns:.*:908968368384:(sandbox|prod)_platform-notifications-topic$/;
const validator = new MessageValidator();

CLIENT.connect(err => {
    if(err) {
        console.log(err);
        Sentry.captureException(new Error(err));
    }
    console.log('connected succesfully to server');
});

// Serve the static files from the React APP
APP.use(EXPRESS.static(PATH.join(__dirname, '../build')));
const S3 = new AWS.S3({
    accessKeyId: process.env.SERVER_APP_ACCESS_ID,
    secretAccessKey: process.env.SERVER_APP_ACCESS_KEY
});

APP.use(cookieParser());
APP.use(jwt({ secret: process.env.JWT_SECRET, credentialsRequired:false, getToken: req => req.cookies.authToken, algorithms: ['HS256'] }));
APP.use(jwtErrorCatch);
function jwtErrorCatch (err, req, res, next) {
    if(err && err.code == "invalid_token") {
        Sentry.captureException(new Error(err));
        next(null, req, res.clearCookie('authToken'));
    } else {
        next(err, req, res);
    }
}

APP.head('/api/circlenotifications', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/html',
    });
    res.end(`HEAD request for ${req.url}`);
})


APP.post('/api/circlenotifications', (req, res) => {   
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
            console.error(err)
        } else {
            switch (envelope.Type) {
            case 'SubscriptionConfirmation': {
                if (!CIRCLEARN.test(envelope.TopicArn)) {
                console.error(`\nUnable to confirm the subscription as the topic arn is not expected ${envelope.TopicArn}. Valid topic arn must match ${CIRCLEARN}.`)
                break
                }
                await axios.post(envelope.SubscribeURL)
                    .then(console.log('subscription confirmend'))
                    .catch(err => console.log('subscription not confirmed' + err));
                break
                }
            case 'Notification': {
                let messageData;
                try{
                    messageData = JSON.parse(envelope.Message);
                    console.log(messageData);
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
                    fetch(url, options)
                    .then(res => res.json())
                    .then(json => json.data.forEach(async element => {
                        console.log(element);
                        let info = {
                            recordId: element.id, 
                            circleFees: element.fees.amount, 
                            amount: element.amount.amount,
                            currency: element.amount.currency,
                            heoWallet: element.merchantWalletId,
                        }      
                        await transferWithinCircle(info)
                            .then('wallet transwer succesfull')
                            .catch(err => console.log(err));
                        let data = {
                            paymentStatus: element.status,
                            lastUpdated: element.updateDate
                        }
                        await updatePaymentRecord(element.id, data)
                            .then('record updated succenfully')
                            .catch(err => console.log(err));
                    }))
                    .catch(err => console.error('error:' + err));
                } else if (messageData.notificationType === 'payments') {
                    let data = {
                        paymentStatus: messageData.payment.status,
                        lastUpdated: messageData.payment.updateDate,
                        circleFees: messageData.payment.fees.amount
                    }
                    await updatePaymentRecord(messageData.payment.id, data)
                            .then('record updated succenfully')
                            .catch(err => console.log(err));
                } else if(messageData.notificationType === 'transfers'){
                    let data = {
                        transferStatus: messageData.transfer.status
                    }
                    const DB = CLIENT.db(DBNAME);
                    let paymentRecord = await DB.collection('fiatPaymentRecords').findOne({'transferId': messageData.transfer.id});
                    if(paymentRecord){
                        await updatePaymentRecord(paymentRecord._id, data)
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
})

APP.post('/api/uploadimage', (req,res) => {
    if(req.user && req.user.address) {
        const PARAMS = {
            Bucket: process.env.SERVER_APP_BUCKET_NAME,
            Key: process.env.SERVER_APP_IMG_DIR_NAME + '/' + req.files.myFile.name,
            Body: req.files.myFile.data
        }
        S3.upload(PARAMS, (error, data) => {
            if (error) {
                Sentry.captureException(new Error(error));
                console.log(error);
                res.sendStatus(500);
            } else {
                res.send(data.Location);
            }
        });
    } else {
        Sentry.captureException(new Error('Image upload Error 401'));
        res.sendStatus(401);
    }
});

APP.post('/api/campaign/update', async (req, res) => {
    if (req.user && req.user.address) {
        const DB = CLIENT.db(DBNAME);
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
    } else {
        Sentry.captureException(new Error('campaign update error 401'));
        res.sendStatus(401);
    }
});

APP.post('/api/deleteimage', (req, res) => {
    if(req.user && req.user.address) {
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
    }  else {
        console.log('failed to delete');
        Sentry.captureException(new Error('failed to delete image 401'));
        res.sendStatus(401);
    }
});

APP.post('/api/campaign/deactivate', async (req, res) => {
    if(req.user && req.user.address) {
        const DB = CLIENT.db(DBNAME);
        let result = await DB.collection("campaigns").findOne({"_id" : req.body.id});
        if(!result || result.ownerId != req.user.address.toLowerCase()) {
            Sentry.captureException(new Error(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.address})`));
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
    }  else {
        console.log('failed to deactivate');
        Sentry.captureException(new Error('failed to deactivate campaign 401'));
        res.sendStatus(401);
    }
});

APP.post('/api/campaign/add', async (req, res) => {
    if(req.user && req.user.address) {
        let newWalletId;
        await createCircleWallet(req.body.mydata.address, (callback) => {
            newWalletId = callback;
        });       
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
        console.log(ITEM);
        const DB = CLIENT.db(DBNAME);
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
    } else {
        Sentry.captureException(new Error('failed to add campaign 401'));
        res.sendStatus(401);
    }
});

APP.post('/api/campaign/loadAll', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    DB.collection("campaigns").find({active: true}).sort({"lastDonationTime" : -1}).toArray(function(err, result) {
        if (err) throw err;
        Sentry.captureException(new Error(err));
        res.send(result);
    });
})

APP.post('/api/campaign/loadOne', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let result = await DB.collection("campaigns").findOne({"_id" : req.body.ID});
    if(result){
        res.send(result);
    } else {
        Sentry.captureException(new Error('failed to load campaign'));
    }
})

APP.post('/api/campaign/loadUserCampaigns',
    (req, res) => {
    if(req.user && req.user.address) {
        const DB = CLIENT.db(DBNAME);
        DB.collection("campaigns").find({"ownerId" : {$eq: req.user.address}}).toArray(function(err, result) {
            if (err) {
                Sentry.captureException(new Error(err));
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(result);
            }
        });
    } else {
        Sentry.captureException(new Error('failed to load campaigns 401'));
        res.sendStatus(401);
    }
})

APP.get('/api/env', async (req,res) => {
    const DB = CLIENT.db(DBNAME);
    let configs = await DB.collection('configs').find().toArray();
    if(configs) {
        var chains = {};
        for (let i=0; i<configs.length; i++) {
            chains[configs[i]._id] = configs[i];
        }

        res.json(
            {
                CHAINS: chains,
                CHAIN: process.env.CHAIN
            });
    } else {
        Sentry.captureException(new Error('failed to load configs'));
    }
});

APP.get('/api/auth/msg', (req, res) => {
    res.json({dataToSign:`Today is ${(new Date()).toDateString()}`});
});

APP.post('/api/auth/jwt', async(req, res) => {
    //extract Address from signature
    try {
        let dataToSign = `Today is ${(new Date()).toDateString()}`;
        var signature;
        if(req.body.signature && req.body.signature.signature) {
            signature = req.body.signature.signature;
        } else if(req.body.signature) {
            signature = req.body.signature;
        }
        const {v, r, s} = ethereumutil.fromRpcSig(signature);
        let signedData = ethereumutil.keccak("\x19Ethereum Signed Message:\n" + dataToSign.length + dataToSign);
        const pubKey = ethereumutil.ecrecover(signedData, v, r, s);
        const addrBuf = ethereumutil.pubToAddress(pubKey);
        const addr = ethereumutil.bufferToHex(addrBuf).toLowerCase();
        if(addr != req.body.addr.toLowerCase()) {
            Sentry.captureException(new Error('auth failed'));
            res.sendStatus(401);
        } else {
            let token = jsonwebtoken.sign({ address:addr }, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.cookie('authToken', token, { httpOnly: true }).send({success:true});
        }
    } catch (err) {
        console.log(err);
        Sentry.captureException(new Error(err));
        res.sendStatus(401);
    }
});

APP.get('/api/auth/status', (req, res) => {
    if(req.user && req.user.address) {
        res.send({addr:req.user.address});
    } else {
        Sentry.captureException(new Error('failed addr vs usr addr'));
        res.sendStatus(401);
    }
});

APP.post('/api/auth/logout', (req, res) => {
    res.clearCookie('authToken').send({});
});

APP.get('/api/circle/publickey', async (req, res) => {
    try {
        let apiRes = await axios(
            {
                method: 'get',
                baseURL: CIRCLE_API_URL,
                url: '/v1/encryption/public',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${CIRCLE_API_KEY}`
                }
            });
        if(apiRes && apiRes.status == 200) {
            res.send(apiRes.data);
        } else {
            console.log(apiRes);
            console.log("Empty respone from Circle API");
            res.sendStatus(500);
        }
    } catch (err) {
        console.log("Error respone from Circle API");
        console.log(err);
        res.sendStatus(500);
    }
});

APP.post('/api/donatefiat', async (req, res) => {
    let cardIdempotencyKey = uuidv4();
    let userIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(userIP.indexOf(",") > 0) {
        try {
            let ips = userIP.split(",");
            userIP = ips[0];
        } catch (err) {
            console.log(`failed to parse user IP: ${userIP}`);
        }
    }
    //first create card in Circle API
    try {
        let createCardResp = await axios({
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
        if(createCardResp && createCardResp.status >= 200 && createCardResp.data && createCardResp.data.data && createCardResp.data.data.id) {
            let paymentIdempotencyKey = uuidv4();
            let verificationUrl = req.headers.referer;
            if(verificationUrl.includes('?')){
                verificationUrlArray = verificationUrl.split('?');
                verificationUrl = verificationUrlArray[0];
            }
            //got card ID, can create a payment
            let paymentResp = await axios({
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
                    await createPaymentRecord(data).then(console.log('payment record made succesfully')).catch(err => console.log(err));
                } else {
                    let data = {
                        lastUpdated: paymentResp.data.data.updateDate,
                        paymentStatus: paymentResp.data.data.status
                    }
                    await updatePaymentRecord(paymentResp.data.data.id, data).then(console.log('payment record update succesfully')).catch(err => console.log(err));
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
        console.log(err.response.data);
        res.status(500).send({paymentStatus: err.response.data});
    }
})

//create initial payment record in mongodb
createPaymentRecord = async (data) => {
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
updatePaymentRecord = async (recordId, data) => {
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

createCircleWallet = async (campaignId, callback) => {
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

    await fetch(url, options)
    .then(res => res.json())
    .then(json => {
        console.log(json);
        if(json.data.walletId){
            return callback(json.data.walletId);
        } else {
            return callback('');
        }
    })
    .catch(err => {
        console.error('error:' + err);
        return callback('');
    })
}

//transfer settled funds
transferWithinCircle = async (info) => {
    const DB = CLIENT.db(DBNAME);
    let paymentRecord = await DB.collection('fiatPaymentRecords').findOne({'_id': info.recordId});
    if(!paymentRecord.walletId || paymentRecord.walletId === null){
        //check the campaign in mongo for wallet id
        //this comes up if new wallet was just created but front end state variable was not reloaded.
        let campaign = await DB.collection("campaigns").findOne({"_id" : paymentRecord.campaignId});
        if(campaign.walletId) {
            paymentRecord.walletId = campaign.walletId;
            let data = {walletId: campaign.walletId};
            updatePaymentRecord(info.recordId, data)
        } else {
            await createCircleWallet(paymentRecord.campaignId, (callback) => {
                console.log('callback comes back as ' + callback);
                paymentRecord.walletId = callback;
                let data = {walletId: callback};
                updatePaymentRecord(info.recordId, data);
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
        updatePaymentRecord(info.recordId, data);
    })
    .catch(err => console.error('error:' + err));
}

// Handles any requests that don't match the ones above.
// All other routing except paths defined above is done by React in the UI
APP.get('*', async(req,res) =>{
    var title = "HEO App";
    var description = "Crowdfunding on blockchain.";
    var image = "https://app.heo.finance/static/media/heo-logo.e772bc1b.png";
    var url = "https://app.heo.finance";
    var campaign, title, description, image;
    var splitURL = req.url.split('/');
    var campaignId = splitURL[splitURL.length -1]

    if(splitURL.length > 2) {
        try {
            const DB = CLIENT.db(DBNAME);
            campaign = await DB.collection("campaigns").findOne({"_id" : campaignId});
            if(campaign){
                title = (campaign.title.default).replace(/"/g,"&quot;");
                description = (campaign.description.default).replace(/"/g,"&quot;");
                image = campaign.mainImageURL;
                url = req.url;
            } else {
                Sentry.captureException(new Error('campaign no longer available'));
                title="This campaign is no longer available.";
                description="";
            }
        } catch (err){
            Sentry.captureException(new Error(err));
            console.log(err);
            title="Information Currently Unavailable.";
            description="";
        }
    }

    const filePath = PATH.resolve(__dirname, '..', 'build', '_index.html');
    fs.readFile(filePath, 'utf8', function (err, data){
        if (err) {
            res.sendStatus(500);
            return console.log(err);
        }
        data = data.replace(/\$OG_TITLE/g, title);
        data = data.replace(/\$OG_DESCRIPTION/g, description);
        data = data.replace(/\$OG_URL/g, url)
        let result = data.replace(/\$OG_IMAGE/g, image);
        res.send(result);
    });
});

APP.use(Sentry.Handlers.errorHandler());

APP.use(function onError(err, req, res, next) {
    // The error id is attached to `res.sentry` to be returned
    // and optionally displayed to the user for support.
    res.statusCode = 500;
    res.end(res.sentry + "\n");
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
APP.listen(PORT);

console.log('App is listening on port ' + PORT);
