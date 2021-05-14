import React from 'react';
import App from './components/App';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from "react-router-dom";
import config from 'react-global-configuration';
import configuration from './config';
import loadServerProps from './util/serverprops';
import 'bootstrap/dist/css/bootstrap.min.css';
import './util/i18n';

import './index.css';
import 'semantic-ui-css/semantic.min.css'

(function clientJS() {
    //Load configs from server
    loadServerProps().then(jsonConfig => {
        configuration["CHAIN"] =  jsonConfig.REACT_APP_CHAIN_ID;
        configuration["CHAIN_NAME"]= jsonConfig.REACT_APP_CHAIN_NAME;
        config.set(configuration);
        ReactDOM.render(
            <Router>
                <App />
            </Router>,
            document.getElementById('root')
        )
    });

}());
