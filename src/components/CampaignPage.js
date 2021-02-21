import React, {lazy, useState} from 'react';
import config from "react-global-configuration";
import {
    Input,
    Image,
    Label,
    Progress,
    Container,
    Header,
    Segment,
    Grid,
    Modal,
    Loader,
    Dimmer,
    Button
} from "semantic-ui-react";

var HEOCampaign, ERC20Coin, web3;
const CHAIN = process.env.REACT_APP_CHAIN_ID;
const CHAIN_NAME = process.env.REACT_APP_CHAIN_NAME;
class CampaignPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            donationAmount:"10",
            address: "0x0",
            title:"Title of the campaign",
            description:"Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor.",
            coinName:"BNB",
            coinAddress:"",
            maxAmount:0,
            raisedAmount:0,
            percentRaised: "60%",
            mainImageURL: "",
            reward: "200%",
            modalMessage:"Please confirm the transaction in MetaMask",
            showDimmer:false,
            showModal:false
        };
    }
    handleChange = (e, { name, value }) => this.setState({ [name]: value })

    handleDonateClick = async event => {
        var campaignInstance = this.state.campaign;
        if (typeof window.ethereum !== 'undefined') {
            var ethereum = window.ethereum;
            try {
                var accounts = await ethereum.request({ method: 'eth_requestAccounts' });
                var coinInstance = new web3.eth.Contract(ERC20Coin, this.state.coinAddress);
                var toDonate = web3.utils.toWei(this.state.donationAmount);
                var that = this;
                coinInstance.methods.approve(this.state.address, toDonate).send({from:accounts[0]}).on(
                    'receipt', function(receipt) {
                        console.log("Received receipt from approval transaction");
                        campaignInstance.methods.donateERC20(toDonate).send({from:accounts[0]}).on('receipt',
                            function(receipt) {
                                    console.log("Received receipt from donation transaction");
                                campaignInstance.methods.raisedAmount().call({from:accounts[0]}, function(err, result) {
                                    if(!err) {
                                        that.setState({raisedAmount:parseInt(web3.utils.fromWei(result))});
                                    } else {
                                        console.log("Failed to update raised amount.")
                                        console.log(err);
                                    }

                                });
                                that.setState({showDimmer:false});
                                that.setState({showModal:true});
                                that.setState({modalMessage:"Thank you for your donation!"})
                            }
                        ).on('error', function(error) {
                            that.setState({showDimmer:false});
                            that.setState({showModal:true});
                            console.log("donateERC20 transaction failed");
                            console.log(error);
                            if(error.toString().indexOf("cannot donate to yourself")) {
                                that.setState({modalMessage:"As the creator of this fundraiser, you cannot donate to yourself."});
                            } else {
                                that.setState({modalMessage:"Donation transaction has failed"});
                            }
                            /*
                            "Error: [ethjs-query] while formatting outputs from RPC '{"value":{"code":-32603,"data":{"message":"VM Exception while processing transaction: revert HEOCampaign: cannot donate to yourself.","code":-32000,"data":{"0xfb3d421c90383839148814b889844767fb17a48e2fe43cbc88e7879695e3d1ef":{"error":"revert","program_counter":4218,"return":"0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000002748454f43616d706169676e3a2063616e6e6f7420646f6e61746520746f20796f757273656c662e00000000000000000000000000000000000000000000000000","reason":"HEOCampaign: cannot donate to yourself."},"stack":"RuntimeError: VM Exception while processing transaction: revert HEOCampaign: cannot donate to yourself.\n    at Function.RuntimeError.fromResults (/Applications/Ganache.app/Contents/Resources/static/node/node_modules/ganache-core/lib/utils/runtimeerror.js:94:13)\n    at BlockchainDouble.processBlock (/Applications/Ganache.app/Contents/Resources/static/node/node_modules/ganache-core/lib/blockchain_double.js:627:24)\n    at runMicrotasks (<anonymous>)\n    at processTicksAndRejections (internal/process/task_queues.js:93:5)","name":"RuntimeError"}}}}'"
                             */

                        }).on('transactionHash', function(transactionHash){
                            that.setState({modalMessage:"Waiting for the network to confirm transaction."})
                        })
                        that.setState({modalMessage:"Please confirm transaction in MetaMask."});
                    }
                ).on('error', function(error) {
                    that.setState({showDimmer:false});
                    that.setState({showModal:true});
                    console.log("Approval transaction failed");
                    console.log(error);
                    that.setState({modalMessage:"Transaction failed"});
                }).on('transactionHash', function(transactionHash){
                    that.setState({modalMessage:"Waiting for the network to confirm transaction."})
                });
                that.setState({modalMessage:"Please confirm transaction in MetaMask."})
                that.setState({showDimmer:true});
            } catch (err) {
                console.log(err);
                this.setState({
                    showModal:true,
                    modalMessage:"Failed to connect to blockchain network. If you are using a browser wallet like MetaMask, " +
                        "please make sure that it is configured for " + CHAIN_NAME
                });
            }
        } else {
            alert("Please install metamask");
        }

    }
    render() {
        return (
            <div>
                <Dimmer.Dimmable as={Segment} dimmed={this.state.showDimmer}>
                    <Grid columns={2}>
                        <Grid.Row>
                            <Grid.Column><Header as='h2'>{this.state.title}</Header></Grid.Column>
                        </Grid.Row>

                        <Grid.Row>
                            <Grid.Column><Image src={this.state.mainImageURL} /></Grid.Column>
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
                </Dimmer.Dimmable>
                <Dimmer active={this.state.showDimmer}>
                    <Loader>{this.state.modalMessage}</Loader>
                </Dimmer>
                <Modal open={this.state.showModal}>
                           <Modal.Content>{this.state.modalMessage}</Modal.Content>
                           <Modal.Actions>
                               <Button positive onClick={ () => {this.setState({showModal:false})}}>
                                   OK
                               </Button>
                           </Modal.Actions>
                </Modal>

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
        let coinAddress = (await campaignInstance.methods.currency().call()).toLowerCase();
        let coinName = config.get("chainconfigs")[CHAIN]["currencies"][coinAddress];
        let donationYield = await campaignInstance.methods.donationYield().call();
        let y = web3.utils.fromWei(donationYield.toString());
        let reward = `${y * 100}%`;
        this.setState({title:metaData.title, isActive:isActive, maxAmount:maxAmount, raisedAmount:raisedAmount,
            coinAddress:coinAddress, coinName:coinName, donationYield:donationYield, reward:reward,
            description:metaData.description, mainImageURL:metaData.mainImageURL, address:address, campaign:campaignInstance});
    }
}


export default CampaignPage;