import React, { Component, lazy } from 'react';
import config from 'react-global-configuration';
import '../css/modal.css';
import '../css/campaignList.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal } from 'react-bootstrap';
import { CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { i18nString, DescriptionPreview, LogIn, initWeb3, checkAuth, initWeb3Modal, checkAuthTron, LogInTron, initTron } from '../util/Utilities';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import {UserContext} from './UserContext';

import ReactGA from "react-ga4";

ReactGA.initialize("G-C657WZY5VT");

class UserCampaigns extends Component {
    constructor(props) {
        super(props);
        this.state = {
            campaigns: [],
            showError:false,
            modalTitle:"",
            modalMessage:"",
            isLoggedIn:false,
            isLoggedInTron:false,
            whiteListed:false,
            showTwoButtons: false,
            campaignId: '',
            chainId:"",
            tronChainId:"",
            chainConfig:{},
            tronChainConfig:{}, 
            fileName: '',
            showModal: false,
            showModalDialog: false,
        };
    }

    async checkWLTron(chainId) {
        //is white list enabled?
        try {
            console.log(`Tron initialized. Account1: ${window.tronWeb.toHex(window.tronAdapter.address)}`);
            console.log(`Loading HEOParameters on ${chainId}`);
            let abi = (await import("../remote/" + chainId + "/HEOParameters")).abi;
            let address = (await import("../remote/" + chainId + "/HEOParameters")).address;
            var HEOParameters = await window.tronWeb.contract(abi, address);
            let wlEnabled = await HEOParameters.methods.intParameterValue(11).call();
            if(wlEnabled > 0) {
                console.log('WL enabled')
                //is user white listed?
                let whiteListed = await HEOParameters.methods.addrParameterValue(5, window.tronWeb.toHex(window.tronAdapter.address).toLowerCase()).call();
                if(whiteListed > 0) {
                    this.setState({
                        isLoggedInTron : true,
                        whiteListed: true,
                        beneficiaryAddress: window.tronWeb.toHex(window.tronAdapter.address),
                        showModal: false,
                        goHome: false
                    });
                    this.loadCampaigns();
                } else {
                    console.log(`User not in WL`)
                    //user is not in the white list
                    this.setState({
                        goHome: true,
                        showModal:true,
                        isLoggedInTron: true,
                        whiteListed: false,
                        modalTitle: 'nonWLTitle',
                        modalMessage: 'nonWLMessage',
                        modalIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                        modalButtonVariant: "#E63C36", waitToClose: false
                    });
                }
            } else {
                this.loadCampaigns();
                //white list is disabled
                this.setState({
                    isLoggedInTron : true,
                    whiteListed: true,
                    goHome: false,
                    showModal: false
                });
            }
        } catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'Failed',
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false,
                modalMessage: 'blockChainConnectFailed'
            });
        }
    }


    //is white list enabled?
    async checkWL(chainId) {
        try {
            if(!this.state.web3 || !this.state.accounts) {
                await initWeb3(chainId, this);
            }
            let abi = (await import("../remote/" + chainId + "/HEOParameters")).abi;
            let address = (await import("../remote/" + chainId + "/HEOParameters")).address;
            var HEOParameters = new this.state.web3.eth.Contract(abi, address);
            let wlEnabled = await HEOParameters.methods.intParameterValue(11).call();
            if(wlEnabled > 0) {
                //is user white listed?
                let whiteListed = await HEOParameters.methods.addrParameterValue(5,this.state.accounts[0]).call();
                if(whiteListed > 0) {
                    this.setState({
                        isLoggedIn : true,
                        whiteListed: true,
                        showModal: false,
                        goHome: false
                    });
                  this.loadCampaigns();
                } else {
                    //user is not in the white list
                    this.setState({
                        campaigns : [],
                        goHome: true,
                        showModal:true,
                        isLoggedIn: true,
                        whiteListed: false,
                        modalTitle: 'nonWLTitle',
                        modalMessage: 'nonWLMessage',
                        errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                        modalButtonVariant: "#E63C36", waitToClose: false
                    });
                }
            } else {
                //white list is disabled
                this.setState({
                    isLoggedIn : true,
                    whiteListed: true,
                    goHome: false,
                    showModal: false
                });
                this.loadCampaigns();
            }

        } catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'Failed',
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false,
                modalMessage: 'blockChainConnectFailed'
            });
        }
    }

    async componentDidMount() {
        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });
        let chainId = config.get("CHAIN");
        let tronChainId = config.get("TRON_CHAIN");
        this.setState({
            chainId: chainId,
            tronChainId: tronChainId,
        });
        await initWeb3Modal(chainId, this);
        // is the user logged in?
        if((!this.state.isLoggedIn)&&(window.ethereum)) {
           await checkAuth(chainId, this);
        }
        if((!this.state.isLoggedInTron)&&(window.tron)) {
            await checkAuthTron(tronChainId, this);
         }
        if((this.state.isLoggedIn)&&(window.ethereum))  await this.checkWL(chainId);
        if((this.state.isLoggedInTron)&&(window.tron))  await this.checkWLTron(tronChainId); 
        if((!this.state.isLoggedIn)&&(!this.state.isLoggedInTron)) {
            //need to log in first
            this.setState({
                isLoggedIn : false,
                isLoggedInTron: false,
                whiteListed: false,
                goHome: false,
                modalTitle: 'pleaseLogInTitle',
                modalMessage: 'pleaseLogInToCreateMessage',
                modalIcon: 'XCircle', modalButtonMessage: 'login',
                modalButtonVariant: "#E63C36", waitToClose: false
            });
                if ((window.tron)&&(window.ethereum)) this.setState({showModalDialog : true,showModal:false});
                else this.setState({showModalDialog : false, showModal : true});
        }
    }

    async loadCampaigns() {
        this.setState({showModal:true, modalTitle: 'processingWait',
            modalMessage: 'waitingForNetwork', errorIcon:'HourglassSplit',
            modalButtonVariant: "gold", waitToClose: true});
        var campaigns = [];
        var donates = [];
        var modalTitle = 'failedToLoadDonates';
        await axios.post('/api/campaign/getalldonationsforlist')
        .then(res => {
            donates = res.data;
        }).catch(err => {
            modalTitle = 'failedToLoadDonates'
            console.log(err);
            this.setState({showModal:true,
                modalTitle: modalTitle,
                modalMessage: 'technicalDifficulties',
                errorIcon:'XCircle', modalButtonMessage: 'returnHome',
                modalButtonVariant: "#E63C36", waitToClose: false});
        })
        var modalTitle = 'failedToLoadCampaigns';
        await axios.post('/api/campaign/loadUserCampaigns', {}, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            campaigns = res.data;
            this.setState({
                showModal: false,
                campaigns: campaigns
            });
        }).catch(err => {
            modalTitle = 'failedToLoadCampaigns'
            console.log(err);
            this.setState({showModal:true,
                modalTitle: modalTitle,
                modalMessage: 'technicalDifficulties',
                errorIcon:'XCircle', modalButtonMessage: 'returnHome',
                modalButtonVariant: "#E63C36", waitToClose: false});
        })
        campaigns.forEach( campaign => {
            const found = donates.find(element => element._id == campaign._id);
            let raisedDonations = found ? found.totalQuantity  : 0;
            let raisedAmount = campaign.raisedAmount ? parseFloat(campaign.raisedAmount) : 0;
            let fiatDonations = campaign.fiatDonations ? parseFloat(campaign.fiatDonations) : 0;
            let raisedOnCoinbase = campaign.raisedOnCoinbase ? parseFloat(campaign.raisedOnCoinbase) : 0;
            if(raisedAmount || fiatDonations || raisedOnCoinbase || raisedDonations) {
                campaign["raisedAmount"] = Math.round((raisedAmount + fiatDonations + raisedOnCoinbase + raisedDonations) * 100)/100;
            }
        })
        this.setState({
            showModal: false,
            campaigns: campaigns
        });
    }

    async closeCampaignPrep(id, imageURL) {
        let chainId = config.get("CHAIN");
        if(!this.state.web3 || !this.state.accounts) {
            await initWeb3(chainId, this);
        }
        console.log('close campaign');
        this.setState({
            showTwoButtons: true, waitToClose: true,
            showModal: true, errorIcon:'ExclamationTriangle',
            modalTitle: 'closeCampaign',
            modalMessage: 'final',
            campaignId: id
        })
        var splits;
        if(imageURL) {
            splits = imageURL.split('/');
            this.setState({fileName: splits[splits.length -1]});
        }
    }

    async closeCampaign() {
        this.setState({showModal: true, modalMessage: 'confirmMetamask', modalIcon:'HourglassSplit',
            showTwoButtons: false, modalButtonVariant: "gold", waitToClose: true});
        try {
            this.deActivateInDB();
            this.setState({
                modalMessage: 'campaignDeleted', modalTitle: 'complete',
                errorIcon: 'CheckCircle', modalButtonMessage: i18n.t('ok'),
                modalButtonVariant: '#588157', waitToClose: false, showTwoButtons: false,
            })
        } catch (err) {
            console.log(err);
            this.setState({
                waitToClose: false, modalMessage: 'technicalDifficulties',
                errorIcon:'XCircle', modalButtonMessage: 'closeBtn', modalTitle: 'failed',
                modalButtonVariant: "#E63C36", showTwoButtons: false})
        }
    }

    async deleteimage () {
        let data = {name: this.state.fileName};
        return axios.post('/api/deleteimage', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            console.log("Success deleting image");
        }).catch(err => {
            console.log(err);
        });
    }

    async deActivateInDB() {
        let data = {id : this.state.campaignId};
        return axios.post('/api/campaign/deactivate', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            console.log("Success deleting db entry");
        }).catch(err => {
            console.log(err);
        });
    }

    render() {
        return (
            <div>
                <Container>
                    {this.state.campaigns.length == 0 &&
                        <h1>
                            <Trans i18nKey='noUserCampaigns'>You did not create any campaigns yet. Click <Link to="/new">here</Link> to create your first campaign.</Trans>
                        </h1>
                    }
                </Container>
                <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' centered>
                    <Modal.Body><p className='modalIcon'>
                        {this.state.modalIcon == 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.modalIcon == 'ExclamationTriangle' && <ExclamationTriangle/>}
                        {this.state.modalIcon == 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.modalIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p>
                        <p className='modalMessage'><Trans i18nKey={this.state.modalMessage}>
                            Your account has not been cleared to create campaigns.
                            Please fill out this
                            <a target='_blank' href='https://docs.google.com/forms/d/e/1FAIpQLSdTo_igaNjF-1E51JmsjJgILv68RN2v5pisTcqTLvZvuUvLDQ/viewform'>form</a>
                            to ne granted permission to fundraise on HEO Platform
                        </Trans></p>
                        {!this.state.waitToClose &&
                        <UserContext.Consumer>
                            {() => (
                                <Button className='myModalButton'
                                    style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                                    onClick={ async () => {
                                       
                                           if (!window.tron){
                                            window.blockChainOrt = "ethereum";
                                            this.setState({showModal:false})
                                            if(this.state.goHome) {
                                                this.props.history.push('/');
                                            } else if(!this.state.isLoggedIn) {
                                                try {
                                                    if(!this.state.accounts || !this.state.web3) {
                                                        await initWeb3(this.state.chainId, this);
                                                    }
                                                    await LogIn(this.state.accounts[0], this.state.web3, this);
                                                    if(this.state.isLoggedIn) {
                                                        await this.checkWL(this.state.chainId);
                                                    }
                                                } catch (err) {
                                                    console.log(err);
                                                    this.setState({showModal:true,
                                                        goHome: true,
                                                        waitToClose: false,
                                                        isLoggedIn: false,
                                                        modalTitle: 'authFailedTitle',
                                                        modalMessage: 'authFailedMessage',
                                                        modalButtonMessage: 'closeBtn',
                                                        modalButtonVariant: "#E63C36"}
                                                    );
                                                }
                                            }
                                           } else if (window.tron){
                                            window.blockChainOrt = "tron";
                                            if(this.state.goHome) {
                                                this.props.history.push('/');
                                            } else if(!this.state.isLoggedInTron) {
                                                try {
                                                    if(!window.tronWeb) {
                                                        await initTron(this.state.tronChainId , this);
                                                    } 
                                                    await  LogInTron(this); 
                                                    if(this.state.isLoggedInTron) {
                                                    await this.checkWLTron(this.state.tronChainId);
                                                    }  
                                                } catch (err) {
                                                    console.log(err);
                                                    this.setState({showModal:true,
                                                        goHome: true,
                                                        waitToClose: false,
                                                        isLoggedInTron: false,
                                                        modalTitle: 'authFailedTitle',
                                                        modalMessage: 'authFailedMessage',
                                                        modalButtonMessage: 'closeBtn',
                                                        modalButtonVariant: "#E63C36"}
                                                    );
                                                }
                                            }
                                           } 
                                       
                                        
                                    }}>
                                    <Trans i18nKey={this.state.modalButtonMessage} />
                                </Button>
                                )}
                        </UserContext.Consumer>
                        }
                    </Modal.Body>
                </Modal>
                <Modal show={this.state.showModalDialog} onHide={()=>{}} className='myModal' centered>
                    <Modal.Body><p className='modalIcon'>
                        {this.state.modalIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p>
                        <p className='modalMessage'><Trans i18nKey={'pleaseLogInToCreateMessageDuo'}>
                            Your account has not been cleared to create campaigns.
                            Please fill out this
                            <a target='_blank' href='https://docs.google.com/forms/d/e/1FAIpQLSdTo_igaNjF-1E51JmsjJgILv68RN2v5pisTcqTLvZvuUvLDQ/viewform'>form</a>
                            to ne granted permission to fundraise on HEO Platform
                        </Trans></p>
                        {!this.state.waitToClose &&
                        <UserContext.Consumer>
                            {() => (
                                <Modal.Dialog>
                                <Row lg = {2}> 
                                <Col md = '6'>       
                                 <Button className='myModalButton'  
                                    style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                                    onClick={ async () => {
                                        window.blockChainOrt = "ethereum";
                                        this.setState({showModalDialog:false})
                                        if(this.state.goHome) {
                                            this.props.history.push('/');
                                        } else if(!this.state.isLoggedIn) {
                                            try {
                                                if(!this.state.accounts || !this.state.web3) {
                                                    await initWeb3(this.state.chainId, this);
                                                }
                                                await LogIn(this.state.accounts[0], this.state.web3, this);
                                                if(this.state.isLoggedIn) {
                                                    await this.checkWL(this.state.chainId);
                                                }
                                            } catch (err) {
                                                console.log(err);
                                                this.setState({showModal:true,
                                                    goHome: true,
                                                    waitToClose: false,
                                                    isLoggedIn: false,
                                                    modalTitle: 'authFailedTitle',
                                                    modalMessage: 'authFailedMessage',
                                                    modalButtonMessage: 'closeBtn',
                                                    modalButtonVariant: "#E63C36"}
                                                );
                                            }
                                        }
                                    }}>
                                    Ethereum
                                </Button>
                                </Col>
                                <Col  md = '6'> 
                                <Button className='myModalButton'
                                style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                                onClick={ async () => {
                                    this.setState({showModalDialog:false});
                                    window.blockChainOrt = "tron";
                                    if(this.state.goHome) {
                                        this.props.history.push('/');
                                    } else if(!this.state.isLoggedInTron) {
                                        try {
                                            if(!window.tronWeb) {
                                                await initTron(this.state.tronChainId , this);
                                            } 
                                            await  LogInTron(this); 
                                            if(this.state.isLoggedInTron) {
                                            await this.checkWLTron(this.state.tronChainId);
                                            }  
                                        } catch (err) {
                                            console.log(err);
                                            this.setState({showModal:true,
                                                goHome: true,
                                                waitToClose: false,
                                                isLoggedInTron: false,
                                                modalTitle: 'authFailedTitle',
                                                modalMessage: 'authFailedMessage',
                                                modalButtonMessage: 'closeBtn',
                                                modalButtonVariant: "#E63C36"}
                                            );
                                        }
                                    }
                                }}>
                            Tron
                            </Button>
                            </Col>
                            </Row> 
                            </Modal.Dialog>
                            )}
                        </UserContext.Consumer>
                        }
                   </Modal.Body>
                </Modal>
                <div id="campaingListMainDiv">
                    <Container>
                        {this.state.campaigns.map((item, i) =>
                            <Row style={{marginBottom: '20px'}} key={i}>
                                <Card>
                                    <Row>
                                        <Col sm='3' id='picColumn'>
                                            <Card.Img src={item.mainImageURL} fluid='true' />
                                        </Col>
                                        <Col >
                                            <Link to={'/campaign/' + item._id} id='cardLink'>
                                            <Row>
                                                <Card.Body>
                                                    <Card.Title>{i18nString(item.title, i18n.language)}</Card.Title>
                                                    <Card.Text>{`${DescriptionPreview(item.description, i18n.language)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id='readMore'><Trans i18nKey='readMore'/></span></Card.Text>
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>{item.raisedAmount}</span>{i18n.t('raised')}{item.maxAmount} {i18n.t('goal')}</p>
                                                    <ProgressBar now={100 * item.raisedAmount/item.maxAmount} />
                                                </Card.Body>
                                            </Row>
                                            </Link>
                                            <Row id='buttonsRow'>
                                                <Col className='buttonCol'><Button variant="danger" id='donateBtn' block onClick={() => this.closeCampaignPrep(item._id, item.mainImageURL)}><Trans i18nKey='closeCmpnBtn'/></Button></Col>
                                                {item.new &&
                                                 <Col className='buttonCol'><Link to={'/withdrawDonations/' + item.key} id='cardLink'><Button id='editBtn' block><Trans i18nKey='withdrawDonations'/></Button></Link></Col>
                                                }
                                                <Col className='buttonCol'><Link to={'/editCampaign/' + item.key} id='cardLink'><Button id='editBtn' block><Trans i18nKey='editCmpnBtn'/></Button></Link></Col>
                                            </Row>
                                        </Col>
                                    </Row>
                                </Card>
                            </Row>
                        )}
                    </Container>
                </div>
            </div>

        );
    }
}

export default UserCampaigns;
