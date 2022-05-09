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
const Sentry = require('@sentry/node');
const Tracing = require("@sentry/tracing");
const ServerLib = require('./serverLib');
const CircleLib = require('./circleLib');
const PORT = process.env.PORT || 5000;


require('dotenv').config({path : PATH.resolve(process.cwd(), '.env')});

const APP = EXPRESS();
const serverLib = new ServerLib();
const circleLib = new CircleLib();

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
    circleLib.handleCircleNotifications(req, res, CIRCLEARN, CIRCLE_API_KEY, validator, CLIENT, DBNAME)
});

APP.post('/api/uploadimage', (req,res) => {
    if(serverLib.authenticated(req, res, Sentry)) serverLib.handleUploadImage(req, res, S3, Sentry);
    
});

APP.post('/api/deleteimage', (req, res) => {   
    if(serverLib.authenticated(req, res, Sentry)) serverLib.handleDeleteImage(req, res, S3, Sentry);   
});

APP.post('/api/campaign/add', async (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)){
        const DB = CLIENT.db(DBNAME);
        serverLib.handleAddCampaign(req, res, Sentry, DB, CIRCLE_API_KEY, circleLib);
    }
});

APP.post('/api/campaign/update', async (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)){
        const DB = CLIENT.db(DBNAME);
        serverLib.handleUpdateCampaign(req, res, Sentry, DB);
    }
    
});

APP.post('/api/campaign/deactivate', async (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)) {
        const DB = CLIENT.db(DBNAME);
        serverLib.handleDeactivateCampaign(req, res, Sentry, DB);
    }
});

APP.post('/api/campaign/loadAll', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleLoadAllCampaigns(req, res, Sentry, DB);
})

APP.post('/api/campaign/loadOne', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    serverLib.handleLoadOneCampaign(req, res, Sentry, DB);
})

APP.post('/api/campaign/loadUserCampaigns', (req, res) => {
    if(serverLib.authenticated(req, res, Sentry)) {
        const DB = CLIENT.db(DBNAME);
        serverLib.handleLoadUserCampaigns(req, res, Sentry, DB);
    } 
})

APP.get('/api/env', async (req, res) => {
    const DB = await CLIENT.db(DBNAME);
    serverLib.handleLoadEnv(res, process.env.CHAIN, Sentry, DB);
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
    if(serverLib.authenticated(req, res, Sentry)) res.send({addr:req.user.address});
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

APP.post('/api/donatefiat', (req, res) => {
    serverLib.handleDonateFiat(req, res, CIRCLE_API_URL, CIRCLE_API_KEY, Sentry, CLIENT, DBNAME);
})

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

APP.listen(PORT);

console.log('App is listening on port ' + PORT);
