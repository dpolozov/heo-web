import React, {Component} from 'react';
import config from "react-global-configuration";
import axios from 'axios';
import { Container, Row, Col, Card, ProgressBar, Button, DropdownButton, Dropdown, Modal, Image, InputGroup, FormControl } from 'react-bootstrap';
import { ChevronLeft, Gift, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle} from 'react-bootstrap-icons';
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
import countryMap from '../countryMap';
import { Editor, EditorState, convertFromRaw, CompositeDecorator } from "draft-js";
import ReactGA from "react-ga4";

import '../css/campaignPage.css';
import '../css/modal.css';
import bnbIcon from '../images/binance-coin-bnb-logo.png';
import busdIcon from '../images/binance-usd-busd-logo.png';
import usdcIcon from '../images/usd-coin-usdc-logo.png';
import ethIcon from '../images/eth-diamond-purple.png';
import cusdIcon from '../images/cusd-celo-logo.png';
import usdcAurora from '../images/usd-coin-aurora-logo.png';
import CCData from '../components/CCData';
const IMG_MAP = {"BUSD-0xe9e7cea3dedca5984780bafc599bd69add087d56": busdIcon,
    "BNB-0x0000000000000000000000000000000000000000": bnbIcon,
    "USDC-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": usdcIcon,
    "ETH-0x0000000000000000000000000000000000000000": ethIcon,
    "cUSD-0x765DE816845861e75A25fCA122bb6898B8B1282a": cusdIcon,
    "USDC-0xb12bfca5a55806aaf64e99521918a4bf0fc40802": usdcAurora};


