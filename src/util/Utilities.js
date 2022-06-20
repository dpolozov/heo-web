import config from 'react-global-configuration';
import axios from 'axios';
import Web3 from 'web3';
import Web3Modal from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import ReactGA from "react-ga4";
import { CheckCircle, HourglassSplit, XCircle } from 'react-bootstrap-icons';
import { createMessage, encrypt, readKey } from 'openpgp';

ReactGA.initialize("G-C657WZY5VT");

class Utilities {

}

const clearWeb3Provider= async (that) => {
    if(that.state.web3 && that.state.web3.currentProvider && that.state.web3.currentProvider.close) {
        await that.state.web3.currentProvider.close();
    }
    if(window.web3Modal) {
        await window.web3Modal.clearCachedProvider();
    }
}

const LogIn = async (accountAdd, web3, that) => {
    that.setState({showModal:true, modalTitle: '',
        modalMessage: 'signThePhrase', modalIcon: 'HourglassSplit',
        modalButtonVariant: "#E63C36", waitToClose: false, modalButtonMessage: 'abortBtn',
            onModalClose: function() {
                clearWeb3Provider(that);
            }
        });
    let res = await axios.get('/api/auth/msg');
    let dataToSign = res.data.dataToSign;
    if(window.web3Modal.cachedProvider == "binancechainwallet") {
        let signature = await window.BinanceChain.bnbSign(accountAdd,dataToSign);
        let authRes = await axios.post('/api/auth/jwt',
            {signature: signature, addr: accountAdd},
            {headers: {"Content-Type": "application/json"}});
        that.setState({
            isLoggedIn: true, showModal: true, modalMessage: 'logInSuccess', modalTitle: 'success',
            modalIcon: 'CheckCircle', modalButtonVariant: "#588157", waitToClose: false,
            modalButtonMessage: 'closeBtn'
        });
        return authRes.data.success;
    } else {
        let signature = await web3.eth.personal.sign(dataToSign, accountAdd);
        let authRes = await axios.post('/api/auth/jwt',
            {signature: signature, addr: accountAdd},
            {headers: {"Content-Type": "application/json"}});
        that.setState({
            isLoggedIn: true, showModal: true, modalMessage: 'logInSuccess', modalTitle: 'success',
            modalIcon: 'CheckCircle', modalButtonVariant: "#588157", waitToClose: false,
            modalButtonMessage: 'closeBtn'
        });
        return authRes.data.success;
    }
}

function i18nString(value, lang) {
    if(!value || !lang) {
        return "";
    }
    if(typeof value == "string") {
        return value;
    }
    return value[lang] ? value[lang] : value["default"];
}
function DescriptionPreview(description, lang) {
    var i = 200;
    var text = "";
    if(description !== undefined ){
        if (typeof description == "string") {
            text = description;
        } else if(description[lang] !== undefined) {
            text = description[lang];
        } else {
            text = description["default"];
        }
        let preview = text.trim();
        var firstSpace = preview.indexOf(" ");
        if(firstSpace >= 200){
            return preview.substring(0,200);
        } else if (preview.length <= 200) {
            return preview;
        } else {
            while(preview.charAt(i) != ' '  && i > 0){
                i--;
            }
            if(preview.charAt(i-1).match(/[.,?!]/)){
                return preview.substring(0, i-1);
            } else {
                return preview.substring(0, i);
            }
        }
    }
}

function GetLanguage() {
    let language = window.localStorage.getItem("heolang");
    language = language || navigator.language || navigator.userLanguage;
    return language;
}

