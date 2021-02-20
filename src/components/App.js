import React from 'react';
import CampaignPage from './CampaignPage';
import CreateCampaign from './CreateCampaign';
import logo from '../images/heo-logo.png';
import {Menu, Image, Container} from "semantic-ui-react";
import Home from "./Home";
import {
    BrowserRouter as Router,
    Switch,
    Route,
    Link
} from "react-router-dom";
class App extends React.Component {
    render() {
        return (
            <main>
                <Menu fixed='top'>
                    <Container>
                        <Menu.Item as='a' href='/' header><Image size='mini' src={logo} style={{ marginRight: '1.5em' }} />
                            Help Each Other
                        </Menu.Item>
                        <Menu.Item as='a' href='/'>Browse fundraisers</Menu.Item>
                        <Menu.Item as='a' href='/new'>Start a fundraiser</Menu.Item>
                        <Menu.Item as='a' target='_blank' href='https://heo.finance'>About HEO</Menu.Item>
                        <Menu.Item as='a' target='_blank' href='https://heo.finance'>Buy HEO tokens</Menu.Item>
                    </Container>
                </Menu>
                <Container  style={{ marginTop: '7em' }}>
                    <Switch>
                        <Route path="/campaign" component={CampaignPage} />
                        <Route path="/new" component={CreateCampaign} />
                        <Route path="/" component={Home} />
                        <Route component={Error} />
                    </Switch>
                </Container>
            </main>
        );
    }
}

export default App;