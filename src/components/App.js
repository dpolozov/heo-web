import {Component, Suspense} from 'react';
import React from 'react';
import CampaignPage from './CampaignPage';
import CreateCampaign from './CreateCampaign';
import UserCampaigns from './UserCampaigns';
import EditCampaign from './EditCampaign';
import MyDonations from "./MyDonations";
import logo from '../images/heo-logo.png';
import Home from "./Home";
import '../css/app.css';
import '../css/modal.css';
import { BrowserRouter as Router, Switch, Route, Link, withRouter } from "react-router-dom";
import { Nav, Navbar, Container, Button, Modal } from 'react-bootstrap';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import { Trans } from 'react-i18next';
import { GetLanguage, LogIn, checkAuth, initWeb3, initWeb3Modal, clearWeb3Provider } from '../util/Utilities';
import axios from 'axios';
import config from 'react-global-configuration';
import i18n from '../util/i18n';
import {UserContext} from './UserContext';
import Web3Modal from 'web3modal';
import Web3 from 'web3';
import WalletConnectProvider from '@walletconnect/web3-provider';

const HELP_URLS = {
    "ru":"https://helpeachother.gitbook.io/faq/",
    "en":"https://helpeachother.gitbook.io/faq/v/english/",
}
class App extends Component {
    constructor(props) {
        super(props);
        this.toggleLoggedIn = (val) => {
            this.setState({isLoggedIn: val});
        };

        this.state = {
            toggleLoggedIn: this.toggleLoggedIn,
            language: 'en',
            isLoggedIn: false,
            showError: false,
            showModal: false,
            waitToClose: false,
            modalMessage: "",
            modalTitle: "",
            modalButtonMessage: "",
            modalButtonVariant: ""
        };
    }

    async componentDidMount() {
        let lang = GetLanguage();
        this.setState({language : lang});
        await initWeb3Modal();
        await checkAuth(this, true);
    }

    async setLanguage(lang) {
        await i18n.changeLanguage(lang);
        this.setState({language: lang});
    }

    async setLoggedIn() {
        if(this.state.isLoggedIn) {
            await clearWeb3Provider(this);
            await axios.post('/api/auth/logout');
            this.setState({isLoggedIn : false});
            this.props.history.push('/');
        } else {
            if(!this.state.accounts || !this.state.accounts[0] || !this.state.web3) {
                await initWeb3(this);
            }
            try {
                await LogIn(this.state.accounts[0], this.state.web3, this);
                if(this.state.isLoggedIn) {
                    this.props.history.push('/');
                } else {
                    this.setState({showModal:true,
                        waitToClose: false,
                        modalTitle: 'authFailedTitle',
                        modalMessage: 'authFailedMessage',
                        modalButtonMessage: 'closeBtn',
                        modalButtonVariant: "#E63C36"}
                    );
                    await clearWeb3Provider(this);
                }
            } catch (err) {
                console.log(err);
                this.setState({showModal:true,
                    waitToClose: false,
                    modalTitle: 'authFailedTitle',
                    modalMessage: 'authFailedMessage',
                    modalButtonMessage: 'closeBtn',
                    modalButtonVariant: "#E63C36"}
                );
                await clearWeb3Provider(this);
            }

        }
    }

