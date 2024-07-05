# 知識で殴る

## 実行方法

`runServer.bat`をダブルクリックで実行できます。

`.bat`恐怖症の方か、windows以外の環境の方はターミナルで以下のコマンドを入力すると実行できます[^2]。
```cmd
> npm start
```

俺は`node`を使いたいんだ！！という方もいるかもしれません。
<br>
そのような方は以下のコマンドで実行できます[^2]。
```cmd
> node index.js
```

## 作成環境
`package.json`にすべて書いてあります。

node管理用に`volta`を導入しています。

IDEは`VSCode`を使用しています。

パッケージのインストールは
`npm install`で

`.env`の`MYSQL_USER`,`MYSQL_PASSWORD`,`MYSQL_DB`は例です。適宜変更してください。

## 使用パッケージ一覧
* `dotenv@latest`
  * `.env`を使う為に導入
* `express@latest`
  * 軽量で安定した動的webサーバ
* `express-session@latest`
  * `express`でセッションを使う為に導入
* `express-mysql-session@2.1.8`
  * `express-session`が`node:cluster`に対応していなかったのでそれ対策
* `express-rate-limit@latest`
  * DOS攻撃対策
* `@express-rate-limit/cluster-memory-store@latest`
  * `express-rate-limit`が`node:cluster`に対応(以下略)
* `express-slow-down@latest`
  * スロットリングで多量アクセス対策
* `ejs@latest`
  * `express`で使うテンプレートエンジン
* `body-parser@latest`
  * postリクエストをjsonで取得
* `compression@latest`
  * 通信でgzipを使用するため
* `node-cron@latest`
  * 定期実行用
* `mysql2@latest`
  * 最新版のMySQLを操作する用
* `bcrypt@latest`
  * パスワードハッシュ化用
* `seedrandom@latest`
  * seedを用いた乱数の生成用


[^1]: 最終更新が2019なので問題の鮮度が悪い
[^2]: 当然ですが、カレントディレクトリを`QuizProject`にしてください。
