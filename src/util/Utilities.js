import config from 'react-global-configuration';
var ACCOUNTS, web3;

class Utilities {

}


function DescriptionPreview(description){
    var i = 200;
    if(description !== undefined ){
        let preview = description.trim();
        var firstSpace = preview.indexOf(" ");
        if(firstSpace >= 200){
            return preview.substring(0,200);
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

function GetLanguage(){
    let language = navigator.language || navigator.userLanguage;
    return language;
}

async function Login(){
    if (typeof window.ethereum !== 'undefined') {
        var ethereum = window.ethereum;
        ACCOUNTS = await ethereum.request({method: 'eth_requestAccounts'});
        web3 = (await import("../remote/" + config.get("CHAIN") + "/web3")).default;
        return true;
    } else {
        alert("Please install metamask");
        return false;
    }
}


export {DescriptionPreview, GetLanguage, Login};
export default Utilities;