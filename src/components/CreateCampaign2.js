import React from 'react';
import countries from '../countries';
import '../css/createCampaign.css';
import {Container, Form, Col, Button, Image, Modal} from 'react-bootstrap';
import ReactPlayer from 'react-player';
import config from "react-global-configuration";
import uuid from 'react-uuid';
import axios from 'axios';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';

var HEOCampaignFactory, ACCOUNTS, web3;

class CreateCampaign2 extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            showLoader:false,
            loaderMessage:"Please wait",
            showError:false,
            showModal: false,
            modalMessage:"",
            errorMessage:"",
            errorIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
            fn:"",
            ln:"",
            org:"",
            cn:"",
            vl:"",
            title:"",
            maxAmount:10000,
            title:"",
            description:"Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor.",
            raisedAmount:0,
            percentRaised: "0%",
            mainImageURL: "",
            metaDataURL:"",
            mainImageFile:"",
            currencyAddress:"",
            currencyName:"",
            coinOptions: [],
            waitToClose: false
        };

    }
    
    handleTextArea = (e) => {
        this.setState({description:e.target.value});
    }
    handleChange = e => {
        this.setState({ [e.target.name]: e.target.value });
        if(e.target.name == "currencyAddress") {
            this.setState({["currencyName"]: this.state.currencies[e.target.value]});
        }
    };

    fileSelected = e => {
        this.setState({mainImageFile:e.target.files[0], mainImageURL: URL.createObjectURL(e.target.files[0])});
    }

    handleClick = (event) => {
        event.preventDefault();
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
    }

    async createCampaign(that) {
        console.log("Creating campaign");
        var that = this;
        HEOCampaignFactory.methods.createCampaign(web3.utils.toWei(`${this.state.maxAmount}`),
            this.state.currencyAddress, this.state.metaDataURL, ACCOUNTS[0]).send({from:ACCOUNTS[0]}).on(
            'receipt', function(receipt) {
                console.log("Received receipt from createCampaign transaction");
                that.setState({showModal:true,
                    modalMessage:"Congratulations! Your fundraiser is live on the blockchain.",
                    errorMessage:'Success!', errorIcon:'CheckCircle', modalButtonMessage: "RETURN TO HOME",
                    modalButtonVariant: "#588157", waitToClose: false });
            }).on('error', function(error) {
                that.setState({showModal:true,
                    errorMessage:'Blockchain transaction has failed.',
                    modalMessage:'Please check MetaMask for more details.',
                    errorIcon:'XCircle', modalButtonMessage: "RETURN TO HOME",
                    modalButtonVariant: "#E63C36", waitToClose: false});
                console.log("createCampaign transaction failed");
                console.log(error);
            }).on('transactionHash', function(transactionHash){
                that.setState({showModal:true, errorMessage:'Processing...',
                    modalMessage:'Waiting for the network to confirm transaction.', errorIcon:'HourglassSplit',
                    modalButtonVariant: "gold", waitToClose: true});
            });
        that.setState({showLoader:true, loaderMessage:"Please confirm transaction in MetaMask."})
    }

    //vl - video link(youtube)
    async uploadMetaS3(that, metaID) {
        console.log(`Generating metadata file ${metaID}`);
        that.setState({showModal:true, errorMessage:'Processing...',
            modalMessage:'Please wait. Uploading metadata.', errorIcon:'HourglassSplit',
            modalButtonVariant: "gold", waitToClose: true});
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
            that.setState({showModal: false, metaDataURL:res.data
            });
        }).catch(err => {
            if (err.response) { 
                console.log('response error in uploading meta data- ' + err.response.status);
                that.setState({showModal:true,
                    errorMessage:'Failed to upload compaign informaion.',
                    modalMessage:'We are having technical difficulties',
                    errorIcon:'XCircle', modalButtonMessage: "RETURN TO HOME",
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else if (err.request) { 
                console.log('No response in uploading meta data' + err.message);
                that.setState({showModal:true,
                    errorMessage:'Failed to upload compaign informaion.',
                    modalMessage:'Please check your connection.',
                    errorIcon:'XCircle', modalButtonMessage: "RETURN TO HOME",
                    modalButtonVariant: "#E63C36", waitToClose: false}); 
            } else { 
                console.log('error uploading campaign information ' + err.message);
                that.setState({showModal:true,
                    errorMessage:'Failed to upload compaign informaion.',
                    errorIcon:'XCircle', modalButtonMessage: "RETURN TO HOME",
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }           
            throw new Error(`Failed to upload compaign information.`); 
        });
    }

    async uploadImageS3 (that, imgID) {
        console.log(`Uploading ${this.state.mainImageFile.name} of type ${this.state.mainImageFile.type} to S3`);
        that.setState({showModal:true, errorMessage:'Processing...',
        modalMessage:'Please wait. Uploading image file.', errorIcon:'HourglassSplit',
        modalButtonVariant: "gold", waitToClose: true});
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
            that.setState({showModal:false, mainImageURL:res.data});
        }).catch(err => {
            if (err.response) { 
                console.log('response error in uploading main image- ' + err.response.status);
                that.setState({showModal:true,
                    errorMessage:'Failed to upload image file.',
                    modalMessage:'We are having technical difficulties',
                    errorIcon:'XCircle', modalButtonMessage: "RETURN TO HOME",
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else if (err.request) { 
                console.log('No response in uploading main image' + err.message);
                that.setState({showModal:true,
                    errorMessage:'Failed to upload image file.',
                    modalMessage:'Please check your connection.',
                    errorIcon:'XCircle', modalButtonMessage: "RETURN TO HOME",
                    modalButtonVariant: "#E63C36", waitToClose: false}); 
            } else { 
                console.log('error uploading image ' + err.message);
                that.setState({showModal:true,
                    errorMessage:'Failed to upload image file.',
                    errorIcon:'XCircle', modalButtonMessage: "RETURN TO HOME",
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }           
            throw new Error(`Failed to upload image file.`); 
        });
    }

    render() {
        return (
            <div>
                <Modal show={this.state.showModal} onHide={this.state.showModal} className='myModal' centered>
                    <Modal.Body><p className='errorIcon'>
                        {this.state.errorIcon == 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.errorIcon == 'ExclamationTriangle' && <ExclamationTriangle/>}
                        {this.state.errorIcon == 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.errorIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                        <p className='errorMessage'>{this.state.errorMessage}</p>
                        <p className='modalMessage'>{this.state.modalMessage}</p>
                        {!this.state.waitToClose &&
                        <Button className='myModalButton' 
                            style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}} 
                            onClick={ () => {this.setState({showModal:false})}}>
                            {this.state.modalButtonMessage}
                        </Button>
                        }
                    </Modal.Body>
                    
                </Modal>
                <Container className='backToCampaignsDiv'>
                        <p className='backToCampaigns'><ChevronLeft id='createCampaignChevron'/> Back To Campaigns</p>
                </Container>
                <Container id='mainContainer'>
                    <Form onSubmit={this.handleClick}>
                        <div className='titles'> About You </div>
                        <Form.Row>
                            <Form.Group as={Col} className='name'>                           
                                <Form.Label>First name<span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control required type="text" className="createFormPlaceHolder" placeholder="First name" 
                                    name='fn' value={this.state.fn} onChange={this.handleChange} 
                                />
                            </Form.Group>
                            <Form.Group as={Col} className='name'>                           
                                <Form.Label>Last name<span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control required type="text" className="createFormPlaceHolder" placeholder="Last name" name='ln'
                                            value={this.state.ln} onChange={this.handleChange} />
                            </Form.Group>
                        </Form.Row>                       
                        <Form.Group >
                            <Form.Label>Organizaion <span className="optional">(optional)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder" placeholder="Organization name" 
                                name='org' value={this.state.org} onChange={this.handleChange} />
                        </Form.Group>
                        <Form.Row>
                            <Form.Group as={Col}>
                                <Form.Label>Select your country</Form.Label>
                                <Form.Control as="select" name='cn' value={this.state.cn} onChange={this.handleChange} >
                                {countries.map( (data)=> 
                                    <option value={data.value}>{data.text}</option>
                                )}
                                </Form.Control>
                            </Form.Group>
                            <Form.Group as={Col}>
                                <Form.Label>Select coin</Form.Label>
                                <Form.Control as="select" name='currencyAddress' 
                                    value={this.state.currencyAddress} onChange={this.handleChange}>
                                    {this.state.coinOptions.map( (data)=>
                                        <option value={data.value}>{data.text}</option>
                                    )}
                                </Form.Control>
                            </Form.Group>
                        </Form.Row>
                        <hr/>
                        <div className='titles'> Campaign Details </div>
                        <Form.Group>
                            <Form.Label>How much {this.state.currencyName} do you need to raise?<span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="number" className="createFormPlaceHolder"
                                          value={this.state.maxAmount} placeholder={this.state.maxAmount}
                                          name='maxAmount' onChange={this.handleChange}/>
                        </Form.Group>
                        <hr/>
                        <Form.Group>
                            <Form.Label>Select cover image</Form.Label>
                            <Form.File
                                name='imageFile' className="position-relative" required
                                id="campaignImgInput" accept='.jpg,.png,.jpeg,.gif' 
                                onChange={this.fileSelected}
                            />
                        </Form.Group>
                        <Image id='createCampaignImg' src={this.state.mainImageURL}/>
                        <Form.Group>
                            <Form.Label>Promotional Video <span className='optional'>(optional)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder" placeholder="Link to YouTube Video"
                                name='vl' value={this.state.vl} onChange={this.handleChange}/>
                        </Form.Group>
                        { this.state.vl != "" && <ReactPlayer url={this.state.vl} id='createCampaignVideoPlayer' />}
                        <Form.Group>
                            <Form.Label>Title<span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="text" className="createFormPlaceHolder" placeholder="Title of the campaign"
                                name='title' value={this.state.title} onChange={this.handleChange}/>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Campaign description</Form.Label>
                            <Form.Control as="textarea" rows={5} className="createFormPlaceHolder" placeholder="Campaign description"
                                name='description' value={this.state.description} onChange={this.handleTextArea} />
                        </Form.Group>
                        <Button type="submit" id='createCampaignBtn' name='ff3'>
                            CREATE CAMPAIGN
                        </Button>
                    </Form>
                </Container>
            </div>
        );
    }

    async componentDidMount() {
        if (typeof window.ethereum !== 'undefined') {
            HEOCampaignFactory = (await import("../remote/" + config.get("CHAIN") + "/HEOCampaignFactory")).default;
            var ethereum = window.ethereum;
            ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
            web3 = (await import("../remote/" + config.get("CHAIN") + "/web3")).default;
        } else {
            alert("Please install metamask");
        }
        let options = (config.get("chainconfigs")[config.get("CHAIN")]["currencyOptions"]);
        let currencyOptions= (config.get("chainconfigs")[config.get("CHAIN")]["currencies"]);
        this.setState({currencies: currencyOptions,
            coinOptions: options,
            currencyAddress: options[0].value,
            currencyName:options[0].text}
        );
    }
}


export default CreateCampaign2;