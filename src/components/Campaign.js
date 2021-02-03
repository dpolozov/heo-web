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
                    <div className="header">Help Save Baltimore Restaurants & Bars!</div>

                    <div className='description'>Baltimore City restaurants are dying a slow, inevitable death due to the mayor's indoor & outdoor dining ban. These establishments were not able to open their doors during Christmas, New Year's, the Ravens playoff run - and many more events. Over 20,000 employees have lost their source of income as a result of the ban.</div>
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