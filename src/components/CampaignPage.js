import React, {Component} from 'react';
import config from "react-global-configuration";
import axios from 'axios';
import { Container, Row, Col, ProgressBar, Button, DropdownButton, Dropdown, Modal, Image, InputGroup, FormControl } from 'react-bootstrap';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle} from 'react-bootstrap-icons';
import ReactPlayer from 'react-player';
import { Link } from "react-router-dom";
import { Trans } from 'react-i18next';
import {
    i18nString,
    initWeb3,
    initWeb3Modal,
    clearWeb3Provider,
    encryptCardData,
    getPCIPublicKey
} from '../util/Utilities';
import i18n from '../util/i18n';
import { Editor, EditorState, convertFromRaw, CompositeDecorator } from "draft-js";
import '../css/campaignPage.css';
import '../css/modal.css';
import ReactGA from "react-ga4";

import bnbIcon from '../images/binance-coin-bnb-logo.png';
import busdIcon from '../images/binance-usd-busd-logo.png';
import usdcIcon from '../images/usd-coin-usdc-logo.png';
import ethIcon from '../images/eth-diamond-purple.png';
import cusdIcon from '../images/cusd-celo-logo.png';
import btcLogo from '../images/bitcoin-logo.png';
import daiLogo from '../images/dai-logo.png';
import ltcLogo from '../images/ltc-logo.png'
import coinBaseLogo from '../images/coinbase-c-logo.png';
import CCData from '../components/CCData';

const IMG_MAP = {"BUSD": busdIcon,
    "BNB": bnbIcon,
    "USDC": usdcIcon,
    "ETH": ethIcon,
    "cUSD": cusdIcon};

const PAYMENT_ERROR_MESSAGES = {
    declined: "cardPaymentDeclined",
    payment_stopped_by_issuer: "cardPaymentFailed_payment_stopped_by_issuer",
    payment_fraud_detected: "cardPaymentFailed_payment_fraud_detected",
    payment_denied: "cardPaymentFailed_payment_denied",
    card_limit_violated: "cardPaymentFailed_card_limit_violated",
    card_invalid: "cardPaymentFailed_card_invalid",
    payment_not_funded: "cardPaymentFailed_payment_not_funded",
    payment_not_supported_by_issuer: "cardPaymentFailed_payment_not_supported_by_issuer",
    card_not_honored: "cardPaymentFailed_card_not_honored",
    thankyou: "thankYouDonation"
};

const CC_INFO_FIELDS_ERRORS = {
    name: 'checkCCName',
    number: 'checkCCNumber',
    expMonth: 'checkCCExpMonth',
    expYear: 'checkCCExpYear',
    cvv: 'checkCCcvv',
    email: 'checkCCemail',
    line1: 'checkCCstreet',
    line2: 'checkCCstreet2',
    city: 'checkCCcity',
    country: 'checkCCcountry',
    district: 'checkCCdistrict',
    postalCode: 'checkCCpostalCode',
    phoneNumber: 'checkCCphoneNumber',
    default: 'checkCCdefault'
}

ReactGA.initialize("G-C657WZY5VT");
var HEOCampaign, ERC20Coin;

class CampaignPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editorState: EditorState.createEmpty(),
            donationAmount:"10",
            campaign:{},
            campaignId: "",
            waitToClose:false,
            raisedAmount:0,
            showModal: false,
            showCoinbaseModal: false,
            modalMessage:"",
            modalTitle:"",
            errorIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
            chainId:"",
            chains:[],
            coins:[],
            ccinfo:{},
            showCCinfoModal: false,
            tryAgainCC: false,
            fiatPaymentEnabled: false,
            fiatPaymentProvider: ''
        };
        this.handleGetCCInfo = this.handleGetCCInfo.bind(this);
        this.handleCCInfoCancel = this.handleCCInfoCancel.bind(this);
    }
    async handleGetCCInfo(info) {
        await this.setState({ccinfo : info});
        this.handleDonateFiat();
    }
    handleCCInfoCancel() {
        this.setState({showCCinfoModal : false});
    }

    handleDonationAmount = (e) => {this.setState({donationAmount: e.target.value})};

    async getCampaign(address) {
        var campaign = {};
        var modalMessage = 'failedToLoadCampaign';
        let data = {ID : address};
        await axios.post('/api/campaign/loadOne', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            campaign = res.data;
        }).catch(err => {
            if (err.response) {
                modalMessage = 'technicalDifficulties'}
            else if(err.request) {
                modalMessage = 'checkYourConnection'
            }
            console.log(err);
            this.setState({
                showError: true,
                modalMessage,
            })
        })
        if(campaign.raisedAmount || campaign.raisedOnCoinbase) {
            campaign.raisedAmount = Math.round((campaign.raisedAmount + campaign.raisedOnCoinbase) * 100)/100;
        }
        return campaign;
    }

    updateRaisedAmount = async (accounts, campaignInstance, web3, decimals) => {
        var campaign = this.state.campaign;
        var that = this;
        campaignInstance.methods.raisedAmount().call({from:accounts[0]}, function(err, result) {
            if(!err) {
                if(decimals == 18) {
                    campaign.raisedAmount = parseFloat(web3.utils.fromWei(result));
                } else {
                    campaign.raisedAmount = parseFloat(result/Math.pow(10, decimals));
                }
                that.setState({campaign:campaign});
            } else {
                console.log("Failed to update raised amount.")
                console.log(err);
            }
        });
    }

    handleDonateFiat = async () => {
        //TODO: check that this.state.donationAmount is larger than 0
        let cardKeyData, encryptedCardData, encryptedSecurityData;
        if(this.state.fiatPaymentProvider === 'circle') {
            cardKeyData = await getPCIPublicKey();
            encryptedCardData = await encryptCardData(cardKeyData, {number:this.state.ccinfo.number, cvv:this.state.ccinfo.cvc});
            encryptedSecurityData = await encryptCardData(cardKeyData, {cvv:this.state.ccinfo.cvc});
        } else if (this.state.fiatPaymentProvider ==='payadmit') {
            cardKeyData = ''
            encryptedCardData = this.state.ccinfo.number;
            encryptedSecurityData = this.state.ccinfo.cvc;
        }
        let data = {
            billingDetails: {
                city: this.state.ccinfo.city,
                country: this.state.ccinfo.country,
                district: this.state.ccinfo.district,
                line1: this.state.ccinfo.line1,
                line2: this.state.ccinfo.line2,
                name: this.state.ccinfo.name,
                postalCode: this.state.ccinfo.postalCode
            },
            keyId: cardKeyData.keyId,
            encryptedCardData: encryptedCardData,
            encryptedSecurityData: encryptedSecurityData,
            expMonth: this.state.ccinfo.expMonth,
            expYear: this.state.ccinfo.expYear,
            email: this.state.ccinfo.email,
            phoneNumber: this.state.ccinfo.phoneNumber,
            amount: this.state.donationAmount,
            currency: this.state.ccinfo.currency,
            verification: this.state.ccinfo.verification,
            campaignId: this.state.campaignId,
            walletId: this.state.campaign.walletId
        };
        try {
            this.setState({
                showModal: true, modalTitle: 'processingWait',
                modalMessage: "plzWait",
                errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
            });
            let resp = await axios.post('/api/donatefiat', data, {headers: {"Content-Type": "application/json"}});
            if(resp.data.paymentStatus === 'action_required') {
                this.setState({showModal: false});
                window.open(resp.data.redirectUrl, '_self');
            } else if(resp.data.paymentStatus === "success") {
                this.setState({
                    showModal: true, modalTitle: 'complete',
                    modalMessage: 'thankYouDonation',
                    errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#588157', waitToClose: false, tryAgainCC: false, ccinfo: {}
                });
            } else {
                this.setState({
                    showModal: true, modalTitle: 'failed', modalMessage: PAYMENT_ERROR_MESSAGES[resp.data.paymentStatus],
                    errorIcon: 'XCircle', modalButtonMessage: 'tryAgain',
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: true
                });
                this.setState(prevState => ({
                    ccinfo: {
                        ...prevState.ccinfo,
                        ccError : PAYMENT_ERROR_MESSAGES[resp.data.paymentStatus]
                    }
                }));
            }
        } catch (err) {
            if (err.response.status === 503) {
                this.setState({
                    showModal: true, modalTitle: 'failed',
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalMessage: err.response.data,
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: false
                });
                return;
            }
            let errorFound = false;
            console.log(err.response)
            if(err.response.data.paymentStatus){
                Object.keys(CC_INFO_FIELDS_ERRORS).every((key)=>{
                    if(err.response.data.paymentStatus.message.includes(key)) {
                        this.setState({modalMessage: CC_INFO_FIELDS_ERRORS[key]});
                        this.setState(prevState => ({
                            ccinfo: {
                                ...prevState.ccinfo,
                                ccError: CC_INFO_FIELDS_ERRORS[key],
                                ccErrorType: `${key}Input`
                            }
                        }));
                        errorFound = true;
                        return false;
                    }
                    return true;
                })
            }
            this.setState({
                showModal: true, modalTitle: 'failed',
                errorIcon: 'XCircle', modalButtonMessage: 'tryAgain',
                modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: true
            });
            if(!errorFound) {
                this.setState(prevState => ({
                    ccinfo: {
                        ...prevState.ccinfo,
                        ccError: CC_INFO_FIELDS_ERRORS['default'],
                        ccErrorType: 'default'
                    }
                }));
            }
        }
    }

    showCoinbaseCommerce = async() => {
        this.setState({showCoinbaseModal: true});
    }

    handleDonateClick = async (chainId) => {
        //TODO: check that this.state.donationAmount is larger than 0
        try {
            await clearWeb3Provider(this);
            await initWeb3Modal(chainId);
            await initWeb3(chainId, this);
            var web3 = this.state.web3;
            var accounts = this.state.accounts;
            var currentProvider = "";
            if(web3.currentProvider && web3.currentProvider.isMetaMask) {
                currentProvider = "metamask";
            } else if(web3.currentProvider && web3.currentProvider.isWalletConnect) {
                currentProvider = "walletconnect";
            }
            HEOCampaign = (await import("../remote/"+ chainId + "/HEOCampaign")).default;
            var campaignAddress = this.state.campaign.addresses[chainId];
            var campaignInstance = new web3.eth.Contract(HEOCampaign, campaignAddress);
            var coinAddress = (await campaignInstance.methods.currency().call()).toLowerCase();
            var toDonate = web3.utils.toWei(this.state.donationAmount);
            ReactGA.event({
                category: "donation",
                action: "donate_button_click",
                value: parseInt(this.state.donationAmount), // optional, must be a number
                nonInteraction: false
            });
            //check if donating to oneself
            if(accounts[0].toLowerCase() == this.state.campaign.beneficiaryId.toLowerCase()) {
                this.setState({
                    showModal: true, modalTitle: 'notAllowed',
                    modalMessage: 'donateToYourSelf',
                    errorIcon: 'ExclamationTriangle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false
                });
                ReactGA.event({
                    category: "donation",
                    action: "self_donation_blocked",
                    nonInteraction: false
                });
                return;
            }

            var that = this;
            //for native donations
            if(coinAddress === "0x0000000000000000000000000000000000000000") {
                this.setState({
                    showModal: true, modalTitle: 'processingWait',
                    modalMessage: "confirmDonation",
                    errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
                });
                if(currentProvider !== "metamask" && currentProvider !== "injected") {
                    // Binance Chain Extension Wallet does not support network events
                    // so we have to poll for transaction status instead of using
                    // event listeners and promises.
                    try {
                        campaignInstance.methods.donateNative().send(
                            {from:accounts[0], value:(""+toDonate)}
                        ).once('transactionHash', function(transactionHash) {
                            that.setState({modalMessage: "waitingForNetwork"});
                            web3.eth.getTransaction(transactionHash).then(
                                function(txnObject) {
                                    if(txnObject) {
                                        checkDonationTransaction(txnObject, decimals, chainId, that);
                                    } else {
                                        checkDonationTransaction({hash:transactionHash}, decimals, chainId, that);
                                    }
                                }
                            );
                        });
                    } catch (err) {
                        this.setState({
                            showModal: true, modalTitle: 'failed', modalMessage: 'blockChainTransactionFailed',
                            errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                            modalButtonVariant: '#E63C36', waitToClose: false
                        });
                        console.log(err);
                    }
                } else {
                    try {
                        await campaignInstance.methods.donateNative().send(
                            {from:accounts[0], value:(""+toDonate)}
                        ).once('transactionHash', function(transactionHash) {
                            that.setState({modalMessage: "waitingForNetwork"})
                        });
                        await this.updateRaisedAmount(accounts, campaignInstance, web3, 18);
                        this.setState({
                            showModal: true, modalTitle: 'complete',
                            modalMessage: 'thankYouDonation',
                            errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                            modalButtonVariant: '#588157', waitToClose: false
                        });
                    } catch (err) {
                        this.setState({
                            showModal: true, modalTitle: 'failed', modalMessage: 'blockChainTransactionFailed',
                            errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                            modalButtonVariant: '#E63C36', waitToClose: false
                        });
                        console.log("donateNative transaction failed");
                        console.log(err);
                    }
                }
            } else {
                //for ERC20 donations
                ERC20Coin = (await import("../remote/"+ chainId + "/ERC20")).default;
                var coinInstance = new web3.eth.Contract(ERC20Coin, coinAddress);
                this.setState({
                    showModal: true, modalTitle: 'processingWait',
                    modalMessage: "approveSpend",
                    errorIcon: 'HourglassSplit', modalButtonVariant: "#E63C36", waitToClose: false,
                    modalButtonMessage: 'abortBtn',
                });

                try {
                    var decimals = 6;
                    var toDonate = new web3.utils.BN(""+this.state.donationAmount).mul(new web3.utils.BN("1000000"));
                    if(currentProvider != "metamask") {
                        ReactGA.event({
                            category: "provider",
                            action: "using_noninjected_provider",
                            label: window.web3Modal.cachedProvider,
                            nonInteraction: false
                        });
                        // Binance Chain Extension Wallet does not support network events
                        // so we have to poll for transaction status instead of using
                        // event listeners and promises.
                        console.log(`Using provider ${currentProvider}`);
                        coinInstance.methods.decimals().call({from:accounts[0]}, function(err, result) {
                            if(err) {
                                console.log(`Failed to fetch decimals from ${coinAddress} `);
                                console.log(err);
                            } else {
                                decimals = result;
                                console.log(`${coinAddress} has ${result} decimals`);
                                toDonate = new web3.utils.BN(""+that.state.donationAmount).mul(new web3.utils.BN(new web3.utils.BN("10").pow(new web3.utils.BN(""+decimals))));
                                console.log(`Adjusted donation amount is ${toDonate.toString()}`);
                            }
                            coinInstance.methods.approve(campaignAddress, ""+toDonate.toString()).send(
                                {from:accounts[0]}
                            ).once('transactionHash', function(transactionHash) {
                                that.setState({modalMessage: "waitingForNetwork"});
                                web3.eth.getTransaction(transactionHash).then(
                                    function(txnObject) {
                                        if(txnObject) {
                                            checkApprovalTransaction(txnObject, decimals, chainId, that);
                                        } else {
                                            console.log(`getTransaction returned null. Using transaction hash`);
                                            checkApprovalTransaction({hash:transactionHash}, decimals, chainId, that);
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
                                ReactGA.event({
                                    category: "error",
                                    action: "donateerc20_approval_error",
                                    label: error, // optional, must be a number
                                    nonInteraction: false
                                });
                            });
                        });
                    } else {
                        console.log(`Using provider ${currentProvider}`);
                        ReactGA.event({
                            category: "provider",
                            action: "using_injected_provider",
                            label: window.web3Modal.cachedProvider, // optional, must be a number
                            nonInteraction: false
                        });
                        decimals = await coinInstance.methods.decimals().call();
                        toDonate = new web3.utils.BN(""+that.state.donationAmount).mul(new web3.utils.BN(new web3.utils.BN("10").pow(new web3.utils.BN(""+decimals))));

                        let result = await coinInstance.methods.approve(campaignAddress, ""+toDonate).send(
                            {from:accounts[0]}
                        ).once('transactionHash', function(transactionHash) {
                            that.setState({modalMessage: "waitingForNetwork"})
                        });
                        console.log('Approved spending');
                        ReactGA.event({
                            category: "donation",
                            action: "approval_succeeded",
                            value: parseInt(this.state.donationAmount), // optional, must be a number
                            nonInteraction: false
                        });
                        this.setState({
                            showModal: true, modalTitle: 'processingWait',
                            modalMessage: "approveDonate",
                            errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
                        });
                        result = await campaignInstance.methods.donateERC20(""+toDonate).send(
                            {from:accounts[0]}
                        ).once('transactionHash', function(transactionHash) {
                            console.log(`transaction hash for donateERC20 ${transactionHash}`);
                            that.setState({modalMessage: "waitingForNetwork"})
                        });
                        console.log(`Done with transactions`);

                        if(result.code) {
                            this.setState({
                                showModal: true, modalTitle: 'failed',
                                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                                modalButtonVariant: '#E63C36', waitToClose: false,
                                modalMessage: 'blockChainTransactionFailed'
                            });
                            ReactGA.event({
                                category: "error",
                                action: "transaction_error",
                                label: `Metamask transaction failed with code ${result.code}`,
                                nonInteraction: false
                            });
                            clearWeb3Provider(this);
                            return;
                        }
                        await this.updateRaisedAmount(accounts, campaignInstance, web3, decimals);
                        this.setState({
                            showModal: true, modalTitle: 'complete',
                            modalMessage: 'thankYouDonation',
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
                    ReactGA.event({
                        category: "error",
                        action: "transaction_error",
                        label: (err && err.message ? err.message : "blockChainTransactionFailed"), // optional, must be a number
                        nonInteraction: false
                    });
                    clearWeb3Provider(this);
                    console.log(err);
                }
            }
        } catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'failed',
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false,
                modalMessage: 'blockChainConnectFailed'
            });
            ReactGA.event({
                category: "error",
                action: "transaction_error",
                label: (err && err.message ? err.message : "blockChainConnectFailed"), // optional, must be a number
                nonInteraction: false
            });
        }
    }

    onModalClose() {
        if(this.state.tryAgainCC) {
            this.setState({showCCinfoModal:true});
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
                                   values={{donationAmount: this.state.donationAmount, currencyName: this.state.campaign.currencyName }} />
                        </p>
                        {!this.state.waitToClose &&
                        <Button className='myModalButton'
                            style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                            onClick={ () => {
                                    this.onModalClose();
                                    this.setState({showModal: false, onModalClose: false});
                                    ReactGA.event({
                                        category: "button_click",
                                        action: "modal_closed",
                                        label: this.state.modalTitle, // optional, must be a number
                                        nonInteraction: false
                                    });
                                }
                            }>
                            <Trans i18nKey={this.state.modalButtonMessage} />
                        </Button>
                        }
                    </Modal.Body>
                </Modal>
                <Container className='backToCampaignsDiv'>
                    <p className='backToCampaigns'><Link className={"backToCampaignsLink"} to="/"><ChevronLeft id='backToCampaignsChevron'/><Trans i18nKey='backToCampaigns'/></Link></p>
                </Container>
                <Container id='mainContainer'>
                    {this.state.showCCinfoModal && <CCData handleCCInfoCancel = {this.handleCCInfoCancel} handleGetCCInfo = {this.handleGetCCInfo} currentCCInfo = {this.state.ccinfo}/>}
                    <Row id='topRow'>
                        <Col id='imgCol'>
                            <Image src={this.state.campaign.mainImageURL} id='mainImage'/>
                        </Col>
                        <Col id='infoCol'>
                            <Row id='titleRow'>
                                <p id='title'>{i18nString(this.state.campaign.title, i18n.language)}</p>
                            </Row>
                            <Row id='countryRow'><h2>{i18nString(this.state.campaign.org, i18n.language)}</h2></Row>
                            <Row id='progressRow'>
                                <p id='progressBarLabel'><span id='progressBarLabelStart'>&#36;{`${this.state.campaign.raisedAmount}`}</span>{i18n.t('raised')}&#36;{this.state.campaign.maxAmount} {i18n.t('goal')}</p>
                                <ProgressBar id='progressBar' now={this.state.campaign.percentRaised}/>
                            </Row>
                            <Row id='acceptingRow'>
                                <div id='acceptingDiv'>
                                    <p><Trans i18nKey='accepting'/>:
                                        {this.state.coins.map((item, i) =>
                                            <span className='coinRewardInfo'><img src={IMG_MAP[item]} width={20} height={20} style={{marginRight:5, marginLeft:5}} />{item} </span>
                                            )}
                                        {this.state.campaign.coinbaseCommerceURL && <span className='coinRewardInfo'><img src={ethIcon} width={20} height={20} style={{marginRight:5, marginLeft:5}} />ETH </span> }
                                        {this.state.campaign.coinbaseCommerceURL && <span className='coinRewardInfo'><img src={btcLogo} width={20} height={20} style={{marginRight:5, marginLeft:5}} />BTC </span> }
                                        {this.state.campaign.coinbaseCommerceURL && <span className='coinRewardInfo'><img src={daiLogo} width={20} height={20} style={{marginRight:5, marginLeft:5}} />DAI </span> }
                                        {this.state.campaign.coinbaseCommerceURL && <span className='coinRewardInfo'><img src={ltcLogo} width={20} height={20} style={{marginRight:5, marginLeft:5}} />LTC </span> }
                                    </p>
                                </div>
                            </Row>
                            <Row id='donateRow'>
                                <InputGroup className="mb-3">
                                    <FormControl
                                        id='donateAmount'
                                        value={this.state.donationAmount}
                                        onChange={this.handleDonationAmount}
                                        type="number"
                                    />
                                    <InputGroup.Append>
                                        <DropdownButton id='donateButton' title={i18n.t('donate')}>
                                            {this.state.fiatPaymentEnabled && <Dropdown.Item key="_fiat" as="button" onClick={() => this.setState({showCCinfoModal: true})}>Visa/MasterCard</Dropdown.Item> }
                                            {this.state.chains.map((item, i) =>
                                                    <Dropdown.Item key={item["CHAIN"]} as="button" onClick={() => this.handleDonateClick(item["CHAIN"])}><img src={IMG_MAP[this.state.campaign.coins[item["CHAIN"]].name]} width={16} height={16} style={{marginRight:5}} />{this.state.campaign.coins[item["CHAIN"]].name} ({item["CHAIN_NAME"]})</Dropdown.Item>
                                                )}
                                            {this.state.campaign.coinbaseCommerceURL &&
                                                <Dropdown.Item key="DonateCoinbaseCommerce" href={`${this.state.campaign.coinbaseCommerceURL}`} target="_blank"><img src={coinBaseLogo} width={16} height={16} style={{marginRight:5}} /><Trans i18nKey="otherCoinsCoinbase" /></Dropdown.Item>
                                            }
                                        </DropdownButton>

                                    </InputGroup.Append>
                                </InputGroup>
                            </Row>
                        </Col>
                    </Row>
                    <Row id='videoRow'>
                        <Container id='videoRowContainer'>
                            { this.state.campaign.vl && <ReactPlayer controls={true} url={this.state.campaign.vl} id='videoPlayer' />}
                        </Container>
                    </Row>
                    <Row id='descriptionRow'>
                        <Container>
                            <Editor editorState={this.state.editorState} readOnly={true} decorators={true}/>
                        </Container>
                    </Row>
                    {this.state.campaign.qrCodeImageURL &&
                    <Row>
                        <Image src={this.state.campaign.qrCodeImageURL} id='qrCodeImg'/>
                    </Row>
                    }
                </Container>
            </div>
        );
    }

    async componentDidMount() {
        window.scrollTo(0,0);
        let toks = this.props.location.pathname.split("/");
        let campaignId = toks[toks.length -1];
        let campaign = (await this.getCampaign(campaignId));
        if(!campaign) {
            this.props.history.push("/404");
            return;
        }
        campaign.percentRaised = 100 * (campaign.raisedAmount)/campaign.maxAmount;
        var contentState = {};
        if(campaign.descriptionEditor[i18n.language]) {
            for(var lng in campaign.descriptionEditor) {
                contentState[lng] = convertFromRaw(campaign.descriptionEditor[lng]);
            }
        } else if(campaign.descriptionEditor["default"]) {
            for(var lng in campaign.descriptionEditor) {
                contentState[lng] = convertFromRaw(campaign.descriptionEditor[lng]);
            }
            contentState[i18n.language] = convertFromRaw(campaign.descriptionEditor["default"]);
        } else {
            contentState[i18n.language] = convertFromRaw(campaign.descriptionEditor);
        }

        var that = this;
        i18n.on('languageChanged', function(lng) {
            if(contentState[lng]) {
                that.setState({
                    editorState: EditorState.createWithContent(contentState[lng], createDecorator())
                })
            }
        })
        let chains = [];
        let configChains = config.get("CHAINS");
        for(var ch in campaign.addresses) {
            if(configChains[ch]) {
                chains.push(configChains[ch]);
            }
        }
        let globals = config.get("GLOBALS");
        globals.forEach(element => {
            if(element._id === 'FIATPAYMENT') {
                this.setState({fiatPaymentEnabled: element.enabled});
                if(element.enabled) {
                    if(element.CIRCLE && !element.PAYADMIT) {
                        this.setState(({
                            fiatPaymentProvider: 'circle'
                        }));
                    } else if (!element.CIRCLE && element.PAYADMIT) {
                        this.setState(({
                            fiatPaymentProvider: 'payadmit'
                        }));
                    }
                }
            }
        });

        //dedupe coin names for "accepting" section
        let dedupedCoinNames = [];
        for(var coin in campaign.coins) {
            let coinName = campaign.coins[coin].name;
            if(!dedupedCoinNames.includes(coinName)) {
                dedupedCoinNames.push(coinName);
            }
        }

        this.setState({
            chains: chains,
            campaignId: campaignId,
            campaign : campaign,
            coins: dedupedCoinNames,
            editorState: EditorState.createWithContent(contentState[i18n.language], createDecorator())
        });

        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });

        const params = new Proxy(new URLSearchParams(window.location.search), {
            get: (searchParams, prop) => searchParams.get(prop),
        });

        if(params.fp) {
            if(params.fp === 's') {
                this.setState({
                    showModal: true, modalTitle: 'complete',
                    modalMessage: 'thankYouDonation',
                    errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#588157', waitToClose: false, tryAgainCC: false, ccinfo: {}
                });
            } else if(params.fp === 'f') {
                this.setState({
                    showModal: true, modalTitle: 'failed', modalMessage: 'failed3ds',
                    errorIcon: 'XCircle', modalButtonMessage: 'tryAgain',
                    modalButtonVariant: '#E63C36', waitToClose: false, tryAgainCC: true,
                    donationAmount: params.am
                });
            } else if(params.fp === 'pa') {
                let data = {refId : params.ref}
                let paymentDetails = await axios.post('/api/payadmit/getPaymentRecord', data, {headers: {"Content-Type": "application/json"}});
                console.log(paymentDetails);
                this.setState({
                    showModal: true, modalTitle: paymentDetails.data.title, modalMessage: PAYMENT_ERROR_MESSAGES[paymentDetails.data.errorMessage],
                    errorIcon: paymentDetails.data.errorIcon, modalButtonMessage: paymentDetails.data.modalButtonMessage,
                    modalButtonVariant: paymentDetails.data.modalButtonVariant, waitToClose: paymentDetails.data.waitToClose,
                    tryAgainCC: paymentDetails.data.tryAgainCC, donationAmount: params.am
                });
            }
        }
    }
}

