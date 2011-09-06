var path = require('path');
var uuid = require('node-uuid');
var logger = require('./config').logger;
var jobdb = require('./config').database.jobs;
var programdb = require('./config').database.programs;

var running = false;

module.exports = function(options, callback){
  if( running ){
    return callback({
      error: 'forbidden',
      reason: 'already running'
    }, null);
  }

  var klass = require('./providers/sonet');

  var job = {
    _id: uuid(),
    type: 'crawler',
    provider: module.exports.provider,
    start: new Date(),
    status: 'processing'
  };

  var crawler = new klass(job);

  jobdb.save(job, function(err, res){
    if( err ){
      callback(err, null);
    }else{
      job._rev = res.rev;
      logger.info('Crawler[%s] started.', job._id);
      running = true;
      function jobEnd(){
        job.end = new Date();
        job.time_taken = (job.end - job.start) / 1000;
        if( job.error ){
          logger.error("Crawler[%s] Error: " + job.error.toString());;
          logger.error(job.error.stack);
        }
        logger.info('Crawler[%s] finished. (status = %s, time taken = %s).', job._id, job.status, job.time_taken);
        jobdb.save(job, function(err, res){
          running = false;
        });
      }

      crawler.run(options, function(err, result){
        if( err ){
          job.status = 'fail';
          job.error = err;
          jobEnd();
        }else{
          var idList = result.map(function(doc){
            return doc._id;
          });

          programdb.get(idList, function(err, res){
            for(var i in result){
              if( res[i].error === undefined ){
                // updated
                result[i]._rev = res[i].doc._rev;
              }
            }
            programdb.save(result, { allOrNothing: false }, function(err, res){
              if( err ){
                job.status = 'fail';
                job.error = err;
              }else{
                job.status = 'succ';
              }
              jobEnd();
            });
          });
        }
      });
      callback(err, job);
    }
  });
}
