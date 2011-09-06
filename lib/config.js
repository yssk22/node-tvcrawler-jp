
var logger = require('log4js').getLogger();
if( process.env.NODE_ENV === 'production' ){
  logger.setLevel('INFO');
}else{
  logger.setLevel('ALL');
}

var secure = process.env.COUCH_USE_SECURE === 'true';

var Couch = new (require('cradle').Connection)({
  host: process.env.COUCH_HOST || 'localhost',
  port: process.env.COUCH_PORT || (secure ? 443 : 5984),
  secure: secure,
  auth: {
    username: process.env.COUCH_USER || 'admin',
    password: process.env.COUCH_PASS || 'password'
  }
});


module.exports = {
  port: process.env.VCAP_APP_PORT || 3000,
  logger: logger,

  database: {
    programs: Couch.database(process.env.DB_PROGRAMS || 'programs'),
    jobs:     Couch.database(process.env.DB_JOBS     || 'jobs')
  }
}