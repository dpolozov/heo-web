import React from 'react';
import Campaign from './Campaign';
import {
    Container,
    Grid,
    Header, Image,
    Item,
    Label,
    Menu,
    Segment,
    Step,
    Card,
} from 'semantic-ui-react'

class CampaignList extends React.Component {
    render() {
        return (
            <Card.Group>
                        <Campaign/>
                <Campaign/>
            </Card.Group>
        );
    }
}

export default CampaignList;