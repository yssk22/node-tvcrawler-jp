var path = require('path');
var uuid = require('node-uuid');
var logger = require('./config').logger;
var jobdb = require('./config').database.jobs;
var programdb = require('./config').database.programs;

// ヘルスチェック用
module.exports = function(callback){
  // ひとまずDBの生死確認のみ

  // TODO: Crawler が admin 権限でアクセスしていること まで確認すべき
  jobdb.exists(function(err1, res1){
    programdb.exists(function(err2, res2){
       var result = {
         jobdb: res1,
         programdb: res2
       };
       if( res1 && res2 ){
         callback(null, result);
       }else{
         callback(result, null);
       }
     });
  });
}
