import React, { Component, lazy } from 'react';
import config from 'react-global-configuration';
import {Button, Item, Label, Modal, Progress, Header} from 'semantic-ui-react'
import axios from 'axios';
var ACCOUNTS, web3;

class UserCampaigns extends Component {
    constructor(props) {
        super(props);

        this.state = {
            campaigns: [],
            showError:false,
            errorMessage:"",
            isLoggedIn:false,
        };
    }

    async componentDidMount() {

        if (typeof window.ethereum !== 'undefined') {
            var ethereum = window.ethereum;
            ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
            web3 = (await import("../remote/" + config.get("CHAIN") + "/web3")).default;
            this.setState({
                campaigns : (await this.getCampaigns()),
                isLoggedIn : true,
            });
        } else {
            alert("Please install metamask");
        }
    }

    async getCampaigns(){
        var campaigns = [];
        var errorMessage = 'Failed to load campaigns';
        let data = {accounts : ACCOUNTS}
        await axios.post('/api/campaigns/loadUserCampaigns', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            console.log(res.data);
            campaigns = res.data;
        }).catch(err => {
            if (err.response) { 
                errorMessage = 'Failed to load campaigns. We are having technical difficulties'}
            else if(err.request) {
                errorMessage = 'Failed to load campaings. Please check your internet connection'
            }
            console.log(err);
            this.setState({
                showError: true,
                errorMessage,
            })
        })

        return campaigns;
    }                 

    renderCampaigns() {
        var items = [];
        for(let i in this.state.campaigns) {
            let campaign = this.state.campaigns[i];
            items.push(
                <Item key={`${campaign._id}-main`}>
                    <Item.Image src={ campaign.mainImage } as='a' href={'/campaign/' + campaign._id} />
                    <Item.Content>
                        <Item.Header as='a'>{campaign.title}</Item.Header>
                        <Item.Description>{campaign.description}</Item.Description>
                        <Item.Meta>
                            <Label basic color='green' as='a' href={'/campaign/' + campaign._id}>
                                Accepting: {campaign.coinName}
                            </Label>
                            <Label basic color='red' as='a' href={'/campaign/' + campaign._id}>
                                Rewards: {campaign.reward}
                            </Label>
                            <Label basic color='blue' as='a' href={'/campaign/' + campaign._id}>See more details</Label>
                        </Item.Meta>
                    </Item.Content>
                </Item>

            )
            items.push(<Item key={`${campaign._id}-progress`} >
                <Item.Content>
                    <Progress color='olive' content={'test'} percent={campaign.percentRaised}>{campaign.raisedAmount} {campaign.coinName} raised out of {campaign.maxAmount} goal</Progress>
                </Item.Content>
            </Item>)

        };
        return items;
    }

    render() {
        return (
            <div>
                <Item.Group relaxed>
                    {this.renderCampaigns()}
                </Item.Group>
                {this.state.isLoggedIn && this.state.campaigns.length == 0 
                    && <h1>There are no campaigns to display</h1>}
                {this.state.isLoggedIn == false 
                    && <h1>Please log into MetaMask</h1>}
                <Modal open={this.state.showError}>
                    <Header icon='warning sign' content='Failed to connect to network!' />
                    <Modal.Content>{this.state.errorMessage}</Modal.Content>
                    <Modal.Actions>
                        <Button positive onClick={ () => {this.setState({showError:false})}}>
                            OK
                        </Button>
                    </Modal.Actions>
                </Modal>
            </div>

        );
    }
}

export default UserCampaigns;