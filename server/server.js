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
const PORT = process.env.PORT || 5000;

require('dotenv').config({path : PATH.resolve(process.cwd(), '.env')});

const APP = EXPRESS();
APP.use(FILE_UPLOAD());
APP.use(CORS());
APP.use(EXPRESS.json());

const URL = `mongodb+srv://${process.env.MONGO_LOGIN}:${process.env.MONGODB_PWD}${process.env.MONGO_URL}`;
const DBNAME = process.env.MONGO_DB_NAME;
const CLIENT = new MongoClient(URL);

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

APP.post('/api/updateCampaignDB', (req, res) => {   
    const DB = CLIENT.db(DBNAME);
    DB.collection('campaigns')
    .updateOne({'_id': req.body.mydata.address}, {$set: req.body.mydata.dataToUpdate}, (err, result) => {
        if(err){
            res.sendStatus(500);
            console.log(err);
        }
        res.send('success');
    });     
});

APP.post('/api/campaigns/sendToDB', (req, res) => {
    let campaigns = JSON.parse(req.files.myFile.data);
    let i = 0;
    campaigns.forEach(element => {
        i++;
        let date = Date.now();
        const ITEM = {
            _id : element.address.toLowerCase(),
            beneficiaryId : element.beneficiaryId.toLowerCase(),
            ownerId : element.ownerId.toLowerCase(),
            title : element.title,
            mainImage : element.mainImage,
            videoLink : element.videoLink,
            campaignDesc : element.description,
            coinName: element.coinName,
            maxAmount: element.maxAmount,
            raisedAmount: element.raisedAmount,
            creationDate : date,
        }
        const DB = CLIENT.db(DBNAME);
        DB.collection('campaigns')
        .insertOne( ITEM, function (err, res){
            if(err) console.log(err);
            console.log("1 entry was insterted in db");
        })
        
    });  

});

APP.post('/api/campaigns/load', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    DB.collection("campaigns").find().toArray(function(err, result) {
        if (err) throw err;
        res.send(result);
      });
})

APP.post('/api/campaign/load', async (req, res) => {
    const DB = CLIENT.db(DBNAME);
    let result = await DB.collection("campaigns").findOne({"_id" : req.body.ID});
    res.send(result);
})

/*APP.post('/api/campaign/updateRaisedAmount', (req, res) =>{
    const DB = CLIENT.db(DBNAME);
    DB.collection("campaigns").findOneAndUpdate({ "_id" : req.body.ID}, { "$set" : {"raisedAmount" : req.body.amount}})
    .then( res.send('db updated successfully'))
    .catch( err => {
        console.log(err);
        res.send('db update failed');
    })
})*/

APP.post('/api/campaigns/loadUserCampaigns',
    (req, res) => {
    if(req.user && req.user.address) {
        const DB = CLIENT.db(DBNAME);
        DB.collection("campaigns").find({"beneficiaryId" : {$eq: req.user.address}}).toArray(function(err, result) {
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

APP.post('/api/uploadmeta', (req,res) => {
    if(req.user && req.user.address) {
        const PARAMS = {
            Bucket: process.env.SERVER_APP_BUCKET_NAME,
            Key: process.env.SERVER_APP_META_DIR_NAME + '/' + req.files.myFile.name,
            ContentType: 'application/json',
            Body: req.files.myFile.data,
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

APP.post('/api/getMetaData', async (req,res) => {
    let metaData = await axios.get(req.body.metaUrl).catch(e => {console.log(e)});
    res.send(JSON.stringify(metaData.data));
});

APP.get('/api/env', (req,res) => {
    res.json(
        {
            REACT_APP_CHAIN_ID: process.env.REACT_APP_CHAIN_ID,
            REACT_APP_CHAIN_NAME: process.env.REACT_APP_CHAIN_NAME
        });
});

APP.get('/api/auth/msg', (req, res) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    res.json({dataToSign:`My IP address is ${ip} and today is ${(new Date()).toDateString()}`});
});

APP.post('/api/auth/jwt', async(req, res) => {
    //extract Address from signature
    try {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        let dataToSign = `My IP address is ${ip} and today is ${(new Date()).toDateString()}`;
        const {v, r, s} = ethereumutil.fromRpcSig(req.body.signature);
        let signedData = ethereumutil.keccak("\x19Ethereum Signed Message:\n" + dataToSign.length + dataToSign);
        const pubKey = ethereumutil.ecrecover(signedData, v, r, s);
        const addrBuf = ethereumutil.pubToAddress(pubKey);
        const addr = ethereumutil.bufferToHex(addrBuf);
        if(addr != req.body.addr) {
            console.log(`Error: decoded address ${addr} is different from user address ${req.body.addr}`);
            res.sendStatus(401);
        } else {
            let token = jsonwebtoken.sign({ address:addr }, process.env.JWT_SECRET, { expiresIn: '7d' });
            console.log(`JWT token ${token}`);
            res.cookie('authToken', token, { httpOnly: true }).send({sucess:true});
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


// Handles any requests that don't match the ones above.
// All other routing except paths defined above is done by React in the UI
APP.get('*', (req,res) =>{
    res.sendFile(PATH.join(__dirname, '..', 'build', 'index.html'));
});

APP.listen(PORT);

console.log('App is listening on port ' + PORT);
