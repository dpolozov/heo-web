import 'fomantic-ui-css/components/card.css';
import React from 'react';
import {Button, Card, Image, Progress, Label} from 'semantic-ui-react';
class CampaignCard extends React.Component {
    moreDetails = (e) => {
        console.log(this.query.address);
    }
    render() {
        return (
            <Card fluid>
                <div className="ui horizontal card" style={{ width: 800 }}>
                <Image
                    wrapped ui={true}
                    src={ this.props.mainImage.url }
                />
                <Card.Content>
                    <div className="header">{this.props.tagline}</div>
                    <div className='description'>{this.props.description}</div>
                </Card.Content>
                <Card.Content extra>
                    <Progress color='olive' percent={this.props.percentRaised}>{this.props.raisedAmount} {this.props.coinName} raised out of {this.props.maxAmount} goal</Progress>
                    <div className='ui three buttons'>
                        <Label basic color='green'>
                            Accepting: {this.props.coinName}
                        </Label>
                        <Label basic color='red'>
                            Rewards: {this.props.reward}
                        </Label>
                        <Label><a href={'/campaign/' + this.props.address}>See more details</a></Label>

                    </div>
                </Card.Content>
                </div>
            </Card>
        );
    }
}

export default CampaignCard;