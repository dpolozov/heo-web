# HEO - Stablecoin-based crowdfunding that rewards donors

This is a basic implementation of React-base web UI for HEO (https://heo.finance).
Solidity contracts that this UI interacts with are in a separate Truffle project on my github: https://github.com/grishick/heo-eth

#Demo on Heroku
You can play with the latest deployed version of this app on Heroku: https://heo-bsc.herokuapp.com/.
You will need to connect MetaMask to Binance Smart Chain testnet in order to use the demo app.

# Configuration parameters
## AWS configs
This application currently does not have any server-side code, like ExpressJS.
All the code in this repo so far is UI-only. In order to be able to upload files
without a server-side API, the application uses AWS S3 (see `src/util/s3/README.md` for more info).
In order to interact with AWS S3, the application requires 4 configuration parameters:
 * Access ID (AWS account identified)
 * Access Key (AWS account secret key)
 * Bucket Name (name of S3 bucjet)
 * Region (name of AWS region for accessing the S3 bucket)

These parameters are passed to the application via environment variables:
* REACT_APP_ACCESS_ID
* REACT_APPREACT_APP_BUCKET_NAME_ACCESS_KEY
* REACT_APP_REGION
    
In addition to the above variables the application uses two more configuration parameters
to specify the folders for storing images and metadata files:
* REACT_APP_IMG_DIR_NAME
* REACT_APP_META_DIR_NAME

## Blockchain configs
The application uses Web3 JavaScript library to interact with Ethereum-compatible blockchain.
In order to be able to switch between dev and prod environments, and to be able to test
on different flavors of Ethereum-compatible blockchains, the application stores
blockchain configs in `src/config.js`. Environment variable `REACT_APP_CHAIN_ID` is used
to select config parameters for a specific blockchain. Environment variable `REACT_APP_CHAIN_NAME`
is used to show a humanly-readable name of the selected blockchain in error messages. 

# Running locally
## Environment variables
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
## AWS configuration
Set `REACT_APP_BUCKET_NAME` and `REACT_APP_REGION` to point to an IAM account and an S3 bucket that
will hold file uploads from the app. Set `REACT_APP_IMG_DIR_NAME`, `REACT_APP_META_DIR_NAME`
to two separate subfolders in that bucket (e.g. 'images' and 'meta'). Make sure that
the bucket is publicly readable and by default all new objects uploaded to the bucket are publicly readable.

Set `REACT_APP_ACCESS_ID`, `REACT_APP_ACCESS_KEY` to match an IAM account that has permissions to add and delete
objects in the bucket specified by `REACT_APP_BUCKET_NAME`.  
 
## Blockchain configuration

### Local Ganache
If you are running with a local instance of EVM, such as Ganache (https://www.trufflesuite.com/ganache),
edit `src/config.js` file, so that config values under `chainconfigs/ganache` point to addresses of the contracts you have deployed on Ganache.
See https://github.com/grishick/heo-eth for more information about smart contracts.
### Remote EVM node
You can also run the application locally with a remote EVM node. See `chainconfigs/binancetestnet` for an example
of configuration that points to smart contracts running on BSC Testnet. 

# Running on Heroku
To run on Heroku, create a Heroku dyno with create-react-app [Buildpack](https://elements.heroku.com/buildpacks/mars/create-react-app-buildpack).
Then, to set the following environment variables in your dyno's environment:
* REACT_APP_ACCESS_ID
* REACT_APP_ACCESS_KEY
* REACT_APP_BUCKET_NAME
* REACT_APP_IMG_DIR_NAME
* REACT_APP_META_DIR_NAME
* REACT_APP_REGION
* REACT_APP_CHAIN_ID
* REACT_APP_CHAIN_NAME

See [Configuration parameters](#Configuration parameters) section above for details about these variables.
 
#TODO
* Add UI to check farmed rewards
* Add UI to edit launched fundraisers
* Show completed fundraisers separately from active ones
* Add web-based authentication
* Add KYC for larger fundraisers
* Cache blockchain data on webserver for better UI performance
* Add instructions for deploying on Heroku
* Templetize for easy localization
* Perhaps store images and metadata on storage blockchain like IPFS or Storj