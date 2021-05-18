//HEOPriceOracle ABI and address
import web3 from './web3';
const abi=[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function","constant":true},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"uint256","name":"decimals","type":"uint256"}],"name":"setPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"getPrice","outputs":[{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"uint256","name":"decimals","type":"uint256"}],"stateMutability":"view","type":"function","constant":true}];
const address = "0x2CBe2c9dD834b7365592D7166d3bb8f3bEe99611";
const instance = new web3.eth.Contract(
    abi,
    address,
);

export default instance;
