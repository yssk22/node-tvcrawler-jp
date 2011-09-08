var rimraf  = require('rimraf'),
    path = require('path'),
    fs  = require('fs');

// add-on modules
var cf_modules = ['iconv', 'jsdom'];

module.exports = function(cb){
  if( process.env.VCAP_APP_PORT ){
    // in cloud foundry
    // symlink to precompiled module
    ['iconv', 'jsdom'].forEach(function(m){
      try{
        rimraf.sync(path.join(__dirname, '../node_modules/', m));
      }catch(e){

      }
      fs.symlinkSync(path.join(__dirname, '../cf_modules/', m),
                     path.join(__dirname, '../node_modules/', m));
    });
    cb();
  }else{
    cb();
  }
}