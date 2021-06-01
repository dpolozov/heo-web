import React, { Component, lazy } from 'react';
import config from 'react-global-configuration';
import '../css/campaignList.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal } from 'react-bootstrap';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { DescriptionPreview, LogIn } from '../util/Utilities';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import {UserContext} from './UserContext';

var ACCOUNTS, web3, HEOParameters;

class UserCampaigns extends Component {
    constructor(props) {
        super(props);

        this.state = {
            campaigns: [],
            showError:false,
            modalTitle:"",
            modalMessage:"",
            isLoggedIn:false,
            whiteListed:false
        };
    }

    async checkWL() {
        //is white list enabled?
        let wlEnabled = await HEOParameters.methods.intParameterValue(11).call();
        if(wlEnabled > 0) {
            //is user white listed?
            let whiteListed = await HEOParameters.methods.addrParameterValue(5,ACCOUNTS[0]).call();
            if(whiteListed > 0) {
                this.setState({
                    isLoggedIn : true,
                    whiteListed: true,
                    showModal: false,
                    goHome: false
                });
                this.getCampaigns();
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
            this.getCampaigns();
        }
    }

    async componentDidMount() {
        if (typeof window.ethereum !== 'undefined') {
            var ethereum = window.ethereum;
            try {
                ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
            } catch {
                this.setState({
                    showModal:true,
                    campaigns : [],
                    modalTitle: 'web3WalletRequired',
                    goHome: true,
                    modalMessage: 'pleaseUnlockMetamask',
                    errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }
            web3 = (await import("../remote/" + config.get("CHAIN") + "/web3")).default;
            HEOParameters = (await import("../remote/" + config.get("CHAIN") + "/HEOParameters")).default;
            // is the user logged in?
            if(!this.state.isLoggedIn) {
                try {
                    let res = await axios.get('/api/auth/status');
                    if (res.data.addr && ACCOUNTS[0] == res.data.addr) {
                        this.setState({isLoggedIn: true, showModal: false});
                    } else {
                        //must have logged in with different account before
                        await axios.post('/api/auth/logout');
                    }
                } catch (err) {
                    this.setState({
                        showModal: true,
                        isLoggedIn: false,
                        campaigns : [],
                        goHome: true,
                        modalTitle: 'authFailedTitle',
                        modalMessage: 'technicalDifficulties',
                        errorIcon: 'XCircle', modalButtonMessage: 'returnHome',
                        modalButtonVariant: "#E63C36", waitToClose: false});
                }
            }
            if(this.state.isLoggedIn) {
                await this.checkWL();
            } else {
                //need to log in first
                this.setState({
                    showModal: true,
                    campaigns : [],
                    isLoggedIn : false,
                    whiteListed: false,
                    goHome: false,
                    modalTitle: 'pleaseLogInTitle',
                    modalMessage: 'pleaseLogInToCreateMessage',
                    errorIcon: 'XCircle', modalButtonMessage: 'login',
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }
        } else {
            this.setState({showModal:true,
                modalTitle: 'web3WalletRequired',
                campaigns : [],
                modalMessage: 'pleaseInstallMetamask',
                errorIcon:'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: "#E63C36", waitToClose: false});
        }
    }

    getCampaigns() {
        this.setState({showModal:true, modalTitle: 'processingWait',
            modalMessage: 'waitingForNetowork', errorIcon:'HourglassSplit',
            modalButtonVariant: "gold", waitToClose: true});
        var campaigns = [];
        var modalTitle = 'failedToLoadCampaigns';
        var that = this;
        axios.post('/api/campaigns/loadUserCampaigns', {}, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            campaigns = res.data;
            that.setState({
                showModal: false,
                campaigns:campaigns
            });
        }).catch(err => {
            modalTitle = 'failedToLoadCampaigns'
            console.log(err);
            that.setState({showModal:true,
                modalTitle: modalTitle,
                modalMessage: 'technicalDifficulties',
                errorIcon:'XCircle', modalButtonMessage: 'returnHome',
                modalButtonVariant: "#E63C36", waitToClose: false});
        })
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
                <Modal show={this.state.showModal} onHide={this.state.showModal} className='myModal' centered>
                    <Modal.Body><p className='errorIcon'>
                        {this.state.errorIcon == 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.errorIcon == 'ExclamationTriangle' && <ExclamationTriangle/>}
                        {this.state.errorIcon == 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.errorIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                    </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p>
                        <p className='modalMessage'>
                            <Trans i18nKey={this.state.modalMessage}>
                            Your account has not been cleared to create campaigns.
                            Please fill out this
                                <Link  as='a' target='_blank' to='https://docs.google.com/forms/d/e/1FAIpQLSdTo_igaNjF-1E51JmsjJgILv68RN2v5pisTcqTLvZvuUvLDQ/viewform'>form</Link>
                                to ne granted permission to fundraise on HEO Platform
                            </Trans>
                        </p>
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
                                                    if(await LogIn(ACCOUNTS[0], web3)) {
                                                        toggleLoggedIn(true);
                                                        this.setState({isLoggedIn: true, showModal: false});
                                                        await this.checkWL();
                                                    }
                                                } catch (err) {
                                                    this.setState({showModal:true,
                                                        goHome: true,
                                                        isLoggedIn: false,
                                                        campaigns: [],
                                                        errorMessage: 'authFailedTitle',
                                                        modalMessage: 'authFailedMessage',
                                                        modalButtonMessage: 'closeBtn',
                                                        modalButtonVariant: "#E63C36"}
                                                    );
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
                <div id="campaingListMainDiv">
                    <Container>
                        {this.state.campaigns.map((item, i) =>
                            <Row style={{marginBottom: '20px'}} key={i}>
                                <Link to={'/campaign/' + item._id} id='cardLink'>
                                <Card>
                                    <Row>
                                        <Col sm='3' id='picColumn'>
                                            <Card.Img src={item.mainImage} fluid='true' />
                                        </Col>
                                        <Col >
                                            <Row>                                  
                                                <Card.Body>
                                                    <Card.Title>{item.title}</Card.Title> 
                                                    <Card.Text>{`${DescriptionPreview(item.campaignDesc)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id='readMore'>Read More</span></Card.Text>
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>{`$${item.raisedAmount}`}</span>{i18n.t('raised')}{item.maxAmount} {i18n.t('goal')}</p>
                                                    <ProgressBar now={item.percentRaised} /> 
                                                </Card.Body>
                                            </Row>
                                            <Row id='buttonsRow'>
                                                <Col className='buttonCol'><div id='rewardsBtn' className='cardButtons'><p><Trans i18nKey='reward'/> {item.reward}</p></div></Col>                                                  
                                                <Col className='buttonCol'><Link to={'/editCampaign/' + item._id} id='cardLink'><Button id='editBtn' block>EDIT</Button></Link></Col>
                                            </Row> 
                                        </Col>
                                    </Row>
                                </Card>
                                </Link>
                            </Row>                           
                        )} 
                    </Container>
                </div>
            </div>

        );
    }
}

export default UserCampaigns;