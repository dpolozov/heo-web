const { MongoClient } = require('mongodb');
const EXPRESS = require('express');
const PATH = require('path');
require('dotenv').config({path : PATH.resolve(process.cwd(), '.env')});
const URL = `mongodb+srv://${process.env.MONGO_LOGIN}:${process.env.MONGODB_PWD}${process.env.MONGO_URL}`;
const DBNAME = process.env.MONGO_DB_NAME;
const CLIENT = new MongoClient(URL);
var log = require('console-log-level')({
    prefix: function (level) {
      return new Date().toISOString()
    },
    level: 'info'
  })

 async function setkeys() {
    try{
        var DB = CLIENT.db(DBNAME);
        var myCollection = await DB.collection('campaigns');
        //const campaigns = await myCollection.find({active: true});
        var campaigns_sort = await myCollection.toArray();
    } catch (err) {
       return; 
    }
    var i;
    for (i = 0; i < campaigns_sort.length; i++)
     this.setState({progress: (campaigns_sort.length/100)*i});
     campaigns_sort[i].key = "";        
    for (i = 0; i < campaigns_sort.length; i++){
        var help_org = '';
        help_org = campaigns_sort[i].org["default"];
        if(typeof help_org == "undefined")
          help_org = campaigns_sort[i].org; 
        if(typeof help_org == "undefined")
          help_org = campaigns_sort[i].title["default"]; 
        if(typeof help_org == "undefined")
          help_org = campaigns_sort[i].title;  
        if(typeof help_org == "undefined")
          help_org = 'org1';  
        let code = '';
        log.info("help_org");
        log.info(help_org);
        help_org = help_org.toLowerCase();
        for (let j = 0; j < help_org.length; j++){
          if (help_org[j] == ' ') code += '-';
          if (/^[A-Za-z0-9]*$/.test(help_org[j]) == true) code += help_org[j];
        }
        for (let k = 0; k < campaigns_sort.length; k++){
          if(code === campaigns_sort[k].key) code = code +'1'; 
        }
        campaigns_sort[i].key = code;
       await myCollection.updateOne({'_id': campaigns_sort[i]._id}, {$set: campaigns_sort[i]});
    } 
      
}