const EXPRESS = require('express');
const PATH = require('path');
const AWS = require('aws-sdk');
const FILE_UPLOAD = require('express-fileupload');
const CORS = require('cors');
const AXIOS = require('axios');
const { MongoClient } = require('mongodb');
const PORT = process.env.PORT || 5000;

require('dotenv').config({path : PATH.resolve(process.cwd(), '.env')});

const APP = EXPRESS();
APP.use(FILE_UPLOAD());
APP.use(CORS());
APP.use(EXPRESS.json());

const URL = `mongodb+srv://dpolozov:${process.env.MONGODB_PWD}@cluster0.jvp7o.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const DBNAME = 'HEO';
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

APP.post('/api/uploadimage', (req,res) => {
    const PARAMS = {
        Bucket: process.env.SERVER_APP_BUCKET_NAME,
        Key: process.env.SERVER_APP_IMG_DIR_NAME + '/' + req.files.myFile.name,
        Body: req.files.myFile.data
    }

    S3.upload(PARAMS, (error, data) => {
        if(error) {
            console.log(error);
        } else {
            res.send(data.Location);
        }
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
            title : element.title,
            mainImage : element.mainImage,
            videoLink : element.videoLink,
            campaignDesc : element.description,
            coinName: element.coinName,
            reward: element.reward,
            maxAmount: element.maxAmount,
            percentRaised: element.percentRaised,
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

APP.post('/api/campaigns/loadUserCampaigns', (req, res) => {
    const DB = CLIENT.db(DBNAME);
    DB.collection("campaigns").find({"beneficiaryId" : {$in: req.body.accounts}}).toArray(function(err, result) {
        if (err) throw err;
        res.send(result);
      });
})

APP.post('/api/uploadmeta', (req,res) => {
    const PARAMS = {
        Bucket: process.env.SERVER_APP_BUCKET_NAME,
        Key: process.env.SERVER_APP_META_DIR_NAME + '/' + req.files.myFile.name,
        ContentType: 'application/json',
        Body: req.files.myFile.data,
    }

    S3.upload(PARAMS, (error, data) => {
        if(error) {
            console.log(error);
        } else {
            res.send(data.Location);
        }
    });
});

APP.get('/api/env', (req,res) => {
    res.json(
        {
            REACT_APP_CHAIN_ID: process.env.REACT_APP_CHAIN_ID,
            REACT_APP_CHAIN_NAME: process.env.REACT_APP_CHAIN_NAME
        });
});

// Handles any requests that don't match the ones above.
// All other routing except paths defined above is done by React in the UI
APP.get('*', (req,res) =>{
    res.sendFile(PATH.join(__dirname, '..', 'build', 'index.html'));
});

APP.listen(PORT);

console.log('App is listening on port ' + PORT);
