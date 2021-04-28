import React from 'react';
import CampaignPage from './CampaignPage';
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
import { Nav, Navbar, Form, FormControl, Container, Image } from 'react-bootstrap';
import {Search} from 'react-bootstrap-icons';
class App extends React.Component {
    render() {
        return (
            <main>
                <div>
                    <Navbar id="upperNav" fixed="top">
                        <Container>
                            <Navbar.Brand href="#home" id='upperNavSlogan'>EARN REWARDS ON YOUR DONATIONS</Navbar.Brand>
                            <Navbar.Toggle />
                            <Navbar.Collapse className="justify-content-end">
                                <Nav.Link className='upperNavText'>Help</Nav.Link>
                                <Nav.Link className='upperNavText' id='loginBtn'>Login</Nav.Link>
                            </Navbar.Collapse>
                        </Container>
                    </Navbar>
                </div>
                <div id="mainNavContainer">
                <Navbar expand="lg" id="mainNav" fixed="top">
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
                            <Nav.Link className='mainNavText' as='a' href="/">Browse Fundraisers</Nav.Link>
                            <Nav.Link className='mainNavText' as='a' href="/new">Start A Fundraiser</Nav.Link>
                            <Nav.Link className='mainNavText' as='a' href="/myCampaigns">My Fundraisers</Nav.Link>
                            <Nav.Link className='mainNavText' as='a' href="/rewards">My Rewards</Nav.Link>
                            <Nav.Link className='mainNavText' as='a' target='_blank' href='https://heo.finance'>About HEO</Nav.Link>
                        </Nav>
                        <Form inline id='mainNavSearch'>
                                <Search id='searchIcon'/>
                                <FormControl type="text" placeholder="Find A Campaign" id="navSearchField" />
                        </Form>
                    </Navbar.Collapse>
                    </Container>
                </Navbar>                              
                </div>
                <Container  style={{ marginTop: '7em' }}>
                    <Switch>
                        <Route path="/campaign" component={CampaignPage} />
                        <Route path="/myCampaigns" component={UserCampaigns} />
                        <Route path="/new" component={CreateCampaign} />
                        <Route path="/buyheo" component={PublicSale} />
                        <Route path="/rewards" component={MyDonations} />
                        <Route path="/" component={Home} />
                        <Route component={Error} />
                    </Switch>
                </Container>
            </main>
        );
    }
}

export default App;