const { default: axios } = require('axios');
const { v4: uuidv4 } = require('uuid');

class PayadmitLib{
    constructor(){}

    async handleDonateFiat(req, res, PAYADMIT_API_URL, PAYADMIT_API_KEY, Sentry, CLIENT, DBNAME){
        const DB = CLIENT.db(DBNAME);
        let phoneNumber = req.body.phoneNumber;
        if(phoneNumber.charAt(0) === '+'){
            phoneNumber = phoneNumber.substring(1);
            phoneNumber = phoneNumber.slice(0, 4) + ' ' + phoneNumber.slice(4);
        }
        let url = req.headers.referer;
        if (url.includes('?')) url = url.split('?')[0];
        let reffId = uuidv4();
        const payload = {
            referenceId: reffId,
            paymentType: "DEPOSIT",
            paymentMethod: "BASIC_CARD",
            amount: req.body.amount,
            currency: req.body.currency,
            card: {
            cardNumber: req.body.encryptedCardData,
            cardholderName: req.body.billingDetails.name,
            cardSecurityCode: req.body.encryptedSecurityData,
            expiryMonth: req.body.expMonth,
            expiryYear: req.body.expYear
            },
            customer: {
            firstName: req.body.billingDetails.name,
            lastName: req.body.billingDetails.name,
            email: req.body.email,
            phone: phoneNumber,
            accountName: req.body.campaignId,
            },
            billingAddress: {
            addressLine1: req.body.billingDetails.line1,
            addressLine2: req.body.billingDetails.line2,
            city: req.body.billingDetails.city,
            countryCode: req.body.billingDetails.country,
            postalCode: req.body.billingDetails.postalCode,
            state: req.body.billingDetails.district
            },
            returnUrl: `${url}?fp=pa&am=${req.body.amount}&ref=${reffId}`,
        }
        let paymentResp;
        try {
            paymentResp = await axios({
                method: 'post',
                baseURL: PAYADMIT_API_URL,
                url: 'api/v1/payments',
                headers: {
                    'Authorization': `Bearer ${PAYADMIT_API_KEY}`
                },
                data: payload
            });
        } catch (err) { 
            Sentry.captureException(new Error(err));
        }

        if(paymentResp) {
            if(paymentResp.data.result.redirectUrl){
                res.status(200).send({paymentStatus: 'action_required', redirectUrl: paymentResp.data.result.redirectUrl});
            }
            const data = {
                _id: paymentResp.data.result.id,
                referenceId: paymentResp.data.result.referenceId,
                campaignId: paymentResp.data.result.customer.accountName,
                paymentCreationDate: paymentResp.data.timestamp,
                paymentAmount: paymentResp.data.result.amount,
                heoFees: '0',
                paymentStatus: paymentResp.data.result.state,
                payadmitFees: '0',
                currency: paymentResp.data.result.currency,
                provider: 'payadmit'
            }
            
            try {
                const myCollection = await DB.collection('fiatPaymentRecords');
                await myCollection.insertOne(data);
            } catch (err) {
                Sentry.captureException(new Error(err))
            } 
        } else {
            res.sendStatus(401);
        }
    }

    async getPaymentDetails(req, res, Sentry, DB){
        let record;
        try {
            const myCollection = await DB.collection('fiatPaymentRecords');
            record = await myCollection.findOne({"referenceId" : req.body.refId});
        } catch (err) {Sentry.captureException(new Error(err));} 
        console.log(record);
        let errorMessage;
        if(record){
            if(record.errorCode){
                switch (record.errorCode) {
                    case 3.01:
                        errorMessage = 'payment_fraud_detected';
                        break;
                    case 2.00:
                        errorMessage = 'payment_stopped_by_issuer';
                        break;
                    case 3.06 || 3.08:
                        errorMessage = 'payment_denied';
                        break;
                    case 3.11:
                        errorMessage = 'card_limit_violated';
                        break;
                    case 3.07:
                        errorMessage = 'card_invalid';
                        break;
                    case 4.01:
                        errorMessage = 'payment_not_funded';
                        break;
                    case 4.00:
                        errorMessage = 'payment_not_supported_by_issuer';
                        break;
                    case 1.07:
                        errorMessage = 'card_not_honored'
                        break;
                    default:
                        errorMessage = 'declined';
                }
            } 
        }
        let success = {
            title: 'complete',
            errorMessage: 'thankyou',
            errorIcon: 'CheckCircle',
            modalButtonMessage: 'closeBtn',
            modalButtonVariant: '#588157',
            waitToClose: false,
            tryAgainCC: false, 
            ccinfo: {},
            hasErrors: false,
        }
        let failure = {
            title: 'failed',
            errorMessage,
            errorIcon: 'XCircle',
            modalButtonMessage: 'closeBtn',
            modalButtonVariant: '#E63C36',
            waitToClose: false,
            tryAgainCC: true,
            hasErrors: true 
        }
        if(errorMessage){
            res.send(failure);
        } else {
            res.send(success);
        }
    }
}

module.exports = PayadmitLib;