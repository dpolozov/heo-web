import React, { Component, lazy } from 'react';
import config from 'react-global-configuration';
import axios from 'axios';
import '../css/campaignList.css';
import '../css/modal.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { GetLanguage, i18nString, DescriptionPreview } from '../util/Utilities';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import countryMap from '../countryMap';
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

ReactGA.initialize("G-C657WZY5VT");

class CampaignList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            campaigns: [],
            showError:false,
            errorMessage:"",
            lang:'',
        };
    }

    async componentDidMount() {
        ReactGA.send({ hitType: "pageview", page: "/" });
        this.setState({
            campaigns : (await this.getCampaigns())
        });
    }

    async getCampaigns(){
        var campaigns = [];
        var errorMessage = 'Failed to load campaigns';
        await axios.post('/api/campaign/loadAll')
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
        campaigns.forEach( campaign => {
            campaign.raisedAmount = Math.round(campaign.raisedAmount * 100)/100;
        })
        return campaigns;
    }

    render() {
        return (
            <div>
                <Modal show={this.state.showError} onHide={()=>{}} >
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
                                <Link to={'/campaign/' + item._id} id='cardLink' key={i}>
                                <Card>
                                    <Row>
                                        <Col sm='3' id='picColumn'>
                                            <Card.Img src={item.mainImageURL} fluid='true' />
                                        </Col>
                                        <Col >
                                            <Row>
                                                <Card.Body>
                                                    <Card.Title>{i18nString(item.title, i18n.language)}</Card.Title>
                                                    <Card.Text><span className={"h2"}>{i18nString(item.org, i18n.language)} ({countryMap[item.cn]})</span><br/>
                                                        {`${DescriptionPreview(item.description, i18n.language)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id='readMore'><Trans i18nKey='readMore'/></span>
                                                    </Card.Text>
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>
                                                        {item.raisedAmount}</span>{i18n.t('raised')}{item.maxAmount} {i18n.t('goal')}</p>
                                                    <ProgressBar now={100 * item.raisedAmount/item.maxAmount} />
                                                </Card.Body>
                                            </Row>
                                            <Row >
                                                <Col className='buttonCol'>
                                                    <div id='acceptingBtn' className='cardButtons'><p><Trans i18nKey='accepting'/></p>
                                                        <p id='currencyName'>
                                                            {Object.keys(item.coins).map((chain, j) =>
                                                                <span key={item._id + "-" + chain + "-" + item.coins[chain].address}><img src={IMG_MAP[item.coins[chain].name+"-"+item.coins[chain].address]} width={20} height={20} style={{marginLeft:5, marginRight:5}} />{item.coins[chain].name}</span>
                                                            )}

                                                        </p>
                                                    </div></Col>
                                                <Col className='buttonCol'><Button variant="danger" id='donateBtn' block><Trans i18nKey='donate'/></Button></Col>
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
