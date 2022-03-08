import React from 'react';
import countries from '../countries';
import {Container, Form, Col, Button, DropdownButton, Dropdown, Image, Modal} from 'react-bootstrap';
import ReactPlayer from 'react-player';
import config from "react-global-configuration";
import axios from 'axios';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import { ChevronLeft, CheckCircle, ExclamationTriangle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import { compress, decompress } from 'shrink-string';
import TextEditor, { setEditorState, getEditorState, editorStateHasChanged } from '../components/TextEditor';
import { LogIn, initWeb3, checkAuth, initWeb3Modal } from '../util/Utilities';
import '../css/createCampaign.css';
import '../css/modal.css';
import Web3Modal from 'web3modal';
import Web3 from 'web3';
import WalletConnectProvider from '@walletconnect/web3-provider';
import ReactGA from "react-ga4";
import bnbIcon from '../images/binance-coin-bnb-logo.png';
import busdIcon from '../images/binance-usd-busd-logo.png';
import usdcIcon from '../images/usd-coin-usdc-logo.png';
import ethIcon from '../images/eth-diamond-purple.png';
import cusdIcon from '../images/cusd-celo-logo.png';
import usdcAurora from '../images/usd-coin-aurora-logo.png';
const IMG_MAP = {"BUSD-0xe9e7cea3dedca5984780bafc599bd69add087d56": busdIcon,
    "BNB-0x0000000000000000000000000000000000000000": bnbIcon,
    "USDC-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": usdcIcon,
    "ETH-0x0000000000000000000000000000000000000000": ethIcon,
    "cUSD-0x765DE816845861e75A25fCA122bb6898B8B1282a": cusdIcon,
    "USDC-0xb12bfca5a55806aaf64e99521918a4bf0fc40802": usdcAurora};

var CAMPAIGNINSTANCE;
ReactGA.initialize("G-C657WZY5VT");

class EditCampaign extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            showLoader:false,
            loaderMessage:"Please wait",
            showError:false,
            showModal: false,
            modalMessage:"",
            errorIcon:"",
            modalButtonMessage: "",
            modalButtonVariant: "",
            fn:"",
            ln:"",
            org:"",
            ogOrg:{},
            cn:"",
            vl:"",
            title:"",
            ogTitle:{},
            description:"",
            ogDescription:{},
            mainImageURL: "",
            imgID:"",
            mainImageFile:"",
            qrCodeImageURL:"",
            qrCodeImageFile:"",
            waitToClose: false,
            maxAmount:0,
            updateImage: false,
            updateMeta: false,
            campaignId: "",
            currentError:"",
            updatedEditorState: false,
            chains:{},
            chainId:"",
            addresses: {},
            coins: {}
        };
    }

    onSubmit = (e) => {
        e.preventDefault();
        console.log("refresh prevented");
    };

    handleTextArea = (e) => {
        this.setState({description:e.target.value, updateMeta : true});
    }

    handleChange = (e) => {
        const name = e.target.name
        const value = e.target.value;
        this.setState({ [name] : value, updateMeta : true });
    }

    fileSelected = e => {
        this.setState({
            mainImageFile:e.target.files[0],
            mainImageURL: URL.createObjectURL(e.target.files[0]),
            updateImage : true, updateMeta : true
        });
    }

    qrfileSelected = e => {
        this.setState({qrCodeImageFile:e.target.files[0], qrCodeImageURL: URL.createObjectURL(e.target.files[0])});
    };

    handleClick = async (chainId) => {
        await initWeb3Modal(chainId, this);
        await initWeb3(chainId, this);
        // is the user logged in?
        if(!this.state.isLoggedIn) {
            await checkAuth(chainId, this);
        }

        //check if this campaign belongs to this user
        if(editorStateHasChanged()) {
            this.state.updateMeta = true;
        }

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
        let editorState = getEditorState();
        if(!editorState || editorState.length < 2) {
            console.log(`Editor state is empty ${editorState}`);
            console.log(editorState);
            this.setState(
                {showModal:true, modalTitle: 'requiredFieldsTitle',
                    modalMessage: 'longDescRequired', modalIcon: 'ExclamationTriangle',
                    waitToClose: false,
                    modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                });
            return false;
        }
        this.setState({showModal:true, modalTitle: 'processingWait',
                modalMessage: 'waitingForNetwork',
                errorIcon:'HourglassSplit',
                modalButtonVariant: "gold", waitToClose: true});
        var newImgUrl = this.state.mainImageURL;
        if(this.state.updateImage) {
            newImgUrl = await this.uploadImageS3('main');
            if(!newImgUrl) {
                this.setState({showModal:true,
                    modalTitle: 'imageUploadFailed',
                    modalMessage: 'technicalDifficulties',
                    errorIcon:'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
                return;
            }
        }
        var newQrImgUrl = this.state.qrCodeImageURL;
        if(this.state.updateImage) {
            newQrImgUrl = await this.uploadImageS3('qrCode');
            if(!newQrImgUrl) {
                this.setState({showModal:true,
                    modalTitle: 'imageUploadFailed',
                    modalMessage: 'technicalDifficulties',
                    errorIcon:'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
                return;
            }
        }

        //updating existing HEOCampaign
        if(this.state.updateMeta) {
            if(!(await this.updateCampaign(chainId))) {
                this.setState({showModal : true,
                    modalTitle: 'updatingAmountFailed',
                    modalMessage: this.state.currentError,
                    errorIcon:'XCircle', modalButtonMessage: 'closeBtn',
                    modalButtonVariant: "#E63C36", waitToClose: false});
                return;
            }
        }


        this.setState({
            showModal: true, modalTitle: 'complete',
            modalMessage: 'updateSuccessfull',
            errorIcon: 'CheckCircle', modalButtonMessage: 'closeBtn',
            modalButtonVariant: '#588157', waitToClose: false
        });
    }


    async updateCampaign(chainId) {
        this.setState({showModal:true,
            modalMessage: 'confirmMetamask', errorIcon:'HourglassSplit',
            modalButtonVariant: "gold", waitToClose: true})
        try {
            let data = {
                mainImageURL: this.state.mainImageURL,
                qrCodeImageURL: this.state.qrCodeImageURL,
                fn: this.state.fn,
                ln: this.state.ln,
                cn: this.state.cn,
                vl: this.state.vl
            };
            data.description = this.state.ogDescription;
            data.description[i18n.language] = data.description["default"] = this.state.description;
            data.title = this.state.ogTitle;
            data.title[i18n.language] = data.title["default"] = this.state.title;
            data.descriptionEditor = this.state.ogDescriptionEditor;
            data.descriptionEditor[i18n.language] = data.descriptionEditor["default"] = getEditorState();
            data.org = this.state.ogOrg;
            data.org[i18n.language] = data.org["default"] = this.state.org;
            console.log(`Updating title to`);
            console.log(data.title);
            console.log(`Updating org to`);
            console.log(data.org);

            let compressed_meta = await compress(JSON.stringify(data));

            if(this.state.addresses[chainId]) {
                console.log(`Campaign already deployed on ${chainId} - updating`);
                let HEOCampaign = (await import("../remote/"+ chainId + "/HEOCampaign")).default;
                CAMPAIGNINSTANCE = new this.state.web3.eth.Contract(HEOCampaign, this.state.addresses[chainId]);
                let result = await CAMPAIGNINSTANCE.methods.update(
                    this.state.web3.utils.toWei(this.state.maxAmount), compressed_meta).send({from:this.state.accounts[0]}, () => {
                    this.setState({showModal:true, modalTitle: 'processingWait',
                        modalMessage: 'updatingCampaignOnBlockchain', errorIcon:'HourglassSplit',
                        modalButtonVariant: "gold", waitToClose: true});
                });
            } else {
                console.log(`Campaign not yet deployed on ${chainId} - deploying`);
                var that = this;
                var web3 = this.state.web3;
                let abi = (await import("../remote/" + chainId + "/HEOCampaignFactory")).abi;
                let address = (await import("../remote/" + chainId + "/HEOCampaignFactory")).address;
                var HEOCampaignFactory = new this.state.web3.eth.Contract(abi, address);

                let result = await HEOCampaignFactory.methods.createCampaign(
                    this.state.web3.utils.toWei(`${this.state.maxAmount}`), this.state.chains[chainId].currencyOptions.value, this.state.accounts[0], compressed_meta)
                    .send({from:this.state.accounts[0]})
                    .on('transactionHash',
                        function(transactionHash) {
                            that.setState({showModal:true, modalTitle: 'processingWait',
                                modalMessage: 'waitingForNetwork', modalIcon: 'HourglassSplit',
                                modalButtonVariant: "gold", waitToClose: true});
                        });
                if(result && result.events && result.events.CampaignDeployed && result.events.CampaignDeployed.address) {
                    console.log(`Deployed campaign to ${chainId} at ${result.events.CampaignDeployed.returnValues.campaignAddress}`)
                    data.addresses = this.state.addresses;
                    data.coins = this.state.coins;
                    data.addresses[chainId] = result.events.CampaignDeployed.returnValues.campaignAddress;
                    data.coins[chainId] = {address: this.state.chains[chainId].currencyOptions.value, name: this.state.chains[chainId].currencyOptions.text};
                } else {
                    return false;
                }
            }

            data.maxAmount = this.state.maxAmount;
            let dataForDB = {address: this.state.campaignId, dataToUpdate: data};

            try {
                await axios.post('/api/campaign/update', {mydata : dataForDB},
                    {headers: {"Content-Type": "application/json"}});
                return true;
            } catch (err) {
                console.log(err);
                if(err.response){
                    this.setState({currentError : 'technicalDifficulties'});
                } else if (err.request){
                    this.setState({currentError : 'checkYourConnection'});
                } else {
                    this.setState({currentError : ''});
                }
                return false;
            }
        } catch (error) {
            this.setState({currentError : 'checkMetamask'});
            console.log("updating maxAmount transaction failed");
            console.log(error);
            return false;
        }
    }

    async uploadImageS3(type) {
        this.setState({showModal:true, modalTitle: 'processingWait',
        modalMessage: 'uploadingImageWait', errorIcon:'HourglassSplit',
        modalButtonVariant: "gold", waitToClose: true});
        let imgID = this.state.imgID;
        let qrImgID = this.state.qrImgID;
        const formData = new FormData();
        if(type === 'main'){ 
            this.setState({ imageFileName : imgID,});        
            let fileType = this.state.mainImageFile.type.split("/")[1];
            formData.append(
                "myFile",
                this.state.mainImageFile,
                `${imgID}.${fileType}`,
            );
        } else if (type === 'qrCode'){
            this.setState({ imageFileName : qrImgID,});        
            let fileType = this.state.qrCodeImageFile.type.split("/")[1];
            formData.append(
                "myFile",
                this.state.qrCodeImageFile,
                `${qrImgID}.${fileType}`,
            );
        }
        try {
            let res = await axios.post('/api/uploadimage', formData);
            if(type === 'main'){
                this.setState({showModal: false, mainImageURL: res.data});
            } else if (type === 'qrCode'){
                this.setState({showModal: false, qrCodeImageURL: res.data});
            }
            return res.data;
        } catch (err) {
            if(err.response){
                this.setState({currentError : 'technicalDifficulties'});
            } else if (err.request){
                this.setState({currentError : 'checkYourConnection'});
            } else {
                this.setState({currentError : ''});
            }
            return false;
        }
    }

    render() {
        return (
            <div>
                <Modal show={this.state.showModal} onHide={()=>{}} className='myModal' centered>
                    <Modal.Body><p className='errorIcon'>
                        {this.state.errorIcon == 'CheckCircle' && <CheckCircle style={{color:'#588157'}} />}
                        {this.state.errorIcon == 'ExclamationTriangle' && <ExclamationTriangle/>}
                        {this.state.errorIcon == 'HourglassSplit' && <HourglassSplit style={{color: 'gold'}}/>}
                        {this.state.errorIcon == 'XCircle' && <XCircle style={{color: '#E63C36'}}/>}
                        </p>
                        <p className='modalTitle'><Trans i18nKey={this.state.modalTitle}/></p>
                        <p className='modalMessage'><Trans i18nKey={this.state.modalMessage}/></p>
                        {!this.state.waitToClose &&
                        <Button className='myModalButton'
                            style={{backgroundColor : this.state.modalButtonVariant, borderColor : this.state.modalButtonVariant}}
                            onClick={ () => {this.setState({showModal:false})}}>
                            <Trans i18nKey={this.state.modalButtonMessage} />
                        </Button>
                        }
                    </Modal.Body>
                </Modal>
                <Container className='backToCampaignsDiv'>
                    <Link to="/myCampaigns">
                        <p className='backToCampaigns'><ChevronLeft id='createCampaignChevron'/> <Trans i18nKey='backToMyCampaigns'/></p>
                    </Link>
                </Container>
                <Container id='mainContainer'>
                    <Form onSubmit={this.onSubmit}>
                        <div className='titles'> <Trans i18nKey='aboutYou'/> </div>
                        <Form.Group >
                            <Form.Label><Trans i18nKey='organization'/><span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="text" className="createFormPlaceHolder" placeholder={i18n.t('on')}
                                name='org' value={this.state.org} onChange={this.handleChange} />
                        </Form.Group>
                        <hr/>
                        <Form.Row>
                            <Form.Group as={Col}>
                                <Form.Label><Trans i18nKey='selectConuntry'/><span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control required as="select" name='cn' value={this.state.cn} onChange={this.handleChange} >
                                {countries.map( (data)=>
                                    <option value={data.value}>{data.text}</option>
                                )}
                                </Form.Control>
                            </Form.Group>
                        </Form.Row>
                        <hr/>
                        <div className='titles'> <Trans i18nKey='campaignDetails'/></div>
                        <Form.Group>
                            <Form.Label>{i18n.t('howMuchYouNeed')}<span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="number" className="createFormPlaceHolder"
                                          value={this.state.maxAmount} placeholder={this.state.maxAmount}
                                          name='maxAmount' onChange={this.handleChange}/>
                        </Form.Group>
                        <hr/>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='selectCoverImage'/><span className='redAsterisk'>*</span></Form.Label>
                            <Form.Label><span className='optional'>(<Trans i18nKey='coverImageHint'/>)</span></Form.Label>
                            <Form.File
                                name='imageFile' className="position-relative"
                                id="campaignImgInput" accept='.jpg,.png,.jpeg,.gif'
                                onChange={this.fileSelected}
                            />
                        </Form.Group>
                        <Image id='createCampaignImg' src={this.state.mainImageURL}/>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='promoVideo'/> <span className='optional'>(<Trans i18nKey='optional'/>)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder" placeholder={i18n.t('linkToYouTube')}
                                name='vl' value={this.state.vl} onChange={this.handleChange}/>
                        </Form.Group>
                        { this.state.vl != "" && <ReactPlayer url={this.state.vl} id='createCampaignVideoPlayer' />}
                        <Form.Group>
                            <Form.Label><Trans i18nKey='title'/><span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required type="text" className="createFormPlaceHolder" placeholder={i18n.t('campaignTitle')}
                                name='title' value={this.state.title} onChange={this.handleChange}/>
                        </Form.Group>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='shortDescription'/><span className='redAsterisk'>*</span></Form.Label>
                            <Form.Control required as="textarea" rows={5} className="createFormPlaceHolder" placeholder={i18n.t('descriptionOfCampaign')}
                                name='description' value={this.state.description} onChange={this.handleTextArea} />
                            <Form.Label><Trans i18nKey='campaignDescription'/><span className='redAsterisk'>*</span></Form.Label>
                            {this.state.updatedEditorState && <TextEditor  />}
                        </Form.Group>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='selectQRCodeImage'/></Form.Label>
                            <Form.File
                                name='qrCodeImageFile' className="position-relative"
                                id="campaignImgInput" accept='.jpg,.png,.jpeg,.gif'
                                onChange={this.qrfileSelected}
                            />
                            <Image id='qrCodeImg' src={this.state.qrCodeImageURL}/>
                        </Form.Group>
                        <DropdownButton title={i18n.t('saveCampaignBtn')} id='createCampaignBtn' name='ff3'>
                        {Object.keys(this.state.chains).map((chain, i) =>
                                <Dropdown.Item key={chain} as="button" onClick={() => this.handleClick(chain)}><img
                                    src={IMG_MAP[this.state.chains[chain].currencyOptions.text+"-"+this.state.chains[chain].currencyOptions.address]} width={16} height={16}
                                    style={{marginLeft: 5, marginRight: 5}}/>
                                    {i18n.t('deployToChain', {
                                        currencyName: this.state.chains[chain].currencyOptions.text,
                                        chainName: this.state.chains[chain].CHAIN_NAME
                                    })} </Dropdown.Item>
                        )}
                        </DropdownButton>
                    </Form>
                </Container>
            </div>
        );
    }



    async getCampaignFromDB(id) {
        var campaign = {};
        var modalMessage = 'failedToLoadCampaign';
        let data = {ID : id};
        await axios.post('/api/campaign/loadOne', data, {headers: {"Content-Type": "application/json"}})
            .then(res => {
                campaign = res.data;
            }).catch(err => {
                if (err.response) {
                    modalMessage = 'technicalDifficulties'}
                else if(err.request) {
                    modalMessage = 'checkYourConnection'
                }
                console.log(err);
                this.setState({
                    showError: true,
                    modalMessage,
                })
            })
        return campaign;
    }

    async componentDidMount() {
        let toks = this.props.location.pathname.split("/");
        ReactGA.send({ hitType: "pageview", page: this.props.location.pathname });
        let id = toks[toks.length -1];
        let dbCampaignObj = await this.getCampaignFromDB(id);
        let chains = config.get("CHAINS");
        let chainId = config.get("CHAIN");
        let chainConfig = chains[chainId];
        let address = id;
        if(dbCampaignObj && dbCampaignObj.addresses && dbCampaignObj.addresses[chainId]) {
            address = dbCampaignObj.addresses[chainId];
        }
        let web3 = new Web3(chainConfig["WEB3_RPC_NODE_URL"]);
        let HEOCampaign = (await import("../remote/"+ chainId + "/HEOCampaign")).default;
        CAMPAIGNINSTANCE = new web3.eth.Contract(HEOCampaign, address);
        console.log(`Campaign instance`);
        console.log(CAMPAIGNINSTANCE);
        let compressedMetaData = await CAMPAIGNINSTANCE.methods.metaData().call();
        console.log(`Compressed metadata`);
        console.log(compressedMetaData);
        let rawMetaData = await decompress(compressedMetaData);
        let metaData = JSON.parse(rawMetaData);
        let maxAmount = web3.utils.fromWei(await CAMPAIGNINSTANCE.methods.maxAmount().call());
        if(metaData.mainImageURL) {
            let splits = metaData.mainImageURL.split("/");
            if(splits && splits.length) {
                metaData.imgID = splits[splits.length-1];
            }
        }
        if(metaData.qrCodeImageURL) {
            let splits = metaData.mainImageURL.split("/");
            if(splits && splits.length) {
                metaData.qrImgID = splits[splits.length-1];
            }
        }

        var orgObj = {};
        if(typeof metaData.org == "string") {
            orgObj.default = metaData.org;
            orgObj[i18n.language] = metaData.org;
        } else {
            orgObj = metaData.org;
        }
        var titleObj = {};
        if(typeof metaData.title == "string") {
            console.log(`metaData.title is a string (${metaData.title})`);
            titleObj.default = metaData.title;
            titleObj[i18n.language] = metaData.title;
        } else {
            titleObj = metaData.title;
        }
        var descriptionObj = {};
        if(typeof metaData.description == "string") {
            descriptionObj.default = metaData.description;
            descriptionObj[i18n.language] = metaData.description;
        } else {
            descriptionObj = metaData.description;
        }
        var descriptionEditorObj = {};
        if(metaData.descriptionEditor && (metaData.descriptionEditor[i18n.language] || metaData.descriptionEditor["default"])) {
            console.log("This campaign is multi-lingual on blockchain")
            descriptionEditorObj = metaData.descriptionEditor;
        } else if(metaData.descriptionEditor) {
            console.log("This campaign has not been updated to multi-lingual on blockchain")
            descriptionEditorObj = {"default": metaData.descriptionEditor};
            descriptionEditorObj[i18n.language] = metaData.descriptionEditor;
        } else {
            console.log('No description editor state in metadata object');
        }
        this.setState({
            campaignId : id,
            fn : metaData.fn,
            ln : metaData.ln,
            cn : metaData.cn,
            vl : metaData.vl,
            imgID: metaData.imgID,
            qrImgID: metaData.qrImgID,
            org: orgObj[i18n.language],
            ogOrg: orgObj,
            title: titleObj[i18n.language],
            ogTitle: titleObj,
            description: descriptionObj[i18n.language],
            ogDescription: descriptionObj,
            ogDescriptionEditor: descriptionEditorObj,
            mainImageURL: metaData.mainImageURL,
            maxAmount : maxAmount,
            chains: chains,
            chainId: chainId,
            addresses: dbCampaignObj.addresses,
            coins: dbCampaignObj.coins
        });
        console.log(`Set title to`);
        console.log(this.state.ogTitle);
        console.log(`Set org to`);
        console.log(this.state.ogOrg);
        if(descriptionEditorObj[i18n.language]) {
            setEditorState(descriptionEditorObj[i18n.language], true);
            this.setState({updatedEditorState : true});
        } else {
            setEditorState({}, false);
            this.setState({updatedEditorState : true});
        }
    }

}

export default EditCampaign;
