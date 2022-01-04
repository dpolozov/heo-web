import React, {Component} from 'react';
import {
    Card,
    Container,
    Row
} from "react-bootstrap";
import {ChevronLeft} from "react-bootstrap-icons";
import {Trans} from "react-i18next";
import {Link} from "react-router-dom";
import {i18nString} from "../util/Utilities";
import i18n from "../util/i18n";


class Page404 extends Component {
    render() {
        return (
            <div>
                <Container className='backToCampaignsDiv'>
                    <p className='backToCampaigns'><Link className={"backToCampaignsLink"} to="/"><ChevronLeft id='backToCampaignsChevron'/><Trans i18nKey='backToCampaigns'/></Link></p>
                </Container>
                <Container id='mainContainer'>
                    <Row id='descriptionRow'>
                        <Card>
                            <Card.Body>
                                <Card.Title>404</Card.Title>
                                <Card.Text>
                                    <Trans i18nKey='Text404'/>
                                </Card.Text>
                            </Card.Body>
                        </Card>
                    </Row>
                </Container>
            </div>
        );
    }
}

export default Page404;