    render() {
        return (
            <UserContext.Provider value={this.state}>
            <Suspense fallback="...is loading">
                <main>
                    <div>
                        <Navbar id="upperNav" fixed="top">
                            <Container>
                                <Navbar.Brand href="/" id='upperNavSlogan'><Trans i18nKey='slogan'/></Navbar.Brand>
                                <Navbar.Toggle />
                                <Navbar.Collapse className="justify-content-end">
                                <select value={this.state.language} id="languages" onChange={(e)=>this.setLanguage(e.target.value)}>
                                    <option value='en'>{i18n.t('english')}</option>
                                    <option value='ru'>{i18n.t('russian')}</option>
                                </select>
                                    <Nav.Link target="_blank" href={HELP_URLS[this.state.language]} className='upperNavText' id='helpBtn'><Trans i18nKey='help'/></Nav.Link>
                                    <Nav.Link className='upperNavText' id='loginBtn' onClick={ () => this.setLoggedIn()}>
                                        {!this.state.isLoggedIn && <Trans i18nKey='login'/>}
                                        {this.state.isLoggedIn && <Trans i18nKey='logout'/>}
                                    </Nav.Link>
                                </Navbar.Collapse>
                            </Container>
                        </Navbar>
                    </div>
                    <div id="mainNavContainer">
                        <Navbar collapseOnSelect expand="lg" id="mainNav" fixed="top">
                            <Container>
                                <Navbar.Brand href="/">
                                            <img
                                                src={logo}
                                                width="50"
                                                height="50"
                                                className="d-inline-block align-top"
                                                alt="HEO logo"
                                            />
                                </Navbar.Brand>
                                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                                <Navbar.Collapse id="basic-navbar-nav">
                                    <Nav className="mr-auto" bg="light">
                                        <Nav.Link as={Link} eventKey="1" className='mainNavText' to="/"><Trans i18nKey='browse'/></Nav.Link>
                                        <Nav.Link as={Link} eventKey="2" className='mainNavText' to={{pathname:"/new",
                                            state:{
                                                isLoggedIn: this.state.isLoggedIn,
                                                accounts: this.state.accounts
                                            }}} >
                                            <Trans i18nKey='startFundraiser'/>
                                        </Nav.Link>
                                        <Nav.Link as={Link} eventKey="3" className='mainNavText' to={{pathname:"/myCampaigns",
                                            state:{
                                                isLoggedIn: this.state.isLoggedIn,
                                                accounts: this.state.accounts
                                            }}} >
                                            <Trans i18nKey='myFundraisers'/>
                                        </Nav.Link>
                                        <Nav.Link as={Link} eventKey="4" className='mainNavText' as='a' target='_blank' href='https://heo.finance'><Trans i18nKey='about'/></Nav.Link>
                                    </Nav>
                                </Navbar.Collapse>
                            </Container>
                        </Navbar>
                    </div>
                    <div>
                        <Modal onHide={()=>{}} show={this.state.showModal} className='myModal' centered>
                            <Modal.Body>
                                <p className='modalIcon'>
                                    {this.state.modalIcon == 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                                    {this.state.modalIcon == 'ExclamationTriangle' && <ExclamationTriangle/>}
                                    {this.state.modalIcon == 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                                    {this.state.modalIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                                </p>
                                <p className='modalTitle'><Trans i18nKey={this.state.modalTitle} /></p>
                                <p className='modalMessage'><Trans i18nKey={this.state.modalMessage} /></p>
                                {!this.state.waitToClose &&
                                <Button className='myModalButton'
                                        style={{
                                            backgroundColor: this.state.modalButtonVariant,
                                            borderColor: this.state.modalButtonVariant
                                        }}
                                        onClick={() => {
                                            if(this.state.onModalClose) {
                                                this.state.onModalClose();
                                            }
                                            this.setState({showModal: false, onModalClose: false});
                                        }}>
                                    <Trans i18nKey={this.state.modalButtonMessage} />
                                </Button>
                                }
                            </Modal.Body>
                        </Modal>
                        <Container  style={{ marginTop: '7em' }}>
                            <Switch>
                                <Route path="/campaign" component={CampaignPage} />
                                <Route path="/myCampaigns" component={UserCampaigns} />
                                <Route path="/new" component={CreateCampaign} />
                                <Route path="/rewards" component={MyDonations} />
                                <Route path="/editCampaign" component={EditCampaign} />
                                <Route path="/" component={Home} />
                                <Route component={Error} />
                            </Switch>
                        </Container>
                    </div>
                </main>
            </Suspense>
            </UserContext.Provider>
        );
    }
}

export default withRouter(App);