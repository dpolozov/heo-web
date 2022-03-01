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
import ReactGA from "react-ga4";
ReactGA.initialize("G-C657WZY5VT");

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
            description:"",
            raisedAmount:0,
            percentRaised: "0%",
            mainImageURL: "",
            mainImageFile:"",
            waitToClose: false,
            goHome:false,
            getContent: false,
            editorContent: {},
            chains:{},
            chainConfig:{},
            chainId:""
        };

    }

    onSubmit = (e) => {
        e.preventDefault();
        console.log("refresh prevented");
    };

    handleTextArea = (e) => {
        this.setState({description:e.target.value});
    }
    handleChange = e => {
        this.setState({ [e.target.name]: e.target.value });
    };

    fileSelected = e => {
        this.setState({mainImageFile:e.target.files[0], mainImageURL: URL.createObjectURL(e.target.files[0])});
    }

    async handleClick (event) {
        //this.showHtml();
        let imgID = uuid();
        try {
            if(!this.state.org) {
                this.setState(
                    {showModal:true, modalTitle: 'requiredFieldsTitle',
                        modalMessage: 'orgRequired', modalIcon: 'ExclamationTriangle',
                        waitToClose: false,
                        modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                    });
                return false;
            }
            if(!this.state.cn) {
                this.setState(
                    {showModal:true, modalTitle: 'requiredFieldsTitle',
                        modalMessage: 'cnRequired', modalIcon: 'ExclamationTriangle',
                        waitToClose: false,
                        modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                    });
                return false;
            }
            if(!this.state.title) {
                this.setState(
                    {showModal:true, modalTitle: 'requiredFieldsTitle',
                        modalMessage: 'titleRequired', modalIcon: 'ExclamationTriangle',
                        waitToClose: false,
                        modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                    });
                return false;
            }
            if(!this.state.description) {
                this.setState(
                    {showModal:true, modalTitle: 'requiredFieldsTitle',
                        modalMessage: 'shortDescRequired', modalIcon: 'ExclamationTriangle',
                        waitToClose: false,
                        modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                    });
                return false;
            }
            if(!getEditorState() || getEditorState().length < 2) {
                this.setState(
                    {showModal:true, modalTitle: 'requiredFieldsTitle',
                        modalMessage: 'longDescRequired', modalIcon: 'ExclamationTriangle',
                        waitToClose: false,
                        modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                    });
                return false;
            }
            let imgUrl = await this.uploadImageS3(imgID);
            if(imgUrl) {
                if(window.web3Modal.cachedProvider != "binancechainwallet") {
                    let campaignData = await this.createCampaign(imgUrl);
                    if (campaignData) {
                        await this.addCampaignToDb(campaignData);
                    }
                } else {
                    this.createCampaign(imgUrl);
                }
            }
        } catch(error)  {
            console.log(error);
        }
    }

    async addCampaignToDb(campaignData) {
        try {
            campaignData.title = {"default": this.state.title};
            campaignData.title[i18n.language] = this.state.title;
            campaignData.addresses = {};
            campaignData.addresses[this.state.chainId] = campaignData.address;
            campaignData.coins = {};
            campaignData.coins[this.state.chainId] = {
                address: this.state.chainConfig.currencyOptions.value,
                name:this.state.chainConfig.currencyOptions.text
            };
            campaignData.description = {"default": this.state.description};
            campaignData.description[i18n.language] = this.state.description;
            campaignData.mainImageURL = this.state.mainImageURL;
            campaignData.maxAmount = this.state.maxAmount;
            campaignData.vl = this.state.vl;
            campaignData.fn = this.state.fn;
            campaignData.ln = this.state.ln;
            campaignData.org = {"default": this.state.org};
            campaignData.org[i18n.language] = this.state.org;
            campaignData.cn = this.state.cn;
            let editorState = getEditorState();
            campaignData.descriptionEditor = {"default": editorState};
            campaignData.descriptionEditor[i18n.language] = editorState;
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
        var titleObj = {"default": this.state.title};
        titleObj[i18n.language] = this.state.title;
        var orgObj = {"default": this.state.org};
        orgObj[i18n.language] = this.state.org;
        var descriptionObj = {"default": this.state.description};
        descriptionObj[i18n.language] = this.state.description;
        let editorState = getEditorState();
        var editorObj = {"default": editorState};
        editorObj[i18n.language] = editorState;
        let compressed_meta = await compress(JSON.stringify(
            {   title: titleObj,
                description: descriptionObj,
                mainImageURL: imgUrl,
                fn: this.state.fn,
                ln: this.state.ln,
                org: orgObj,
                cn: this.state.cn,
                vl: this.state.vl,
                descriptionEditor : editorObj,
            })
        );
        try {
            this.setState({showModal:true,
                modalMessage: 'confirmMetamask', modalIcon:'HourglassSplit',
                modalButtonMessage: 'closeBtn',
                modalButtonVariant: "#E63C36", waitToClose: false});
            if(!this.state.web3 || !this.state.accounts) {
                await initWeb3(this.state.chainId, this);
            }
            var that = this;
            var web3 = this.state.web3;
            let abi = (await import("../remote/" + this.state.chainId + "/HEOCampaignFactory")).abi;
            let address = (await import("../remote/" + this.state.chainId + "/HEOCampaignFactory")).address;
            var HEOCampaignFactory = new this.state.web3.eth.Contract(abi, address);

            if(window.web3Modal.cachedProvider == "binancechainwallet") {
                HEOCampaignFactory.methods.createCampaign(
                    this.state.web3.utils.toWei(`${this.state.maxAmount}`), this.state.chainConfig.currencyOptions.value, this.state.accounts[0], compressed_meta)
                    .send({from:this.state.accounts[0]})
                    .once('transactionHash', function(transactionHash) {
                        that.setState({showModal:true, modalTitle: 'processingWait',
                            modalMessage: 'waitingForNetwork', modalIcon: 'HourglassSplit',
                            modalButtonVariant: "gold", waitToClose: true}
                        );
                        web3.eth.getTransaction(transactionHash).then(
                            function(txnObject) {
                                checkTransaction(txnObject, that);
                            }
                        );
                    });
            } else {
                let result = await HEOCampaignFactory.methods.createCampaign(
                    this.state.web3.utils.toWei(`${this.state.maxAmount}`), this.state.chainConfig.currencyOptions.value, this.state.accounts[0], compressed_meta)
                    .send({from:this.state.accounts[0]})
                    .on('transactionHash',
                        function(transactionHash) {
                            that.setState({showModal:true, modalTitle: 'processingWait',
                                modalMessage: 'waitingForNetwork', modalIcon: 'HourglassSplit',
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
        if(!this.state.mainImageFile || !this.state.mainImageFile.type) {
            this.setState(
                {showModal:true, modalTitle: 'coverImageRequiredTitle',
                    modalMessage: 'coverImageRequired', modalIcon: 'ExclamationTriangle',
                    waitToClose: false,
                    modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                });
            return false;
        }
        let fileType = this.state.mainImageFile.type.split("/")[1];
        const formData = new FormData();
        formData.append(
            "myFile",
            this.state.mainImageFile,
            `${imgID}.${fileType}`,
        );
        try {
            let res = await axios.post('/api/uploadimage', formData);
            this.setState({showModal:false, mainImageURL: res.data});
            if(res.data) {
                return res.data;
            } else {
                console.log('error uploading image: res.data is empty');
                this.setState({showModal: true, goHome: false,
                    modalTitle: 'imageUploadFailed',
                    modalMessage: 'technicalDifficulties',
                    modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
                return false;
            }
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
                <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' centered>
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
                            <a target='_blank' href='https://docs.google.com/forms/d/e/1FAIpQLSdTo_igaNjF-1E51JmsjJgILv68RN2v5pisTcqTLvZvuUvLDQ/viewform'>form</a>
                            to ne granted permission to fundraise on HEO Platform
                        </Trans></p>
                        {!this.state.waitToClose &&
                        <UserContext.Consumer>
                            {({isLoggedIn}) => (
                                <Button className='myModalButton'
                                    style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                                    onClick={ async () => {
                                        this.setState({showModal:false})
                                        if(this.state.goHome) {
                                            this.props.history.push('/');
                                        } else if(!this.state.isLoggedIn) {
                                            try {
                                                if(!this.state.accounts || !this.state.web3) {
                                                    await initWeb3(this.state.chainId, this);
                                                }
                                                await LogIn(this.state.accounts[0], this.state.web3, this);
                                                if(this.state.isLoggedIn) {
                                                    await this.checkWL(this.state.chainId);
                                                }
                                            } catch (err) {
                                                console.log(err);
                                                this.setState({showModal:true,
                                                    goHome: true,
                                                    waitToClose: false,
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
                    <Form onSubmit={this.onSubmit}>
                        <div className='titles'><Trans i18nKey='aboutYou'/></div>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='organization'/><span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="text" className="createFormPlaceHolder" placeholder={i18n.t('on')}
                                name='org' value={this.state.org} onChange={this.handleChange}/>
                        </Form.Group>
                        <Form.Row>
                            <Form.Group as={Col}>
                                <Form.Label><Trans i18nKey='selectConuntry'/><span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control as="select" name='cn' value={this.state.cn} onChange={this.handleChange}>
                                    {countries.map((data) =>
                                        <option value={data.value}>{data.text}</option>
                                    )}
                                </Form.Control>
                            </Form.Group>
                        </Form.Row>
                        <hr/>
                        <div className='titles'><Trans i18nKey='campaignDetails'/></div>
                        <Form.Group>
                            <Form.Label>{i18n.t('howMuchYouNeed')}<span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="number" className="createFormPlaceHolder"
                                          value={this.state.maxAmount} placeholder={this.state.maxAmount}
                                          name='maxAmount' onChange={this.handleChange} onwheel="this.blur()" />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='selectCoverImage'/><span className='redAsterisk'>*</span></Form.Label>
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
                            <Form.Label><Trans i18nKey='shortDescription'/><span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required as="textarea" rows={3} className="createFormPlaceHolder"
                                          placeholder={i18n.t('descriptionOfCampaign')}
                                          name='description' value={this.state.description}
                                          maxLength='195' onChange={this.handleTextArea}/>
                            <Form.Label><Trans i18nKey='campaignDescription'/><span className='redAsterisk'>*</span></Form.Label>
                            <TextEditor/>
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

    async checkWL(chainId) {
        //is white list enabled?
        try {
            if(!this.state.web3 || !this.state.accounts) {
                console.log(`Web3 not initialized`);
                await initWeb3(chainId, this);
            }
            console.log(`Web 3 initialized. Account1: ${this.state.accounts[0]}`);
            console.log(`Loading HEOParameters on ${chainId}`);
            let abi = (await import("../remote/" + chainId + "/HEOParameters")).abi;
            let address = (await import("../remote/" + chainId + "/HEOParameters")).address;
            var HEOParameters = new this.state.web3.eth.Contract(abi, address);
            let wlEnabled = await HEOParameters.methods.intParameterValue(11).call();
            if(wlEnabled > 0) {
                console.log('WL enabled')
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
                    console.log(`User logged in and in WL`)
                } else {
                    console.log(`User not in WL`)
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
                console.log('WL disabled')
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
        setEditorState({}, false);
        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });
        let chains = config.get("CHAINS");
        let chainId = config.get("CHAIN");
        let chainConfig = chains[chainId];
        await initWeb3Modal(chainId, this);

        // is the user logged in?
        if(!this.state.isLoggedIn) {
            console.log(`User not logged in. Checking authentication on ${chainId}.`)
            await checkAuth(chainId, this);
        }
        this.setState({
            chains: chains,
            chainId: chainId,
            chainConfig: chainConfig
        });
        if(this.state.isLoggedIn) {
            console.log(`User logged in. Checking WL.`)
            await this.checkWL(chainId);
        } else {
            //need to log in first
            this.setState({
                chains: chains,
                chainId: chainId,
                chainConfig: chainConfig,
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

function checkTransaction(txnObject, that) {
    if(txnObject.blockNumber) {
        that.state.web3.eth.getTransactionReceipt(txnObject.hash).then(function(txnObject) {
            if(txnObject.logs && txnObject.logs.length >2 && txnObject.logs[2] && txnObject.logs[2].topics && txnObject.logs[2].topics.length > 3) {
                that.addCampaignToDb({
                    address: txnObject.logs[2].topics[1],
                    beneficiaryId: txnObject.logs[2].topics[3]
                });
            } else {
                this.setState({showModal: true, goHome: true,
                    modalTitle: 'addToDbFailedTitle',
                    modalMessage: 'addToDbFailedMessage',
                    modalIcon: 'CheckCircle',
                    modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#588157", waitToClose: false
                });
            }
        });
    } else {
        that.state.web3.eth.getTransaction(txnObject.hash).then(function(txnObject) {
            checkTransaction(txnObject, that);
        });
    }
}

export default withRouter(CreateCampaign);