const PAYMENT_ERROR_MESSAGES = {
    declined: "cardPaymentDeclined",
    payment_stopped_by_issuer: "cardPaymentFailed_payment_stopped_by_issuer",
    payment_fraud_detected: "cardPaymentFailed_payment_fraud_detected",
    payment_denied: "cardPaymentFailed_payment_denied",
    card_limit_violated: "cardPaymentFailed_card_limit_violated",
    card_invalid: "cardPaymentFailed_card_invalid",
    payment_not_funded: "cardPaymentFailed_payment_not_funded",
    payment_not_supported_by_issuer: "cardPaymentFailed_payment_not_supported_by_issuer",
    card_not_honored: "cardPaymentFailed_card_not_honored"
};
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
            modalMessage:"",
            modalTitle:"",
            errorIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
            chainId:"",
            chains:[],
            ccinfo:{},
            showCCinfoModal: false,
        };
        this.handleGetCCInfo = this.handleGetCCInfo.bind(this);
        this.handleCCInfoCancel = this.handleCCInfoCancel.bind(this);
    }

    handleGetCCInfo(info){
        this.setState({ccinfo : info});
        this.handleDonateFiat();
    }

    handleCCInfoCancel(){
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
        if(campaign.raisedAmount) {
            campaign.raisedAmount = Math.round(campaign.raisedAmount * 100)/100;
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
                console.log(that.state.raisedAmount)
            } else {
                console.log("Failed to update raised amount.")
                console.log(err);
            }
        });
    }
    handleDonateFiat = async () => {
        //TODO: check that this.state.donationAmount is larger than 0
        let cardKeyData = await getPCIPublicKey();
        let encryptedCardData = await encryptCardData(cardKeyData, {number :this.state.ccinfo.number, cvv:this.state.ccinfo.cvc});
        let encryptedSecurityData = await encryptCardData(cardKeyData, {cvv:this.state.ccinfo.cvc});
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
            campaignId: this.state.campaignId,
            amount: this.state.donationAmount,
            currency: this.state.ccinfo.currency,
            verification: "cvv"
        };
        try {
            this.setState({
                showModal: true, modalTitle: 'processingWait',
                modalMessage: "confirmDonation",
                errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
            });
            let resp = await axios.post('/api/donatefiat', data, {headers: {"Content-Type": "application/json"}});
            console.log(resp);
            if(resp.data.paymentStatus == "success") {
                this.setState({
                    showModal: true, modalTitle: 'complete',
                    modalMessage: 'thankYouDonation',
                    errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#588157', waitToClose: false
                });
            } else {
                this.setState({
                    showModal: true, modalTitle: 'failed', modalMessage: PAYMENT_ERROR_MESSAGES[resp.data.paymentStatus],
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false
                });
            }
        } catch (err) {
            this.setState({
                showModal: true, modalTitle: 'failed', modalMessage: 'cardPaymentGatewayFailure',
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false
            });
        }

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
                value: this.state.donationAmount, // optional, must be a number
                nonInteraction: false
            });
            //check if donating to oneself
            if(accounts[0].toLowerCase() == this.state.campaign.beneficiaryId.toLowerCase()){
                this.setState({
                    showModal: true, modalTitle: 'notAllowed',
                    modalMessage: 'donateToYourSelf',
                    errorIcon: 'ExclamationTriangle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false
                });
                ReactGA.event({
                    category: "donation",
                    action: "self_donation_blocked",
                    value: this.state.campaign.beneficiaryId, // optional, must be a number
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
                        ).once('transactionHash', function(transactionHash){
                            that.setState({modalMessage: "waitingForNetowork"});
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
                        ).once('transactionHash', function(transactionHash){
                            that.setState({modalMessage: "waitingForNetowork"})
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
                    var toDonate = this.state.donationAmount * 1000000;
                    if(currentProvider !== "metamask") {
                        ReactGA.event({
                            category: "provider",
                            action: "using_noninjected_provider",
                            value: window.web3Modal.cachedProvider, // optional, must be a number
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
                                toDonate = that.state.donationAmount * Math.pow(10, decimals);
                                console.log(`Adjusted donation amount is ${toDonate}`);
                            }
                            coinInstance.methods.approve(campaignAddress, ""+toDonate).send(
                                {from:accounts[0]}
                            ).once('transactionHash', function(transactionHash){
                                that.setState({modalMessage: "waitingForNetowork"});
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
                            }).on('error', function(error){
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
                                    value: error, // optional, must be a number
                                    nonInteraction: false
                                });
                            });
                        });
                    } else {
                        console.log(`Using provider ${currentProvider}`);
                        ReactGA.event({
                            category: "provider",
                            action: "using_injected_provider",
                            value: window.web3Modal.cachedProvider, // optional, must be a number
                            nonInteraction: false
                        });
                        decimals = await coinInstance.methods.decimals().call();
                        toDonate = this.state.donationAmount * Math.pow(10, decimals);
                        let result = await coinInstance.methods.approve(campaignAddress, ""+toDonate).send(
                            {from:accounts[0]}
                        ).once('transactionHash', function(transactionHash){
                            that.setState({modalMessage: "waitingForNetowork"})
                        });
                        console.log('Approved spending');
                        this.setState({
                            showModal: true, modalTitle: 'processingWait',
                            modalMessage: "approveDonate",
                            errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
                        });
                        result = await campaignInstance.methods.donateERC20(""+toDonate).send(
                            {from:accounts[0]}
                        ).once('transactionHash', function(transactionHash){
                            console.log(`transaction hash for donateERC20 ${transactionHash}`);
                            that.setState({modalMessage: "waitingForNetowork"})
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
                                value: `Metamask transaction failed with code ${result.code}`,
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
                        value: err, // optional, must be a number
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
                value: err, // optional, must be a number
                nonInteraction: false
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
                                   values={{donationAmount: this.state.donationAmount, currencyName: this.state.campaign.currencyName }} />
                        </p>
                        {!this.state.waitToClose &&
                        <Button className='myModalButton'
                            style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                            onClick={ () => {
                                    if(this.state.onModalClose) {
                                        this.state.onModalClose();
                                    }
                                    this.setState({showModal: false, onModalClose: false});
                                    ReactGA.event({
                                        category: "button_click",
                                        action: "modal_button_clicked",
                                        value: this.state.modalButtonMessage, // optional, must be a number
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
                    {this.state.showCCinfoModal && <CCData handleCCInfoCancel = {this.handleCCInfoCancel} handleGetCCInfo = {this.handleGetCCInfo}/>}
                    <Row id='topRow'>
                        <Col id='imgCol'>
                            <Image src={this.state.campaign.mainImageURL} id='mainImage'/>
                        </Col>
                        <Col id='infoCol'>
                            <Row id='titleRow'>
                                <p id='title'>{i18nString(this.state.campaign.title, i18n.language)}</p>
                            </Row>
                            <Row id='countryRow'><h2>{i18nString(this.state.campaign.org, i18n.language)} ({countryMap[this.state.campaign.cn]})</h2></Row>
                            <Row id='progressRow'>
                                <p id='progressBarLabel'><span id='progressBarLabelStart'>{`${this.state.campaign.raisedAmount}`}</span>{i18n.t('raised')}{this.state.campaign.maxAmount} {i18n.t('goal')}</p>
                                <ProgressBar id='progressBar' now={this.state.campaign.percentRaised}/>
                            </Row>
                            <Row id='acceptingRow'>
                                <div id='acceptingDiv'>
                                    <p><Trans i18nKey='accepting'/>:
                                        {this.state.chains.map((item, i) =>
                                            <span className='coinRewardInfo'><img src={IMG_MAP[this.state.campaign.coins[item["CHAIN"]].name+"-"+this.state.campaign.coins[item["CHAIN"]].address]} width={20} height={20} style={{marginRight:5, marginLeft:5}} />{this.state.campaign.coins[item["CHAIN"]].name} </span>
                                            )}
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
                                            <Dropdown.Item key="_fiat" as="button" onClick={() => this.setState({showCCinfoModal : true})}>Visa/MasterCard</Dropdown.Item>
                                                {this.state.chains.map((item, i) =>
                                                    <Dropdown.Item key={item["CHAIN"]} as="button" onClick={() => this.handleDonateClick(item["CHAIN"])}><img src={IMG_MAP[this.state.campaign.coins[item["CHAIN"]].name+"-"+this.state.campaign.coins[item["CHAIN"]].address]} width={16} height={16} style={{marginRight:5}} />{this.state.campaign.coins[item["CHAIN"]].name} ({item["CHAIN_NAME"]})</Dropdown.Item>
                                                )}
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
        campaign.percentRaised = 100 * campaign.raisedAmount/campaign.maxAmount;
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

        this.setState({
            chains: chains,
            campaignId: campaignId,
            campaign : campaign,
            editorState: EditorState.createWithContent(contentState[i18n.language], createDecorator())
        });
        console.log(`this.state.chains is ${this.state.chains}`);
        console.log(this.state.chains);
        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });
    }

}

function createDecorator(){
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
            value: that.state.donationAmount, // optional, must be a number
            nonInteraction: false
        });
        ReactGA.event({
            category: "purchase",
            currency: that.state.campaign.currencyName,
            action: "modal_button_clicked",
            value: that.state.donationAmount, // optional, must be a number
            items: [{item_id: that.state.campaign.addresses[chainId], item_name: that.state.campaign.title}]
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
        let toDonate = that.state.donationAmount * Math.pow(10, decimals);
        that.setState({
            showModal: true, modalTitle: 'processingWait',
            modalMessage: "approveDonate",
            errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
        });
        ReactGA.event({
            category: "donation",
            action: "approval_succeeded",
            value: that.state.donationAmount, // optional, must be a number
            nonInteraction: false
        });
        campaignInstance.methods.donateERC20(""+toDonate).send(
            {from:accounts[0]}
        ).once('transactionHash', function(transactionHash){
            console.log(`Got donation trnasaction hash ${transactionHash}`);
            ReactGA.event({
                category: "donation",
                action: "donation_hash",
                value: transactionHash, // optional, must be a number
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
        }).on('error', function(error){
            ReactGA.event({
                category: "donation",
                action: "donation_failed",
                value: error, // optional, must be a number
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
                value: "txnObject is null", // optional, must be a number
                nonInteraction: false
            });
        }
    }
}

export default CampaignPage;
