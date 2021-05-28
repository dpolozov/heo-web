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

var HEOCampaign, web3;

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
            metaDataURL:"",
            mainImageFile:"",
            waitToClose: false,
            campaign:{},
            currencyName:"",
            maxAmount:0,
            metaData:{},
            metaFileName:"",
            dbValuesToUpdate: [],
            updateImage: false,
            updateMeta: false,
            updateDB: false,
            campaignAddress: "",
        };
    }

    async getCampaign(address){
        var campaign = {};
        let data = {ID : address};

        await axios.post('/api/campaign/load', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            campaign = res.data;
            console.log(res.data);
        }).catch(err => {
            if (err.response) { 
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    modalMessage: i18n.t('technicalDifficulties'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else if(err.request) {
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    modalMessage: i18n.t('checkYourConnection'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false}); 
            } else { 
                console.log('error uploading campaign information ' + err.message);
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }           
        })
        return campaign;
    }

    async getMetaData(url){
        let data = {metaUrl : url}
        let splits = url.split('/');
        let metaWithExtension = splits[splits.length -1];
        let splitagain = metaWithExtension.split('.');
        let metaID = splitagain[0];
        this.setState({metaFileName : metaID});
        await axios.post('/api/getMetaData', data, {headers: {"Content-Type": "application/json"}})
        .then((res) => {
            console.log(res.data);
            this.setState({
                fn : res.data.fn,
                ln : res.data.ln,
                org: res.data.org,
                cn : res.data.cn,
            })
        })
        .catch(err => {
            if (err.response) { 
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    modalMessage: i18n.t('technicalDifficulties'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else if(err.request) {
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    modalMessage: i18n.t('checkYourConnection'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false}); 
            } else { 
                console.log('error uploading campaign information ' + err.message);
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }           
        })
    }
    
    handleTextArea = (e) => {
        this.setState({description:e.target.value});
        if(this.state.dbValuesToUpdate.indexOf('description') === -1){
            this.state.dbValuesToUpdate.push('description');
        }
        this.setState({
            updateDB : true,
            updateMeta : true,
        });
    }

    handleChange = (e) => {
        const name = e.target.name
        const value = e.target.value;
        this.setState({ [name] : value });
        switch (name){
            case 'title': case 'vl':
                this.setState({updateDB : true});
                if(this.state.dbValuesToUpdate.indexOf(name) === -1){
                    this.state.dbValuesToUpdate.push(name);
                }
                break;
            case 'fn': case 'ln': case 'cn': case'org':
                this.setState({updateMeta : true});
                break;
            default:
                console.log(name);
        }
    }

    fileSelected = e => {
        this.setState({mainImageFile:e.target.files[0], mainImageURL: URL.createObjectURL(e.target.files[0])});
        this.setState({updateImage : true});
        if(this.state.dbValuesToUpdate.indexOf('mainImageURL') === -1){
            this.state.dbValuesToUpdate.push('mainImageURL');
        }
    }

    handleClick = (event) => {
        event.preventDefault();
        if(this.state.updateImage) {
            this.uploadImageS3(this, this.state.metaFileName);
            return
        } else if(this.state.updateDB) {
            this.updateCampaignDB();
            return
        } else if(this.state.updateMeta){
            this.uploadMetaS3(this, this.state.metaFileName);
        }
    }

    async updateCampaignDB() {
        console.log('update db called');
        let dbValuesToUpdateData = {};
        this.state.dbValuesToUpdate.forEach( item => {
            dbValuesToUpdateData[item] =  this.state[item];
            console.log(dbValuesToUpdateData);
        });
        //need to go through and change variables to same names through out the app
        //for now just a correction for the mongo db.
        let adjustdata = JSON.stringify(dbValuesToUpdateData);
        adjustdata = adjustdata.replace('description', 'campaignDesc');
        adjustdata = adjustdata.replace('vl', 'videoLink');
        adjustdata = adjustdata.replace('mainImageURL', 'mainImage');
        let data = JSON.parse(adjustdata);

        let dataAndAdress = {dataToUpdate : data, address: this.state.campaignAddress}
        console.log(dataAndAdress);
        axios.post('/api/updateCampaignDB', {mydata : dataAndAdress}, {headers: {"Content-Type": "application/json"}})
        .then(res => {
            if(res.data === 'failed') {
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    modalMessage: i18n.t('technicalDifficulties'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
                    return;
            }
            this.uploadMetaS3(this, this.state.metaFileName);
        }).catch(err => {
            if(err.response){
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    modalMessage: i18n.t('technicalDifficulties'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else if(err.request){
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    modalMessage: i18n.t('checkYourConnection'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else { 
                console.log('error updating campaign information ' + err.message);
                this.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }           
        })
    }

    async uploadMetaS3(that, metaID) {
        console.log('update meta called');
        console.log(`Generating metadata file ${metaID}`);
        that.setState({showModal:true, errorMessage: i18n.t('processingWait'),
            modalMessage: i18n.t('uploadingMetaWait'), errorIcon:'HourglassSplit',
            modalButtonVariant: "gold", waitToClose: true});
        let data = new Blob([JSON.stringify({title:that.state.title,
            description:that.state.description,
            mainImageURL: that.state.mainImageURL,
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

        return axios.post('/api/uploadmeta', formData)
        .then(res => {
            console.log("Success uploading meta data");
            that.setState({
                showModal: true, errorMessage: i18n.t('complete'),
                modalMessage: i18n.t('updateSuccessfull'),
                errorIcon: 'CheckCircle', modalButtonMessage: i18n.t('closeBtn'),
                modalButtonVariant: '#588157', waitToClose: false
            });
        }).catch(err => {
            if (err.response) { 
                console.log('response error in uploading meta data- ' + err.response.status);
                that.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    modalMessage: i18n.t('technicalDifficulties'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else if (err.request) { 
                console.log('No response in uploading meta data' + err.message);
                that.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    modalMessage: i18n.t('checkYourConnection'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false}); 
            } else { 
                console.log('error uploading campaign information ' + err.message);
                that.setState({showModal:true,
                    errorMessage: i18n.t('metaUploadFailed'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }           
        });
    }

    async uploadImageS3 (that, imgID) {
        console.log(`Uploading ${this.state.mainImageFile.name} of type ${this.state.mainImageFile.type} to S3`);
        that.setState({showModal:true, errorMessage: i18n.t('processingWait'),
        modalMessage: i18n.t('uploadingImageWait'), errorIcon:'HourglassSplit',
        modalButtonVariant: "gold", waitToClose: true});
        let fileType = this.state.mainImageFile.type.split("/")[1];
        let newName = `${imgID}.${fileType}`;
        this.setState({
            imageFileName : newName,       
        });
        const formData = new FormData();
        formData.append(
            "myFile",
            this.state.mainImageFile,
            newName,
        );
            
        return axios.post('/api/uploadimage', formData)
        .then(res => {
            if(res.data == 'failed') {
                console.log('failed to upload main image');
                that.setState({
                    errorMessage: i18n.t('imageUploadFailed'),
                    modalMessage: i18n.t('technicalDifficulties'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false
                });
                return;
            }
            console.log("Success uploading main image");
            console.log(res.data);
            that.setState({showModal:false, mainImageURL:res.data});
            this.updateCampaignDB();
            this.uploadMetaS3(this, this.state.metaFileName);
        }).catch(err => {
            if (err.response) { 
                console.log('response error in uploading main image- ' + err.response.status);
                that.setState({showModal:true,
                    errorMessage: i18n.t('imageUploadFailed'),
                    modalMessage: i18n.t('technicalDifficulties'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            } else if (err.request) { 
                console.log('No response in uploading main image' + err.message);
                that.setState({showModal:true,
                    errorMessage: i18n.t('imageUploadFailed'),
                    modalMessage: i18n.t('checkYourConnection'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false}); 
            } else { 
                console.log('error uploading image ' + err.message);
                that.setState({showModal:true,
                    errorMessage: i18n.t('imageUploadFailed'),
                    errorIcon:'XCircle', modalButtonMessage: i18n.t('returnHome'),
                    modalButtonVariant: "#E63C36", waitToClose: false});
            }           
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
                            <Form.Control disabled required type="number" className="createFormPlaceHolder"
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
        web3 = (await import("../remote/"+ config.get("CHAIN") + "/web3")).default;
        HEOCampaign = (await import("../remote/"+ config.get("CHAIN") + "/HEOCampaign")).default;
        let campaignInstance = new web3.eth.Contract(HEOCampaign, address);
        let metaDataUrl = await campaignInstance.methods.metaDataUrl().call();
        this.getMetaData(metaDataUrl);
        this.setState({
            campaign : (await this.getCampaign(address)),
        });  
        this.setState({
            currencyName : this.state.campaign.coinName,
            title : this.state.campaign.title,
            vl : this.state.campaign.videoLink,
            maxAmount : this.state.campaign.maxAmount,
            description : this.state.campaign.campaignDesc,
            mainImageURL : this.state.campaign.mainImage,
            campaignAddress : address,
        });   
    }
}


export default EditCampaign;