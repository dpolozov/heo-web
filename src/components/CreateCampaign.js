import React from 'react';
import countries from '../countries';
import {Container, Form, Col, Button, Image, Modal} from 'react-bootstrap';
import ReactPlayer from 'react-player';
import config from "react-global-configuration";
import { Link, withRouter } from "react-router-dom";
import uuid from 'react-uuid';
import axios from 'axios';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import {UserContext} from './UserContext';
import { LogIn, initWeb3, checkAuth, initWeb3Modal } from '../util/Utilities';
import TextEditor, { getEditorState, setEditorState } from '../components/TextEditor';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import { compress } from 'shrink-string';
import '../css/createCampaign.css';
import '../css/modal.css';

import Web3Modal from 'web3modal';
import Web3 from 'web3';
import WalletConnectProvider from '@walletconnect/web3-provider';

class CreateCampaign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            whiteListed: false,
            loaderMessage:"Please wait",
            showError:false,
            showModal: false,
            modalMessage:"",
            modalTitle:"",
            modalIcon:"",
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
            description:"",
            raisedAmount:0,
            percentRaised: "0%",
            mainImageURL: "",
            mainImageFile:"",
            currencyAddress:"",
            currencyName:"",
            coinOptions: [],
            waitToClose: false,
            goHome:false,
            getContent: false,
            editorContent: {}
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

    async handleClick (event) {
        //this.showHtml();
        let imgID = uuid();
        try {
            let imgUrl = await this.uploadImageS3(imgID);
            if(imgUrl) {
                let campaignData = await this.createCampaign(imgUrl);
                if(campaignData) {
                    await this.addCampaignToDb(campaignData);
                }
            }
        } catch(error)  {
            console.log(error);
        }
    }

    async addCampaignToDb(campaignData) {
        try {
            campaignData.title = this.state.title;
            campaignData.currencyName = this.state.currencyName;
            campaignData.description = this.state.description;
            campaignData.mainImageURL = this.state.mainImageURL;
            campaignData.maxAmount = this.state.maxAmount;
            campaignData.vl = this.state.vl;
            campaignData.fn = this.state.fn;
            campaignData.ln = this.state.ln;
            campaignData.org = this.state.org;
            campaignData.cn = this.state.cn;
            campaignData.descriptionEditor = getEditorState();
            let res = await axios.post('/api/campaign/add', {mydata : campaignData},
                {headers: {"Content-Type": "application/json"}});
            this.setState({showModal:true, goHome: true,
                modalMessage: 'campaignCreateSuccess',
                modalTitle: 'success',
                modalIcon: 'CheckCircle',
                modalButtonMessage: 'returnHome',
                modalButtonVariant: "#588157", waitToClose: false
            });
        } catch (err) {
            this.setState({showModal: true, goHome: true,
                modalTitle: 'addToDbFailedTitle',
                modalMessage: 'addToDbFailedMessage',
                modalIcon: 'CheckCircle',
                modalButtonMessage: 'returnHome',
                modalButtonVariant: "#588157", waitToClose: false
            });
            console.log('error adding campaign to the database ' + err.message);
        }
    }

    async createCampaign(imgUrl) {
        let compressed_meta = await compress(JSON.stringify(
            {   title: this.state.title,
                description: this.state.description,
                mainImageURL: imgUrl,
                fn: this.state.fn,
                ln: this.state.ln,
                org: this.state.org,
                cn: this.state.cn,
                vl: this.state.vl,
                currencyName: this.state.currencyName,
                descriptionEditor : getEditorState(),
            })
        );
        try {
            this.setState({showModal:true,
                modalMessage: 'confirmMetamask', modalIcon:'HourglassSplit',
                modalButtonMessage: 'closeBtn',
                modalButtonVariant: "#E63C36", waitToClose: false});
            var that = this;
            if(!this.state.web3 ||!this.state.accounts) {
                await initWeb3(this);
            }
            let abi = (await import("../remote/" + config.get("CHAIN") + "/HEOCampaignFactory")).abi;
            let address = (await import("../remote/" + config.get("CHAIN") + "/HEOCampaignFactory")).address;
            var HEOCampaignFactory = new this.state.web3.eth.Contract(abi, address);
            let result = await HEOCampaignFactory.methods.createCampaign(
                this.state.web3.utils.toWei(`${this.state.maxAmount}`), this.state.currencyAddress, this.state.accounts[0], compressed_meta)
                    .send({from:this.state.accounts[0]})
                    .on('transactionHash',
                        function(transactionHash) {
                            that.setState({showModal:true, modalTitle: 'processingWait',
                            modalMessage: 'waitingForNetowork', modalIcon: 'HourglassSplit',
                            modalButtonVariant: "gold", waitToClose: true});
                        });
            if(result && result.events && result.events.CampaignDeployed && result.events.CampaignDeployed.address) {
                return {
                    address: result.events.CampaignDeployed.returnValues.campaignAddress,
                    beneficiaryId: result.events.CampaignDeployed.returnValues.beneficiary
                };
            } else {
                return false;
            }
        } catch (error) {
            this.setState({showModal: true,
                modalTitle: 'blockChainTransactionFailed',
                modalMessage: 'checkMetamask',
                modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                modalButtonVariant: "#E63C36", waitToClose: false});
            console.log("createCampaign transaction failed");
            console.log(error);
            return false;
        }
        return false;
    }

    async uploadImageS3 (imgID) {
        this.setState(
            {showModal:true, modalTitle: 'processingWait',
            modalMessage: 'uploadingImageWait', modalIcon: 'HourglassSplit',
            modalButtonVariant: "gold", waitToClose: true
            });
        let fileType = this.state.mainImageFile.type.split("/")[1];
        const formData = new FormData();
        formData.append(
            "myFile",
            this.state.mainImageFile,
            imgID,
        );
        try {
            let res = await axios.post('/api/uploadimage', formData);
            this.setState({showModal:false, mainImageURL: res.data});
            return res.data;
        }  catch(err) {
            if (err.response) {
                console.log('response error in uploading main image- ' + err.response.status);
                this.setState({showModal: true, goHome: false,
                    modalTitle: 'imageUploadFailed',
                    modalMessage: 'technicalDifficulties',
                    modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else if (err.request) {
                console.log('No response in uploading main image' + err.message);
                this.setState({showModal: true, goHome: false,
                    modalTitle: 'imageUploadFailed',
                    modalMessage: 'checkYourConnection',
                    modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else {
                console.log('error uploading image ' + err.message);
                this.setState({showModal: true, goHome: false,
                    modalTitle: 'imageUploadFailed',
                    modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }
            return false;
        }
    }

    render() {
        return (
            <div>
                <Modal show={this.state.showModal} onHide={this.state.showModal} className='myModal' centered>
                    <Modal.Body><p className='modalIcon'>
                        {this.state.modalIcon == 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.modalIcon == 'ExclamationTriangle' && <ExclamationTriangle/>}
                        {this.state.modalIcon == 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.modalIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p>
                        <p className='modalMessage'><Trans i18nKey={this.state.modalMessage}>
                            Your account has not been cleared to create campaigns.
                            Please fill out this
                            <Link  as='a' target='_blank' to='https://docs.google.com/forms/d/e/1FAIpQLSdTo_igaNjF-1E51JmsjJgILv68RN2v5pisTcqTLvZvuUvLDQ/viewform'>form</Link>
                            to ne granted permission to fundraise on HEO Platform
                        </Trans></p>
                        {!this.state.waitToClose &&
                        <UserContext.Consumer>
                            {({isLoggedIn, toggleLoggedIn}) => (
                                <Button className='myModalButton'
                                    style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                                    onClick={ async () => {
                                        this.setState({showModal:false})
                                        if(this.state.goHome) {
                                            this.props.history.push('/');
                                        } else if(!this.state.isLoggedIn) {
                                            try {
                                                if(!this.state.accounts || !this.state.web3) {
                                                    await initWeb3(this);
                                                }
                                                await LogIn(this.state.accounts[0], this.state.web3, this);
                                                if(this.state.isLoggedIn) {
                                                    toggleLoggedIn(true);
                                                    await this.checkWL();
                                                }
                                            } catch (err) {
                                                console.log(err);
                                                this.setState({showModal:true,
                                                    goHome: true,
                                                    isLoggedIn: false,
                                                    modalTitle: 'authFailedTitle',
                                                    modalMessage: 'authFailedMessage',
                                                    modalButtonMessage: 'closeBtn',
                                                    modalButtonVariant: "#E63C36"}
                                                );
                                            }
                                        }
                                    }}>
                                    <Trans i18nKey={this.state.modalButtonMessage} />
                                </Button>
                                )}
                        </UserContext.Consumer>
                        }
                    </Modal.Body>                
                </Modal>
                <Container className='backToCampaignsDiv'>
                    <p className='backToCampaigns'><Link class={"backToCampaignsLink"} to="/"><ChevronLeft id='backToCampaignsChevron'/> <Trans i18nKey='backToCampaigns'/></Link></p>
                </Container>
                {(this.state.isLoggedIn && this.state.whiteListed) &&
                <Container id='mainContainer'>
                    <Form>
                        <div className='titles'><Trans i18nKey='aboutYou'/></div>
                        <Form.Row>
                            <Form.Group as={Col} className='name'>
                                <Form.Label><Trans i18nKey='fn'/><span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control required type="text" className="createFormPlaceHolder"
                                              placeholder={i18n.t('fn')}
                                              name='fn' value={this.state.fn} onChange={this.handleChange}
                                />
                            </Form.Group>
                            <Form.Group as={Col} className='name'>
                                <Form.Label><Trans i18nKey='ln'/><span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control required type="text" className="createFormPlaceHolder"
                                              placeholder={i18n.t('ln')} name='ln'
                                              value={this.state.ln} onChange={this.handleChange}/>
                            </Form.Group>
                        </Form.Row>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='organization'/> <span
                                className="optional">(<Trans i18nKey='optional'/>)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder" placeholder={i18n.t('on')}
                                name='org' value={this.state.org} onChange={this.handleChange}/>
                        </Form.Group>
                        <Form.Row>
                            <Form.Group as={Col}>
                                <Form.Label><Trans i18nKey='selectConuntry'/></Form.Label>
                                <Form.Control as="select" name='cn' value={this.state.cn} onChange={this.handleChange}>
                                    {countries.map((data) =>
                                        <option value={data.value}>{data.text}</option>
                                    )}
                                </Form.Control>
                            </Form.Group>
                            <Form.Group as={Col}>
                                <Form.Label><Trans i18nKey='selectCoin'/></Form.Label>
                                <Form.Control as="select" name='currencyAddress'
                                    value={this.state.currencyAddress} onChange={this.handleChange}>
                                    {this.state.coinOptions.map((data) =>
                                        <option value={data.value}>{data.text}</option>
                                    )}
                                </Form.Control>
                            </Form.Group>
                        </Form.Row>
                        <hr/>
                        <div className='titles'><Trans i18nKey='campaignDetails'/></div>
                        <Form.Group>
                            <Form.Label>{i18n.t('howMuchYouNeed', {currencyName: this.state.currencyName})}<span
                                className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="number" className="createFormPlaceHolder"
                                          value={this.state.maxAmount} placeholder={this.state.maxAmount}
                                          name='maxAmount' onChange={this.handleChange}/>
                        </Form.Group>
                        <hr/>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='selectCoverImage'/></Form.Label>
                            <Form.Label><span className='optional'>(<Trans i18nKey='coverImageHint'/>)</span></Form.Label>
                            <Form.File
                                name='imageFile' className="position-relative" required
                                id="campaignImgInput" accept='.jpg,.png,.jpeg,.gif'
                                onChange={this.fileSelected}
                            />
                        </Form.Group>
                        <Image id='createCampaignImg' src={this.state.mainImageURL}/>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='promoVideo'/> <span
                                className='optional'>(<Trans i18nKey='optional'/>)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder"
                                          placeholder={i18n.t('linkToYouTube')}
                                          name='vl' value={this.state.vl} onChange={this.handleChange}/>
                        </Form.Group>
                        {this.state.vl != "" && <ReactPlayer url={this.state.vl} id='createCampaignVideoPlayer'/>}
                        <Form.Group>
                            <Form.Label><Trans i18nKey='title'/><span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="text" className="createFormPlaceHolder"
                                          placeholder={i18n.t('campaignTitle')}
                                          name='title' value={this.state.title} onChange={this.handleChange}/>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='shortDescription'/></Form.Label>  
                            <Form.Control as="textarea" rows={3} className="createFormPlaceHolder"
                                          placeholder={i18n.t('descriptionOfCampaign')}
                                          name='description' value={this.state.description}
                                          maxLength='195' onChange={this.handleTextArea}/>
                            <Form.Label><Trans i18nKey='campaignDescription'/></Form.Label> 
                            <TextEditor />                  
                        </Form.Group>
                        <Button onClick={() => this.handleClick()} id='createCampaignBtn' name='ff3'>
                            {i18n.t('createCampaignBtn')}
                        </Button>
                    </Form>
                </Container>
                }
            </div>
        );
    }

    async checkWL() {
        //is white list enabled?
        try {
            if(!this.state.web3 || !this.state.accounts) {
                await initWeb3(this);
            }
            let abi = (await import("../remote/" + config.get("CHAIN") + "/HEOParameters")).abi;
            let address = (await import("../remote/" + config.get("CHAIN") + "/HEOParameters")).address;
            var HEOParameters = new this.state.web3.eth.Contract(abi, address);
            let wlEnabled = await HEOParameters.methods.intParameterValue(11).call();
            if(wlEnabled > 0) {
                //is user white listed?
                let accounts = await this.state.web3.eth.getAccounts();
                this.setState({accounts: accounts});
                let whiteListed = await HEOParameters.methods.addrParameterValue(5, accounts[0].toLowerCase()).call();
                if(whiteListed > 0) {
                    this.setState({
                        isLoggedIn : true,
                        whiteListed: true,
                        showModal: false,
                        goHome: false
                    });
                } else {
                    //user is not in the white list
                    this.setState({
                        goHome: true,
                        showModal:true,
                        isLoggedIn: true,
                        whiteListed: false,
                        modalTitle: 'nonWLTitle',
                        modalMessage: 'nonWLMessage',
                        modalIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                        modalButtonVariant: "#E63C36", waitToClose: false
                    });
                }
            } else {
                //white list is disabled
                this.setState({
                    isLoggedIn : true,
                    whiteListed: true,
                    goHome: false,
                    showModal: false
                });
            }
        } catch (err) {
            console.log(err);
            this.setState({
                showModal: true, modalTitle: 'Failed',
                errorIcon: 'XCircle', modalButtonMessage: 'closeBtn',
                modalButtonVariant: '#E63C36', waitToClose: false,
                modalMessage: 'blockChainConnectFailed'
            });
        }
    }

    async componentDidMount() {
        await initWeb3Modal();
        let options = (config.get("chainconfigs")[config.get("CHAIN")]["currencyOptions"]);
        let currencyOptions = (config.get("chainconfigs")[config.get("CHAIN")]["currencies"]);
        this.setState({currencies: currencyOptions,
            coinOptions: options,
            currencyAddress: options[0].value,
            currencyName:options[0].text}
        );
        // is the user logged in?
        if(!this.state.isLoggedIn) {
            await checkAuth(this);
        }
        if(this.state.isLoggedIn) {
            await this.checkWL();
        } else {
            //need to log in first
            this.setState({
                showModal: true,
                isLoggedIn : false,
                whiteListed: false,
                goHome: false,
                modalTitle: 'pleaseLogInTitle',
                modalMessage: 'pleaseLogInToCreateMessage',
                modalIcon: 'XCircle', modalButtonMessage: 'login',
                modalButtonVariant: "#E63C36", waitToClose: false});
        }
    }
}

export default withRouter(CreateCampaign);