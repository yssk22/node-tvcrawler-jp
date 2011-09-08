
/**
 * Module dependencies.
 */
function main(){
  var http = require('http');
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
  // 毎朝4時に直近一週間分(当日分は除く)のアップデート
  new cron.CronJob('00 00 4 * * *', function(){
    var i = 1;

    function crawl(){
      if( i < 7 ){
        var t = new Date();
        t.setTime(t.getTime() + 86400000 * i);
        crawler({date: t}, function(err, job){
          if( err ){
            logger.error('Update %s: fail - %s', t, JSON.stringify(err, null, 4));
          }else{
            logger.info('Update %s: succ - %s', t, JSON.stringify(job, null, 4));
          }
          i++;
          crawl();
        });
      }else{
        logger.info('Weekly programs have been updated.');
      }
    }
  });

  // 6時間毎に当日分の最新のアップデート
  new cron.CronJob('0 0 */6 * * *', function(){
    var t = new Date();
    crawler({date: t}, function(err, job){
      if( err ){
        logger.error('Update %s: fail - %s', t, JSON.stringify(err, null, 4));
      }else{
        logger.info('Update %s: succ - %s', t, JSON.stringify(job, null, 4));
      }
    });
  });

  app.listen(config.port, function(){
    logger.info("Express server listening on port %d in %s mode",
                app.address().port, app.settings.env);
  });

  // http.createServer(function(req, res){
  //   res.end('ok\n');
  // }).listen(process.env.VCAP_APP_PORT || 3000, function(){
  //   console.log('started');
  // });
}


require('./lib/resolveDependencies')(function(){
  main();
});

