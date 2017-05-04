var sqlite3 = require("sqlite3");


var $ = require("./lib/util/util"),
    BaseModel = require("./lib/baseModel");
var ModelWhereList = require("./lib/obj/model-where-list");

var _sqlite3 = {
  _config:{},
  _models:{},
  _arrSource:[],
  _getLogger(){
    var self = this;
    var logger = self._config.logger;
    logger.error = logger.error || console.log.bind(console);
    return logger;
  },
  modelWhereList(){
    return new ModelWhereList();
  },
  model(table){
    //根据name
    var self = this;
    return self._models[table];
  },
  configure(config){
    config = config || {};
    config.logger = config.logger || {};
    this._config = config;
    return this;
  },
  createModel(config){
    var self = this;
    var table = config.table;
    if(self._models[table]){
      return self.model(table);
    }
    //根据table name 判断是哪个数据源
    var logger = self._getLogger();
    var db = null;

    $.each(self._arrSource,function(index,source){
      if(!source.dataSource.prefix){
        db = source.db;
        return false;
      }
      $.each(source.dataSource.model,function(i,m){
        if(m == table){
          db = source.db;
          return false;
        }
        var r = new RegExp("^"+source.dataSource.prefix,"i");
        if(r.test(table)){
          db = source.db;
          return false;
        }
     });
    });
    if(db == null){
      logger.error("找不到"+table+"对应的database");
      return null;
    }
    return self._models[table] =  new BaseModel(config,db,self._getLogger());
  },
  init(){
    var self = this;
    $.each(self._config.dataSource,function(index,dataSource){
      var db = new sqlite3.Database(dataSource.path);
      dataSource.model = dataSource.model || [];
      self._arrSource.push({
        db:db,
        dataSource:dataSource
      });
    });
  }
};

module.exports = _sqlite3;
