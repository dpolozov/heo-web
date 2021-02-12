import React, { Component } from 'react';
import {Item, Label, Progress} from 'semantic-ui-react'
import HEOCampaignRegistry from "../remote/binance-testnet/HEOCampaignRegistry";
import HEOCampaign from "../remote/binance-testnet/HEOCampaign";
import web3 from "../remote/binance-testnet/web3";
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
            let coinName = config.get("binance")["testnet"]["currencies"][coinAddress];
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
                percentRaised: (raisedAmount > 0 ? (100 * raisedAmount/maxAmount) : 0),
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
            items.push(
                <Item>
                    <Item.Image src={ campaign.mainImage.url } as='a' href={'/campaign/' + campaign.address} />
                    <Item.Content>
                        <Item.Header as='a'>{campaign.tagline}</Item.Header>
                        <Item.Description>{campaign.description}</Item.Description>
                    </Item.Content>
                </Item>

            )
            items.push(<Item>
                <Item.Content>
                    <Progress color='olive' percent={campaign.percentRaised}>{campaign.raisedAmount} {campaign.coinName} raised out of {campaign.maxAmount} goal</Progress>
                </Item.Content>
            </Item>)
            items.push(
                <Item>
                    <Item.Content>
                        <Label basic color='green' as='a' href={'/campaign/' + campaign.address}>
                            Accepting: {campaign.coinName}
                        </Label>
                        <Label basic color='red' as='a' href={'/campaign/' + campaign.address}>
                            Rewards: {campaign.reward}
                        </Label>
                        <Label basic color='blue' as='a' href={'/campaign/' + campaign.address}>See more details</Label>
                    </Item.Content>
                </Item>
            )
        };
        return items;
    }

    render() {
        return (
            <Item.Group relaxed>
                {this.renderCampaigns()}
            </Item.Group>
        );
    }
}

export default CampaignList;