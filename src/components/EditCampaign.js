import React from 'react';
import countries from '../countries';
import {Container, Form, Col, Button, Image, Modal} from 'react-bootstrap';
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

var CAMPAIGNINSTANCE;

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
            cn:"",
            vl:"",
            title:"",
            description:"",
            mainImageURL: "",
            imgID:"",
            mainImageFile:"",
            waitToClose: false,
            currencyName:"",
            maxAmount:0,
            updateImage: false,
            updateMeta: false,
            campaignAddress: "",
            currentError:"",
            updatedEditorState: false,
        };
    }

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

    handleClick = async (event) => {
        if(editorStateHasChanged()){
            this.state.updateMeta = true;
        }
        event.preventDefault();
        if(!this.state.org) {
            this.setState(
                {showModal:true, modalTitle: 'requiredFieldsTitle',
                    modalMessage: 'orgRequired', modalIcon: 'ExclamationTriangle',
                    modalButtonVariant: "gold", waitToClose: false,
                    modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                });
            return false;
        }
        if(!this.state.cn) {
            this.setState(
                {showModal:true, modalTitle: 'requiredFieldsTitle',
                    modalMessage: 'cnRequired', modalIcon: 'ExclamationTriangle',
                    modalButtonVariant: "gold", waitToClose: false,
                    modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                });
            return false;
        }
        if(!this.state.title) {
            this.setState(
                {showModal:true, modalTitle: 'requiredFieldsTitle',
                    modalMessage: 'titleRequired', modalIcon: 'ExclamationTriangle',
                    modalButtonVariant: "gold", waitToClose: false,
                    modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                });
            return false;
        }
        if(!this.state.description) {
            this.setState(
                {showModal:true, modalTitle: 'requiredFieldsTitle',
                    modalMessage: 'shortDescRequired', modalIcon: 'ExclamationTriangle',
                    modalButtonVariant: "gold", waitToClose: false,
                    modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                });
            return false;
        }
        if(!getEditorState() || getEditorState().length < 2) {
            this.setState(
                {showModal:true, modalTitle: 'requiredFieldsTitle',
                    modalMessage: 'longDescRequired', modalIcon: 'ExclamationTriangle',
                    modalButtonVariant: "gold", waitToClose: false,
                    modalButtonMessage: 'closeBtn', modalButtonVariant: '#E63C36'
                });
            return false;
        }
        this.setState({showModal:true, modalTitle: 'processingWait',
                modalMessage: 'waitingForNetowork',
                errorIcon:'HourglassSplit',
                modalButtonVariant: "gold", waitToClose: true});
        var newImgUrl = this.state.mainImageURL;
        if(this.state.updateImage) {
            newImgUrl = await this.uploadImageS3();
            if(!newImgUrl) {
                this.setState({showModal:true,
                    modalTitle: 'imageUploadFailed',
                    modalMessage: 'technicalDifficulties',
                    errorIcon:'XCircle', modalButtonMessage: 'returnHome',
                    modalButtonVariant: "#E63C36", waitToClose: false});
                return;
            }
        }
        if(this.state.updateMeta) {
            if(!(await this.updateCampaign())) {
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

    async updateCampaign(){
        this.setState({showModal:true,
            modalMessage: 'confirmMetamask', errorIcon:'HourglassSplit',
            modalButtonVariant: "gold", waitToClose: true})
        try {
            let data = {
                title: this.state.title,
                description: this.state.description,
                mainImageURL: this.state.mainImageURL,
                fn: this.state.fn,
                ln: this.state.ln,
                org: this.state.org,
                cn: this.state.cn,
                vl: this.state.vl,
                currencyName: this.state.currencyName,
                descriptionEditor : getEditorState()
            };
            let compressed_meta = await compress(JSON.stringify(data));
            let result = await CAMPAIGNINSTANCE.methods.update(
                this.state.web3.utils.toWei(this.state.maxAmount), compressed_meta).send({from:this.state.accounts[0]}, () => {
                    this.setState({showModal:true, modalTitle: 'processingWait',
                    modalMessage: 'updatingCampaignOnBlockchain', errorIcon:'HourglassSplit',
                    modalButtonVariant: "gold", waitToClose: true});
                });
            data.maxAmount = this.state.maxAmount;
            let dataForDB = {address: this.state.campaignAddress, dataToUpdate: data};
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

    async uploadImageS3() {
        this.setState({showModal:true, modalTitle: 'processingWait',
        modalMessage: 'uploadingImageWait', errorIcon:'HourglassSplit',
        modalButtonVariant: "gold", waitToClose: true});
        let imgID = this.state.imgID;
        this.setState({
            imageFileName : imgID,
        });
        const formData = new FormData();
        formData.append(
            "myFile",
            this.state.mainImageFile,
            imgID,
        );
        try {
            let res = await axios.post('/api/uploadimage', formData);
            this.setState({showModal: false, mainImageURL: res.data});
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
                    <Form onSubmit={this.handleClick}>
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
                            <Form.Label>{i18n.t('howMuchYouNeed', { currencyName: this.state.currencyName })}<span className='redAsterisk'>*</span></Form.Label>
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
                        <Button type="submit" id='createCampaignBtn' name='ff3'>
                            {i18n.t('saveCampaignBtn')}
                        </Button>
                    </Form>
                </Container>
            </div>
        );
    }

    async componentDidMount() {
        let toks = this.props.location.pathname.split("/");
        let address = toks[toks.length -1];

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
        if(!this.state.isLoggedIn) {
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
        let HEOCampaign = (await import("../remote/"+ config.get("CHAIN") + "/HEOCampaign")).default;
        CAMPAIGNINSTANCE = new this.state.web3.eth.Contract(HEOCampaign, address);
        let compressedMetaData = await CAMPAIGNINSTANCE.methods.metaData().call();
        let rawMetaData = await decompress(compressedMetaData);
        let metaData = JSON.parse(rawMetaData);
        let maxAmount = this.state.web3.utils.fromWei(await CAMPAIGNINSTANCE.methods.maxAmount().call());
        if(metaData.mainImageURL) {
            let splits = metaData.mainImageURL.split("/");
            if(splits && splits.length) {
                metaData.imgID = splits[splits.length-1];
            }
        }
        this.setState({
            campaignAddress : address,
            fn : metaData.fn,
            ln : metaData.ln,
            org: metaData.org,
            cn : metaData.cn,
            vl : metaData.vl,
            imgID: metaData.imgID,
            title: metaData.title,
            description: metaData.description,
            mainImageURL: metaData.mainImageURL,
            maxAmount : maxAmount,
            currencyName: metaData.currencyName
        });
        if(metaData.descriptionEditor){
            setEditorState(metaData.descriptionEditor, true);
            this.setState({updatedEditorState : true});
        } else {
            setEditorState({}, false);
            this.setState({updatedEditorState : true});
        }
    }

}

export default EditCampaign;