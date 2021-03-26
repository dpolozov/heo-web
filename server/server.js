const express = require('express');
const path = require('path');
const AWS = require('aws-sdk');
const fileUpload = require('express-fileupload');
const cors = require('cors');

require('dotenv').config({path : path.resolve(process.cwd(), '.env')});

const app = express();
app.use(fileUpload());
app.use(cors());

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '../build')));
const s3 = new AWS.S3({
    accessKeyId: process.env.SERVER_APP_ACCESS_ID,
    secretAccessKey: process.env.SERVER_APP_ACCESS_KEY
});

app.post('/api/uploadimage', (req,res) => {
    const params = {
        Bucket: process.env.SERVER_APP_BUCKET_NAME,
        Key: process.env.SERVER_APP_IMG_DIR_NAME + '/' + req.files.myFile.name,
        Body: req.files.myFile.data
    }

    s3.upload(params, (error, data) => {
        if(error) {
            console.log(error);
        } else {
            console.log(data);
            res.send(data.Location);
        }
    });
});

app.post('/api/uploadmeta', (req,res) => {
    const params = {
        Bucket: process.env.SERVER_APP_BUCKET_NAME,
        Key: process.env.SERVER_APP_META_DIR_NAME + '/' + req.files.myFile.name,
        ContentType: 'application/json',
        Body: req.files.myFile.data,
    }

    s3.upload(params, (error, data) => {
        if(error) {
            console.log(error);
        } else {
            console.log(data);
            res.send(data.Location);
        }
    });
});

app.get('/api/env', (req,res) => {
    res.json(
        {
            REACT_APP_CHAIN_ID: process.env.REACT_APP_CHAIN_ID,
            REACT_APP_CHAIN_NAME: process.env.REACT_APP_CHAIN_NAME
        });
});

// Handles any requests that don't match the ones above.
// All other routing except paths defined above is done by React in the UI
app.get('*', (req,res) =>{
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port);

console.log('App is listening on port ' + port);
