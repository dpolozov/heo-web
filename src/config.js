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
                {"text":"BUSD", "value":"0x40C141AC46835eC8dc7Dc81A5eBd09b3926Aa784"},
                {"text":"BNB", "value":"0x0000000000000000000000000000000000000000"}
            ],
            "currencies":{
                "0x40C141AC46835eC8dc7Dc81A5eBd09b3926Aa784":"BUSD",
                "0x0000000000000000000000000000000000000000":"BNB"
            }
        }
    }
};

export default config;