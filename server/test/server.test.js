const chai = require('chai');
const sinon = require('sinon');
const ServerLib = require("../serverLib");

const myServerLib = new ServerLib();

var expect = require('chai').expect




describe('Server unit tests', function () {

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

        const fakeRes = {sendStatus:function(){}};
        const fakeSentry = {captureException: function() {}};
        const fakeReqWithData = {user:{address:"someAddress"},body:{mydata}};
        
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
        
        describe('creating new campaign in mongo DB', () => {       
            it('should call DB.collection and insertOne', (done)=>{
                var myCollection = {insertOne: function(){}};
                var insertOneCalled = false;
                var fakeRes = {send: function(){}};
                var fakeDB = {collection: function(){}};
                var stub = sinon.stub(fakeDB, 'collection');
                stub.returns({insertOne: function(){}});
                var stub2 = sinon.stub(myCollection, 'insertOne');
                stub2.returns(insertOneCalled = true);
                var newWalletId = '000000001';
                expect(myServerLib.handleAddCampaign(fakeReqWithData, fakeRes, fakeSentry, fakeDB, newWalletId))
                    .to.be.a('Promise');
                expect(insertOneCalled).to.be.equal(true);
                done();
            });
        });
        
        describe('updating campaign in mongoDB', () => {
            it('should call DB.collection and findOne', (done) => {
                var myCollection = {findOne: function(){}};
                var findOneCalled = false;
                var fakeDB = {collection: function() {}};
                var stub = sinon.stub(fakeDB, 'collection');
                stub.returns({findOne: function(){ }});
                var stub2 = sinon.stub(myCollection, 'findOne');
                stub2.returns(findOneCalled = true);
                expect(myServerLib.handleUpdateCampaign(fakeReqWithData, fakeRes, fakeSentry, fakeDB))
                    .to.be.a('Promise');
                expect(findOneCalled).to.be.equal(true);
                done();
            });
        });
        
        describe('deactivating campaign in mongoDB', () => {
            it('should call DB.collection and findOne', (done) => {
                var myCollection = {findOne: function(){}};
                var findOneCalled = false;
                var fakeDB = {collection: function() {}};
                var stub = sinon.stub(fakeDB, 'collection');
                stub.returns({findOne: function(){ }});
                var stub2 = sinon.stub(myCollection, 'findOne');
                stub2.returns(findOneCalled = true);
                expect(myServerLib.handleDeactivateCampaign(fakeReqWithData, fakeRes, fakeSentry, fakeDB))
                    .to.be.a('Promise');
                expect(findOneCalled).to.be.equal(true);
                done();
            });
        }); 
        
        describe('load all campaigns from MongoDB', () => {
            it('should call DB.collection and find', (done) => {
                var myCollection = {find: function(){}};
                var findCalled = false;
                var fakeDB = {collection: function(){}};
                var stub = sinon.stub(fakeDB, 'collection');
                stub.returns({find: function(){ }});
                var stub2 = sinon.stub(myCollection, 'find');
                stub2.returns(findCalled = true);
                expect(myServerLib.handleLoadAllCampaigns(fakeReqWithData, fakeRes, fakeSentry, fakeDB))
                    .to.be.a('Promise');
                expect(findCalled).to.be.equal(true);
                done();
            });
        });
        
        describe('load one campaign from MongoDB', () => {
            it('should call DB.collection and findOne', (done) => {
                var myCollection = {findOne: function(){}};
                var findOneCalled = false;
                var fakeDB = {collection: function() {}};
                var stub = sinon.stub(fakeDB, 'collection');
                stub.returns({findOne: function(){ }});
                var stub2 = sinon.stub(myCollection, 'findOne');
                stub2.returns(findOneCalled = true);
                expect(myServerLib.handleLoadOneCampaign(fakeReqWithData, fakeRes, fakeSentry, fakeDB))
                    .to.be.a('Promise');
                expect(findOneCalled).to.be.equal(true);
                done();
            });
        });

        describe('load user campaigns from MongoDB', () => {
            it('should call DB.collection and find', (done) => {
                var myCollection = {find: function(){}};
                var findCalled = false;
                var fakeDB = {collection: function() {}};
                var stub = sinon.stub(fakeDB, 'collection');
                stub.returns({find: function(){ }});
                var stub2 = sinon.stub(myCollection, 'find');
                stub2.returns(findCalled = true);
                expect(myServerLib.handleLoadUserCampaigns(fakeReqWithData, fakeRes, fakeSentry, fakeDB))
                    .to.be.a('Promise');
                expect(findCalled).to.be.equal(true);
                done();
            });
        });

        describe('load env variables from MongoDB', () => {
            it('should call DB.collection and find', (done) => {
                var fakeChain = {};
                var myCollection = {find: function(){}};
                var findCalled = false;
                var fakeDB = {collection: function() {}};
                var stub = sinon.stub(fakeDB, 'collection');
                stub.returns({find: function(){ }});
                var stub2 = sinon.stub(myCollection, 'find');
                stub2.returns(findCalled = true);
                expect(myServerLib.handleLoadEnv(fakeRes, fakeChain, fakeSentry, fakeDB))
                    .to.be.a('Promise');
                expect(findCalled).to.be.equal(true);
                done();
            });
        });

        describe('create payment record in MongoDB', () => {
            it('should call DB.collection and find', (done) => {
                var fakeData = {};
                var fakeCLIENT = {db: function(){}};
                var DBNAME = 'database';
                var myCollection = {insertOne: function(){}};
                var insertOneCalled = false;
                var fakeDB = {collection: function(){}};
                var stub1 = sinon.stub(fakeCLIENT, 'db');
                stub1.returns({collection: function(){}})
                var stub = sinon.stub(fakeDB, 'collection');
                stub.returns({insertOne: function(){}});
                var stub2 = sinon.stub(myCollection, 'insertOne');
                stub2.returns(insertOneCalled = true);
                expect(myServerLib.createPaymentRecord(fakeData, fakeCLIENT, DBNAME, fakeSentry))
                    .to.be.a('Promise');
                expect(insertOneCalled).to.be.equal(true);
                done();
            });
        });

        describe('update payment record in MongoDB', () => {
            it('should call DB.collection and updateOne', (done) => {
                var fakeData = {};
                var fakeCLIENT = {db: function(){}};
                var DBNAME = 'database';
                var myCollection = {updateOne: function(){}};
                var updateOneCalled = false;
                var fakeDB = {collection: function(){}};
                var stub1 = sinon.stub(fakeCLIENT, 'db');
                stub1.returns({collection: function(){}})
                var stub = sinon.stub(fakeDB, 'collection');
                stub.returns({updateOne: function(){}});
                var stub2 = sinon.stub(myCollection, 'updateOne');
                stub2.returns(updateOneCalled = true);
                expect(myServerLib.createPaymentRecord(fakeData, fakeCLIENT, DBNAME, fakeSentry))
                    .to.be.a('Promise');
                expect(updateOneCalled).to.be.equal(true);
                done();
            });
        });       
    });
})