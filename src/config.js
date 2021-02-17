const config = {
    "chain":"binancetestnet",
    "chainconfigs":{
        "binancetestnet":{
            "currencies": {
                "0x0000000000000000000000000000000000000000":"BNB",
                "0x8301F2213c0eeD49a7E28Ae4c3e91722919B8B47":"BUSD",
                "0x64544969ed7EBf5f083679233325356EbE738930":"USDC",
                "0xEC5dCb5Dbf4B114C9d0F65BcCAb49EC54F6A0867":"DAI",
                "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd":"USDT"
            },
            "contracts":{
                "HEOToken":"0x6d231B36831c971cFCeBf7263103E2710EbD9B10",
                "HEOManualDistribution":"0xEfFB322eE8612523073bd1803A7738fd700b5F86",
                "HEOCampaignRegistry": "0xd972b0FaF2F18ED06c580D23229c799F87FaCd5c",
                "HEOGlobalParameters": "0x088ab827D5d1036BFC5f586E09D66e03b1cCD6F9",
                "HEOPriceOracle": "0x791D0Bc888E19D5B09e8F176d0295f2cE1C8921F",
                "HEORewardFarm": "0x3C66Ff2577e5E1915d3A326B4Dde83a19C2d1d41",
                "HEOCampaignFactory" :"0x5496AF2c4af974d5900E5f7AA9842938eC0D1B39"
            }
        },
        "ganache":{
            "currencies":{"0x0000000000000000000000000000000000000000":"ETH"},
            "contracts":{}
        }
    }
};

export default config;