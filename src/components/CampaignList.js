import React, { Component, lazy } from 'react';
import config from 'react-global-configuration';
import {Button, Item, Label, Modal, Progress, Header} from 'semantic-ui-react'
import axios from 'axios';

class CampaignList extends Component {
    constructor(props) {
        super(props);

        this.state = {
            campaigns: [],
            showError:false,
            errorMessage:""
        };
    }

    async componentDidMount() {
        this.setState({
            campaigns : (await this.getCampaigns()),
        });
    }

    async getCampaigns(){
        var campaigns = [];
        var errorMessage = 'Failed to load campaigns';
        await axios.post('/api/campaigns/load')
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

    //initial upload to mongo db
    async sendToDB(campaigns){
        let data2 = new Blob([JSON.stringify(campaigns)], {type : 'application/jason'});
        const formData2 = new FormData();
        formData2.append(
            "myFile",
            data2,
            )
        axios.post('api/campaigns/sendToDB', formData2)
        .then(res => {
            console.log("Success sending campaings");
        }).catch(err => {
            console.log(err);
        });
    }

    renderCampaigns() {
        var items = [];
        //this.sendToDB(this.state.campaigns);
        console.log(this.state.campaigns);
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
            /*items.push(
                <Item key={`${campaign.address}-actions`}>
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
            )*/
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

export default CampaignList;