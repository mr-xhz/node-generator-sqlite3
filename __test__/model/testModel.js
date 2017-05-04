var sqilte3 = require("../../index");

function TestModel(){

}

TestModel.prototype = sqilte3.createModel({
  table:"test",
  desc:"测试用的库",
  priKey:"test_id",
  fieldInfo:{
    "test_id":{
        "type":"INTEGER",
        "not_null":true,
        "auto_increment":true,
        "key":"PRIMARY KEY"
    },
    "test_text":{
        "type":"TEXT",
        "not_null":true
    },
    "test_json":{
        "type":"JSON"
    }
  },
  version:1
});

var fn = {

};


for(var key in fn){
  TestModel.prototype[key] = fn[key];
}

module.exports = new TestModel();
