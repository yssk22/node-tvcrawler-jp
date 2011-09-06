
/**
 * Module dependencies.
 */

var express = require('express');
var cron = require('cron');
var config = require('./lib/config');
var logger = config.logger;
// Configuration
var app = module.exports = express.createServer();
app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure("development", function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


var healthcheck = require('./lib/healthcheck');
var crawler     = require('./lib/crawler');

// ヘルスチェック用
app.get('/', function(req, res){
  healthcheck(function(err, result){
    if( err ){
      res.writeHead(500);
      res.end(JSON.stringify(err, null, 4));
    }else{
      res.writeHead(200);
      res.end(JSON.stringify(result, null, 4));
    }
  });
});

// オンデマンド実行する
app.post('/ondemand', function(req, res){
  var t = (req.body && req.body.date) ? Date.parse(req.body.date) : new Date();
  crawler({date: t}, function(err, job){
    if( err ){
      res.writeHead(403);
      res.end(JSON.stringify({
        error: 'forbidden',
        reason: err.reason || err.toString()
      }, null, 4));
    }else{
      res.writeHead(202);
      res.end(JSON.stringify(job, null, 4));
    }
  });
});

// クーロンの登録/実行
new cron.CronJob('0 0 */6 * * *', function(){
  crawler({date: new Date()}, function(err, job){
    if( err ){
      logger.error('CronJob fail: %s' + JSON.stringify(err, null, 4));
    }else{
      logger.info('CronJob succ: %s' + JSON.stringify(job, null, 4));
    }
  });
});

app.listen(config.port, function(){
  logger.info("Express server listening on port %d in %s mode",
              app.address().port, app.settings.env);
});
