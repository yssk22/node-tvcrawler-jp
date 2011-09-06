var assert = require('assert'),
    path = require('path'),
    fs = require('fs');
var crawler = new (require('../../lib/providers/sonet.js'))();

module.exports = {
  // "test processId": function(){
  //   crawler.processId('101040201107300930', function(err, doc){
  //     if( err ){
  //       console.log(err);
  //     }else{
  //       console.log(doc);
  //     }
  //   });
  // },

  "test getScheduleUrl": function(){
    var url = crawler.getScheduleUrl(23, new Date(2011, 1, 22));
    assert.eql(url, 'http://tv.so-net.ne.jp/chart/23.action?head=201102220400&span=24');
  },

  "test getIEPGUrl": function(){
    var url = crawler.getIEPGUrl('123608201107300400');
    assert.eql(url, 'http://tv.so-net.ne.jp/iepg.tvpi?id=123608201107300400');
  },

  "test getHTMLUrl": function(){
    var url = crawler.getHTMLUrl('123608201107300400');
    assert.eql(url, 'http://tv.so-net.ne.jp/schedule/123608201107300400.action');
  },

  "test extractProgramIds": function(){
    fs.readFile(__dirname + '/../fixtures/sonet-schedule.html', function(err, data){
      assert.isNull(err);
      crawler.extractProgramIds(data.toString(), function(err, ids){
        assert.isNull(err);
        assert.ok(Array.isArray(ids));
        assert.eql(ids[0], '101024201107250300');
        assert.eql(ids.length, 370);
      });
    });
  },

  "test extractPropsFromHTML": function(done){
    fs.readFile(__dirname + '/../fixtures/sonet-program.html', function(err, data){
      assert.isNull(err);
      crawler.extractPropsFromHTML(data.toString(), function(err, attrs){
        assert.isNull(err);
        assert.isNotNull(attrs.genre);
        assert.eql([ { name: 'バラエティー',
                       href: 'http://tv.so-net.ne.jp/schedulesBySearch.action?condition.genres[0].id=105000&stationPlatformId=0' },
                     { name: '旅バラエティ',
                       href: 'http://tv.so-net.ne.jp/schedulesBySearch.action?condition.genres[0].id=105105' },
                     { name: 'ドキュメンタリー／教養',
                       href: 'http://tv.so-net.ne.jp/schedulesBySearch.action?condition.genres[0].id=108000&stationPlatformId=0' },
                     { name: '歴史・紀行',
                       href: 'http://tv.so-net.ne.jp/schedulesBySearch.action?condition.genres[0].id=108101' } ],
                   attrs.genre);
        assert.isNotNull(attrs.people);
        assert.eql([ { name: 'かとうかず子',
                       href: 'http://tv.so-net.ne.jp/schedulesBySearch.action?condition.keyword=%E3%81%8B%E3%81%A8%E3%81%86%E3%81%8B%E3%81%9A%E5%AD%90&stationPlatformId=0&from=schedule' },
                     { name: '滝口順平',
                       href: 'http://tv.so-net.ne.jp/schedulesBySearch.action?condition.keyword=%E6%BB%9D%E5%8F%A3%E9%A0%86%E5%B9%B3&stationPlatformId=0&from=schedule' } ] ,
                   attrs.people);
        assert.eql('\r\n\t\t\t\t\t\t\t\t\t【旅人】かとうかず子  【ナレーター】滝口順平<br><br>\r\n\t\t\t\t\t\t\t\t\tかとうかず子が半蔵門線と田園都市線でぶらり!▽もやしにこだわる料理店!麺がもやしのラーメン?▽味も香りもコーヒーの白いプリン▽美智子様も使っている?希少なメタルビーズバッグ▽爆笑!90歳の野菜ばあちゃん毒舌にかとう撃沈!▽ゴミにならない!食べられるフードカップ▽青山で超便利!授乳服発見▽金魚?カエル?動く!生物の万華鏡▽次回予告!香田晋の銀座線!冷やし石焼き茶漬け&amp;本格ところてん&amp;日本橋川クルーズ<br><br>\r\n\t\t\t\t\t\t\t\t\t【番組テーマ曲】「Lien～選ばれし絆～」青木隆治  【番組BGM】外山和彦<br><br>\r\n\t\t\t\t\t\t\t\t\t【制作協力】日テレ　アックスオン<br><br>\r\n\t\t\t\t\t\t',
                   attrs.detail_description);
        assert.eql('もやし料理の珍品▽希少!メタルビーズのバッグ▽爆笑!90歳野菜おばあちゃん▽食べられる海苔フードカップ▽白い!コーヒープリン▽超便利!授乳服▽動く!生物の万華鏡',
                   attrs.description);
        // process.exit(0);
      });
    });
  },

  "test extractPropsFromIEPG": function(){
    fs.readFile(__dirname + '/../fixtures/iepg-drama.tvpid', function(err, data){
      assert.isNull(err);
      crawler.extractPropsFromIEPG(data, function(err, iepg){
        assert.isNull(err);
        assert.eql(iepg.headers['station-name'], 'フジテレビ');
        assert.eql(iepg.headers['program-title'], '全開ガール　#03[字][S][デ]');
        assert.eql(iepg.body, '“キス"をしたことを認めてから、お互いを意識しあうようになった若葉と草太の二人。そんな二人に恋のライバルも出現!果たして泥んこ遊びで二人の恋は発展するのか!?');
      });
    });
  }
}
