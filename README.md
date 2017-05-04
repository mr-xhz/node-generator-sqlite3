# node-generator-sqlite3

## 概述
1. 这是一个让你可以远离大部分SQL语句拼接的模块
2. 这是一个支持多个数据源

## 版本
v1.0.0 基础功能的支持 [v1.0.0](https://github.com/mr-xhz/node-generator-sqlite3)

    1.增删改查样样都有
    3.支持多个数据源配置

## 安装
先安装吧，骚年。

由于还没有放到npm上面，所以现在只能通过手动去安装，找到本模块的git [v1.0.0]:https://github.com/mr-xhz/node-generator-sqlite3.git 地址，clone一下，然后在本地执行一下：

```sh
$ npm install
```

安装本模块的sqlite3依赖。

## 开始使用

### 配置
```javascript
var sqlite3 = require("node-generator-sqlite3");

var path = require("path");
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
});

```
配置完成之后直接连接

```javascript
sqlite3.init();
```

也可以

```javascript
sqlite3.configure(...).init();
```

### model初始化

```javascript
//userModel.js
var sqlite3 = require("node-generator-sqlite3");

function UserModel(){

}

UserModel.prototype = sqilte3.createModel({
  table:"user",
  desc:"测试用的库",
  priKey:"user_id",
  fieldInfo:{
    "user_id":{
        "type":"INTEGER",
        "not_null":true,
        "auto_increment":true,
        "key":"PRIMARY KEY"
    },
    "user_name":{
        "type":"TEXT",
        "not_null":true
    },
    "status":{
        "type":"JSON"
    }
  },
  version:1
});

var fn = {

};


for(var key in fn){
  UserModel.prototype[key] = fn[key];
}

module.exports = new UserModel();

```

OK 配置结束，开始愉快的使用吧

### 我是例子
假设有一张表 user

|字段名|类型|是否主键|
|:----|:--|:--|
|user_id|int(11)|Y|
|user_name|varchar(20)|N|
|status|varchar(200)|N|

1. 增(会过滤掉不存在的字段,并且返回自增长id)
```javascript
  var userModel = require("./model/userModel.js");
  var user = {
    user_name:"小明",
    status:{
      key1:"key1"
    },
    no_column:"no_column" //这个字段在插入的时候会被过滤掉
  };
  userModel.insert(user,function(rs){
    console.log(rs.user_id);
  });
  //还可以用promise
  userModel.insert(user).then(function(rs){
    console.log(rs.user_id);
    this.resolve(rs);
  }).then(function(rs){
    console.log(rs);
    this.resolve(rs);
  }).catch(function(e){
    console.error(e);
  }).finally(function(){
    console.log(user.user_id);
  });
  //还可以批量插入
  userModel.insert([{
    user_name:"小明"
  },{
    user_name:"小红"
  }],function(rs){
    rs.forEach(function(item,index){
      console.log(item.user_id);
    });
  });
```
2. 删
```javascript
var userModel = require("./model/userModel.js");
userModel.where("user_id",1).delete();
//同上可以使用promise，关于where 的高级用法放最后面去讲
```
3. 改
```javascript
var userModel = require("./model/userModel.js");
userModel.update({
  user_id:1,
  user_name:"小红"
});
//同insert 这个可以做批量更新，例子我就不写了
```
4. 查(OK,来到了使用最多的查 所有的方法都可以使用promise)
```javascript
var userModel = require("./model/userModel.js");

//列表查询
userModel.where("status",1).list(function(rs){
  //在这里做一些异步的处理
  this.resolve(rs);
}).then(function(rs){
  console.log(rs);
});
//单个
userModel.where("user_id",1).get(function(rs){
  console.log(rs);
});
//多个限制条件
userModel.orderBy("user_id DESC").groupBy("user_id").limit(0,20).list(function(rs){
  console.log(rs);
});
//获取数量
userModel.count(function(count){
  console.log(count);
});
//获取单个属性列表
userModel.field("user_name").listSingle(function(rs){
  console.log(rs);
});
//获取单个属性
userModel.field("user_name").where("user_id",1).getSingle(function(user_name){
  console.log(user_name);
});
```
5. 接下来就是where条件的大合集了
```javascript
var userModel = sqlite3.model("user");
//WHERE user_id = 1
userModel.where("user_id",1);
//WHERE user_id > 1
userModel.where("user_id",1,">");
//WHERE user_id IN (1,2)
userModel.where("user_id",[1,2],"in");
//WHERE user_id BETWEEN 1 AND 2
userModel.where("user_id",[1,2],"between");
userModel.where("user_id","1,2","between");
//WHERE user_name LIKE %小%
userModel.where("user_name","小","%");
userModel.where("user_name","%小%","like");
//WHERE user_name LIKE %小
userModel.where("user_name","小","%_");
userModel.where("user_name","%小","like");
//WHERE user_name LIKE 小%
userModel.where("user_name","小","_%");
userModel.where("user_name","小%","like");
//WHERE user_name IS null
userModel.where("user_name",null,"IS");
//WHERE user_name IS NOT null
userModel.where("user_name",null,"IS NOT");
//WHERE user_id = 1 AND status = 1
userModel.where("user_id",1).where("status",1);
//WHERE user_id = 1 OR status = 1
userModel.where("user_id",1).or("status",1);
userModel.where("user_id",1).where("status",1,"or");
//WHERE (user_id = 1 OR status = 1) AND user_id = 1
var modelWhereList = sqlite3.modelWhereList();
modelWhereList.where("user_id",1).or("status",1);
userModel.where(modelWhereList).where("user_id",1);
```
