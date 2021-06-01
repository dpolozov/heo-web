import {React, Component, Suspense} from 'react';
import CampaignPage from './CampaignPage';
import CreateCampaign from './CreateCampaign';
import UserCampaigns from './UserCampaigns';
import EditCampaign from './EditCampaign';
import MyDonations from "./MyDonations";
import logo from '../images/heo-logo.png';
import Home from "./Home";
import '../css/app.css';
import { BrowserRouter as Router, Switch, Route, Link, withRouter } from "react-router-dom";
import { Nav, Navbar, Container, Button, Modal } from 'react-bootstrap';
import { XCircle } from 'react-bootstrap-icons';
import { Trans } from 'react-i18next';
import { GetLanguage } from '../util/Utilities';
import axios from 'axios';
import config from 'react-global-configuration';
import i18n from '../util/i18n';

var ACCOUNTS, web3;

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            language: 'en',
            isLoggedIn: false,
            showError: false,
            showModal: false,
            modalMessage: "",
            errorMessage: "",
            modalButtonMessage: "",
            modalButtonVariant: ""
        };
    }

    async componentDidMount() {
        let lang = GetLanguage();
        this.setState({language : lang});
        try {
            if (typeof window.ethereum !== 'undefined') {
                let res = await axios.get('/api/auth/status');
                if(res.data.addr) {
                    var ethereum = window.ethereum;
                    ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
                    if(ACCOUNTS[0] == res.data.addr) {
                        this.setState({isLoggedIn : true});
                    }
                }
            }
        } catch (err) {
            this.setState({isLoggedIn : false});
        }
    }

    async setLanguage(lang) {
        await i18n.changeLanguage(lang);
        this.setState({language: lang});
    }

    async setLoggedIn() {
        if(this.state.isLoggedIn) {
            await axios.post('/api/auth/logout');
            this.setState({isLoggedIn : false});
            this.props.history.push('/');
        } else {
            if (typeof window.ethereum !== 'undefined') {
                var ethereum = window.ethereum;
                ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
                web3 = (await import("../remote/" + config.get("CHAIN") + "/web3")).default;
                try {
                    let res = await axios.get('/api/auth/msg');
                    let dataToSign = res.data.dataToSign;
                    let signature = await web3.eth.personal.sign(dataToSign, ACCOUNTS[0]);
                    let authRes = await axios.post('/api/auth/jwt', {signature:signature, addr:ACCOUNTS[0]}, {headers: {"Content-Type": "application/json"}});
                    let sucess = authRes.data.sucess;
                    if(sucess) {
                        this.setState({isLoggedIn : true});
                        this.props.history.push('/');
                    }
                } catch (err) {
                    this.setState({showModal:true,
                        errorMessage: i18n.t('authFailedTitle'),
                        modalMessage: i18n.t('authFailedMessage'),
                        modalButtonMessage: i18n.t('closeBtn'),
                        modalButtonVariant: "#E63C36"}
                    );
                }
            } else {
                this.setState({
                    showModal: true,
                    errorMessage: i18n.t('web3WalletRequired'),
                    modalMessage: i18n.t('pleaseInstallMetamask'),
                    modalButtonMessage: i18n.t('closeBtn'),
                    modalButtonVariant: "#E63C36"
                });
            }
        }
    }

    render() {
        return (
            <Suspense fallback="...is loading">
                <main>
                    <div>
                        <Navbar id="upperNav" fixed="top">
                            <Container>
                                <Navbar.Brand href="#home" id='upperNavSlogan'><Trans i18nKey='slogan'/></Navbar.Brand>
                                <Navbar.Toggle />
                                <Navbar.Collapse className="justify-content-end">
                                <select value={this.state.language} id="languages" onChange={(e)=>this.setLanguage(e.target.value)}>
                                    <option value='en'>{i18n.t('english')}</option>
                                    <option value='ru'>{i18n.t('russian')}</option>
                                </select>
                                    <Nav.Link className='upperNavText' id='helpBtn'><Trans i18nKey='help'/></Nav.Link>
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
                                    <Nav.Link className='mainNavText' href="/"><Trans i18nKey='browse'/></Nav.Link>
                                    <Nav.Link className='mainNavText' href="/new"><Trans i18nKey='startFundraiser'/></Nav.Link>
                                    {this.state.isLoggedIn &&
                                        <Nav.Link className='mainNavText' href="/myCampaigns"><Trans i18nKey='myFundraisers'/></Nav.Link>
                                    }

                                    <Nav.Link className='mainNavText' as='a' target='_blank' href='https://heo.finance'><Trans i18nKey='about'/></Nav.Link>
                                </Nav>
                            </Navbar.Collapse>
                        </Navbar>
                    </div>
                    <div>
                        <Modal show={this.state.showModal} onHide={this.state.showModal} className='myModal' centered>
                            <Modal.Body><p className='errorIcon'>
                                <XCircle style={{color: '#E63C36'}}/>
                            </p>
                                <p className='errorMessage'>{this.state.errorMessage}</p>
                                <p className='modalMessage'>{this.state.modalMessage}</p>
                                <Button className='myModalButton'
                                        style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                                        onClick={ () => {this.setState({showModal:false})}}>
                                    {this.state.modalButtonMessage}
                                </Button>
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
        );
    }
}

export default withRouter(App);