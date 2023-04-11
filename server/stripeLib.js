const { v4: uuidv4 } = require('uuid');
class StripeLib {
    constructor() {}

    async handleDonateFiat(req, res, STRIPE_API_KEY, Sentry) {
        const stripe = require('stripe')(STRIPE_API_KEY);
        console.log(`Initiated stripe API with key ${STRIPE_API_KEY}`)
        let reffId = uuidv4();
        let url = req.headers.referer;
        if (url.includes('?')) url = url.split('?')[0];
        try {
            Sentry.addBreadcrumb({
                category: "stripe",
                message: `Creating checkout session ${reffId} for ${req.body.campaignId}. Currency: ${req.body.currency}. Amount: ${req.body.amount}`,
                level: "info",
            });
            console.log("Creating Stripe checkout session")
            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        price_data: {
                            currency: req.body.currency,
                            product_data: {
                                name: req.body.campaignName,
                                metadata: {campaign_id: req.body.campaignId}
                            },
                            unit_amount: req.body.amount*100,
                        },
                        quantity: 1,
                    },
                ],
                mode: 'payment',
                client_reference_id: reffId,
                success_url: `${url}?fp=s&am=${req.body.amount}&ref=${reffId}`,
                cancel_url: `${url}`
            });
            if(session && session.url) {
                res.status(200).send({paymentStatus: 'action_required', redirectUrl: session.url});
            } else {
                console.log("Failed to create Stripe checkout session")
            }
        } catch (err) {
            console.log(err);
            if(err.response) {
                Sentry.setContext("response", err.response);
                if(err.response.data) {
                    Sentry.addBreadcrumb({
                        category: "responsedata",
                        message: JSON.stringify(err.response.data),
                        level: "info",
                    });
                }
            }
            Sentry.captureException(new Error(err));
        }

    }
}

module.exports = StripeLib;
