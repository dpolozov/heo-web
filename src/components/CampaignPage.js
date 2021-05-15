import React, {lazy, useState, Component} from 'react';
import config from "react-global-configuration";
import axios from 'axios';
import { Container, Row, Col, Card, ProgressBar, Button, Modal, Image, InputGroup, FormControl } from 'react-bootstrap';
import { ChevronRight, Gift } from 'react-bootstrap-icons';
import ReactPlayer from 'react-player';
import '../css/campaignPage.css';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';

var HEOCampaign, ERC20Coin, web3;

class CampaignPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            donationAmount:"10",
            campaign:{},
            modalMessage:"Please confirm the transaction in MetaMask",
            showModal:false,
            donationStatus:"",
            waitToClose:false,
            donationStatusColor:"black",
            modalButtonVariant:"",
            raisedAmount:0,
            
        };
    }

    handleDonationAmount = (e) => {this.setState({donationAmount: e.target.value})};

    async getCampaign(address){
        var campaign = {};
        var errorMessage = 'Failed to load campaign';
        let data = {ID : address};
        await axios.post('/api/campaign/load', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            console.log(res.data);
            campaign = res.data;
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

    async updateRaisedAmountDB(address, newAmount){
        let data = {ID : address, amount : newAmount};
        let errorMessage = 'Failed to update raised amount';
        await axios.post('/api/campaign/updateRaisedAmount', data,  {headers: {"Content-Type": "application/json"}})
        .then(res => {
            console.log(res);
            if(res.data === 'db updated successfully'){
                this.state.campaign.raisedAmount = newAmount;
            }           
        }).catch(err => {
            if (err.response) { 
                errorMessage = 'Failed to update raised amount. We are having technical difficulties'}
            else if(err.request) {
                errorMessage = 'Failed to update raised amount. Please check your internet connection'
            }
            console.log(err);
            this.setState({
                showError: true,
                errorMessage,
            })
        })      
    }

    updateRaisedAmount = async (accounts) => {
        var campaignInstance = this.state.campaignInstance;
        var that = this;
        campaignInstance.methods.raisedAmount().call({from:accounts[0]}, function(err, result) {
            if(!err) {
                that.setState({raisedAmount:parseFloat(web3.utils.fromWei(result))});
                console.log(that.state.raisedAmount)
                that.updateRaisedAmountDB(that.state.address, that.state.raisedAmount);
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
                donationStatus: "Processing",
                waitToClose: true,
                modalMessage: "Processing your Donation, please wait",
                showModal: true,
                donationStatusColor: "yellow",
            });
            try {
                var accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                var toDonate = web3.utils.toWei(this.state.donationAmount);
                var that = this;
                //for native donations
                if(this.state.coinAddress == "0x0000000000000000000000000000000000000000") {
                    campaignInstance.methods.donateNative().send({from:accounts[0], value:toDonate}).on(
                    'receipt', function(receipt) {
                            console.log("Received receipt from donation transaction");
                            that.updateRaisedAmount(accounts);
                            that.setState({
                                donationStatus: "Complete!",
                                waitToClose: false,
                                modalMessage: "Thank you for your donation!",
                                donationStatusColor: "green",
                                modalButtonVariant: "success",
                            });
                    }).on('error', function(error) {
                            that.setState({
                                donationStatus: "Failed",
                                waitToClose: false,
                                donationStatusColor: "red",
                                modalButtonVariant: "danger",
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
                                    donationStatus: "Complete!",
                                    waitToClose: false,
                                    modalMessage: "Thank you for your donation!",
                                    donationStatusColor: "green",
                                    modalButtonVariant: "success",
                                });
                            }
                        ).on('error', function(error) {
                            that.setState({
                                donationStatus: "Failed",
                                waitToClose: false,
                                donationStatusColor: "red",
                                modalButtonVariant: "danger",
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
                            donationStatus: "Failed!",
                            waitToClose: false,
                            modalMessage: "Transaction failed",
                            donationStatusColor: "red",
                            modalButtonVariant: "danger",
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
                    donationStatus: "Failed!",
                    waitToClose: false,
                    donationStatusColor: "red",
                    modalButtonVariant: "danger",
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
                <Modal show={this.state.showModal} onHide={this.state.showModal}>
                    <Modal.Header>
                    <Modal.Title style={{backgroundColor: this.state.donationStatusColor}}>Donation {this.state.donationStatus}</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>{this.state.modalMessage}</Modal.Body>
                    <Modal.Footer>
                    {!this.state.waitToClose &&
                        <Button variant={this.state.modalButtonVariant} onClick={ () => {this.setState({showModal:false})}}>
                            Close
                        </Button>
                    }
                    </Modal.Footer>
                </Modal>
                
                    <Container className='backToCampaignsDiv'>
                        <p className='backToCampaigns'>Help Each Other <ChevronRight id='backToCampaignsChevron'/> Campaign Details</p>
                    </Container>
                  
                <Container id='mainContainer'>
                    <Row id='topRow'>
                        <Col id='imgCol'>
                            <Image src={this.state.campaign.mainImage} id='mainImage'/>
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
                                    <p><Trans i18nKey='accepting'/>: <span className='coinRewardInfo'>{this.state.campaign.coinName}</span></p>
                                </div>
                                <div id='rewardsDiv'>
                                    <p><Trans i18nKey='reward'/>: <span className='coinRewardInfo'>{this.state.campaign.reward}</span></p>
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
                        <Container>
                            { this.state.campaign.videoLink && <ReactPlayer url={this.state.campaign.videoLink} id='videoPlayer' />}
                        </Container>
                    </Row>
                    <Row id='descriptionRow'>
                        <Container>
                            <p id='description'>{this.state.campaign.campaignDesc}</p>
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
        ERC20Coin = (await import("../remote/"+ config.get("CHAIN") + "/ERC20Coin")).default;
        let campaignInstance = new web3.eth.Contract(HEOCampaign, address);
        let coinAddress = (await campaignInstance.methods.currency().call()).toLowerCase();
        this.setState({
            campaignInstance, coinAddress, address,
        });
    }
}


export default CampaignPage;