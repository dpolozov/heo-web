import React, { Component } from 'react';
import axios from 'axios';
import '../css/campaignList.css';
import '../css/modal.css';
import { Container, Row, Col, Card, ProgressBar, Button, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { i18nString, DescriptionPreview } from '../util/Utilities';
import { Trans } from 'react-i18next';
import i18n from '../util/i18n';
import ReactGA from "react-ga4";

import bnbIcon from '../images/binance-coin-bnb-logo.png';
import busdIcon from '../images/binance-usd-busd-logo.png';
import usdcIcon from '../images/usd-coin-usdc-logo.png';
import ethIcon from '../images/eth-diamond-purple.png';
import cusdIcon from '../images/cusd-celo-logo.png';
import btcLogo from '../images/bitcoin-logo.png';
import daiLogo from '../images/dai-logo.png';
import ltcLogo from '../images/ltc-logo.png'
import visaMcLogo from '../images/visa-mc-logo.png';
import config from "react-global-configuration";

const IMG_MAP = {"BUSD": busdIcon,
    "BNB": bnbIcon,
    "USDC": usdcIcon,
    "ETH": ethIcon,
    "cUSD": cusdIcon};

ReactGA.initialize("G-C657WZY5VT");

class CampaignList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            campaigns: [],
            showError:false,
            errorMessage:"",
            lang:'',
            fiatPaymentEnabled:false
        };
    }

    async componentDidMount() {
        ReactGA.send({ hitType: "pageview", page: "/" });
        let globals = await config.get("GLOBALS");
        globals.forEach(element => {
            if(element._id === 'FIATPAYMENT') {
                this.setState({fiatPaymentEnabled: element.enabled});
            }
        });
        this.setState({
            campaigns : (await this.getCampaigns())
        });
    }
    /* this is a test comment */
    async getCampaigns() {
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
            let raisedAmount = campaign.raisedAmount ? parseFloat(campaign.raisedAmount) : 0;
            let fiatDonations = campaign.fiatDonations ? parseFloat(campaign.fiatDonations) : 0;
            let raisedOnCoinbase = campaign.raisedOnCoinbase ? parseFloat(campaign.raisedOnCoinbase) : 0;

            if(raisedAmount || fiatDonations || raisedOnCoinbase) {
                campaign["raisedAmount"] = Math.round((raisedAmount + fiatDonations + raisedOnCoinbase) * 100)/100;
            }

            //dedupe coin names for "accepting" section
            let dedupedCoinNames = [];
            for(var chain in campaign.coins) {
                let coinName = campaign.coins[chain].name;
                if(!dedupedCoinNames.includes(coinName)) {
                    dedupedCoinNames.push(coinName);
                }
            }
            campaign.dedupedCoinNames = dedupedCoinNames;
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
                                                    <Card.Text><span className={"h2"}>{i18nString(item.org, i18n.language)}</span><br/>
                                                        {`${DescriptionPreview(item.description, i18n.language)}...`}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span id='readMore'><Trans i18nKey='readMore'/></span>
                                                    </Card.Text>
                                                    <p id='progressBarLabel'><span id='progressBarLabelStart'>
                                                        &#36;{item.raisedAmount}</span>{i18n.t('raised')}&#36;{item.maxAmount} {i18n.t('goal')}</p>
                                                    <ProgressBar now={100 * item.raisedAmount/item.maxAmount} />
                                                </Card.Body>
                                            </Row>
                                            <Row >
                                                <Col className='buttonCol'>
                                                    <div id='acceptingBtn' className='cardButtons'><p><Trans i18nKey='accepting'/></p>
                                                        <p id='currencyName'>
                                                            {this.state.fiatPaymentEnabled && item.fiatPayments && <span className='coinRewardInfo'><img src={visaMcLogo} width={21} height={20} style={{marginRight:5, marginLeft:5}} /> </span>}
                                                            {item.dedupedCoinNames.map((coin, j) =>
                                                                <span key={item._id + "-" + coin}><img src={IMG_MAP[coin]} width={20} height={20} style={{marginLeft:5, marginRight:5}} /> </span>
                                                            )}

                                                            {item.coinbaseCommerceURL && <span className='coinRewardInfo'><img src={ethIcon} width={20} height={20} style={{marginRight:5, marginLeft:5}} /> </span> }
                                                            {item.coinbaseCommerceURL && <span className='coinRewardInfo'><img src={btcLogo} width={20} height={20} style={{marginRight:5, marginLeft:5}} /> </span> }
                                                            {item.coinbaseCommerceURL && <span className='coinRewardInfo'><img src={daiLogo} width={20} height={20} style={{marginRight:5, marginLeft:5}} /> </span> }
                                                            {item.coinbaseCommerceURL && <span className='coinRewardInfo'><img src={ltcLogo} width={20} height={20} style={{marginRight:5, marginLeft:5}} /> </span> }

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
