const chai = require('chai');
const sinon = require('sinon');
const ServerLib = require("../serverLib");
const FakeCircleLib = require('../fakeCircleLib');
const { instrumentOutgoingRequests } = require('@sentry/tracing/dist/browser');

const fakeCirleLib = new FakeCircleLib();
const myServerLib = new ServerLib();

chai.should();




describe('Server unit tests', function () {

    before(() => {
    })

    after(() => {

    })

    describe('Campaings and mongoDB tests', () => {
        const mydata = {
            address: '00001',
            beneficiaryId: '00002',
            title: 'Title',
            mainImageURL: 'https://www.heo.finance/',
            qrCodeImageURL: 'https://app.heo.finance/',
            vl: 'https://www.youtube.com/watch?v=waJhB6EhSnY',
            cn: 'usa',
            fn: 'customer',
            ln: 'zero',
            org: 'heo',
            description: 'short description',
            descriptionEditor: 'long description',
            maxAmount: '100',
            currencyName: 'usd',
            coins: '0',
            addresses: 'addresses',
            walletId: '',
        }
        //var fakeDB = {collection: function() {}};
        //const mockDB = sinon.mock(fakeDB);
        const fakeReq = {user:{address:"someAddress"},body:{}};
        const fakeRes = {sendStatus:function(){}};
        const fakeSentry = {captureException: function() {}};
        const fakeCircleAPI = '12345'

        /*
        describe('uploading image to S3', () => {
            it('should call upload function from S3 object', (done)=>{     
                let fakeReqImage = {user:{address:"someAddress"}, files:{myFile:{name:"filename"}}};
                let fakeS3 = {upload: function() {return}};
                var mock = sinon.mock(fakeS3);
                mock.expects("upload").once();
                myServerLib.handleUploadImage(fakeReqImage, fakeRes, fakeS3, fakeSentry);
                mock.verify();
                done();
            });
        });
        */
        describe('creating new campaign in mongo DB', () => {
            /*
            it('should call create wallet function', (done)=>{
                let fakeReqWithData = {user:{address:"someAddress"},body:{mydata}};
                var fakeDB = {collection: function() {}};
                var fakeLib = {createCircleWallet: function() {}}
                var mock = sinon.mock(fakeLib);
                mock.expects('createCircleWallet').once();
                myServerLib.handleAddCampaign(fakeReqWithData, fakeRes, fakeSentry, fakeDB, fakeCircleAPI, fakeLib);
                mock.verify();
                done();
            });
            */
            it('should call DB.collection', async (done) => {
                let fakeReqWithData = {user:{address:"someAddress"},body:{mydata}};
                var fakeDB = {collection: function() {}};
                var fakeLib = {createCircleWallet: function() {return 'dadfadsfa'}}
                var mock2 = sinon.mock(fakeLib);
                mock2.expects('createCircleWallet');
                var mock = sinon.mock(fakeDB);
                mock.expects('collection').once();
                myServerLib.handleAddCampaign(fakeReqWithData, fakeRes, fakeSentry, fakeDB, fakeCircleAPI, fakeLib);
                mock2.verify();
                mock.verify();
                done();
            })
            
        });
        
        describe('updating campaign in mongoDB', () => {
            it('should call DB.collection', (done) => {
                //var fakeDB2 = {collection: function() {}};
                var fakeDB = {collection: function() {}};
                var mock = sinon.mock(fakeDB);
                mock.expects('collection').once();
                myServerLib.handleUpdateCampaign(fakeReq, fakeRes, fakeSentry, fakeDB);
                mock.verify();
                done();
            });
        });
        /*
        describe('deactivating campaign in mongoDB', () => {
            it('should call DB.collection', (done) => {
                var fakeDB = {collection: function() {}};
                var mock = sinon.mock(fakeDB);
                mock.expects('collection').once();
                myServerLib.handleDeactivateCampaign(fakeReq, fakeRes, fakeSentry, fakeDB);
                mock.verify();
                done();
            });
        }); 
        
        describe('load all campaigns from MongoDB', () => {
            it('should call DB.collection', (done) => {
                var fakeDB = {collection: function() {}};
                var mock = sinon.mock(fakeDB);
                mock.expects('collection').once();
                myServerLib.handleLoadAllCampaigns(fakeReq, fakeRes, fakeSentry, fakeDB);
                mock.verify();
                done();
            });
        });
        
        describe('load one campaign from MongoDB', () => {
            it('should call DB.collection', (done) => {
                var fakeDB = {collection: function() {}};
                var mock = sinon.mock(fakeDB);
                mock.expects('collection').once();
                myServerLib.handleLoadOneCampaign(fakeReq, fakeRes, fakeSentry, fakeDB);
                mock.verify();
                done();
            });
        });

        describe('load user campaigns from MongoDB', () => {
            it('should call DB.collection', (done) => {
                var fakeDB = {collection: function() {}};
                var mock = sinon.mock(fakeDB);
                mock.expects('collection').once();
                myServerLib.handleLoadUserCampaigns(fakeReq, fakeRes, fakeSentry, fakeDB);
                mock.verify();
                done();
            });
        });

        describe('load env variables from MongoDB', () => {
            it('should call DB.collection', (done) => {
                var fakeDB = {collection: function() {}};
                    var fakeCain = {};
                    var mock = sinon.mock(fakeDB);
                    mock.expects('collection').once();
                    myServerLib.handleLoadEnv(fakeRes, fakeCain, fakeSentry, fakeDB);
                    mock.verify();
                    done();
            });
        });
        */
    });

    describe('Donate Fiat', () => {

    })
})