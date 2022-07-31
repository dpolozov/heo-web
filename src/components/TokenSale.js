import React, { useState } from 'react';
import config from "react-global-configuration";
import { Container, Form, Row, Col, Button, Modal } from 'react-bootstrap';
import { CheckCircle, ExclamationTriangle, HourglassSplit, XCircle} from 'react-bootstrap-icons';
import { Trans } from 'react-i18next';

import { initWeb3, initWeb3Modal, clearWeb3Provider } from '../util/Utilities';
import bnbIcon from '../images/binance-coin-bnb-logo.png';
import busdIcon from '../images/binance-usd-busd-logo.png';
import heoIcon from '../images/heo-logo.png';

import '../css/tokensale.css';
import '../css/modal.css';

var ERC20Coin, HEOPriceOracle, HEOSale, currencyInstance;
const IMG_MAP = {BUSD: busdIcon, BNB: bnbIcon, HEO: heoIcon};

class TokenSale extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            chain:"bsctest",
            showLoader:false,
            loaderMessage:"Please wait",
            showError:false,
            showModal:false,
            modalMessage:"",
            errorMessage:"",
            heoPrice:"",
            currencyAddress:"",
            currencyName:"",
            amount:0,
            unsoldHeo:"",
            minInvestment: "",
            cost:0,
            myInvestments:[]
        };
    }

    handleAmountChange = (e) => {this.setState({amount: e.target.value})};

    handleBuy = async (event, target) => {
        try {
            await initWeb3Modal(this.state.chain);
            if (!this.state.web3 || !this.state.accounts) {
                await initWeb3(this.state.chain, this);
            }
            var web3 = this.state.web3;
            var toPay = web3.utils.toWei(this.state.amount+"");
            var accounts = this.state.accounts;
            var that = this;
            this.setState({
                showModal: true, modalTitle: 'processingWait',
                modalMessage: "approveSpend",
                errorIcon: 'HourglassSplit', modalButtonVariant: "#E63C36", waitToClose: false,
                modalButtonMessage: 'abortBtn',
            });
            try {
                if(window.web3Modal.cachedProvider != "injected") {
                    // Binance Chain Extension Wallet does not support network events
                    // so we have to poll for transaction status instead of using
                    // event listeners and promises.
                    currencyInstance.methods.approve(that.state.saleContractAddress, toPay).send(
                        {from:accounts[0]}
                    ).once('transactionHash', function(transactionHash) {
                        that.setState({modalMessage: "waitingForNetwork"});
                        web3.eth.getTransaction(transactionHash).then(
                            function(txnObject) {
                                if(txnObject) {
                                    setTimeout(checkApprovalTransaction, 1000, txnObject, that);
                                } else {
                                    console.log(`getTransaction returned null. Using transaction hash`);
                                    setTimeout(checkApprovalTransaction, 1000, {hash:transactionHash}, that);
                                }
                            }
                        );
                    }).on('error', function(error) {
                        that.setState({
                            showModal: true, modalTitle: 'failed',
                            errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                            modalButtonVariant: '#E63C36', waitToClose: false,
                            modalMessage: 'blockChainTransactionFailed'
                        });
                        //clearWeb3Provider(that)
                        console.log('error handler invoked in approval transaction')
                        console.log(error);
                    });
                } else {
                    console.log(`Using provider ${window.web3Modal.cachedProvider}`);
                    let result = await currencyInstance.methods.approve(that.state.saleContractAddress, toPay).send(
                        {from:accounts[0]}
                    ).once('transactionHash', function(transactionHash) {
                        that.setState({modalMessage: "waitingForNetwork"})
                    });
                    console.log('Approved spending');
                    this.setState({
                        showModal: true, modalTitle: 'processingWait',
                        modalMessage: "approveInvest",
                        errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
                    });
                    result = await HEOSale.methods.sell(toPay).send(
                        {from:accounts[0]}
                    ).once('transactionHash', function(transactionHash) {
                        console.log(`transaction hash for sell ${transactionHash}`);
                        that.setState({modalMessage: "waitingForNetwork"})
                    });
                    console.log(`Done with transactions`);

                    this.setState({
                        showModal: true, modalTitle: 'complete',
                        modalMessage: 'thankYouInvestor',
                        errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                        modalButtonVariant: '#588157', waitToClose: false
                    });
                }

            } catch (err) {
                this.setState({
                    showModal: true, modalTitle: 'failed',
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false,
                    modalMessage: 'blockChainTransactionFailed'
                });
                clearWeb3Provider(this)
                console.log(err);
            }
        } catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'failed',
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false,
                modalMessage: 'blockChainConnectFailed'
            });
        }
    }
    render() {
        return (
            <div>
                <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' centered>
                    <Modal.Body><p className='errorIcon'>
                        {this.state.errorIcon == 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.errorIcon == 'ExclamationTriangle' && <ExclamationTriangle style={{color: '#E63C36'}}/>}
                        {this.state.errorIcon == 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.errorIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                    </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle} /></p>
                        <p className='modalMessage'>
                            <Trans i18nKey={this.state.modalMessage}
                                   values={{amount: this.state.amount, currencyName: this.state.currencyName }} />
                        </p>
                        {!this.state.waitToClose &&
                        <Button className='myModalButton'
                                style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                                onClick={ () => {
                                    if(this.state.onModalClose) {
                                        this.state.onModalClose();
                                    }
                                    this.setState({showModal: false, onModalClose: false});
                                }
                                }>
                            <Trans i18nKey={this.state.modalButtonMessage} />
                        </Button>
                        }
                    </Modal.Body>
                </Modal>
                <Container id='mainContainer'>
                    <Row id={"topRow"}>
                        <h1>Current price of <img src={IMG_MAP["HEO"]} width={20} height={20} style={{marginRight:5}} />HEO token {this.state.heoPrice} <img src={IMG_MAP[this.state.currencyName]} width={20} height={20} style={{marginRight:5}} /> {this.state.currencyName}</h1>
                        <h2><img src={IMG_MAP["HEO"]} width={20} height={20} style={{marginRight:5}} />HEO tokens available for sale at this price: {this.state.unsoldHeo}</h2>
                        <h2>Minimum investment amount: {this.state.minInvestment} <img src={IMG_MAP[this.state.currencyName]} width={18} height={18} style={{marginRight:5}} /> {this.state.currencyName}</h2>
                    </Row>
                    <Row id={"buyRow"}>
                        <Form>
                            <Form.Group as={Row} className="mb-3" >
                                <Form.Label  column>Amount in {this.state.currencyName}:</Form.Label>
                                <Col>
                                    <Form.Control id='amount' value={this.state.amount} onChange={this.handleAmountChange} />
                                </Col>
                                <Col>
                                    <Button id='buyButton' onClick={this.handleBuy}>Invest <img src={IMG_MAP[this.state.currencyName]} width={16} height={16} style={{marginRight:5}} /></Button>
                                </Col>
                            </Form.Group>
                        </Form>
                    </Row>
                    <Row id={"investmentsHeaderRow"}>
                     <h2>Your investments (account: {(this.state.accountAddress + "").substring(0, 5)}...{(this.state.accountAddress + "").substring(38, 43)})</h2>
                    </Row>
                    <Row id={"tableHeaderRow"}><Col>Date</Col><Col>Amount paid</Col><Col>HEO purchased</Col><Col>HEO Vested</Col><Col>HEO Claimed</Col></Row>
                    {this.state.myInvestments.map((item, i) =>
                        <Row style={{marginBottom: '20px'}} key={i}>
                            <Col>{new Date(item.ts * 1000).toLocaleString()}</Col>
                            <Col>{item.amnt} <img src={IMG_MAP[this.state.currencyName]} width={16} height={16} style={{marginRight:5}} /></Col>
                            <Col>{item.heo} <img src={IMG_MAP["HEO"]} width={18} height={18} style={{marginRight:5}} /></Col>
                            <Col>{item.vested}</Col>
                            <Col>{item.claimed}</Col>
                        </Row>
                    )}
                </Container>
            </div>
        );
    }
    async loadInvestments() {
        console.log("loading investments");
        let myInvestments = await HEOSale.methods.investorsSales(this.state.accountAddress).call();
        var investments = [];
        var web3 = this.state.web3;
        for(var i in myInvestments) {
            console.log(`Loading myInvestments[i]`);
            let saleTs = await await HEOSale.methods.saleTS(myInvestments[i]).call();
            let amountPaid = await web3.utils.fromWei(await HEOSale.methods.saleAmount(myInvestments[i]).call());
            let saleEquity = await web3.utils.fromWei(await HEOSale.methods.saleEquity(myInvestments[i]).call());
            let vestedEquity = await web3.utils.fromWei(await HEOSale.methods.vestedEquity(myInvestments[i]).call());
            let claimedEquity = await web3.utils.fromWei(await HEOSale.methods.claimedEquity(myInvestments[i]).call());
            investments.push({ts: saleTs, amnt: amountPaid, heo: saleEquity, vested: vestedEquity, claimed: claimedEquity});
        }
        this.setState({myInvestments:investments})
    }

    async componentDidMount() {
        var chain = config.get("CHAIN");
        await initWeb3Modal(chain);
        if(!this.state.web3 || !this.state.accounts) {
            await initWeb3(chain, this);
        }
        var web3 = this.state.web3;
        var accounts = this.state.accounts;

        console.log(`Configured for ${config.get("CHAIN")}`);
        var abi = (await import("../remote/" + config.get("CHAIN") + "/HEOPriceOracle")).abi;
        var address = (await import("../remote/" + config.get("CHAIN") + "/HEOPriceOracle")).address;
        HEOPriceOracle = new this.state.web3.eth.Contract(abi, address);

        var HEOSaleAbi = (await import("../remote/" + config.get("CHAIN") + "/HEOSale")).abi;
        var HEOSaleAddress = (await import("../remote/" + config.get("CHAIN") + "/HEOSale")).address;
        HEOSale = new this.state.web3.eth.Contract(HEOSaleAbi, HEOSaleAddress);
        ERC20Coin = (await import("../remote/"+ config.get("CHAIN") + "/ERC20")).default;

        let _currencyAddress = (await HEOSale.methods.acceptedToken().call()).toLowerCase();
        let priceObject = await HEOPriceOracle.methods.getPrice(_currencyAddress).call();
        console.log(`Token price ${priceObject.price} / ${priceObject.decimals}`);
        console.log(priceObject);
        let _heoPrice = priceObject.price/priceObject.decimals;
        currencyInstance = new web3.eth.Contract(ERC20Coin, _currencyAddress);

        let _currencyName = await currencyInstance.methods.symbol().call();
        let _unsoldHeo = await web3.utils.fromWei(await HEOSale.methods.unsoldBalance().call());
        let _minInvestment = await web3.utils.fromWei(await HEOSale.methods.minInvestment().call());
        this.setState({
            chain: chain,
            currencyAddress: _currencyAddress,
            heoPrice: _heoPrice,
            currencyName: _currencyName,
            unsoldHeo: _unsoldHeo,
            minInvestment: _minInvestment,
            accountAddress:accounts[0],
            saleContractAddress:HEOSaleAddress});
        this.loadInvestments();
    }
}