function createDecorator() {
    const decorator = new CompositeDecorator([
        {
          strategy: findLinkEntities,
          component: editorLink,
        },
    ]);

    return decorator;
}

function findLinkEntities(contentBlock, callback, contentState) {
    contentBlock.findEntityRanges(
      (character) => {
        const entityKey = character.getEntity();
        return (
          entityKey !== null &&
          contentState.getEntity(entityKey).getType() === 'LINK'
        );
      },
      callback
    );
  }

  const editorLink = (props) => {
    const {url} = props.contentState.getEntity(props.entityKey).getData();
    return (
      <a href={url} target='_blank'>
        {props.children}
      </a>
    );
  };

function checkDonationTransaction(txnObject, decimals, chainId, that) {
    if(txnObject.blockNumber) {
        console.log(`Donation transaction successful in block ${txnObject.blockNumber}`);
        let accounts = that.state.accounts;
        let web3 = that.state.web3;

        let campaignInstance = new web3.eth.Contract(HEOCampaign, that.state.campaign.addresses[chainId]);
        that.updateRaisedAmount(accounts, campaignInstance, web3, decimals);
        that.setState({
            showModal: true, modalTitle: 'complete',
            modalMessage: 'thankYouDonation',
            errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
            modalButtonVariant: '#588157', waitToClose: false
        });
        ReactGA.event({
            category: "donation",
            action: "donation_succeeded",
            value: parseInt(that.state.donationAmount), // optional, must be a number
            nonInteraction: false
        });
    } else {
        that.state.web3.eth.getTransaction(txnObject.hash).then(function(txnObject2) {
            if(txnObject2) {
                setTimeout(checkDonationTransaction, 3000, txnObject2, decimals, chainId, that);
            } else {
                console.log(`Empty txnObject2. Using transaction hash to check status.`);
                setTimeout(checkDonationTransaction, 3000, {hash:txnObject.hash}, decimals, chainId, that);
            }
        });
    }
}

