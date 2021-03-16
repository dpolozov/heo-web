import React, { useState } from 'react';
import logo from '../images/heo-logo.png';
import countries from '../countries';
import S3 from '../util/s3/react-aws-s3'
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
var HEOCampaignFactory, HEOGlobalParameters, HEOPriceOracle, ACCOUNTS, web3;
const AWS_CONFIG_IMAGES = {
        bucketName: process.env.REACT_APP_BUCKET_NAME,
        region: process.env.REACT_APP_REGION || "us-east-1",
        dirName:process.env.REACT_APP_IMG_DIR_NAME,
        accessKeyId: process.env.REACT_APP_ACCESS_ID,
        secretAccessKey: process.env.REACT_APP_ACCESS_KEY,
        //s3Url: 'https://heowebmeta.s3.us-east-1.amazonaws.com'
};
const AWS_CONFIG_META = {
    bucketName: process.env.REACT_APP_BUCKET_NAME,
    region: process.env.REACT_APP_REGION || "us-east-1",
    dirName:process.env.REACT_APP_META_DIR_NAME,
    accessKeyId: process.env.REACT_APP_ACCESS_ID,
    secretAccessKey: process.env.REACT_APP_ACCESS_KEY,
    //s3Url: 'https://heowebmeta.s3.us-east-1.amazonaws.com'
};
const CHAIN = process.env.REACT_APP_CHAIN_ID;
const CHAIN_NAME = process.env.REACT_APP_CHAIN_NAME;
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
            currencyName:""
        };
    }
    handleTextArea = (e) => {
        this.setState({description:e.target.value});
    }
    handleChange = (e, { name, value }) => {
        this.setState({ [name]: value })
        if(name == "currencyAddress") {
            let currencyName = config.get("chainconfigs")[CHAIN]["currencies"][value];
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
        let data = JSON.stringify({title:that.state.title,
            description:that.state.description,
            mainImageURL:that.state.mainImageURL,
            fn:that.state.fn,
            ln:that.state.ln,
            org:that.state.org,
            cn:that.state.cn,
            vl:that.state.vl
        });
        const ReactS3Client = new S3(AWS_CONFIG_META);
        return ReactS3Client.uploadDataFile(data, "application/json", `${metaID}.json`).then(response => {
            console.log("S3 callback");
            console.log(response);
            if(response.status == 204) {
                console.log("Success");
                that.setState({showLoader:false, metaDataURL:response.location});
            } else {
                that.setState({showLoader:false, showError:true, errorMessage:`Failed to upload metadata.`});
                throw new Error(`Failed to upload metadata.`);
            }
        }).catch(err => {
            console.error(err);
            that.setState({showLoader:false, showError:true, errorMessage:`Failed to upload metadata.`});
            throw new Error(`Failed to upload metadata.`);
        });
    }

    async uploadImageS3 (that, imgID) {
        console.log(`Uploading ${this.state.mainImageFile.name} of type ${this.state.mainImageFile.type} to S3`);
        that.setState({showLoader:true, loaderMessage:"Please wait. Uploading image file."});
        const ReactS3Client = new S3(AWS_CONFIG_IMAGES);
        let fileType = this.state.mainImageFile.type.split("/")[1];
        return ReactS3Client.uploadFile(this.state.mainImageFile, `${imgID}.${fileType}`).then(response => {
            console.log("S3 callback");
            console.log(response);
            if(response.status == 204) {
                console.log("Success");
                that.setState({showLoader:false, mainImageURL:response.location});
            } else {
                that.setState({showLoader:false, showError:true, errorMessage:`Failed to upload image file.`});
                throw new Error(`Failed to upload image file.`);
            }
        }).catch(err => {
            console.error(err);
            that.setState({showLoader:false, showError:true, errorMessage:`Failed to upload image file.`});
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
                                               options={config.get("chainconfigs")[CHAIN]["currencyOptions"]}
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
            HEOPriceOracle = (await import("../remote/" + CHAIN + "/HEOPriceOracle")).default;
            HEOGlobalParameters = (await import("../remote/" + CHAIN + "/HEOGlobalParameters")).default;
            HEOCampaignFactory = (await import("../remote/" + CHAIN + "/HEOCampaignFactory")).default;
            var ethereum = window.ethereum;
            ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
            web3 = (await import("../remote/" + CHAIN + "/web3")).default;
            let X = await HEOGlobalParameters.methods.profitabilityCoefficient().call();
            this.setState({x: X});
        } else {
            alert("Please install metamask");
        }
    }
}


export default CreateCampaign;