function checkSellTransaction(txnObject, that) {
    if(txnObject.blockNumber) {
        console.log(`Sale transaction successful in block ${txnObject.blockNumber}`);
        let accounts = that.state.accounts;
        let web3 = that.state.web3;
        that.setState({
            showModal: true, modalTitle: 'complete',
            modalMessage: 'thankYouInvestor',
            errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
            modalButtonVariant: '#588157', waitToClose: false
        });
        that.loadInvestments();
    } else {
        that.state.web3.eth.getTransaction(txnObject.hash).then(function(txnObject2) {
            if(txnObject2) {
                setTimeout(checkSellTransaction, 3000, txnObject2, that);
            } else {
                console.log(`Empty txnObject2. Using transaction hash to check status.`);
                setTimeout(checkSellTransaction, 3000, {hash:txnObject.hash}, that);
            }
        });
    }
}

function checkApprovalTransaction(txnObject, that) {
    if(txnObject && txnObject.blockNumber) {
        //successful, can make the sale now
        let web3 = that.state.web3;
        let accounts = that.state.accounts;
        let toPay = web3.utils.toWei(that.state.amount+"");
        that.setState({
            showModal: true, modalTitle: 'processingWait',
            modalMessage: "approveInvest",
            errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
        });
        HEOSale.methods.sell(toPay).send(
            {from:accounts[0]}
        ).once('transactionHash', function(transactionHash) {
            console.log(`Got sell transaction hash ${transactionHash}`);
            web3.eth.getTransaction(transactionHash).then(
                function(txnObject2) {
                    if(txnObject2) {
                        checkSellTransaction(txnObject2, that);
                    } else {
                        console.log(`Empty txnObject2. Using transaction hash to check sale transaction status.`);
                        checkSellTransaction({hash:transactionHash}, that);
                    }
                }
            );
        }).on('error', function(error) {
            that.setState({
                showModal: true, modalTitle: 'failed',
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false,
                modalMessage: 'blockChainTransactionFailed'
            });
            //clearWeb3Provider(that)
            console.log('error handler invoked in checkApprovalTransaction')
            console.log(error);
        })
    } else {
        if(txnObject) {
            that.state.web3.eth.getTransaction(txnObject.hash).then(function(txnObject2) {
                if(txnObject2) {
                    console.log(`Got updated txnObject for approval transaction`);
                    setTimeout(checkApprovalTransaction, 3000, txnObject2, that);
                } else {
                    console.log(`txnObject2 is null. Using txnObject with transaction hash`);
                    setTimeout(checkApprovalTransaction, 3000, txnObject, that);
                }
            });
        } else {
            console.log(`txnObject is null`);
            that.setState({
                showModal: true, modalTitle: 'failed',
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false,
                modalMessage: 'blockChainTransactionFailed'
            });
        }
    }
}

export default TokenSale;
