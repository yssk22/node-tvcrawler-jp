sorry this program can be useful in Japan only. :P

# node-twcrawler-jp

Node.js で実装したTV番組表クローラーの参照実装です。某番組表のHTMLを巡回し、CouchDBに格納します。
(あくまで参照用のソースなので利用は自己責任でお願いします)

# ローカル環境での動かし方

    $ npm link
    $ node app.js

# Cloud Foundry での動かし方

Linux 64 bit マシンを用意します。

    $ npm link

を実行して、 node_modules 以下に依存モジュールをビルドします。その後 vmc push します。

    $ vmc push
    
(Linux 64 bit マシン以外で行うと、node-iconv モジュールが CloudFoundry上で正しく動作しなくなります)


# データベースの設定諸々

環境変数として定義して下さい。定義可能な環境変数の一覧は lib/config.js を参照して下さい。

ローカル環境で動かす場合はシェルの環境変数を使います。

例)

    $ COUCH_HOST=192.168.1.1 COUCH_USER=admin .... node app.js
    
CloudFoundryで動かす場合は vmc env-add で環境変数を定義します。

例)

    $ vmc env-add node-tvcrawler-jp COUCH_HOST=tvjp.cloudant.com

