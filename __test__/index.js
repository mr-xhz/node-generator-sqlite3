var path = require("path");
var sqlite3 = require("../index");
var databasePath = path.join(__dirname,"test.db");

sqlite3.configure({
  dataSource:[
    {
      path:databasePath,
      prefix:"",
      model:[]
    }
  ],
  logger:{
    error:console.log.bind(console),
    sql:console.log.bind(console)
  }
})
.init();



var testModel =  require("./model/testModel");
console.log("init success");
