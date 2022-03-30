const EXPRESS = require('express');
const PATH = require('path');
const AWS = require('aws-sdk');
const FILE_UPLOAD = require('express-fileupload');
const CORS = require('cors');
const AXIOS = require('axios');
const { MongoClient } = require('mongodb');
const { default: axios } = require('axios');
const jwt = require('express-jwt');
const jsonwebtoken = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const ethereumutil = require("ethereumjs-util");
const fs = require("fs");
const Sentry = require('@sentry/node');
const Tracing = require("@sentry/tracing");
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

APP.post('/api/campaign/add', (req, res) => {
    if(req.user && req.user.address) {
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
            raisedAmount: 0,
            creationDate: Date.now(),
            lastDonationTime: 0,
            coins: req.body.mydata.coins,
            addresses: req.body.mydata.addresses,
            active: true
        }
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


// Handles any requests that don't match the ones above.
// All other routing except paths defined above is done by React in the UI
APP.get('*', async(req,res) =>{
    var title = "HEO App";
    var description = "Crowdfunding on blockchain.";
    var image = "https://app.heo.finance/static/media/heo-logo.e772bc1b.png";
    var url = "https://app.heo.finance";
    var campaign;
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

APP.listen(PORT);

console.log('App is listening on port ' + PORT);
