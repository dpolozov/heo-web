import React, { Component, lazy } from 'react';
import config from 'react-global-configuration';
import '../css/modal.css';
import '../css/campaignList.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal } from 'react-bootstrap';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { i18nString, DescriptionPreview, LogIn, initWeb3, checkAuth, initWeb3Modal } from '../util/Utilities';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import {UserContext} from './UserContext';
import i18next from 'i18next';

import Web3Modal from 'web3modal';
import Web3 from 'web3';
import WalletConnectProvider from '@walletconnect/web3-provider';

var CAMPAIGNINSTANCE;

class UserCampaigns extends Component {
    constructor(props) {
        super(props);

        this.state = {
            campaigns: [],
            showError:false,
            modalTitle:"",
            modalMessage:"",
            isLoggedIn:false,
            whiteListed:false,
            showTwoButtons: false,
            campaignAddress: '',
            fileName: ''
        };
    }

    async checkWL() {
        try {
            //is white list enabled?
            if(!this.state.web3 || !this.state.accounts) {
                await initWeb3(this);
            }
            let abi = (await import("../remote/" + config.get("CHAIN") + "/HEOParameters")).abi;
            let address = (await import("../remote/" + config.get("CHAIN") + "/HEOParameters")).address;
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
        await initWeb3Modal(this);
        // is the user logged in?
        if(!this.state.isLoggedIn) {
            await checkAuth(this);
        }
        if(this.state.isLoggedIn) {
            await this.checkWL();
        } else {
            //need to log in first
            this.setState({
                showModal: true,
                isLoggedIn : false,
                whiteListed: false,
                goHome: false,
                modalTitle: 'pleaseLogInTitle',
                modalMessage: 'pleaseLogInToCreateMessage',
                modalIcon: 'XCircle', modalButtonMessage: 'login',
                modalButtonVariant: "#E63C36", waitToClose: false});
        }
    }

    async loadCampaigns() {
        this.setState({showModal:true, modalTitle: 'processingWait',
            modalMessage: 'waitingForNetowork', errorIcon:'HourglassSplit',
            modalButtonVariant: "gold", waitToClose: true});
        var campaigns = [];
        var modalTitle = 'failedToLoadCampaigns';
        axios.post('/api/campaign/loadUserCampaigns', {}, {headers: {"Content-Type": "application/json"}})
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
    }

    async closeCampaignPrep(address, imageURL){
        if(!this.state.web3 || !this.state.accounts) {
            await initWeb3(this);
        }
        console.log('close campaign');
        this.setState({
            showTwoButtons: true, waitToClose: true,
            showModal: true, errorIcon:'ExclamationTriangle',
            modalTitle: 'closeCampaign',
            modalMessage: 'final',
            campaignAddress: address
        })
        let abi = (await import("../remote/"+ config.get("CHAIN") + "/HEOCampaign")).default;
        CAMPAIGNINSTANCE = new this.state.web3.eth.Contract(abi, address);
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
            var that = this;
            let result = await CAMPAIGNINSTANCE.methods.close().send({from:this.state.accounts[0]}).on('transactionHash',
                    function(transactionHash) {
                        that.setState({showModal:true, modalTitle: 'processingWait',
                            modalMessage: 'waitingForNetowork', modalIcon: 'HourglassSplit',
                            modalButtonVariant: "gold", waitToClose: true});
                    });
            this.deleteimage();
            this.deleteFromDB();
            this.setState({
                modalMessage: 'campaignDeleted', modalTitle: 'complete',
                errorIcon: 'CheckCircle', modalButtonMessage: i18n.t('ok'),
                modalButtonVariant: '#588157', waitToClose: false, showTwoButtons: false,
            })
        } catch (err){
            console.log(err);
            this.setState({
                waitToClose: false, modalMessage: 'technicalDifficulties',
                errorIcon:'XCircle', modalButtonMessage: 'closeBtn', modalTitle: 'failed',
                modalButtonVariant: "#E63C36", waitToClose: false, showTwoButtons: false})
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

    async deleteFromDB (){
        let data = {address : this.state.campaignAddress};
        return axios.post('/api/campaign/delete', data, {headers: {"Content-Type": "application/json"}})
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
                    <Modal.Body><p className='errorIcon'>
                        {this.state.errorIcon == 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.errorIcon == 'ExclamationTriangle' && <ExclamationTriangle style={{color: '#E63C36'}}/>}
                        {this.state.errorIcon == 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.errorIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                    </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p>
                        <p className='modalMessage'>
                            <Trans i18nKey={this.state.modalMessage}>
                            Your account has not been cleared to create campaigns.
                            Please fill out this
                                <a target='_blank' href='https://docs.google.com/forms/d/e/1FAIpQLSdTo_igaNjF-1E51JmsjJgILv68RN2v5pisTcqTLvZvuUvLDQ/viewform'>form</a>
                                to be granted permission to fundraise on HEO Platform
                            </Trans>
                        </p>
                        {this.state.showTwoButtons &&
                            <Container>
                                <Button id='closeCampaign' onClick={() => this.closeCampaign()}>{i18n.t('yes')}</Button>
                                <Button id='cancelClose' onClick={() => this.setState({showModal:false})}>{i18n.t('no')}</Button>
                            </Container>
                        }
                        {!this.state.waitToClose &&
                        <UserContext.Consumer>
                            {({isLoggedIn, toggleLoggedIn}) => (
                                <Button className='myModalButton'
                                        style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                                        onClick={ async () => {
                                            this.setState({showModal:false})
                                            if(this.state.goHome) {
                                                this.props.history.push('/');
                                            } else if(!this.state.isLoggedIn) {
                                                try {
                                                    if(!this.state.accounts || !this.state.web3) {
                                                        await initWeb3(this);
                                                    }
                                                    await LogIn(this.state.accounts[0], this.state.web3, this);
                                                    if(this.state.isLoggedIn) {
                                                        toggleLoggedIn(true);
                                                        await this.checkWL();
                                                    }
                                                } catch (err) {
                                                    this.setState({showModal:true,
                                                        goHome: true,
                                                        isLoggedIn: false,
                                                        waitToClose: false,
                                                        campaigns: [],
                                                        modalTitle: 'authFailedTitle',
                                                        modalMessage: 'authFailedMessage',
                                                        modalButtonMessage: 'closeBtn',
                                                        modalButtonVariant: "#E63C36"}
                                                    );
                                                }
                                            } else {
                                                this.loadCampaigns();
                                            }
                                        }}>
                                    <Trans i18nKey={this.state.modalButtonMessage} />
                                </Button>
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
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>{`$${item.raisedAmount}`}</span>{i18n.t('raised')}{item.maxAmount} {i18n.t('goal')}</p>
                                                    <ProgressBar now={100 * item.raisedAmount/item.maxAmount} />
                                                </Card.Body>
                                            </Row>
                                            </Link>
                                            <Row id='buttonsRow'>
                                                <Col className='buttonCol'><Button variant="danger" id='donateBtn' block onClick={() => this.closeCampaignPrep(item._id, item.mainImageURL)}><Trans i18nKey='closeCmpnBtn'/></Button></Col>
                                                <Col className='buttonCol'><Link to={'/editCampaign/' + item._id} id='cardLink'><Button id='editBtn' block><Trans i18nKey='editCmpnBtn'/></Button></Link></Col>
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