import React from 'react';
import countries from '../countries';
import '../css/createCampaign.css';
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
var HEOCampaign, web3, ACCOUNTS, CAMPAIGNINSTANCE;

class EditCampaign extends React.Component {
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
        this.setState({showModal:true, errorMessage: i18n.t('processingWait'),
                errorIcon:'HourglassSplit',
                modalButtonVariant: "gold", waitToClose: true});
        var newImgUrl = this.state.mainImageURL;
        if(this.state.updateImage) {
            newImgUrl = await this.uploadImageS3();
            if(!newImgUrl) {
                this.setState({showModal:true,
                    errorMessage: i18n.t('imageUploadFailed'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
                return;
            }
        }
        if(this.state.updateMeta) {
            if(!(await this.updateCampaign())) {
                this.setState({showModal : true,
                    errorMessage: i18n.t('updatingAmountFailed'),
                    modalMessage: i18n.t(`${this.state.currentError}`),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('closeBtn'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
                return;
            }    
        }
        this.setState({
            showModal: true, errorMessage: i18n.t('complete'),
            modalMessage: i18n.t('updateSuccessfull'),
            errorIcon: 'CheckCircle', modalButtonMessage: i18n.t('closeBtn'),
            modalButtonVariant: '#588157', waitToClose: false
        });
    }

    async updateCampaign(){
        this.setState({showModal:true,
            modalMessage: i18n.t('confirmMetamask'), errorIcon:'HourglassSplit',
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
                web3.utils.toWei(this.state.maxAmount), compressed_meta).send({from:ACCOUNTS[0]}, () => {
                    this.setState({showModal:true, errorMessage: i18n.t('processingWait'),
                    modalMessage: i18n.t('updatingMaxAmount'), errorIcon:'HourglassSplit',
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
        console.log(`Uploading ${this.state.mainImageFile.name} of type ${this.state.mainImageFile.type} to S3`);
        this.setState({showModal:true, errorMessage: i18n.t('processingWait'),
        modalMessage: i18n.t('uploadingImageWait'), errorIcon:'HourglassSplit',
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
                    <Link to="/myCampaigns">
                        <p className='backToCampaigns'><ChevronLeft id='createCampaignChevron'/> <Trans i18nKey='backToMyCampaigns'/></p>
                    </Link>
                </Container>
                <Container id='mainContainer'>
                    <Form onSubmit={this.handleClick}>
                        <div className='titles'> <Trans i18nKey='aboutYou'/> </div>
                        <Form.Row>
                            <Form.Group as={Col} className='name'>                           
                                <Form.Label><Trans i18nKey='fn'/><span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control required type="text" className="createFormPlaceHolder" placeholder={i18n.t('fn')}
                                    name='fn' value={this.state.fn} onChange={this.handleChange} 
                                />
                            </Form.Group>
                            <Form.Group as={Col} className='name'>                           
                                <Form.Label><Trans i18nKey='ln'/><span className='redAsterisk'>*</span></Form.Label>
                                <Form.Control required type="text" className="createFormPlaceHolder" placeholder={i18n.t('ln')}name='ln'
                                            value={this.state.ln} onChange={this.handleChange} />
                            </Form.Group>
                        </Form.Row>                       
                        <Form.Group >
                            <Form.Label><Trans i18nKey='organization'/> <span className="optional">(optional)</span></Form.Label>
                            <Form.Control type="text" className="createFormPlaceHolder" placeholder={i18n.t('on')}
                                name='org' value={this.state.org} onChange={this.handleChange} />
                        </Form.Group>     
                        <hr/>
                        <Form.Row>
                            <Form.Group as={Col}>
                                <Form.Label><Trans i18nKey='selectConuntry'/></Form.Label>
                                <Form.Control as="select" name='cn' value={this.state.cn} onChange={this.handleChange} >
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
                            <Form.Label><Trans i18nKey='selectCoverImage'/></Form.Label>
                            <Form.File
                                name='imageFile' className="position-relative" 
                                id="campaignImgInput" accept='.jpg,.png,.jpeg,.gif' 
                                onChange={this.fileSelected}
                            />
                        </Form.Group>
                        <Image id='createCampaignImg' src={this.state.mainImageURL}/>
                        <Form.Group>
                            <Form.Label><Trans i18nKey='promoVideo'/> <span className='optional'>(optional)</span></Form.Label>
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
                            <Form.Label><Trans i18nKey='campaignDescription'/></Form.Label>
                            <Form.Control as="textarea" rows={5} className="createFormPlaceHolder" placeholder={i18n.t('descriptionOfCampaign')}
                                name='description' value={this.state.description} onChange={this.handleTextArea} />
                        </Form.Group>
                        {this.state.updatedEditorState && <TextEditor  />}
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
        var ethereum = window.ethereum;
        ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
        web3 = (await import("../remote/"+ config.get("CHAIN") + "/web3")).default;
        HEOCampaign = (await import("../remote/"+ config.get("CHAIN") + "/HEOCampaign")).default;
        ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
        CAMPAIGNINSTANCE = new web3.eth.Contract(HEOCampaign, address);
        let compressedMetaData = await CAMPAIGNINSTANCE.methods.metaData().call();
        let rawMetaData = await decompress(compressedMetaData);
        let metaData = JSON.parse(rawMetaData);
        let maxAmount = web3.utils.fromWei(await CAMPAIGNINSTANCE.methods.maxAmount().call());
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