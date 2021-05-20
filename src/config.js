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
                {"text":"TUSD", "value":"0xeBF76ADA62Cd2d5c9Eb41d7Db0A3a733c9A5a0C5"},
                {"text":"ETH", "value":"0x0000000000000000000000000000000000000000"}
            ],
            "currencies":{
                "0xeBF76ADA62Cd2d5c9Eb41d7Db0A3a733c9A5a0C5":"TUSD",
                "0x0000000000000000000000000000000000000000":"ETH"
            }
        }
    }
};

export default config;