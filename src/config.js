const config = {
    "chainconfigs":{
        "bsctest":{
            "currencyOptions":[
                {"text":"BUSD", "value":"0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee"},
                {"text":"BNB", "value":"0x0000000000000000000000000000000000000000"}
            ],
            "currencies": {
                "0x0000000000000000000000000000000000000000":"BNB",
                "0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee":"BUSD"
            },
        },
        "bscdev":{
            "currencyOptions":[
                {"text":"BUSD", "value":"0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee"},
                {"text":"BNB", "value":"0x0000000000000000000000000000000000000000"}
            ],
            "currencies": {
                "0x0000000000000000000000000000000000000000":"BNB",
                "0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee":"BUSD"
            },
        },
        "ganache":{
            "currencyOptions":[
                {"text":"BUSD", "value":"0xb9c967dF3E296fb44e27495C00EF0BaeE6Db1c34"},
                {"text":"BNB", "value":"0x0000000000000000000000000000000000000000"}
            ],
            "currencies":{
                "0xb9c967dF3E296fb44e27495C00EF0BaeE6Db1c34":"BUSD",
                "0x0000000000000000000000000000000000000000":"BNB"
            }
        }
    }
};

export default config;