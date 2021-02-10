import 'fomantic-ui-css/semantic.css';
import React from 'react';
import {Button, Card, Image, Progress, Label} from 'semantic-ui-react';

class Campaign extends React.Component {
    render() {
        return (
            <Card className='ui horizontal card fluid'>
                <Image
                    style={{ width:'200px' }}
                    src='https://react.semantic-ui.com/images/avatar/large/steve.jpg'
                />
                <Card.Content>
                    <div className="header">{this.props.tagline}</div>

                    <div className='description'>{this.props.description}</div>
                </Card.Content>
                <Card.Content extra>
                    <div className="ui progress" data-percent="44">
                        <div className="bar" style={{ width: '44%' }} >
                            <div className="progress">$44,000 raised out of $100,000 goal</div>
                        </div>
                    </div>

                    <div className='ui three buttons'>
                        <Label basic color='green'>
                            Accepting: USDT, USDC, DAI
                        </Label>
                        <Label basic color='red'>
                            Rewards: 200%
                        </Label>
                        <Button basic color='green'>
                            Donate
                        </Button>
                    </div>
                </Card.Content>
            </Card>
        );
    }
}

export default Campaign;