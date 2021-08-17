import React, {lazy, useState, Component} from 'react';
import config from "react-global-configuration";
import axios from 'axios';
import { Container, Row, Col, Card, ProgressBar, Button, Modal, Image, InputGroup, FormControl } from 'react-bootstrap';
import { ChevronLeft, Gift, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle} from 'react-bootstrap-icons';
import ReactPlayer from 'react-player';
import { Link } from "react-router-dom";
import { Trans } from 'react-i18next';
import { initWeb3, initWeb3Modal, clearWeb3Provider } from '../util/Utilities';
import i18n from '../util/i18n';
import countryMap from '../countryMap';
import { Editor, EditorState, convertFromRaw, CompositeDecorator } from "draft-js";
import '../css/campaignPage.css';
import '../css/modal.css';
import Web3Modal from 'web3modal';
import Web3 from 'web3';
import WalletConnectProvider from '@walletconnect/web3-provider';

import bnbIcon from '../images/binance-coin-bnb-logo.png';
import busdIcon from '../images/binance-usd-busd-logo.png';
const IMG_MAP = {BUSD: busdIcon, BNB: bnbIcon};

var HEOCampaign, ERC20Coin;
const donationAmount="";
const currencyName="";

class CampaignPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            editorState: EditorState.createEmpty(),
            donationAmount:"10",
            campaign:{},
            address:"",
            waitToClose:false,
            raisedAmount:0,
            showModal: false,
            modalMessage:"",
            modalTitle:"",
            errorIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
        };
        
    }

    handleDonationAmount = (e) => {this.setState({donationAmount: e.target.value})};

    async getCampaign(address){
        var campaign = {};
        var modalMessage = 'failedToLoadCampaign';
        let data = {ID : address};
        await axios.post('/api/campaign/loadOne', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            //console.log(res.data);
            campaign = res.data;
            const contentState = convertFromRaw(campaign.descriptionEditor);
            this.state.editorState = EditorState.createWithContent(contentState, createDecorator());
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
        return campaign;
    }

    updateRaisedAmount = async (accounts, campaignInstance, web3) => {
        var campaign = this.state.campaign;
        var that = this;
        campaignInstance.methods.raisedAmount().call({from:accounts[0]}, function(err, result) {
            if(!err) {
                campaign.raisedAmount = parseFloat(web3.utils.fromWei(result));
                that.setState({campaign:campaign});
                console.log(that.state.raisedAmount)
            } else {
                console.log("Failed to update raised amount.")
                console.log(err);
            }
        });
    }

    handleDonateClick = async event => {
        try {
            await initWeb3Modal();
            if(!this.state.web3 ||!this.state.accounts) {
                await initWeb3(this);
            }
            var web3 = this.state.web3;
            var accounts = this.state.accounts;
            var campaignInstance = new web3.eth.Contract(HEOCampaign, this.state.address);
            var coinAddress = (await campaignInstance.methods.currency().call()).toLowerCase();
            if(accounts[0].toLowerCase() == this.state.campaign.beneficiaryId.toLowerCase()){
                this.setState({
                    showModal: true, modalTitle: 'notAllowed',
                    modalMessage: 'donateToYourSelf',
                    errorIcon: 'ExclamationTriangle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#E63C36', waitToClose: false
                });
                return;
            }
            var toDonate = web3.utils.toWei(this.state.donationAmount);
            var that = this;
            //for native donations
            if(coinAddress == "0x0000000000000000000000000000000000000000") {
                this.setState({
                    showModal: true, modalTitle: 'processingWait',
                    modalMessage: "confirmDonation",
                    errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
                });
                try {
                    let result = await campaignInstance.methods.donateNative().send(
                        {from:accounts[0], value:toDonate}
                    ).on('transactionHash', function(transactionHash){
                        that.setState({modalMessage: "waitingForNetowork"})
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
                await this.updateRaisedAmount(accounts, campaignInstance, web3);
                this.setState({
                    showModal: true, modalTitle: 'complete',
                    modalMessage: 'thankYouDonation',
                    errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: '#588157', waitToClose: false
                });
            } else {
                //for ERC20 donations
                var coinInstance = new web3.eth.Contract(ERC20Coin, coinAddress);
                this.setState({
                    showModal: true, modalTitle: 'processingWait',
                    modalMessage: "approveSpend",
                    errorIcon: 'HourglassSplit', modalButtonVariant: "#E63C36", waitToClose: false,
                    modalButtonMessage: 'abortBtn',
                    onModalClose: function() {
                        if(clearWeb3Provider(that)) {
                            clearWeb3Provider(that);
                        }
                    }
                });
                try {
                    let result = await coinInstance.methods.approve(this.state.campaign._id, toDonate).send(
                        {from:accounts[0]}
                    ).on('transactionHash', function(transactionHash){
                        that.setState({modalMessage: "waitingForNetowork"})
                    });
                    this.setState({
                        showModal: true, modalTitle: 'processingWait',
                        modalMessage: "approveDonate",
                        errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
                    });
                    result = await campaignInstance.methods.donateERC20(toDonate).send(
                        {from:accounts[0]}
                    ).on('transactionHash', function(transactionHash){
                        that.setState({modalMessage: "waitingForNetowork"})
                    });
                    await this.updateRaisedAmount(accounts, campaignInstance, web3);
                    this.setState({
                        showModal: true, modalTitle: 'complete',
                        modalMessage: 'thankYouDonation',
                        errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
                        modalButtonVariant: '#588157', waitToClose: false
                    });
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
                                }
                            }>
                            <Trans i18nKey={this.state.modalButtonMessage} />
                        </Button>
                        }
                    </Modal.Body>                
                </Modal>
                <Container className='backToCampaignsDiv'>
                    <p className='backToCampaigns'><Link class={"backToCampaignsLink"} to="/"><ChevronLeft id='backToCampaignsChevron'/><Trans i18nKey='backToCampaigns'/></Link></p>
                </Container>
                <Container id='mainContainer'>
                    <Row id='topRow'>
                        <Col id='imgCol'>
                            <Image src={this.state.campaign.mainImageURL} id='mainImage'/>
                        </Col>
                        <Col id='infoCol'>
                            <Row id='titleRow'>
                                <p id='title'>{this.state.campaign.title}</p>
                            </Row>
                            <Row id='countryRow'><h2>{this.state.campaign.org} ({countryMap[this.state.campaign.cn]})</h2></Row>
                            <Row id='progressRow'>
                                <p id='progressBarLabel'><span id='progressBarLabelStart'><img src={IMG_MAP[this.state.campaign.currencyName]} width={16} height={16} style={{marginRight:5}} />{`${this.state.campaign.raisedAmount}`}</span>{i18n.t('raised')}{this.state.campaign.maxAmount} {i18n.t('goal')}</p>
                                <ProgressBar id='progressBar' now={this.state.campaign.percentRaised}/>
                            </Row>
                            <Row id='acceptingRow'>
                                <div id='acceptingDiv'>
                                    <p><Trans i18nKey='accepting'/>: <span className='coinRewardInfo'>
                                        <img src={IMG_MAP[this.state.campaign.currencyName]} width={16} height={16} style={{marginRight:5}} />
                                        {this.state.campaign.currencyName} </span><span class="coinHelper">(<a target="_blank" href="https://academy.binance.com/en/articles/what-is-busd"><Trans i18nKey='watIsCoin' values={{currencyName: this.state.campaign.currencyName }} /></a>)</span></p>
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
                                        <Button id='donateButton' onClick={this.handleDonateClick}><Trans i18nKey='donate'/> <Gift id='giftIcon'/></Button>
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
        let address = toks[toks.length -1];
        this.setState({
            address: address,
            campaign : (await this.getCampaign(address)),
        });
        HEOCampaign = (await import("../remote/"+ config.get("CHAIN") + "/HEOCampaign")).default;
        ERC20Coin = (await import("../remote/"+ config.get("CHAIN") + "/ERC20")).default;
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

export default CampaignPage;