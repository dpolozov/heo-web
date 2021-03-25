const express = require('express');
const path = require('path');
const AWS = require('aws-sdk');
const fileUpload = require('express-fileupload');
const app = express();

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '../build')));

//TODO: An api endpoint that will handle image uploads
app.post('/api/uploadimage', (req,res) => {
    console.log('Upload image to AWS here');
});

//TODO: An api endpoint that will handle metadata uploads
app.post('/api/uploadmeta', (req,res) => {
    console.log('construct a JSON metadata file and upload it to AWS here');
});

app.get('/api/env', (req,res) => {
    res.json(
        {
            REACT_APP_CHAIN_ID:'binancetestnet',
            REACT_APP_CHAIN_NAME:'Binance test net'
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
