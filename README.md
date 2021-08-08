# HEO - Stablecoin-based crowdfunding that rewards donors

This is a basic implementation of React-based Web UI for HEO (https://app.heo.finance).
Solidity contracts that this UI interacts with are in a separate Truffle project on my Github: https://github.com/HEO-Platform/heo-eth

#Demo on Heroku
You can see the latest deployed version of this app on Binance Smart Chain mainnet: https://app.herokuapp.com/.
If you want to just play around, you can use the app on Binance Smart Chain testnet: https://bsc-test.heo.finance/.

# Configuration parameters
## AWS configs
In order to interact with AWS S3, the application requires 3 configuration parameters:
 * Access ID (AWS account identified)
 * Access Key (AWS account secret key)
 * Bucket Name (name of S3 bucket)

These parameters are passed to the application via environment variables:
* SERVER_APP_ACCESS_ID
* SERVER_APP_ACCESS_KEY  
* SERVER_APP_BUCKET_NAME

## Blockchain configs
The application uses Web3 JavaScript library to interact with Ethereum-compatible blockchain.
In order to be able to switch between dev and prod environments, and to be able to test
on different flavors of Ethereum-compatible blockchains, the application stores
blockchain configs in `src/config.js`. Environment variable `CHAIN` is used
to select config parameters for a specific blockchain. Environment variable `CHAIN_NAME`
is used to show a humanly-readable name of the selected blockchain in error messages. 

The following environment variables are used to connect to Web3 RPC node and WalletConnect bridge:
* WEB3_RPC_CHAIN_ID
* WEB3_RPC_NODE_URL
* WC_BRIDGE_URL

In order to interract with Smart Contracts, the application needs the address of an instance of
HEOCampaignFactory contract. This address is passed through environment variable `CAMPAIGN_FACTORY_ADDRESS`.
HEOCampaignFactory is deployed on BSC testnet at `0x8C9Aaf1B981c241F792D8517F12892D78B9DE6A9`
and on BSC mainnet on `0x69274423157Fa9C625ac99b9d60DE08a0B062A23`

## MongoDB configs
The application uses MongoDB to cache some of the blockchain data for faster access. The following environment
variables are used to connect to MongoDB:
* MONGO_LOGIN
* MONGO_DB_NAME
* MONGO_URL
* MONGODB_PWD

# Running locally
## Environment variables
To run the app locally, add `server/.env` file with the following parameters:
```
SERVER_APP_ACCESS_ID
SERVER_APP_ACCESS_KEY
SERVER_APP_BUCKET_NAME
SERVER_APP_IMG_DIR_NAME
CHAIN
CHAIN_NAME
MONGO_LOGIN
MONGO_DB_NAME
MONGO_URL
MONGODB_PWD
WEB3_RPC_CHAIN_ID
WEB3_RPC_NODE_URL
WC_BRIDGE_URL
CAMPAIGN_FACTORY_ADDRESS
NATIVE_TOKEN_SYMBOL
JWT_SECRET
```
## AWS configuration
Set `SERVER_APP_BUCKET_NAME` to point to the S3 bucket that
will hold image uploads from the app. Set `SERVER_APP_IMG_DIR_NAME` to the name of the subfolder 
where imasges will be stored. Make sure that the bucket is publicly readable and by default all
new objects uploaded to the bucket are publicly readable.

Set `SERVER_APP_ACCESS_ID`, `SERVER_APP_ACCESS_KEY` to match an IAM account that has permissions to add and delete
objects in the bucket specified by `SERVER_APP_BUCKET_NAME`.  
 
## Blockchain configuration

### Local Ganache
If you are running with a local instance of EVM, such as Ganache (https://www.trufflesuite.com/ganache),
edit `src/config.js` file, so that config values under `chainconfigs/ganache` point to addresses of the contracts you
have deployed on Ganache. Set environment variable `CAMPAIGN_FACTORY_ADDRESS` to point to the address where
HEOCampaignFactory is deployed on Ganache. 
See https://github.com/grishick/heo-eth for more information about smart contracts.

### Remote EVM node
You can also run the application locally with a remote EVM node. Use the following parameters to run with 
contracts currently deployed on BSC Testnet:
```
REACT_APP_CHAIN_ID=bsctest
REACT_APP_CHAIN_NAME=BSC-Test
WEB3_RPC_NODE_URL=https://data-seed-prebsc-1-s1.binance.org:8545
CAMPAIGN_FACTORY_ADDRESS=0x8C9Aaf1B981c241F792D8517F12892D78B9DE6A9
NATIVE_TOKEN_SYMBOL=BNB
WC_BRIDGE_URL=https://bridge.walletconnect.org
```

## Build
After you download the source code run 
```
npm run install-all
```
this will install UI dependencies into top level `node_modules` folder and server dependencies into `server/node_modules` folder.

To build the React UI, run
```
npm run build
```
this will put all minified UI files into `build` folder.

## Run
To start the application run
```
npm start
```
To start React App separately (useful for development and debugging UI):
```
npm run start-react
```