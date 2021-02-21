//HEOPublicSale ABI
import web3 from './web3';
const abi=[{"inputs":[{"internalType":"address","name":"currency","type":"address"},{"internalType":"contract HEOPriceOracle","name":"priceOracle","type":"address"},{"internalType":"contract HEOGlobalParameters","name":"globalParams","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"cost","type":"uint256"}],"name":"TokensSold","type":"event"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint16","name":"amount","type":"uint16"}],"name":"sellTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"currency","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}];

const address = "0x0cCff97F98284145720532Bf2a8F5B4A5C1d26F8";
const instance = new web3.eth.Contract(
    abi,
    address,
);

export default instance;
