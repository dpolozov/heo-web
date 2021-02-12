import React from 'react';
import CampaignPage from './CampaignPage';
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
                <Switch>
                    <Route path="/campaign" component={CampaignPage} />
                    <Route path="/" component={Home} />
                    <Route component={Error} />
                </Switch>
            </main>
        );
    }
}

export default App;