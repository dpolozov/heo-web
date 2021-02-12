import React from 'react';
import CampaignPage from './CampaignPage';
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
                        <Menu.Item as='a' header><Image size='mini' src={logo} style={{ marginRight: '1.5em' }} />
                            Help Each Other
                        </Menu.Item>
                    </Container>
                </Menu>
                <Container  style={{ marginTop: '7em' }}>
                    <Switch>
                        <Route path="/campaign" component={CampaignPage} />
                        <Route path="/" component={Home} />
                        <Route component={Error} />
                    </Switch>
                </Container>
            </main>
        );
    }
}

export default App;