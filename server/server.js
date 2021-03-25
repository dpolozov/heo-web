const express = require('express');
const path = require('path');
const AWS = require('aws-sdk');
const fileUpload = require('express-fileupload');
const httpProxy = require('http-proxy');
const app = express();

const apiProxy = httpProxy.createProxyServer();

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '../build/public')));

apiProxy.on('error', (err, req, res) => {
    console.log(err);
    res.status(500).send('Proxy error');
});

//TODO: An api endpoint that will handle image uploads
app.post('/api/uploadimage', (req,res) => {
    apiProxy.web(req, res, {
        target: 'http://localhost:3002',
    });
    console.log('Upload image to AWS here');
});

app.post('/api/uploadmeta', (req,res) => {
    apiProxy.web(req, res, {
        target: 'http://localhost:3003',
    });
    console.log('Upload image to meta data here');
});

//TODO: An api endpoint that will handle metadata uploads
app.post('/api/uploadmeta', (req,res) => {
    console.log('construct a JSON metadata file and upload it to AWS here');
});

// Handles any requests that don't match the ones above.
// All other routing except paths defined above is done by React in the UI
app.get('*', (req,res) =>{
    res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
});

const port = process.env.PORT || 5000;
app.listen(port);

console.log('App is listening on port ' + port);