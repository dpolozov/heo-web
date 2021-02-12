import React, { Component } from 'react';
import CampaignCard from "./CampaignCard";
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
import config from 'react-global-configuration';

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
        var campaigns = [];
        for(let i in HEOCampaigns) {
            let campaignAddress = HEOCampaigns[i];
            let campaignInstance = new web3.eth.Contract(HEOCampaign, campaignAddress);
            let isActive = await campaignInstance.methods.isActive().call();
            if(!isActive) {
                continue;
            }
            let metaDataUrl = await campaignInstance.methods.metaDataUrl().call();
            let metaData = await (await fetch(metaDataUrl)).json();
            let maxAmount = parseInt(web3.utils.fromWei(await campaignInstance.methods.maxAmount().call()));
            let raisedAmount = parseInt(web3.utils.fromWei(await campaignInstance.methods.raisedAmount().call()));
            let coinAddress = await campaignInstance.methods.currency().call();
            let coinName = config.get("currencies")[coinAddress];
            let donationYield = await campaignInstance.methods.donationYield().call();
            let y = web3.utils.fromWei(donationYield.toString());
            let reward = `${y * 100}%`;
            console.log(`Found campaign at ${campaignAddress} for ${maxAmount} of ${coinName}. Raised ${raisedAmount}.
             donationYield = ${donationYield.toString()}, y = ${y}, reward = ${reward}`);
            campaigns.push({
                address:campaignAddress,
                description : metaData.description,
                title: metaData.title,
                coinName:coinName,
                maxAmount:maxAmount,
                raisedAmount:raisedAmount,
                percentRaised: (raisedAmount > 0 ? (100 * raisedAmount/maxAmount) : 50),
                mainImage: metaData.main_image,
                reward: reward
            });
        }

        return campaigns;
    }

    renderCampaigns() {
        var items = [];
        console.log(this.state.campaigns);
        for(let i in this.state.campaigns) {
            let campaign = this.state.campaigns[i];
            items.push(<CampaignCard key={campaign.address} tagline={campaign.title} description={campaign.description}
                                     coinName={campaign.coinName} maxAmount={campaign.maxAmount}
                                     raisedAmount={campaign.raisedAmount} percentRaised={campaign.percentRaised}
                                     mainImage={campaign.mainImage} reward={campaign.reward} address={campaign.address} />);
        };

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