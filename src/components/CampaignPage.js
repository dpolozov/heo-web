import React, {lazy, useState, Component} from 'react';
import config from "react-global-configuration";
import axios from 'axios';
import { Container, Row, Col, Card, ProgressBar, Button, Modal, Image, InputGroup, FormControl } from 'react-bootstrap';
import { ChevronLeft, Gift, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import ReactPlayer from 'react-player';
import { Link } from "react-router-dom";
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import '../css/campaignPage.css';
import { Editor, EditorState, convertFromRaw } from "draft-js";

var HEOCampaign, ERC20Coin, web3;

class CampaignPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            donationAmount:"10",
            campaign:{},
            waitToClose:false,
            raisedAmount:0,
            showModal: false,
            modalMessage:"",
            errorMessage:"",
            errorIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
            editorState: EditorState.createEmpty()          
        };
        
    }

    handleDonationAmount = (e) => {this.setState({donationAmount: e.target.value})};

    async getCampaign(address){
        var campaign = {};
        var errorMessage = 'Failed to load campaign';
        let data = {ID : address};
        await axios.post('/api/campaign/loadOne', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            //console.log(res.data);
            campaign = res.data;
            const contentState = convertFromRaw(campaign.descriptionEditor);
            this.state.editorState = EditorState.createWithContent(contentState);

        }).catch(err => {
            if (err.response) { 
                errorMessage = 'Failed to load campaigns. We are having technical difficulties'}
            else if(err.request) {
                errorMessage = 'Failed to load campaings. Please check your internet connection'
            }
            console.log(err);
            this.setState({
                showError: true,
                errorMessage,
            })
        })
        return campaign;
    }

    updateRaisedAmount = async (accounts) => {
        var campaignInstance = this.state.campaignInstance;
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
        var campaignInstance = this.state.campaignInstance;
        if (typeof window.ethereum !== 'undefined') {
            var ethereum = window.ethereum;
            this.setState({
                showModal: true, errorMessage: 'Processing...',
                modalMessage: "Processing your Donation, please wait",
                errorIcon: 'HourglassSplit', modalButtonVariant: "gold", waitToClose: true
            });
            try {
                var accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                if(accounts[0] == this.state.campaign.beneficiaryId){
                    this.setState({
                        showModal: true, errorMessage: 'Transaction not available',
                        modalMessage: 'Donating to yourself is not allowed',
                        errorIcon: 'ExclamationTriangle', modalButtonMessage: 'CLOSE',
                        modalButtonVariant: '#E63C36', waitToClose: false
                    });
                    return;
                }
                var toDonate = web3.utils.toWei(this.state.donationAmount);
                var that = this;
                //for native donations
                if(this.state.coinAddress == "0x0000000000000000000000000000000000000000") {
                    campaignInstance.methods.donateNative().send({from:accounts[0], value:toDonate}).on(
                    'receipt', function(receipt) {
                            console.log("Received receipt from donation transaction");
                            that.updateRaisedAmount(accounts);
                            that.setState({
                                showModal: true, errorMessage: 'Complete!',
                                modalMessage: 'Thank you for your donation!',
                                errorIcon: 'CheckCircle', modalButtonMessage: 'Close',
                                modalButtonVariant: '#588157', waitToClose: false
                            });
                    }).on('error', function(error) {
                            that.setState({
                                showModal: true, errorMessage: 'Failed',
                                errorIcon: 'XCircle', modalButtonMessage: 'CLOSE',
                                modalButtonVariant: '#E63C36', waitToClose: false
                            });
                            console.log("donateNative transaction failed");
                            console.log(error);
                            if(error.toString().indexOf("cannot donate to yourself") > -1) {
                                that.setState({modalMessage:"As the creator of this fundraiser, you cannot donate to yourself."});
                            } else {
                                that.setState({modalMessage:"Donation transaction has failed. Please check MetaMask for details."});
                            }
                    }).on('transactionHash', function(transactionHash){
                        that.setState({modalMessage:"Waiting for the network to confirm transaction."})
                    })
                    that.setState({modalMessage:"Please confirm transaction in MetaMask."});
                } else {
                    //for ERC20 donations
                    var coinInstance = new web3.eth.Contract(ERC20Coin, this.state.coinAddress);
                    coinInstance.methods.approve(this.state.campaign._id, toDonate).send({from:accounts[0]}).on(
                        'receipt', function(receipt) {
                        console.log("Received receipt from approval transaction");
                        campaignInstance.methods.donateERC20(toDonate).send({from:accounts[0]}).on('receipt',
                            function(receipt) {
                                console.log("Received receipt from donation transaction");
                                that.updateRaisedAmount(accounts);
                                that.setState({
                                    showModal: true, errorMessage: 'Complete!',
                                    modalMessage: 'Thank you for your donation!',
                                    errorIcon: 'CheckCircle', modalButtonMessage: 'Close',
                                    modalButtonVariant: '#588157', waitToClose: false
                                });
                            }
                        ).on('error', function(error) {
                            that.setState({
                                showModal: true, errorMessage: 'Failed',
                                errorIcon: 'XCircle', modalButtonMessage: 'CLOSE',
                                modalButtonVariant: '#E63C36', waitToClose: false
                            });
                            console.log("donateERC20 transaction failed");
                            console.log(error);
                            if(error.toString().indexOf("cannot donate to yourself") > -1) {
                                that.setState({modalMessage:"As the creator of this fundraiser, you cannot donate to yourself."});
                            } else {
                                that.setState({modalMessage:"Donation transaction has failed. Please check MetaMask for details."});
                            }
                        }).on('transactionHash', function(transactionHash){
                            that.setState({modalMessage:"Waiting for the network to confirm transaction."})
                        })
                        that.setState({modalMessage:"Please confirm transaction in MetaMask."});
                    }).on('error', function(error) {
                        that.setState({
                            showModal: true, errorMessage: 'Failed',
                            errorIcon: 'XCircle', modalButtonMessage: 'CLOSE',
                            modalButtonVariant: '#E63C36', waitToClose: false
                        });
                        console.log("Approval transaction failed");
                        console.log(error);
                    }).on('transactionHash', function(transactionHash){
                        that.setState({modalMessage:"Waiting for the network to confirm transaction."})
                    });
                }
                that.setState({modalMessage:"Please confirm transaction in MetaMask."})
            } catch (err) {
                console.log(err);
                this.setState({
                    showModal: true, errorMessage: 'Failed',
                    errorIcon: 'XCircle', modalButtonMessage: 'CLOSE',
                    modalButtonVariant: '#E63C36', waitToClose: false,
                    modalMessage:"Failed to connect to blockchain network. If you are using a browser wallet like MetaMask, " +
                        "please make sure that it is configured for " + config.get("CHAIN_NAME")
                });
            }
        } else {
            alert("Please install metamask");
        }
    }

    render() {
        return (
            <div>
                <Modal show={this.state.showModal} onHide={this.state.showModal} className='myModal' centered>
                    <Modal.Body><p className='errorIcon'>
                        {this.state.errorIcon == 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.errorIcon == 'ExclamationTriangle' && <ExclamationTriangle style={{color: '#E63C36'}}/>}
                        {this.state.errorIcon == 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.errorIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                        <p className='errorMessage'>{this.state.errorMessage}</p>
                        <p className='modalMessage'>{this.state.modalMessage}</p>
                        {!this.state.waitToClose &&
                        <Button className='myModalButton' 
                            style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}} 
                            onClick={ () => {this.setState({showModal:false})}}>
                            {this.state.modalButtonMessage}
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
                            <Row id='progressRow'>
                                <p id='progressBarLabel'><span id='progressBarLabelStart'>{`$${this.state.campaign.raisedAmount}`}</span>{i18n.t('raised')}{this.state.campaign.maxAmount} {i18n.t('goal')}</p>
                                <ProgressBar id='progressBar' now={this.state.campaign.percentRaised}/>
                            </Row>
                            <Row id='acceptingRow'>
                                <div id='acceptingDiv'>
                                    <p><Trans i18nKey='accepting'/>: <span className='coinRewardInfo'>{this.state.campaign.currencyName}</span></p>
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
                            { this.state.campaign.vl && <ReactPlayer url={this.state.campaign.vl} id='videoPlayer' />}
                        </Container>
                    </Row>
                    <Row id='descriptionRow'>
                        <Container>
                            <Editor editorState={this.state.editorState} readOnly={true}/>  
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
            campaign : (await this.getCampaign(address)),
        });
        web3 = (await import("../remote/"+ config.get("CHAIN") + "/web3")).default;
        HEOCampaign = (await import("../remote/"+ config.get("CHAIN") + "/HEOCampaign")).default;
        ERC20Coin = (await import("../remote/"+ config.get("CHAIN") + "/ERC20")).default;
        let campaignInstance = new web3.eth.Contract(HEOCampaign, address);
        let coinAddress = (await campaignInstance.methods.currency().call()).toLowerCase();
        this.setState({
            campaignInstance, coinAddress, address,
        });
    }
}


export default CampaignPage;