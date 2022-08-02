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

const URL1 = `mongodb+srv://${process.env.MONGO_LOGIN1}:${process.env.MONGODB_PWD1}${process.env.MONGO_URL1}`;
const URL2 = `mongodb+srv://${process.env.MONGO_LOGIN2}:${process.env.MONGODB_PWD2}${process.env.MONGO_URL2}`;
const DBNAME1 = process.env.MONGO_DB_NAME1;
const DBNAME2 = process.env.MONGO_DB_NAME2;

const doWork = module.exports.doWork = async function (sourceId, targetId, coinAddress) {
    console.log("Starting");
    const CLIENT1 = new MongoClient(URL1);
    const CLIENT2 = new MongoClient(URL2);
    console.log("Connecting");
    await CLIENT1.connect();
    console.log("Connected to source");
    await CLIENT2.connect();
    console.log("Connected to destination");
    const DB1 = CLIENT1.db(DBNAME1);
    const DB2 = CLIENT2.db(DBNAME2);
    let result = await DB1.collection("campaigns").findOne({"_id" : sourceId});

    const ITEM = {
        _id: targetId,
        beneficiaryId: result.beneficiaryId.toLowerCase(),
        title: result.title,
        mainImageURL: result.mainImageURL,
        vl: result.vl,
        cn: result.cn,
        fn: result.fn,
        ln: result.ln,
        org: result.org,
        description: result.description,
        currencyName: result.currencyName,
        maxAmount: result.maxAmount,
        descriptionEditor: result.descriptionEditor,
        raisedAmount: result.raisedAmount,
        creationDate: result.creationDate,
        lastDonationTime: result.lastDonationTime,
        coinAddress: coinAddress
    }

    let res = await DB2.collection('campaigns').insertOne(ITEM);
    console.log(res);
    return;
}

//Goerli
//doWork("0x4f8b9dfa85abf6a3e7e3e7de9bc8b13582a56344", "0x8046c8c4875ad761ad798f3909f3df2be0fe6154"); // Galiamina
//doWork("0x04f46c1e8af7739a35efc81be58c0cedfb9898f4", "0xe70c2035d41887b46d6a264f6ce66cb4ca585ab2"); // Mediazona
//doWork("0x12d1eee0ae3be1167e60772803ebee35989b299a", "0x55142eEc9d2b1DAa83113BA7cc5260017A37785f"); // Romanova

//Aurora
//doWork("0x5ff888564cdc987e940b4fc76af85318cea00b03", "0x5A0955CfAFBbF8A7A2b01B10e42aF85E94A5298f", "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802") //The Insider
//doWork("0x0876c82d3c70c86b3561f2231f2564609414624c","1a98a69fc21843ee276ce1940280aa4b1d14ef55", "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802") //Roskomsvoboda
//doWork("0x12d1eee0ae3be1167e60772803ebee35989b299a","0x3d8a8787ead11c2a485223c33cbbc0cbda3648cb", "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802") //Rus Sidiashaya
/*const ITEM = {
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
    lastDonationTime: 0
}

const DB = CLIENT.db(DBNAME);
DB.collection('campaigns')
    .updateOne({'_id': req.body.mydata.address}, {$set: ITEM}, (err, result) => {
        if (err) {
            console.log(err);
        } else {
            console.log("Success");
        }
    });*/