# HEO - Stablecoin-based crowdfunding that rewards donors

This is a basic implementation of React-base web UI for HEO (https://heo.finance).
Solidity contracts that this UI interacts with are in a separate Truffle project on my github: https://github.com/grishick/heo-eth

#Demo on Heroku
You can play with the latest deployed version of this app on Heroku: https://heo-bsc.herokuapp.com/.
You will need to connect MetaMask to Binance Smart Chain testnet in order to use the demo app.

# Running with React
To run the app locally, add `.env` file with the following parameters:
```
REACT_APP_ACCESS_ID=
REACT_APP_ACCESS_KEY=
REACT_APP_BUCKET_NAME=
REACT_APP_IMG_DIR_NAME=
REACT_APP_META_DIR_NAME=
REACT_APP_REGION=
REACT_APP_CHAIN_ID=
REACT_APP_CHAIN_NAME=
```
to run on heroku, set the above variables in Heroku dyno environment.

The app uses S3 to host images and metadata in order to save storage space on blockchain. 
#TODO
* Add UI to check farmed rewards
* Add UI to edit launched fundraisers
* Show completed fundraisers separately from active ones
* Add web-based authentication
* Add KYC for larger fundraisers
* Cache blockchain data on webserver for better UI performance
* Add instructions for deploying on Heroku
* Templetize for easy licalization
* Perhaps store images and metadata on storage blockchain like IPFS or Storj