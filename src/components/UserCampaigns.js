import React, { Component, lazy } from 'react';
import config from 'react-global-configuration';
import '../css/campaignList.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal } from 'react-bootstrap';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { DescriptionPreview } from '../util/Utilities';
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
            console.log(res.data);
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
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>{`$${item.raisedAmount}`}</span>{` raised of ${item.maxAmount} goal`}</p>
                                                    <ProgressBar now={item.percentRaised} /> 
                                                </Card.Body>
                                            </Row>
                                            <Row >
                                                <Col><div id='acceptingBtn' className='cardButtons'><p>ACCEPTING</p><p id='coinName'>{item.coinName}</p></div></Col>
                                                <Col><div id='rewardsBtn' className='cardButtons'><p>REWARDS {item.reward}</p></div></Col>
                                                <Col><Button id='editBtn' block>EDIT</Button></Col>
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

export default UserCampaigns;