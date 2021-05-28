import {React, Component, Suspense} from 'react';
import CampaignPage from './CampaignPage';
import CreateCampaign2 from './CreateCampaign2';
import CreateCampaign from './CreateCampaign';
import UserCampaigns from './UserCampaigns';
import PublicSale from './PublicSale';
import MyDonations from "./MyDonations";
import logo from '../images/heo-logo.png';
import Home from "./Home";
import '../css/app.css';
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link
} from "react-router-dom";
import { Nav, Navbar, Form, FormControl, Container } from 'react-bootstrap';
import {Search} from 'react-bootstrap-icons';
import { Trans } from 'react-i18next';
import { GetLanguage, Login } from '../util/Utilities';
import i18n from '../util/i18n';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            language: 'en',
            isLoggedIn: false,           
        };
    }

    async componentDidMount(){
        console.log('inside component did mount');
        let lang = GetLanguage();
        this.setState({language : lang});
        // console.log(lang);
    }

    async setLanguage(lang){        
        await i18n.changeLanguage(lang);
        this.setState({language: lang});
    }

    async setLoggedIn(){
        console.log('setLoggedIn is called');
        if( await Login()){
            this.setState({isLoggedIn : true});
        } else {
            this.setState({isLoggedIn : false});
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
                                <Nav.Link className='mainNavText' href="/myCampaigns"><Trans i18nKey='myFundraisers'/></Nav.Link>
                                <Nav.Link className='mainNavText' as='a' target='_blank' href='https://heo.finance'><Trans i18nKey='about'/></Nav.Link>
                            </Nav>
                        </Navbar.Collapse>
                    </Navbar>                              
                    </div>
                    <Container  style={{ marginTop: '7em' }}>
                        <Switch>
                            <Route path="/campaign" component={CampaignPage} />
                            <Route path="/myCampaigns" component={UserCampaigns} />
                            <Route path="/new" component={CreateCampaign2} />
                            <Route path="/buyheo" component={PublicSale} />
                            <Route path="/rewards" component={MyDonations} />
                            <Route path="/" component={Home} />
                            <Route component={Error} />
                        </Switch>
                    </Container>
                </main>
            </Suspense>
        );
    }
}

export default App;