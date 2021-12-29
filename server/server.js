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
const PORT = process.env.PORT || 5000;


require('dotenv').config({path : PATH.resolve(process.cwd(), '.env')});

const APP = EXPRESS();
APP.use(FILE_UPLOAD());
APP.use(CORS());
APP.use(EXPRESS.json());

const URL = `mongodb+srv://${process.env.MONGO_LOGIN}:${process.env.MONGODB_PWD}${process.env.MONGO_URL}`;
const DBNAME = process.env.MONGO_DB_NAME;
const CLIENT = new MongoClient(URL);
const CIRCLE_API_URL = process.env.CIRCLE_API_URL;
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

CLIENT.connect(err => {
    if(err) {
        console.log(err);
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
                console.log(error);
                res.sendStatus(500);
            } else {
                res.send(data.Location);
            }
        });
    } else {
        res.sendStatus(401);
    }
});

APP.post('/api/campaign/update', async (req, res) => {
    if (req.user && req.user.address) {
        const DB = CLIENT.db(DBNAME);
        let result = await DB.collection("campaigns").findOne({"_id" : req.body.mydata.address});
        if(!result || result.ownerId != req.user.address.toLowerCase()) {
            res.sendStatus(500);
            console.log(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.address})`);
        } else {
            DB.collection('campaigns')
                .updateOne({'_id': req.body.mydata.address}, {$set: req.body.mydata.dataToUpdate}, (err, result) => {
                    if (err) {
                        res.sendStatus(500);
                        console.log(err);
                    } else {
                        res.send('success');
                    }
                });
        }
    } else {
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
                console.log(error, error.stack);
                res.sendStatus(500);
            } else {
                res.send('complete');
            }
        });
    }  else {
        console.log('failed to delete');
        res.sendStatus(401);
    }
});

APP.post('/api/campaign/deactivate', async (req, res) => {
    if(req.user && req.user.address) {
        const DB = CLIENT.db(DBNAME);
        let result = await DB.collection("campaigns").findOne({"_id" : req.body.id});
        if(!result || result.ownerId != req.user.address.toLowerCase()) {
            res.sendStatus(500);
            console.log(`Campaign's ownerId (${result.ownerId}) does not match the user (${req.user.address})`);
        } else {
            DB.collection('campaigns')
            .updateOne({'_id': req.body.id}, {$set: {active:false}}, (err, result) => {
                if (err) {
                    res.sendStatus(500);
                    console.log(err);
                } else {
                    res.send('success');
                }
            });
        }
    }  else {
        console.log('failed to deactivate');
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
                    res.sendStatus(500);
                    console.log(err);
                } else {
                    res.send('success');
                    console.log("1 entry was insterted in db");
                }
            });
    } else {
        res.sendStatus(401);
    }
});

APP.post('/api/campaign/loadAll', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    DB.collection("campaigns").find({active: true}).sort({"lastDonationTime" : -1}).toArray(function(err, result) {
        if (err) throw err;
        res.send(result);
      });
})

APP.post('/api/campaign/loadOne', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let result = await DB.collection("campaigns").findOne({"_id" : req.body.ID});
    res.send(result);
})

APP.post('/api/campaign/loadUserCampaigns',
    (req, res) => {
    if(req.user && req.user.address) {
        const DB = CLIENT.db(DBNAME);
        DB.collection("campaigns").find({"ownerId" : {$eq: req.user.address}}).toArray(function(err, result) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
            } else {
                res.send(result);
            }
        });
    } else {
        res.sendStatus(401);
    }
})

APP.get('/api/env', async (req,res) => {
    const DB = CLIENT.db(DBNAME);
    let configs = await DB.collection('configs').find().toArray();
    var chains = {};
    for (let i=0; i<configs.length; i++) {
        chains[configs[i]._id] = configs[i];
    }

    res.json(
        {
            CHAINS: chains,
            CHAIN: process.env.CHAIN
        });
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
            res.sendStatus(401);
        } else {
            let token = jsonwebtoken.sign({ address:addr }, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.cookie('authToken', token, { httpOnly: true }).send({success:true});
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(401);
    }
});

APP.get('/api/auth/status', (req, res) => {
    if(req.user && req.user.address) {
        res.send({addr:req.user.address});
    } else {
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
            //got card ID, can create a payment
            let createPaymentResp = await axios({
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
                    verification: "cvv"
                }
            });

            if(createPaymentResp && createPaymentResp.data && createPaymentResp.status) {
                console.log("Success");
                res.sendStatus(200);
            } else {
                console.log(createPaymentResp);
                res.sendStatus(500);
            }
        } else {
            console.log("Bad response from card API");
            console.log(createCardResp.data);
            res.sendStatus(500);
        }
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }

    //let billingDetails = req.body.billingDetails;
    //expMonth

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
                title = campaign.title.default;
                description = campaign.description.default;
                image = campaign.mainImageURL;
                url = req.url;
            } else {
                title="This campaign is no longer available.";
                description="";
            }
        } catch (err){
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

APP.listen(PORT);

console.log('App is listening on port ' + PORT);
