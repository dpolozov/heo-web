import React, { useState } from 'react';
import config from "react-global-configuration";
import {Button, Dimmer, Form, Header, Item, Loader, Modal, Segment} from "semantic-ui-react";
const CHAIN = process.env.REACT_APP_CHAIN_ID;
const CHAIN_NAME = process.env.REACT_APP_CHAIN_NAME;

var HEOCampaignFactory, ERC20Coin, HEOGlobalParameters, HEOPriceOracle, HEOPublicSale, ACCOUNTS, web3, CURRENCY_MAP;
class PublicSale extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            step:1,
            showLoader:false,
            loaderMessage:"Please wait",
            showError:false,
            showModal:false,
            modalMessage:"",
            errorMessage:"",
            heoPrice:"",
            currencyAddress:"",
            currencyName:"",
            amount:0,
            cost:0
        };
    }

    handleAmountChange = (e, { name, value }) => {
        let cost = this.state.heoPrice * value;
        this.setState({cost:cost, amount:value});
    };

    handleBuy = (event, target) => {
        var coinInstance = new web3.eth.Contract(ERC20Coin, this.state.currencyAddress);
        var toPay = web3.utils.toWei(`${this.state.cost}`);
        var amount = this.state.amount;
        var that = this;
        coinInstance.methods.approve(HEOPublicSale.options.address, toPay).send({from:ACCOUNTS[0]}).on('error',
            function(error) {
                that.setState({showLoader:false});
                that.setState({showError:true});
                console.log("Approval transaction failed");
                console.log(error);
                that.setState({errorMessage:"Transaction failed"});
        }).on('transactionHash', function(transactionHash){
            that.setState({loaderMessage:"Waiting for the network to confirm transaction."})
        }).on('receipt',  function(receipt) {
            console.log("Received receipt from approval transaction");
            HEOPublicSale.methods.sellTokens(amount).send({from:ACCOUNTS[0]}).on('error',
                function(error) {
                    that.setState({showLoader:false});
                    that.setState({showError:true});
                    console.log("Buy transaction failed");
                    console.log(error);
                    that.setState({errorMessage:"Transaction failed"});
            }).on('transactionHash', function(transactionHash){
                that.setState({loaderMessage:"Waiting for the network to confirm transaction."})
            }).on('receipt',  function(receipt) {
                that.setState({showLoader:false, showModal:true,
                modalMessage:"Congratulations! You should see purchased HEO in your wallet now."});
            });
            that.setState({loaderMessage:"Please confirm transaction in MetaMask."})
            that.setState({showLoader:true});
        })
        that.setState({loaderMessage:"Please confirm transaction in MetaMask."})
        that.setState({showLoader:true});
    }
    render() {
        return (
            <div>
                <Dimmer.Dimmable as={Segment} dimmed={this.state.showLoader}>
                    <Form>
                        <Header as='h3'>Current price of HEO token {this.state.heoPrice} {this.state.currencyName}</Header>
                        <Form.Group widths='equal'>
                            <Form.Input required fluid label='How much HEO you would like to buy' placeholder='10'
                                        name='amount' value={this.state.amount} onChange={this.handleAmountChange} />
                            <Form.Input fluid readOnly label={`${this.state.currencyName} to pay:`} placeholder='10'
                                        name='cost' value={this.state.cost} />
                            <Form.Button name='buy' onClick={this.handleBuy}>Buy HEO</Form.Button>
                        </Form.Group>
                    </Form>
                </Dimmer.Dimmable>
                <Dimmer active={this.state.showLoader}>
                    <Loader>{this.state.loaderMessage}</Loader>
                </Dimmer>
                <Modal open={this.state.showError}>
                    <Header icon='warning sign' content='Failed to connect to network!' />
                    <Modal.Content>{this.state.errorMessage}</Modal.Content>
                    <Modal.Actions>
                        <Button positive onClick={ () => {this.setState({showError:false})}}>
                            OK
                        </Button>
                    </Modal.Actions>
                </Modal>
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
        CURRENCY_MAP = config.get("chainconfigs")[CHAIN]["currencies"];
        if (typeof window.ethereum !== 'undefined') {
            HEOPublicSale = (await import("../remote/" + CHAIN + "/HEOPublicSale")).default;
            HEOPriceOracle = (await import("../remote/" + CHAIN + "/HEOPriceOracle")).default;
            ERC20Coin = (await import("../remote/"+ CHAIN + "/ERC20Coin")).default;
            HEOGlobalParameters = (await import("../remote/" + CHAIN + "/HEOGlobalParameters")).default;
            HEOCampaignFactory = (await import("../remote/" + CHAIN + "/HEOCampaignFactory")).default;
            var ethereum = window.ethereum;
            ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
            web3 = (await import("../remote/" + CHAIN + "/web3")).default;
            let currencyAddress = (await HEOPublicSale.methods.currency().call()).toLowerCase();
            let heoPrice = web3.utils.fromWei(await HEOPriceOracle.methods.getPrice(currencyAddress).call());
            let currencyName = CURRENCY_MAP[currencyAddress];
            this.setState({currencyAddress: currencyAddress, heoPrice:heoPrice, currencyName:currencyName});
        } else {
            this.setState({
                showError: true,
                errorMessage: "Please install MetaMask and connect it to Binance Smart Chain Testnet"
            });
        }
    }
}

export default PublicSale;