import React, { useState } from 'react';
import HEOCampaign from "../remote/HEOCampaign";
import web3 from "../ethereum/web3";
import {Button, Card, Image, Label, Progress} from "semantic-ui-react";
import CampaignCard from "./CampaignCard";
import config from "react-global-configuration";

class CampaignPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            address: "0x0",
            name:"Initial name"
        };
    }

    render() {
        return (<div>{this.state.name} at {this.state.address}</div>);
    }

    async componentDidMount() {
        let toks = this.props.location.pathname.split("/");
        let address = toks[toks.length -1];
        this.setState({
            address:address,
            name:"name 2"
        });
        let campaignInstance = new web3.eth.Contract(HEOCampaign, address);
        let isActive = await campaignInstance.methods.isActive().call();
        let metaDataUrl = await campaignInstance.methods.metaDataUrl().call();
        let metaData = await (await fetch(metaDataUrl)).json();
        let maxAmount = parseInt(web3.utils.fromWei(await campaignInstance.methods.maxAmount().call()));
        let raisedAmount = parseInt(web3.utils.fromWei(await campaignInstance.methods.raisedAmount().call()));
        let coinAddress = await campaignInstance.methods.currency().call();
        let coinName = config.get("currencies")[coinAddress];
        let donationYield = await campaignInstance.methods.donationYield().call();
        let y = web3.utils.fromWei(donationYield.toString());
        let reward = `${y * 100}%`;
        this.setState({name:metaData.title});
    }
}


export default CampaignPage;