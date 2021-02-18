import React, {lazy, useState} from 'react';
import logo from '../images/heo-logo.png';
import {Input, Image, Label, Progress, Container, Header, Segment, Grid} from "semantic-ui-react";
import config from "react-global-configuration";
var HEOCampaign, ERC20Coin, web3, CHAIN;
class CampaignPage extends React.Component {
    constructor(props) {
        super(props);
        CHAIN = config.get("chain");
        this.state = {
            donationAmount:"10",
            address: "0x0",
            title:"Title of the campaign",
            description:"Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor.",
            coinName:"BNB",
            coinAddress:"",
            maxAmount:10000,
            raisedAmount:6000,
            percentRaised: "60%",
            mainImage: "https://ksr-ugc.imgix.net/assets/032/126/819/b2ada0fe85aff53a51778ebd27db7b95_original.jpg",
            reward: "200%"
        };
    }
    handleChange = (e, { name, value }) => this.setState({ [name]: value })

    handleDonateClick = async event => {
        var campaignInstance = this.state.campaign;
        if (typeof window.ethereum !== 'undefined') {
            var ethereum = window.ethereum;
            try {
                const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                let coinInstance = new web3.eth.Contract(ERC20Coin, this.state.coinAddress);
                await coinInstance.methods.approve(this.state.address,
                    web3.utils.toWei(this.state.donationAmount)).send({from:accounts[0]});
                await campaignInstance.methods.donateERC20(
                    web3.utils.toWei(this.state.donationAmount)).send({from:accounts[0]});
                let raisedAmount = parseInt(web3.utils.fromWei(await campaignInstance.methods.raisedAmount().call()));
                this.setState({raisedAmount:raisedAmount});
            } catch (err) {
                console.log(err);
                alert(err);
            }
        } else {
            alert("Please install metamask");
        }

    }

    render() {
        return (
            <div>

                <Grid columns={2}>
                    <Grid.Row>
                        <Grid.Column><Header as='h2'>{this.state.title}</Header></Grid.Column>
                    </Grid.Row>

                    <Grid.Row>
                        <Grid.Column><Image src={this.state.mainImage.url} /></Grid.Column>
                        <Grid.Column>
                            <Segment vertical>
                                <Progress color='olive' percent={this.state.percentRaised}>{this.state.raisedAmount} {this.state.coinName} raised out of {this.state.maxAmount} goal</Progress>
                            </Segment>
                            <Segment vertical>
                                <Label basic color='green'>
                                Accepting: {this.state.coinName}
                                </Label>
                                <Label basic color='red'>
                                    Rewards: {this.state.reward}
                                </Label>
                                <Input
                                    action={{
                                        color: 'teal',
                                        labelPosition: 'right',
                                        icon: 'gift',
                                        content: 'Donate ' + this.state.coinName,
                                        onClick: this.handleDonateClick
                                    }}
                                    name='donationAmount'
                                    actionPosition='right'
                                    placeholder='Amount'
                                    defaultValue='10'
                                    size='mini'
                                    onChange={this.handleChange}
                                />
                            </Segment>
                        </Grid.Column>
                    </Grid.Row>
                    <Grid.Row>
                        <Grid.Column><Container text>{this.state.description}</Container></Grid.Column>
                    </Grid.Row>
                </Grid>
            </div>
        );
    }

    async componentDidMount() {
        HEOCampaign = (await import("../remote/"+ CHAIN + "/HEOCampaign")).default;
        ERC20Coin = (await import("../remote/"+ CHAIN + "/ERC20Coin")).default;
        web3 = (await import("../remote/"+ CHAIN + "/web3")).default;
        let toks = this.props.location.pathname.split("/");
        let address = toks[toks.length -1];
        let campaignInstance = new web3.eth.Contract(HEOCampaign, address);
        let isActive = await campaignInstance.methods.isActive().call();
        let metaDataUrl = await campaignInstance.methods.metaDataUrl().call();
        let metaData = await (await fetch(metaDataUrl)).json();
        let maxAmount = parseInt(web3.utils.fromWei(await campaignInstance.methods.maxAmount().call()));
        let raisedAmount = parseInt(web3.utils.fromWei(await campaignInstance.methods.raisedAmount().call()));
        let coinAddress = await campaignInstance.methods.currency().call();
        let coinName = config.get("chainconfigs")[CHAIN]["currencies"][coinAddress];
        let donationYield = await campaignInstance.methods.donationYield().call();
        let y = web3.utils.fromWei(donationYield.toString());
        let reward = `${y * 100}%`;
        this.setState({title:metaData.title, isActive:isActive, maxAmount:maxAmount, raisedAmount:raisedAmount,
            coinAddress:coinAddress, coinName:coinName, donationYield:donationYield, reward:reward,
            description:metaData.description, mainImage:metaData.main_image, address:address, campaign:campaignInstance});
    }
}


export default CampaignPage;