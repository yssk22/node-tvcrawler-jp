/**
 * So-net TV program library
 *
 * http://tv.so-net.ne.jp/ のURLから、番組表を解析し、JSON形式のデータ変換を行う。
 *
 * @author Yohei Sasaki <yssk22@gmail.com>
 */
var querystring = require('querystring'),
    url = require('url'),
    http = require('http');
var jsdom = require('jsdom'),
    jquery = require('jquery'),
    Iconv = require('iconv').Iconv,
    BufferList = require('bufferlist').BufferList;
var logger = require('../config').logger;

var IEPG_RE_LINK = /iepg\.tvpi\?id\=(\d+)$/;
var IEPG_NEWLINE = '\r\n';
var IEPG_RE_HEADER = /([^:]+):\s*(.+)\r\n/g;

var BASE_URL = 'http://tv.so-net.ne.jp';

module.exports = exports = function Crawler(options){
  this.options = jquery.extend({}, options);
  this.stats = {};
};

exports.prototype = {
  /**
   * クローラーを実行する
   *
   * @param {Object} options 実行オプション
   *
   * 実行オプションには次のフィールドを与える
   *
   * area - エリアID (デフォルト:23 (東京))
   * date - 対象日 (デフォルト: 現在の日付)
   *
   */
  run: function(options, callback){
    var self = this;
    options = jquery.extend({
      area: 23,
      date: new Date()
    }, options);
    var scheduleUrl = self.getScheduleUrl(options.area, options.date);
    logger.debug("ScheduleURL: %s", scheduleUrl);
    http_get(scheduleUrl, function(err, content){
      if( err ){
        callback(err);
      }else{
        logger.debug("Processing extractProgramIds ...");
        self.extractProgramIds(content.toString('utf-8'), function(err, idList){
          if( err ){
            callback(err);
          }else{
            // for debug
            // idList = [idList[0]];

            logger.debug("Found %d program entries.", idList.length);
            var waits = idList.length;
            var result = [];
            (function process(){
              if( idList.length > 0 ){
                var programId = idList.pop();
                self.processId(programId, function(err, doc){
                  if( err ){
                    // ignore error.
                  }else{
                    result.push(doc);
                  }
                  // wait for all done, then callback
                  waits--;
                  logger.debug("Finished processId('%s'). Remains: %d.", programId, waits);
                  if( waits === 0 ){
                    logger.debug("All processes have been finished.");
                    callback(null, result);
                  }
                });
                if( idList.length > 0 ){
                  setTimeout(function(){ process(); }, 1000);
                }else{
                  logger.debug("All processes have been registered.");
                }
              }
            })();
          }
        });
      }
    });

  },

  /**
   * 指定されたIDのプログラムを処理する
   *
   * @param id {String} プログラムID
   * @param callback {Function} コールバック関数 function(err, doc)
   *
   */
  processId: function(id, callback){
    var self = this;
    var htmlUrl = this.getHTMLUrl(id);
    var iepgUrl = this.getIEPGUrl(id);
    var result = {};
    function done(){
      if( result.program && result.iepg ){
        var err = result.program.error || result.iepg.error;
        if( err ){
          callback(err);
        }else{
          // console.log(JSON.stringify(result.program.attrs, null, 4));
          var doc = jquery.extend({
            _id: 'sonet:' + id,
            href: {
              iepg: iepgUrl,
              html: htmlUrl
            }
          }, result.iepg.iepg.headers, result.program.attrs);
          callback(null, doc);
        }
      }
    }

    http_get(htmlUrl, function(err, content){
      if( err ){
        result.program = { error: err };
        done();
      }else{
        self.extractPropsFromHTML(content.toString('utf-8'), function(err, attrs){
          result.program = {
            error: err, attrs: attrs
          };
          done();
        });
      }
    });
    http_get(iepgUrl, function(err, content){
      if( err ){
        result.iepg = { error: err };
        done();
      }else{
        self.extractPropsFromIEPG(content, function(err, iepg){
          result.iepg = {
            error: err, iepg: iepg
          };
          done();
        });
      }
    });
  },

  /**
   * 放送エリアIDと日付からスケジュールのURLを取得する
   *
   * @param area {String} 放送エリアID (doc/area-id-list.txt 参照)
   * @param date {Date} 日付
   *
   */
  getScheduleUrl: function(area, date){
    // sample
    // http://tv.so-net.ne.jp/chart/23.action?head=201107240500&span=24&iepgType=0
    function _(n){
      if( n < 10 ){
        return "0" + n;
      }else{
        return n;
      }
    }
    return BASE_URL + '/chart/' + area + '.action?' + querystring.stringify({
      head : date.getFullYear() + _(date.getMonth() + 1) + _(date.getDate()) + "0400",
      span : 24
    });
  },

  /**
   * 指定したプログラムIDからIEPGコンテンツのURLを取得する
   *
   * @param {String} id プログラムID
   *
   */
  getIEPGUrl: function(id){
    if( !id.match(/\d+/) ){
      throw new TypeError("Invalid ID format: " + id);
    }
    return BASE_URL + '/iepg.tvpi?id=' + id;
  },

  /**
   * 指定したプログラムIDからHTMLコンテンツのURLを取得する
   */
  getHTMLUrl: function(id){
    if( !id.match(/\d+/) ){
      throw new TypeError("Invalid ID format: " + id);
    }
    return BASE_URL + '/schedule/' + id + '.action';
  },


  /**
   * 取得したIEPGコンテンツからプロパティを抽出する
   *
   */
  extractPropsFromIEPG: function parseIEPG(content, callback){
    if( content instanceof Buffer ){
      // convert stream from sjis to utf8;
      content = (new Iconv('Shift-JIS', 'UTF-8')).convert(content).toString();
    }else if( content.constructor.name == 'BufferList' ){
      content = (new Iconv('Shift-JIS', 'UTF-8')).convert(content).toString();
    }else if( typeof(content) === 'string' ){
      // nothing to do
    }else{
      throw new TypeError('content must be string or Buffer, given ' + typeof(content));
    }

    var tmp = content.split(IEPG_NEWLINE + IEPG_NEWLINE);
        var header = tmp[0], body = tmp[1];
    var kv = {};
    while(IEPG_RE_HEADER.exec(content)){
      var key = RegExp.$1, val = RegExp.$2;
      if( key.toLowerCase() === 'content-type' ){
        // skip
      }else{
        kv[key] = val;
      }
    }
    callback(null, {
      headers: kv, body: body
    });
  },

  /**
   * 取得したページコンテンツからプログラムIDを抽出する
   *
   * @param {String} content ページコンテンツ
   * @param {Function} callback コールバック関数 function(err, idList)
   *
   */
  extractProgramIds: function(content, callback){
    try{
      var $ = jquery.create(jsdom.jsdom(content).createWindow());
      var ids = [];
      $('a[name="iepg-button"]').each(function(){
        var href = $(this).attr('href');
        if( href && href.match(IEPG_RE_LINK)){
          ids.push(RegExp.$1);
        }
      });
      callback(null, ids);
    }catch(err){
      callback(err);
    }
  },

  /**
   * 取得したHTMLコンテンツからプロパティを抽出する
   *
   * @param {String} content プログラムコンテンツ
   * @param {Function} callback コールバック関数 function(err, properteis)
   *
   */
  extractPropsFromHTML : function(content, callback){
    try{
      var $ = jquery.create(jsdom.jsdom(content).createWindow());
      var properties = {
        description: '',
        detail_description: '',
        genre: [],
        people: []
      };
      $('div.utileSetting dl.basicTxt dd a').each(function(){
        var self = $(this);
        var href = self.attr('href');
        if( href.match(/\/schedulesBySearch\.action\?condition\.genres\[0\]\.id\=/) ){
          properties.genre.push({
            name: self.text(),
            href: BASE_URL + href
          });
        }
      });
      $('div.subUtileSetting h3').each(function(){
        var self = $(this);
        switch(self.text()){
        case '番組概要':
          properties.description = self.next().text();
          break;
        case '番組詳細':
          properties.detail_description = self.next().html();
          break;
        case '人名リンク':
          $('a', self.next()).each(function(){
            var self = $(this);
            properties.people.push({
              name: self.text(),
              href: BASE_URL + self.attr('href')
            });
          });
          break;
        default:
          break;
        }
      });
      callback(null, properties);
    }catch(err){
      callback(err);
    }
  }
};

// HTTP GET utility
function http_get(location, callback){
  var ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.6; rv:5.0.1) Gecko/20100101 Firefox/5.0.1';
  var _url = url.parse(location);
  var options = {
    host: _url.host,
    path: _url.pathname + (_url.search || ''),
    headers: {
      'Host': _url.host,
      'User-Agent': ua
    }
  };
  http.get(options, function(res){
    var body = new BufferList();
    res.on('data', function(chunk){
      body.push(chunk);
    });
    res.on('end', function(){
      if( res.statusCode == 200 ){
        callback(null, body.join(), res);
      }else{
        var e = new Error('Invalid status code: ' + res.statusCode + " (URL: " + location + ")");
        e.headers = res.headers;
        e.statusCode = res.statusCode;
        e.body = body.join();
        callback(e);
      }
    });
  }).on('error', function(e){
    callback(e);
  });
}