function checkApprovalTransaction(txnObject, decimals, chainId, that) {
    if(txnObject && txnObject.blockNumber) {
        //successful, can make a donation now
        let web3 = that.state.web3;
        let accounts = that.state.accounts;
        let campaignInstance = new web3.eth.Contract(HEOCampaign, that.state.campaign.addresses[chainId]);
        let toDonate = new web3.utils.BN(""+that.state.donationAmount).mul(new web3.utils.BN(new web3.utils.BN("10").pow(new web3.utils.BN(""+decimals))));
        //let toDonate = that.state.donationAmount * Math.pow(10, decimals);
        that.setState({
            showModal: true, modalTitle: 'processingWait',
            modalMessage: "approveDonate",
            errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
        });
        ReactGA.event({
            category: "donation",
            action: "approval_succeeded",
            value: parseInt(that.state.donationAmount), // optional, must be a number
            nonInteraction: false
        });
        campaignInstance.methods.donateERC20(""+toDonate).send(
            {from:accounts[0]}
        ).once('transactionHash', function(transactionHash) {
            console.log(`Got donation trnasaction hash ${transactionHash}`);
            ReactGA.event({
                category: "donation",
                action: "donation_hash",
                label: transactionHash, // optional, must be a number
                nonInteraction: false
            });
            web3.eth.getTransaction(transactionHash).then(
                function(txnObject2) {
                    if(txnObject2) {
                        checkDonationTransaction(txnObject2, decimals, chainId, that);
                    } else {
                        console.log(`Empty txnObject2. Using transaction hash to check donation status.`);
                        checkDonationTransaction({hash:transactionHash}, decimals, chainId, that);
                    }
                }
            );
        }).on('error', function(error) {
            ReactGA.event({
                category: "donation",
                action: "donation_failed",
                label: error, // optional, must be a number
                nonInteraction: false
            });
            that.setState({
                showModal: true, modalTitle: 'failed',
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false,
                modalMessage: 'blockChainTransactionFailed'
            });
            clearWeb3Provider(that)
            console.log('error handler invoked in checkApprovalTransaction')
            console.log(error);
        })
    } else {
        if(txnObject) {
            that.state.web3.eth.getTransaction(txnObject.hash).then(function(txnObject2) {
                if(txnObject2) {
                    console.log(`Got updated txnObject for approval transaction`);
                    setTimeout(checkApprovalTransaction, 3000, txnObject2, decimals, chainId, that);
                } else {
                    console.log(`txnObject2 is null. Using txnObject with transaction hash`);
                    setTimeout(checkApprovalTransaction, 3000, txnObject, decimals, chainId, that);
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
            ReactGA.event({
                category: "donation",
                action: "transaction_failed",
                label: "txnObject is null", // optional, must be a number
                nonInteraction: false
            });
        }
    }
}

export default CampaignPage;
