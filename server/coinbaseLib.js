const Coinbase = require('coinbase-commerce-node');
const CoinbaseClient = Coinbase.Client;
const Sentry = require("@sentry/node");


class CoinbaseLib {
    constructor() {
    }

    async createCharge(req, res, CLIENT, DBNAME, Sentry, apiKey) {
        let campaignId = req.body.campaignId;
        let campaignName = req.body.campaignName;
        let amount = req.body.amount;
        let url = req.headers.referer;
        if (url.includes('?')) url = url.split('?')[0];
        try {
            // Log attempt to create a charge
            Sentry.addBreadcrumb({
                category: "CoinbaseCommerce",
                message: `Creating Coinbase charge for ${campaignId}. Amount: ${amount}`,
                level: "info",
            });
            console.log("Creating Coinbase charge")

            // Attempt to create a charge
            const client = CoinbaseClient.init(apiKey);
            client.setRequestTimeout(3000);
            var Charge = Coinbase.resources.Charge;
            const chargeData = {
                name: campaignName,
                description: "Donation to " + campaignName + " campaign",
                local_price: {
                    amount: amount,
                    currency: 'USD',
                },
                metadata: {
                    customer_id: campaignId,
                    customer_name: campaignName
                },
                pricing_type: 'fixed_price',
                redirect_url: `${url}?fp=s&am=${req.body.amount}`,
                cancel_url: url,
            };

            const charge = await Charge.create(chargeData);
            const chargeId = charge.id;
            const checkoutUrl = charge.hosted_url;

            // Log charge ID and redirect URL
            console.log('Charge created. Charge ID:', chargeId);
            Sentry.addBreadcrumb({
                category: "CoinbaseCommerce",
                message: `Created Coinbase charge ID ${chargeId} for ${campaignId}. Amount: ${amount}`,
                level: "info",
            });

            // Insert charge into DB
            const data = {
                status: "created",
                amount: amount,
                charge_id: chargeId,
                campaign_id: campaignId,
                checkout_url: checkoutUrl,
                last_updated: new Date(),
                created_on: new Date(),
                currency: "USD"
            }
            const DB = CLIENT.db(DBNAME);
            const chargesCollection = await DB.collection('coinbase_commerce_charges');
            await chargesCollection.insertOne(data);
            
            // Redirect to checkout page
            res.status(200).send({paymentStatus: 'action_required', redirectUrl: checkoutUrl});
            return;
        } catch (error) {
            console.error('Error creating charge:', error.message);
            Sentry.captureException(new Error(error));
        }
        res.sendStatus(500);
    }
}

module.exports = CoinbaseLib;