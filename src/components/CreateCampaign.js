import React, { useState } from 'react';
import logo from '../images/heo-logo.png';

import {Input, Image, Label, Progress, Container, Header, Segment, Grid, Step, Form} from "semantic-ui-react";
import config from "react-global-configuration";

const countries = [
    {
        key: 'Jenny Hess',
        text: 'Jenny Hess',
        value: 'Jenny Hess',
        image: { avatar: true, src: '/images/avatar/small/jenny.jpg' },
    },
    {
        key: 'Elliot Fu',
        text: 'Elliot Fu',
        value: 'Elliot Fu',
        image: { avatar: true, src: '/images/avatar/small/elliot.jpg' },
    }
];

class CreateCampaign extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            step:1,
            fn:"",
            ln:"",
            country:"",
            heoPrice:"$10",
            maxAmount:10000,
            donorsEarnPerDollar:1,
            z:1,
            title:"Title of the campaign",
            description:"Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor.",
            coinName:"BNB",
            raisedAmount:6000,
            tokensToBurn:10,
            percentRaised: "60%",
            mainImage: "https://ksr-ugc.imgix.net/assets/032/126/819/b2ada0fe85aff53a51778ebd27db7b95_original.jpg",
            reward: "200%"
        };
    }
    handleChange = (e, { name, value }) => this.setState({ [name]: value })
    handleFileChange = (event, {name, value}) => {
        // filename
        console.log('filename ' + event.target.value);

        //file
        console.log('file ' + event.target.files[0]);
    }

    handleClick = (event, target) => {
        console.log(`Button clicked ${target.name}`);
        switch(target.name) {
            case "ff1":
                this.setState({step:2});
                break;
            case "ff2":
                this.setState({step:3});
                break;
            case "bb2":
                this.setState({step:1});
                break;
            case "bb3":
                this.setState({step:2});
                break;
            case "ff3":
                //Create campaign
                break;
            default:
                break;
        }
    }
    render() {
        return (
            <div>
                <Form>
                { (this.state.step == 1) && (
                    <div>
                        <Form.Group widths='equal'>
                            <Form.Input required fluid label='First name' placeholder='First name' name='fn' />
                            <Form.Input required fluid label='Last name' placeholder='Last name' name='ln' />
                        </Form.Group>
                        <Form.Input fluid label='Organization' placeholder='Organization name (optional)' name='org' />
                        <Form.Dropdown placeholder="Select your country" name='cn' options={countries} />
                        <Form.Button name='ff1' onClick={this.handleClick}>Next</Form.Button>
                    </div>
                )}
                { (this.state.step == 2) && (
                    <div>
                            <Header as='h3'>Current price of HEO token {this.state.heoPrice}</Header>
                            <Form.Group widths='equal'>
                                <Form.Input required fluid label='How much ETH do you need to raise in USD?' placeholder={this.state.maxAmount} name='maxAmount' onChange={this.handleChange} />
                                <Form.Input required fluid label='How much your donors will earn (% of donation)?' placeholder={this.state.reward} name='reward' onChange={this.handleChange} />
                            </Form.Group>
                            <Header as='h3'>You will need to burn {this.state.tokensToBurn} HEO tokens in order to raise ${this.state.maxAmount} with {this.state.reward}% rewards</Header>
                            <Form.Group widths='equal'>
                                <Form.Button name='bb2' onClick={this.handleClick}>Back</Form.Button>
                                <Form.Button name='ff2' onClick={this.handleClick}>Next</Form.Button>
                            </Form.Group>
                    </div>
                )}
                { (this.state.step == 3) && (
                    <div>
                        <Form.Group>
                            <Form.Field label='Select cover image' control='input' type='file' />
                            <Form.Button>Upload</Form.Button>
                        </Form.Group>
                        <Form.Field label='An HTML <textarea>' control='textarea' rows='3' />
                        <Form.Button name='bb3' onClick={this.handleClick}>Back</Form.Button>
                        <Form.Button name='ff3'>Create campaign</Form.Button>
                    </div>

                )}
                </Form>
                <Step.Group ordered>
                    <Step active={(this.state.step == 1)} completed={(this.state.step > 1)}>
                        <Step.Content>
                            <Step.Title>About you</Step.Title>
                        </Step.Content>
                    </Step>

                    <Step active={(this.state.step == 2)} completed={(this.state.step > 2)}>
                        <Step.Content>
                            <Step.Title>How much do you need?</Step.Title>
                        </Step.Content>
                    </Step>

                    <Step active={(this.state.step == 3)} completed={(this.state.step > 3)}>
                        <Step.Content>
                            <Step.Title>Campaign details</Step.Title>
                        </Step.Content>
                    </Step>

                    <Step active={(this.state.step == 4)} completed={(this.state.step > 4)}>
                        <Step.Content>
                            <Step.Title>Confirmation</Step.Title>
                        </Step.Content>
                    </Step>
                </Step.Group>
            </div>
        );
    }

    async componentDidMount() {


    }
}


export default CreateCampaign;