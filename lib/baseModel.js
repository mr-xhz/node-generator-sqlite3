var Promise = require("./util/promise"),
    ModelSQL = require("./obj/model-sql"),
    $ = require("./util/util");

function BaseModel(opts,db,logger){
    var self = this;
    self._opts = opts;
    self._readyCallback = [];
    self._bReady = false;
    self._modelSQL = new ModelSQL(opts.table,logger);
    self._limit = "";
    self._groupby = "";
    self._orderby = "";
    self._field = [];
    self._logger = logger;
    self._db = db;
    self._priKey = "";
    for(var key in opts.fieldInfo){
      if(opts.fieldInfo[key].key && opts.fieldInfo[key].key.toUpperCase() == "PRIMARY KEY"){
        self._priKey = key;
        break;
      }
    }

    self._create && self._create();
}

BaseModel.prototype = {
  _error(){
    var self = this;
    var logger = self._logger;
    logger.error && logger.error.apply(logger,arguments);
  },
  _sql(){
    var self = this;
    var logger = self._logger;
    logger.sql && logger.sql.apply(logger,arguments);
  },
  _create(){
    var self = this;
    var db = self._db;
    var sql = "select count(*) as count from sqlite_master where type='table' and name='"+this._opts.table+"'";
    self._sql(sql);
    db.each(sql,function(err,ret){
      if(err || ret.count == 0){
        //create table
        self._createTable && self._createTable();
      }else{
        self._bReady = true;
        self.ready();
      }
    });
  },
  _createTable(){
    var self = this;
    var sql = "CREATE TABLE `"+self._opts.table+"`";
    var field = [];
    for(var key in self._opts.fieldInfo){
        var type = self._opts.fieldInfo[key].type;
        if(type.toLowerCase() == "json") type = "TEXT";
        field.push(key+" "+type+(self._opts.fieldInfo[key].key?" "+self._opts.fieldInfo[key].key+" ":"") + (self._opts.fieldInfo[key].auto_increment?" AUTOINCREMENT":"")+ (self._opts.fieldInfo[key].not_null?" NOT NULL":""));
    }
    sql += "("+field.join(",")+")";
    self._sql(sql);
    self._db.run(sql,function(err){
        console.log(err);
        self._bReady = true;
        self.ready();
        self._afterCreated && self._afterCreated();
    });
  },
  ready(callback){
    var self = this;
    if($.type(callback) == "undefined"){
      $.each(self._readyCallback,function(){
          this();
      });
      self._readyCallback = [];
      return self;
    }
    if(self._bReady){
      callback && callback();
      return self;
    }
    self._readyCallback.push(callback);
  },
  _trycatch(callback){
    var self = this;
    return function(err){
      if(err){
        self._error(err);
        return callback(null);
      }
      var args = Array.prototype.slice.call(arguments,1);
      callback.apply(null,args);
    }
  },
  _createNewModelSQL(){
    var self = this;
    var modelSQL = self._modelSQL;
    self._modelSQL = new ModelSQL(self._opts.table,self._logger);
    return modelSQL;
  },
  //////////////////////////////////////////////////////////////////////////
  update(){
    var self = this;
    if(arguments.length == 0){
      return self;
    }
    var args = Array.prototype.slice.call(arguments);

    var db = self._db;

    var modelSQL = self._createNewModelSQL();

    //返回一个promise对象 后面可以用链式
    return new Promise(function(){
      var THIS = this;
      self.ready(function () {
        modelSQL.fieldInfo(self._opts.fieldInfo);
        var sql = modelSQL.updateSQL(args[0]);
        delete modelSQL;
        THIS.resolve(sql);
      });
    }).when(function(sql){
      var THIS = this;
      self._sql(sql);
      db.run(sql,self._trycatch(function(){
        THIS.resolve();
      }));
    }).then(function(){
      var promise = this;
      var callback = null;
      if($.type(args[1]) == "function"){
        callback = promise.try(args[1]);
        callback.call(promise);
      }else{
        promise.resolve();
      }
    });
  },
  delete(){
    var self = this;
    var args = [];
    var callback = null;
    if($.type(arguments[arguments.length-1]) == "function"){
        args = Array.prototype.slice.call(arguments,0,arguments.length - 1);
        callback = arguments[arguments.length - 1];
    }else{
        args = Array.prototype.slice.call(arguments);
    }

    var db = self._db;
    var modelSQL = self._createNewModelSQL();

    //返回一个promise对象 后面可以用链式
    return new Promise(function(){
        var promise = this;
        callback && (callback = promise.try(callback));
        self.ready(function () {
            modelSQL.fieldInfo(self._opts.fieldInfo);
            modelSQL.where.apply(modelSQL,args);
            var sql = modelSQL.deleteSQL();
            delete modelSQL;

            db.run(sql,self._trycatch(function(){
              if(callback) {
                callback.apply(promise);
              }else{
                promise.resolve();
              }
            }));
        });
    });
  },
  insert(){
    //插入
    var self = this;
    if(arguments.length == 0){
      return self;
    }
    var args = Array.prototype.slice.call(arguments);

    var db = self._db;
    var modelSQL = self._createNewModelSQL();

    //返回一个promise对象 后面可以用链式
    return new Promise(function() {
        var promise = this;
        var callback;
        if($.type(args[1]) == "function"){
            callback = promise.try(args[1]);
        }
        self.ready(function(){
          modelSQL.fieldInfo(self._opts.fieldInfo);
          var sql = modelSQL.insertSQL(args[0]);
          db.run(sql,self._trycatch(function(){
            if(self._priKey
              && self._opts.fieldInfo[self._priKey]["auto_increment"]){
              db.each("SELECT last_insert_rowid() as id",self._trycatch(function(){
                var id = arguments[0].id;
                if($.type(args[0]) == "object"){
                  args[0][self._priKey] = id;
                }else{
                  for (var i = 0; i < args[0].length; i++) {
                    var obj = args[0][i];
                    obj[self._priKey] = id++;
                  }
                }
              }));
            	if(callback){
              	callback.call(promise,args[0]);
            	}else{
              	promise.resolve(args[0]);
            	}
            }else{
            	if(callback){
              	callback.call(promise,args[0]);
            	}else{
              	promise.resolve(args[0]);
            	}
						}
          }));
        });
    });
  },
  list(){
    var self = this;
    var callback = null;
    var args = null;
    if($.type(arguments[arguments.length-1]) == "function"){
      args = Array.prototype.slice.call(arguments,0,arguments.length - 1);
      callback = arguments[arguments.length - 1];
    }else{
      args = Array.prototype.slice.call(arguments);
    }
    var db = self._db;

    var modelSQL = self._createNewModelSQL();

    //返回一个promise对象 后面可以用链式
    return new Promise(function(){
      var promise = this;
      callback && (callback = promise.try(callback));
      self.ready(function(){
        modelSQL.fieldInfo(self._opts.fieldInfo);
        modelSQL.where.apply(modelSQL,args);
        var sql = modelSQL.selectSQL();
        delete modelSQL;
        var jsonKey = {};
        for(var key in self._opts.fieldInfo){
          if(self._opts.fieldInfo[key].type.toLowerCase() == "json"){
            jsonKey[key] = true;
          }
        }
        db.all(sql,self._trycatch(function(){
          var result = arguments[0] || [];
          if($.type(result) == "array"){
            for(var key in jsonKey){
              $.each(result,function(){
                try{
                  this[key] && (this[key] = JSON.parse(this[key]));
                }catch(e){}
              });
            }
          }
          if(callback) {
            callback.apply(promise, arguments);
          }else{
            promise.resolve(arguments[0]);
          }
        }));
      });
    });
  },
  get(){
    var self = this;
    self.limit(1);
    var args = [];
    var callback = null;
    if($.type(arguments[arguments.length-1]) == "function"){
      args = Array.prototype.slice.call(arguments,0,arguments.length - 1);
      callback = arguments[arguments.length - 1];
    }else{
      args = Array.prototype.slice.call(arguments);
    }
    args[args.length] = function(rs){
      var result = null;
      if(rs && rs.length > 0){
        result = rs[0];
      }
      if(callback){
        callback.call(this,result);
      }else{
        this.resolve(result);
      }
    };
    return self.list.apply(self,args);
  },
  getSingle(){
    var self = this;
    self.limit(1);
    var args = [];
    var callback = null;
    if($.type(arguments[arguments.length-1]) == "function"){
      args = Array.prototype.slice.call(arguments,0,arguments.length - 1);
      callback = arguments[arguments.length - 1];
    }else{
      args = Array.prototype.slice.call(arguments);
    }
    args[args.length] = function(rs){
      var result = null;
      if(rs && rs.length > 0){
        result = rs[0];
        for(var key in result){
          result = result[key];
          break;
        }
      }
      if(callback){
        callback.call(this,result);
      }else{
        this.resolve(result);
      }
    };
    return self.list.apply(self,args);
  },
  listSingle(){
    var self = this;
    var args = [];
    var callback = null;
    if(util.type(arguments[arguments.length-1]) == "function"){
      args = Array.prototype.slice.call(arguments,0,arguments.length - 1);
      callback = arguments[arguments.length - 1];
    }else{
      args = Array.prototype.slice.call(arguments);
    }
    args[args.length] = function(rs){
      var result = [];
      if(rs && rs.length > 0){
        for(var i=0;i<rs.length;i++){
          for(var key in rs[i]){
            result.push(rs[i][key]);
            break;
          }
        }
      }
      if(callback){
        callback.call(this,result);
      }else{
        this.resolve(result);
      }
    };
    return self.list.apply(self,args);
  },
  count(){
    var self = this;
    self.field("count(*)");
    return self.getSingle.apply(self,arguments);
  },
};

$.each(ModelSQL.api,function(key,value){
  BaseModel.prototype[key] = function(){
    value.apply(this._modelSQL,arguments);
    return this;
  }
});

module.exports = BaseModel;
