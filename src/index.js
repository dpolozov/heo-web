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
import 'semantic-ui-css/semantic.min.css';
import * as Sentry from "@sentry/react";
import { Integrations } from "@sentry/tracing";



(function clientJS() {
    Sentry.init({
        dsn: "https://bd347d6c25b14066bfe38628a18ca151@o899113.ingest.sentry.io/5880381",
        integrations: [new Integrations.BrowserTracing()],
      
        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: 1.0,
    })
    //Load configs from server
    loadServerProps().then(jsonConfig => {
        for(var a in jsonConfig) {
            configuration[a] = jsonConfig[a];
        }
        config.set(configuration);
        ReactDOM.render(
            <Router>
                <App />
            </Router>,
            document.getElementById('root')
        )
    });

}());
