import React, { useState } from 'react';
import countries from '../countries';

import {
    Input,
    Image,
    Label,
    Progress,
    Container,
    Header,
    Segment,
    Grid,
    Step,
    Form,
    Dimmer,
    Loader, Modal, Button
} from "semantic-ui-react";
import config from "react-global-configuration";
import uuid from 'react-uuid';
import axios from 'axios';
var HEOCampaignFactory, HEOGlobalParameters, HEOPriceOracle, ACCOUNTS, web3;

class CreateCampaign extends React.Component {
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
            fn:"",
            ln:"",
            cn:"",
            vl:"",
            heoPrice:"",
            maxAmount:10000,
            donorsEarnPerDollar:1,
            z:1,
            x:20,
            title:"Title of the campaign",
            description:"Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor.",
            raisedAmount:0,
            tokensToBurn:0,
            percentRaised: "0%",
            mainImageURL: "",
            metaDataURL:"",
            mainImageFile:"",
            reward:0,
            currencyAddress:"",
            currencyName:"",
            coinOptions:[]
        };
    }
    handleTextArea = (e) => {
        this.setState({description:e.target.value});
    }
    handleChange = (e, { name, value }) => {
        this.setState({ [name]: value })
        if(name == "currencyAddress") {
            let currencyName = config.get("chainconfigs")[config.get("CHAIN")]["currencies"][value];
            this.setState({currencyName:currencyName});
            if(value) {
                var that = this;
                HEOPriceOracle.methods.getPrice(value).call((err, result) => {
                    if(!err) {
                        let heoPrice = web3.utils.fromWei(result);
                        that.setState({heoPrice:heoPrice});
                    } else {
                        console.log(`Failed to fetch price of ${currencyName}`);
                        console.log(err);
                    }

                })
            }
        }
        if(name=="reward") {
            if(value == 0) {
                this.setState({z:0});
                this.setState({tokensToBurn:0});
            } else {
                let Z = this.state.x/value;
                this.setState({z:Z});
                let toBurn = this.state.maxAmount/(Z * this.state.heoPrice);
                this.setState({tokensToBurn:toBurn});
            }
        }
        if(name == "maxAmount") {
            if(this.state.reward == 0) {
                this.setState({tokensToBurn:0});
            } else if(this.state.heoPrice > 0) {
                let toBurn = value/(this.state.z * this.state.heoPrice);
                this.setState({tokensToBurn:toBurn});
            }
        }
    }

    fileSelected = e => {
        this.setState({mainImageFile:e.target.files[0], mainImageURL: URL.createObjectURL(e.target.files[0])});
    }

    handleClick = (event, target) => {
        console.log(`Button clicked ${target.name}`);
        switch(target.name) {
            case "ff1":
                if(!this.state.currencyAddress) {
                    this.setState({showLoader:false, showError:true,
                        errorMessage:`Please select a coin that your fundraiser will accept.`});
                    return;
                }
                if(!this.state.fn || !this.state.ln) {
                    this.setState({showLoader:false, showError:true,
                        errorMessage:`Please enter your first and last name.`});
                    return;
                }
                this.setState({step:2});
                break;
            case "ff2":
                this.setState({step:3});
                break;
            case "bb2":
                this.setState({step:1});
                break;
            case "bb3":
                this.setState({step:2});
                break;
            case "ff3":
                //Creating the campaign
                var that = this;
                let imgID = uuid();
                this.uploadImageS3(that, imgID).then(() => {
                    that.uploadMetaS3(that, imgID).then(() => {
                        that.createCampaign(that);
                    }).catch((error) => {
                        console.log(error);
                    });
                }).catch((error) => {
                    console.log(error);
                });

                break;
            default:
                break;
        }
    }

    async createCampaign(that) {
        console.log("Creating campaign");
        var that = this;
        HEOCampaignFactory.methods.createCampaign(web3.utils.toWei(`${this.state.maxAmount}`),
            web3.utils.toWei(`${this.state.tokensToBurn}`),
            this.state.currencyAddress, this.state.metaDataURL).send({from:ACCOUNTS[0]}).on(
            'receipt', function(receipt) {
                console.log("Received receipt from createCampaign transaction");
                that.setState({showLoader:false, showError:false, showModal:true,
                    modalMessage:"Congratulations! Your fundraiser is live on the blockchain."});
            }).on('error', function(error) {
                that.setState({showLoader:false, showError:true,
                    errorMessage:`Blockchain transaction has failed. Please check MetaMask for more details.`});
                console.log("createCampaign transaction failed");
                console.log(error);
            }).on('transactionHash', function(transactionHash){
                that.setState({showLoader:true, showError:false,
                    loaderMessage:`Waiting for the network to confirm transaction.`});
            });
        that.setState({showLoader:true, loaderMessage:"Please confirm transaction in MetaMask."})
    }

    //vl - video link(youtube)
    async uploadMetaS3(that, metaID) {
        console.log(`Generating metadata file ${metaID}`);
        that.setState({showLoader:true, loaderMessage:"Please wait. Uploading metadata."});
        let data = new Blob([JSON.stringify({title:that.state.title,
            description:that.state.description,
            mainImageURL:that.state.mainImageURL,
            fn:that.state.fn,
            ln:that.state.ln,
            org:that.state.org,
            cn:that.state.cn,
            vl:that.state.vl
        })], {
            type: 'applicaton/json'
        });
        const formData = new FormData();
        formData.append(
            "myFile",
            data,
            `${metaID}.json`
        );
        var options = {
            header: { 'Content-Type': 'multipart/form-data' }
        };

        return axios.post('/api/uploadmeta', formData)
        .then(res => {
            console.log("Success uploading meta data");
            that.setState({showLoader:false, metaDataURL:res.data});
        }).catch(err => {
            if (err.response) { 
                console.log('response error in uploading meta data- ' + err.response.status);
                that.setState({showLoader:false, showError:true, 
                    errorMessage:`Failed to upload compaign informaion.  We are having technical difficulties`});
            } else if (err.request) { 
                console.log('No response in uploading meta data' + err.message);
                that.setState({showLoader:false, showError:true, 
                    errorMessage:`Failed to upload compaign information. Please check your connection.`}); 
            } else { 
                console.log('error uploading image ' + err.message);
                that.setState({showLoader:false, showError:true, 
                    errorMessage:`Failed to upload compaign information.`});
            }           
            throw new Error(`Failed to upload compaign information.`); 
        });
    }

    async uploadImageS3 (that, imgID) {
        console.log(`Uploading ${this.state.mainImageFile.name} of type ${this.state.mainImageFile.type} to S3`);
        that.setState({showLoader:true, loaderMessage:"Please wait. Uploading image file."});
        let fileType = this.state.mainImageFile.type.split("/")[1];
        let newName = `${imgID}.${fileType}`;
        const formData = new FormData();
        formData.append(
            "myFile",
            this.state.mainImageFile,
            newName,
        );
            
        return axios.post('/api/uploadimage', formData)
        .then(res => {
            console.log("Success uploading main image");
            that.setState({showLoader:false, mainImageURL:res.data});
        }).catch(err => {
            if (err.response) { 
                console.log('response error in uploading main image- ' + err.response.status);
                that.setState({showLoader:false, showError:true, 
                    errorMessage:`Failed to upload image file.  We are having technical difficulties`});
            } else if (err.request) { 
                console.log('No response in uploading main image' + err.message);
                that.setState({showLoader:false, showError:true, 
                    errorMessage:`Failed to upload image file. Please check your connection.`}); 
            } else { 
                console.log('error uploading image ' + err.message);
                that.setState({showLoader:false, showError:true, 
                    errorMessage:`Failed to upload image file.`});
            }           
            throw new Error(`Failed to upload image file.`); 
        });
    }

    render() {
        return (
            <div>
                <Dimmer.Dimmable as={Segment} dimmed={this.state.showLoader}>
                    <Form>
                    { (this.state.step == 1) && (
                        <div>
                            <Form.Group widths='equal'>
                                <Form.Input required fluid label='First name' placeholder='First name' name='fn'
                                            value={this.state.fn} onChange={this.handleChange} />
                                <Form.Input required fluid label='Last name' placeholder='Last name' name='ln'
                                            value={this.state.ln} onChange={this.handleChange} />
                            </Form.Group>
                            <Form.Input fluid label='Organization' placeholder='Organization name (optional)' name='org'
                                        value={this.state.org} onChange={this.handleChange} />
                            <Form.Group widths='equal'>
                                <Form.Dropdown placeholder="Select your country" name='cn' options={countries}
                                               value={this.state.cn} onChange={this.handleChange} />
                                <Form.Dropdown required placeholder="Select coin" name='currencyAddress'
                                               options={config.get("chainconfigs")[config.get("CHAIN")]["currencyOptions"]}
                                               value={this.state.currencyAddress} onChange={this.handleChange} />
                                <Form.Button name='ff1' onClick={this.handleClick}>Next</Form.Button>
                            </Form.Group>
                        </div>
                    )}
                    { (this.state.step == 2) && (
                        <div>
                                <Header as='h3'>Current price of HEO token {this.state.heoPrice} {this.state.currencyName}</Header>
                                    <Form.Input required fluid label={`How much ${this.state.currencyName} do you need to raise?`}
                                                value={this.state.maxAmount} placeholder={this.state.maxAmount}
                                                name='maxAmount' onChange={this.handleChange} />
                                    <Form.Input required fluid
                                                label={`How much ${this.state.currencyName} donors will earn for each donated ${this.state.currencyName}`}
                                                placeholder={this.state.reward} name='reward' onChange={this.handleChange} />

                                <Header as='h3'>You have to burn {this.state.tokensToBurn} HEO in order to
                                    raise {this.state.maxAmount} {this.state.currencyName} with {this.state.reward * 100}% reward</Header>
                                <Form.Group widths='equal'>
                                    <Form.Button name='bb2' onClick={this.handleClick}>Back</Form.Button>
                                    <Form.Button name='ff2' onClick={this.handleClick}>Next</Form.Button>
                                </Form.Group>
                        </div>
                    )}
                    { (this.state.step == 3) && (
                        <div>
                            <Form.Field label='Select cover image' control='input' type='file' onChange={this.fileSelected}
                                name='imageFile' accept='.jpg,.png,.jpeg,.gif' />
                            <Image src={this.state.mainImageURL}/>
                            <Form.Input fluid label='Promotional Video' placeholder='Link to YouTube Video (optional)' name='vl'
                                        value={this.state.vl} onChange={this.handleChange} />
                            <Form.Input required fluid label='Title' placeholder='Headline for your campaign' name='title'
                                        value={this.state.title} onChange={this.handleChange} />
                            <Form.Field label='An HTML <textarea>' control='textarea' rows='3' name='description'
                                        value={this.state.description} onChange={this.handleTextArea} />
                            <Form.Button name='bb3' onClick={this.handleClick}>Back</Form.Button>
                            <Form.Button name='ff3' onClick={this.handleClick}>Create campaign</Form.Button>
                        </div>

                    )}
                    </Form>
                    <Step.Group ordered>
                        <Step active={(this.state.step == 1)} completed={(this.state.step > 1)}>
                            <Step.Content>
                                <Step.Title>About you</Step.Title>
                            </Step.Content>
                        </Step>

                        <Step active={(this.state.step == 2)} completed={(this.state.step > 2)}>
                            <Step.Content>
                                <Step.Title>How much do you need?</Step.Title>
                            </Step.Content>
                        </Step>

                        <Step active={(this.state.step == 3)} completed={(this.state.step > 3)}>
                            <Step.Content>
                                <Step.Title>Campaign details</Step.Title>
                            </Step.Content>
                        </Step>

                        <Step active={(this.state.step == 4)} completed={(this.state.step > 4)}>
                            <Step.Content>
                                <Step.Title>Confirmation</Step.Title>
                            </Step.Content>
                        </Step>
                    </Step.Group>
                </Dimmer.Dimmable>
                <Dimmer active={this.state.showLoader}>
                    <Loader>{this.state.loaderMessage}</Loader>
                </Dimmer>
                <Modal open={this.state.showError}>
                    <Header icon='warning sign' content='Error' />
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
        if (typeof window.ethereum !== 'undefined') {
            HEOPriceOracle = (await import("../remote/" + config.get("CHAIN") + "/HEOPriceOracle")).default;
            HEOGlobalParameters = (await import("../remote/" + config.get("CHAIN") + "/HEOGlobalParameters")).default;
            HEOCampaignFactory = (await import("../remote/" + config.get("CHAIN") + "/HEOCampaignFactory")).default;
            var ethereum = window.ethereum;
            ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
            web3 = (await import("../remote/" + config.get("CHAIN") + "/web3")).default;
            let X = await HEOGlobalParameters.methods.profitabilityCoefficient().call();
            this.setState({x: X});
        } else {
            alert("Please install metamask");
        } 
    }
}


export default CreateCampaign;