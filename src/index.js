import React from 'react';
import App from './components/App';
import ReactDOM from 'react-dom';
import './index.css';
import 'semantic-ui-css/semantic.min.css'
import config from 'react-global-configuration';
import configuration from './config';

config.set(configuration);
ReactDOM.render(
    <App />,
    document.getElementById('root')
);
