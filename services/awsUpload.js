const path = require('path');
require('dotenv').config({path : path.resolve(process.cwd(), '../.env')});
const express = require('express');
const fs = require('fs');
const AWS = require('aws-sdk');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const PORT = process.env.PORT || 3002;

const app = express();
app.use(fileUpload());
app.use(cors());

const s3 = new AWS.S3({
    accessKeyId: process.env.REACT_APP_ACCESS_ID,
    secretAccessKey: process.env.REACT_APP_ACCESS_KEY
});

s3.config.update({region: process.env.REACT_APP_REGION})

app.post('/awsUpload', (req, res) => {
    const params = {
        Bucket: process.env.REACT_APP_BUCKET_NAME,
        Key: process.env.REACT_APP_IMG_DIR_NAME + '/' + req.files.myFile.name,
        Body: req.files.myFile.data
    }

    console.log(params);
    s3.upload(params, (error, data) => {
        if(error) {
            console.log(error);
        } else {
            console.log(data);
            res.send(data.Location);
        }
    });
    
});


app.listen(PORT, ()=> {
    console.log(`awsUpload on port ${PORT}`);
} );