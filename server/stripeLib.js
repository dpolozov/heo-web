const { v4: uuidv4 } = require('uuid');
const Sentry = require("@sentry/node");
class StripeLib {
    constructor() {}

    async handleNotification (req, res, STRIPE_API_KEY, STRIPE_WH_SECRET, CLIENT, DBNAME, Sentry) {
        try {
            Sentry.addBreadcrumb({
                category: "stripe",
                message: `Received webhook notification from stripe`,
                level: "info",
            });
            const stripe = require('stripe')(STRIPE_API_KEY);
            console.log(`Notifications: initiated stripe API`)
            console.log(`Stripe WH secret ${STRIPE_WH_SECRET}`)
            let event = req.body;
            Sentry.addBreadcrumb({
                category: "stripe",
                message: event,
                level: "debug",
            });
            if(STRIPE_WH_SECRET) {
                // Get the signature sent by Stripe
                const signature = req.headers['stripe-signature'];
                try {
                    event = stripe.webhooks.constructEvent(
                        req.body,
                        signature,
                        STRIPE_WH_SECRET
                    );
                } catch (err) {
                    console.log(`Webhook signature verification failed.`, err.message);
                    Sentry.captureException(new Error(err));
                    return res.sendStatus(400);
                }
            }
            // Handle the event
            switch (event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object;
                    console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
                    // Then define and call a method to handle the successful payment intent.
                    // handlePaymentIntentSucceeded(paymentIntent);
                    break;
                case 'checkout.session.completed':
                    console.log('Checkout session completed');
                    const sessionObj = event.data.object;
                    console.log(sessionObj);
                    console.log(`Checkout session for ${sessionObj.amount_total}`);
                    if(sessionObj.metadata && sessionObj.metadata.campaign_id) {
                        //this is a payment for a campaign
                        if(sessionObj.payment_status && sessionObj.payment_status == "paid") {
                            console.log(`Received a payment for campaign ${sessionObj.metadata.campaign_id} for ${sessionObj.amount_total}/100`);
                        } else {
                            console.log(`Payment status is ${sessionObj.payment_status} `);
                        }
                    } else {
                        console.log("Could not find campaign Id in metadata");
                    }
                    break;
                default:
                    // Unexpected event type
                    console.log(`Unhandled event type ${event.type}.`);
                    Sentry.captureException(new Error(`Unhandled event type ${event.type}.`));
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
    async handleDonateFiat(req, res, STRIPE_API_KEY, Sentry) {
        const stripe = require('stripe')(STRIPE_API_KEY);
        console.log(`Initiated stripe API`)
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
                                name: req.body.campaignName
                            },
                            unit_amount: req.body.amount*100,
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    campaign_id: req.body.campaignId
                },
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
