//HEORewardFarm ABI and address
import web3 from './web3';
const abi=[{"inputs":[{"internalType":"contract HEOGlobalParameters","name":"globalParams","type":"address"},{"internalType":"contract HEOPriceOracle","name":"priceOracle","type":"address"},{"internalType":"contract IHEOCampaignRegistry","name":"registry","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"donor","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"token","type":"address"}],"name":"addDonation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"donor","type":"address"}],"name":"getDonationCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true},{"inputs":[{"internalType":"address","name":"donor","type":"address"},{"internalType":"uint256","name":"di","type":"uint256"}],"name":"claimedReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true},{"inputs":[{"internalType":"address","name":"destination","type":"address"},{"internalType":"uint256","name":"di","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"claimReward","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"donor","type":"address"},{"internalType":"uint256","name":"di","type":"uint256"}],"name":"calculateReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function","constant":true}];
const address = "0xd0Fb8052A0D27b7c6aDF0546D00aCb5ACDb57A13";
const instance = new web3.eth.Contract(
    abi,
    address,
);

export default instance;
