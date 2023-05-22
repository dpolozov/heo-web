import React from 'react';
import CampaignList from './CampaignList';
import FinishedCampaigns from './FinishedCampaigns';
import '../css/home.css';
class Home extends React.Component {

    render() {
        return (
            <div>
                <div className="heo-head">
                    <h3>Funded</h3>
                </div>
                <FinishedCampaigns/>
                <div className="heo-head">
                    <h3>In Progress</h3>
                </div>
                <CampaignList/>
            </div>
        );
    }
}

export default Home;
