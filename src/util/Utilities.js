import config from 'react-global-configuration';

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

export {DescriptionPreview, GetLanguage };
export default Utilities;