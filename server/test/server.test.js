const chai = require('chai');
const chaiHttp =require('chai-http');
const { ChatRight } = require('react-bootstrap-icons');
const server = require('../server');
chai.should();
chai.use(chaiHttp);

this.timeout(3000);

describe('wallet and payment record functions', function () {

    before(() => {
        
    })

    after(() => {

    })

    //test head requests. only used during initial subscriptions set up
    //for circle api payment notification subscriptions.
    describe('Head request /api/circlenotifications', () => {
        it('It should return status 200', (done) => {
            chai.request(server)
            .head("/api/circlenotifications")
            .end((err, res) => {
                res.should.have.status(200);
            done();
            })
        })
    })

    //recieving notifications from circle subscriptions
    describe('Receive and process notifications from circle api', () => {

    })

    /*  There is no delete wallet function on circle api. keep running this 
        will have infinte wallets

    describe('wallet creation', () => {
        it('it should return a wallet number', (done) => {
            let walletId;
            createCircleWallet('aklsdjfalsd', (callback) => {
                walletId = callback;
            });
            chai.assert.isNotNull(walletId);
            done();
        })
    })
    */
})