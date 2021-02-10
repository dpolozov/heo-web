import React, { Component } from 'react';
import Campaign from './Campaign';
import {
    Container,
    Grid,
    Header, Image,
    Item,
    Label,
    Menu,
    Segment,
    Step,
    Card,
} from 'semantic-ui-react'
import HEOCampaignRegistry from "../remote/HEOCampaignRegistry";
import HEOCampaign from "../remote/HEOCampaign";
import web3 from "../ethereum/web3";
class CampaignList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            campaigns: [],
        };
    }

    async componentDidMount() {
        this.setState({
            campaigns: (await this.getCampaigns()),
        });
    }

    async getCampaigns() {
        let HEOCampaigns = await HEOCampaignRegistry.methods.allCampaigns().call();
        //console.log(HEOCampaigns);
        var campaigns = [];
        for(let i in HEOCampaigns) {
            let campaignAddress = HEOCampaigns[i];
            let campaignInstance = new web3.eth.Contract(HEOCampaign, campaignAddress);
            let metaDataUrl = await campaignInstance.methods.metaDataUrl().call();
            let metaData = await (await fetch(metaDataUrl)).json();
            console.log(metaData);
            campaigns.push({
                addr:campaignAddress,
                description : metaData.description,
                title: metaData.title
            })
        }

        return campaigns;
    }


    renderCampaigns() {
        var items = [];
        console.log(this.state.campaigns);
        for(let i in this.state.campaigns) {
            let campaign = this.state.campaigns[i];
            items.push(<Campaign key={campaign.addr} tagline={campaign.title} description={campaign.description} />);
        }

        return items;
    }

    render() {
        return (
            <Card.Group>
                {this.renderCampaigns()}
            </Card.Group>
        );
    }
}

export default CampaignList;