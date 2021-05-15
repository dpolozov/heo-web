import React, { useState } from 'react';
import countries from '../countries';
import '../css/createCampaign.css';
import {Container, Form, Col, Button} from 'react-bootstrap';
import config from "react-global-configuration";
import uuid from 'react-uuid';
import axios from 'axios';
import { ChevronLeft } from 'react-bootstrap-icons';
var HEOCampaignFactory, HEOGlobalParameters, HEOPriceOracle, ACCOUNTS, web3;

class CreateCampaign2 extends React.Component {
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
            coinOptions: [],
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
                <Container className='backToCampaignsDiv'>
                        <p className='backToCampaigns'><ChevronLeft id='createCampaignChevron'/> Back To Campaigns</p>
                </Container>
                <Container id='mainContainer'>
                    <Form>
                        <div className='titles'> About You </div>
                        <Form.Row>
                            <Form.Group as={Col} controlId="createForm.fn" className='name'>                           
                                <Form.Label>First name<span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control type="text" className="createFormPlaceHolder" placeholder="First name" />
                            </Form.Group>
                            <Form.Group as={Col} controlId="createForm.ln" className='name'>                           
                                <Form.Label>Last name<span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control type="text" className="createFormPlaceHolder" placeholder="Last name" />
                            </Form.Group>
                        </Form.Row>                       
                        <Form.Group controlId="createForm.og">
                            <Form.Label>Organizaion <span className="optional">(optional)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder" placeholder="Organization name"/>
                        </Form.Group>
                        <Form.Row>
                            <Form.Group as={Col} controlId="createForm.country">
                                <Form.Label>Select your country</Form.Label>
                                <Form.Control as="select">
                                {countries.map( (data)=> 
                                    <option value={data.value}>{data.text}</option>
                                )}
                                </Form.Control>
                            </Form.Group>
                            <Form.Group as={Col} controlId="createForm.coinName">
                                <Form.Label>Select coin</Form.Label>
                                <Form.Control as="select">
                                {this.state.coinOptions.map( (data)=>
                                    <option value={data.value}>{data.text}</option>
                                )}
                                </Form.Control>
                            </Form.Group>
                        </Form.Row>
                        <hr/>
                        <div className='titles'> How much do you need? </div>
                        <div className='subTitles'> Current Price of HEO token 1BSUD </div>
                        <Form.Group controlId="creatForm.maxAmount">
                            <Form.Label>How much BSUD do you need to raise?<span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control type="number" className="createFormPlaceHolder" placeholder="10,000"/>
                        </Form.Group>  
                        <hr/>
                        <div className='titles'> Campaign Details </div>
                        <Form.Group>
                            <Form.Label>Select cover image</Form.Label>
                            <Form.File
                                className="position-relative"
                                required
                                name="file"
                                id="campaignImgInput"
                            />
                        </Form.Group>
                        <Form.Group controlId="creatForm.vl">
                            <Form.Label>Promotional Video <span className='optional'>(optional)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder" placeholder="Link to YouTube Video"/>
                        </Form.Group>
                        <Form.Group controlId="creatForm.title">
                            <Form.Label>Title<span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder" placeholder="Title of the campaign"/>
                        </Form.Group>
                        <Form.Group controlId="creatForm.description">
                            <Form.Label>Campaign description</Form.Label>
                            <Form.Control as="textarea" rows={5} className="createFormPlaceHolder" placeholder="Campaign description"/>
                        </Form.Group>
                        <Button id='createCampaignBtn' type="submit">
                            CREATE CAMPAIGN
                        </Button>
                    </Form>
                </Container>
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
        

        let options = (config.get("chainconfigs")[config.get("CHAIN")]["currencyOptions"]);
        this.setState({coinOptions : options});
        console.log(this.state.coinOptions);
    }
}


export default CreateCampaign2;