const initWeb3 = async (chainId, that) => {
    if(!window.web3Modal) {
        await initWeb3Modal(chainId);
    }
    let provider = await window.web3Modal.connect();
    provider.on("disconnect", (code, reason) => {
        that.setState({web3:null, accounts: null});
    });

    if(provider && provider.isMetaMask) {
        let chainConfig = config.get("CHAINS")[chainId];
        if(!chainConfig) {
            throw(`Unsupported blockchain: ${chainId}`);
        }
        var hexChainID = chainConfig["WEB3_HEX_CHAIN_ID"];
        var currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if(currentChainId != hexChainID) {
            try {
                ReactGA.event({
                    category: "provider",
                    action: "switching_network",
                    label: chainConfig["CHAIN_NAME"],
                    nonInteraction: false
                });
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: hexChainID }],
                });
                ReactGA.event({
                    category: "provider",
                    action: "switched_network",
                    label: chainConfig["CHAIN_NAME"],
                    nonInteraction: false
                });
            } catch (switchError) {
                // This error code indicates that the chain has not been added to MetaMask.
                if (switchError.code === 4902) {
                    try {
                        ReactGA.event({
                            category: "provider",
                            action: "adding_network",
                            label: chainConfig["CHAIN_NAME"],
                            nonInteraction: false
                        });
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: hexChainID,
                                rpcUrls: [chainConfig["WEB3_RPC_NODE_URL"]],
                                chainName: chainConfig["CHAIN_NAME"],
                                blockExplorerUrls:[chainConfig["WEB3_BLOCK_EXPLORER_URL"]]
                            }],
                        });
                    } catch (addError) {
                        console.log(`Failed to add provider for ${chainId} and ${chainConfig["WEB3_RPC_NODE_URL"]}`)
                        console.log(addError);
                        ReactGA.event({
                            category: "provider",
                            action: "failed_to_add_provider",
                            label: chainConfig["CHAIN_NAME"],
                            nonInteraction: false
                        });
                    }
                } else {
                    console.log(`Failed to switch provider to ${chainId} and ${chainConfig["WEB3_RPC_NODE_URL"]}`)
                    console.log(switchError);
                }
            }
        }
        //Workaround for web3-provider bug. See https://github.com/WalletConnect/walletconnect-monorepo/issues/496
        delete provider.__proto__.request;
        provider.hasOwnProperty("request") && delete provider.request;
        //end workaround
    }

    let web3 = new Web3(provider);
    let accounts = await web3.eth.getAccounts();
    that.setState({web3:web3, accounts: accounts});
}

const checkAuth = async (chainId, that, skipError=false) => {
    try {
        let res = await axios.get('/api/auth/status');
        if(res.data.addr) {
            if(!that.state.accounts) {
                await initWeb3(chainId, that);
            }
            if(that.state.accounts && that.state.accounts[0]) {
                if (that.state.accounts[0].toLowerCase() == res.data.addr.toLowerCase()) {
                    that.setState({isLoggedIn: true, showModal: false});
                } else {
                    //must have logged in with different account before
                    await axios.post('/api/auth/logout');
                }
            } else {
                that.setState({isLoggedIn: false, showModal: false});
                await axios.post('/api/auth/logout');
            }
        }
    } catch (err) {
        if(!skipError) {
            that.setState({
                showModal: true,
                isLoggedIn: false,
                goHome: true,
                modalTitle: 'authFailedTitle',
                modalMessage: 'technicalDifficulties',
                modalIcon: 'XCircle', modalButtonMessage: 'returnHome',
                modalButtonVariant: "#E63C36", waitToClose: false});
        }
    }
}

const initWeb3Modal = async(chainId) => {
    let rpc = [];
    let chains = config.get("CHAINS");
    let chainConfig = chains[chainId];
    if(!chainConfig) {
        throw(`Unsupported blockchain: ${chainId}`);
    }
    for(let chainId in chains) {
        rpc[chains[chainId]["WEB3_RPC_CHAIN_ID"]] = chains[chainId]["WEB3_RPC_NODE_URL"];
    }
    rpc[chainConfig["WEB3_RPC_CHAIN_ID"]] = chainConfig["WEB3_RPC_NODE_URL"];

    window.web3Modal = new Web3Modal({
        cacheProvider: false,
        providerOptions: {
            walletconnect: {
                package: WalletConnectProvider,
                options: {
                    rpc: rpc,
                    chainId: chainConfig["WEB3_RPC_CHAIN_ID"],
                    bridge: chainConfig["WC_BRIDGE_URL"],
                    network: chainConfig["WC_CHAIN_NAME"],
                    qrcodeModalOptions:{
                        mobileLinks:[
                            "metamask",
                            "trust",
                            "safepalwallet",
                            "valora",
                            "mathwallet"
                        ]
                    }
                }
            },
            binancechainwallet: {
                package: (chainId == "bsctest" || chainId == "bsc")
            }
        }
    });
}
const getPCIPublicKey = async() => {
    let res = await axios.get('/api/circle/publickey');
    return res.data.data;
};

const encryptCardData = async(keyData, cardData) => {
    const decodedPublicKey = await readKey({ armoredKey: atob(keyData.publicKey) });
    const message = await createMessage({ text: JSON.stringify(cardData) });
    const encrypted = await encrypt({message, encryptionKeys: decodedPublicKey});
    return btoa(encrypted);
}
export {DescriptionPreview, i18nString, GetLanguage, LogIn, initWeb3, checkAuth, initWeb3Modal, clearWeb3Provider, getPCIPublicKey, encryptCardData };
export default Utilities;
