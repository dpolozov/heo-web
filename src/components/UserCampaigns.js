import React, { Component, lazy } from 'react';
import config from 'react-global-configuration';
import '../css/campaignList.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal } from 'react-bootstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { DescriptionPreview, Login } from '../util/Utilities';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
var ACCOUNTS, web3;

class UserCampaigns extends Component {
    constructor(props) {
        super(props);

        this.state = {
            campaigns: [],
            showError:false,
            errorMessage:"",
            isLoggedIn:false,
        };
    }

    async componentDidMount() {
        if (typeof window.ethereum !== 'undefined') {
            var ethereum = window.ethereum;
            ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
            web3 = (await import("../remote/" + config.get("CHAIN") + "/web3")).default;
            this.setState({
                campaigns : (await this.getCampaigns()),
                isLoggedIn : true,
            });
        } else {
            alert("Please install metamask");
        }
    }

    async getCampaigns(){
        var campaigns = [];
        var errorMessage = 'Failed to load campaigns';
        let data = {accounts : ACCOUNTS}
        await axios.post('/api/campaigns/loadUserCampaigns', data, {headers: {"Content-Type": "application/json"}})
        .then(res => {
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

    render() {
        return (
            <div> 
                <Container>
                    {this.state.campaigns.length == 0 && 
                        <h1>
                            <Trans i18nKey='noUserCampaigns1'/>
                            <a id='formLink' href='https://docs.google.com/forms/d/e/1FAIpQLSdTo_igaNjF-1E51JmsjJgILv68RN2v5pisTcqTLvZvuUvLDQ/viewform'>form</a>
                            <Trans i18nKey='noUserCampaigns2'/>
                        </h1>                       
                    }
                </Container>
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
                                                    <Card.Text>{`${DescriptionPreview(item.campaignDesc)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id='readMore'>Read More</span></Card.Text>
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>{`$${item.raisedAmount}`}</span>{i18n.t('raised')}{item.maxAmount} {i18n.t('goal')}</p>
                                                    <ProgressBar now={item.percentRaised} /> 
                                                </Card.Body>
                                            </Row>
                                            <Row id='buttonsRow'>
                                                <Col className='buttonCol'><div id='rewardsBtn' className='cardButtons'><p><Trans i18nKey='reward'/> {item.reward}</p></div></Col>                                                  
                                                <Col className='buttonCol'><Link to={'/editCampaign/' + item._id} id='cardLink'><Button id='editBtn' block>EDIT</Button></Link></Col>
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

export default UserCampaigns;