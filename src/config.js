const config = {
    "chain":{"id":"ganache", "name":"Local Dev network"},
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
            "currencies":{
                "0x0000000000000000000000000000000000000000":"ETH",
                "0x869911D9a3f42DDdb94B10Aee034a0B491405145":"TUSD"
            },
            "contracts":{
                "HEOToken":"0xE15aBCb7e4C8aB5a96Fd093A460d07E0A12A5f5F",
                "HEOManualDistribution":"0x5313Dfd68d74A6dfe5b0Ed8D7589D04c300b337e",
                "HEOCampaignRegistry": "0x0aB6B9A68C619CDe89C3B32B25ac80c02991e033",
                "HEOGlobalParameters": "0x79CAAaf21A5a345e79B9901E8F223698Db154d00",
                "HEOPriceOracle": "0x2E0acE81E37eBB787E741Ec65BAE53E4E930Bb58",
                "HEORewardFarm": "0xa49135e8643D69e37cF5D7Cb8faD125E3f49c771",
                "HEOCampaignFactory" :"0x288FC5B322A33f1886238b702E2D744E15A189A9"
            }
        }
    }
};

export default config;