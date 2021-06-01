import config from 'react-global-configuration';
import axios from 'axios';

class Utilities {

}

const LogIn = async (accountAdd, web3) => {
    let res = await axios.get('/api/auth/msg');
    let dataToSign = res.data.dataToSign;
    let signature = await web3.eth.personal.sign(dataToSign, accountAdd);
    let authRes = await axios.post('/api/auth/jwt',
        {signature:signature, addr: accountAdd},
        {headers: {"Content-Type": "application/json"}});
    return authRes.data.success;
}

function DescriptionPreview(description) {
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

function GetLanguage() {
    let language = navigator.language || navigator.userLanguage;
    return language;
}

export {DescriptionPreview, GetLanguage, LogIn };
export default Utilities;