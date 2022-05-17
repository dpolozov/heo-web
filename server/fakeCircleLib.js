const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const { default: axios } = require('axios');

class FakeCircleLib {
    constructor(){
    }

    async handleCircleNotifications(req, res, CIRCLEARN, CIRCLE_API_KEY, validator, CLIENT, DBNAME){
        this.createCircleWallet('asdfasdfasdf', 'aasdfasdf');
    }

    async createCircleCard(req, CIRCLE_API_URL, CIRCLE_API_KEY, userIP) {
        return;
    }

    async createCircleWallet(campaignId, CIRCLE_API_KEY){
        return 'adafdsfasd';
    }

    async handleCreatePayment(req, CIRCLE_API_URL, CIRCLE_API_KEY, userIP, verificationUrl, createCardResp){
        return;
    }

    async transferWithinCircle(info, CIRCLE_API_KEY, CLIENT, DBNAME){
        return;
    }

    //create initial payment record in mongodb
    async createPaymentRecord(data, CLIENT, DBNAME){
        return
    }

    //update payment record in mongodb
    async updatePaymentRecord(recordId, data, CLIENT, DBNAME){
        return;     
    }
}

module.exports = FakeCircleLib;