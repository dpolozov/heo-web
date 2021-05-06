import React, { Component, lazy } from 'react';
import config from 'react-global-configuration';
import axios from 'axios';
import '../css/campaignList.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';

class CampaignList extends Component {
    constructor(props) {
        super(props);

        this.state = {
            campaigns: [],
            showError:false,
            errorMessage:""
        };
    }

    async componentDidMount() {
        this.setState({
            campaigns : (await this.getCampaigns()),
        });
    }

    async getCampaigns(){
        var campaigns = [];
        var errorMessage = 'Failed to load campaigns';
        await axios.post('/api/campaigns/load')
        .then(res => {
            //console.log(res.data);
            campaigns = res.data;
        }).catch(err => {
            if (err.response) { 
                errorMessage = 'Failed to load campaigns. We are having technical difficulties'}
            else if(err.request) {
                errorMessage = 'Failed to load campaings. Please check your internet connection'
            }
            console.log(err);
            this.setState({
                showError: true,
                errorMessage,
            })
        })

        return campaigns;
    }
    
    descriptionPreview(description){
        var i = 200;
        if(description !== undefined ){
            let preview = description.trim();
            var firstSpace = preview.indexOf(" ");
            if(firstSpace >= 200){
                return preview.substring(0,200);
            } else {
                while(preview.charAt(i) != ' '  && i > 0){
                    i--;
                }
                if(preview.charAt(i-1).match(/[.,?!]/)){
                    return preview.substring(0, i-1);
                } else {
                    return preview.substring(0, i);
                }
            }
        }
    }

    //initial upload to mongo db
    async sendToDB(campaigns){
        let data2 = new Blob([JSON.stringify(campaigns)], {type : 'application/jason'});
        const formData2 = new FormData();
        formData2.append(
            "myFile",
            data2,
            )
        axios.post('api/campaigns/sendToDB', formData2)
        .then(res => {
            console.log("Success sending campaings");
        }).catch(err => {
            console.log(err);
        });
    }

    render() {
        this.descriptionPreview();
        return (
            <div> 
                <Modal show={this.state.showError} >
                    <Modal.Header closeButton>
                    <Modal.Title>Failed to connect to network.</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>{this.state.errorMessage}</Modal.Body>
                    <Modal.Footer>
                    <Button variant="secondary" onClick={ () => {this.setState({showError:false})}}>
                        Close
                    </Button>
                    </Modal.Footer>
                </Modal>           
                <div id="campaingListMainDiv">
                    <Container>
                        {this.state.campaigns.map((item, i) =>
                            <Row style={{marginBottom: '20px'}} key={i}>
                                <Link to={'/campaign/' + item._id} id='cardLink'>
                                <Card>
                                    <Row>
                                        <Col sm='3' id='picColumn'>
                                            <Card.Img src={item.mainImage} fluid='true' />
                                        </Col>
                                        <Col >
                                            <Row>                                  
                                                <Card.Body>
                                                    <Card.Title>{item.title}</Card.Title> 
                                                    <Card.Text>{`${this.descriptionPreview(item.campaignDesc)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id='readMore'>Read More</span></Card.Text>
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>{`$${item.raisedAmount}`}</span>{` raised of ${item.maxAmount} goal`}</p>
                                                    <ProgressBar now={item.percentRaised} /> 
                                                </Card.Body>
                                            </Row>
                                            <Row >
                                                <Col><div id='acceptingBtn' className='cardButtons'><p>ACCEPTING</p><p id='coinName'>{item.coinName}</p></div></Col>
                                                <Col><div id='rewardsBtn' className='cardButtons'><p>REWARDS {item.reward}</p></div></Col>
                                                <Col><Button variant="danger" id='donateBtnList' block>DONATE</Button></Col>
                                                <Col sm='1'></Col>
                                            </Row> 
                                        </Col>
                                    </Row>
                                </Card>
                                </Link>
                            </Row>                           
                        )} 
                    </Container>
                </div>
            </div>

        );
    }
}

export default CampaignList;