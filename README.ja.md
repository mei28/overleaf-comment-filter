# Overleaf Comment Filter

[English](README.md)

Overleaf のレビューパネルにあるコメントを、時刻の順に並べ替える Tampermonkey 用のユーザースクリプトです。
overleaf.com で動きます。
パネルの 2 つのタブにある Overleaf 自身のコメントをそのまま並べ替えるので、返信や解決はいつもどおりに使えます。

![レビューパネルの見出しにある並べ替えメニュー](docs/images/menu.png)

この README の画像は、サンプルデータで作った説明用の画面です。

## できること

レビューパネルの見出しの、Resolved comments ボタンの左に並べ替えボタンが加わります。
並び順は次の 5 つから選べます。

- Document order (Overleaf 本来の表示。初期値)
- Latest reply first (最終返信が新しい順)
- Oldest reply first (最終返信が古い順)
- Newest comment first (コメントの作成が新しい順)
- Oldest comment first (コメントの作成が古い順)

選んだ並び順は、パネルの 2 つのタブの両方に反映されます。

- 「Current file」タブでは、本来は本文の行の横に並ぶコメントを、選んだ順の一覧にまとめます。一覧はパネルの上端に固定されます。
- 「Overview」タブでは、ファイルごとに、そのファイルの中のコメントを並べ替えます。

![最終返信の順に並べた Current file のコメント](docs/images/list.png)

Overleaf は、Current file のコメントのうち、本文で表示したことのある範囲の分しか描画しません。
全件を一覧にするため、スクリプトは文書を一度末尾までスクロールし、そのあと元の位置に戻します。
短い文書なら数秒で終わります。
その間はエディタの上に覆いが出て、クリックとキー入力を受け付けません。
本文に文字が入ってしまうことはありません。

![文書をスクロールしている間に出る覆い](docs/images/scan.png)

並べ替えボタンは、時刻の順を選んでいる間は緑色になります。
コメントを読み込んでいる間は薄く表示され、並べ替えに失敗したときは赤くなります。
失敗したときは、メニューに理由が表示されます。

## インストール

1. Chrome に [Tampermonkey](https://www.tampermonkey.net/) を入れます。
2. Tampermonkey がユーザースクリプトを動かせるようにします。
   - Chrome 138 以降では、`chrome://extensions` を開き、Tampermonkey の「詳細」で「ユーザー スクリプトを許可」をオンにします。
   - それより前の Chrome では、`chrome://extensions` の右上にある「デベロッパー モード」をオンにします。
3. 次のどちらかからスクリプトを入れます。
   - [Greasy Fork](https://greasyfork.org/ja/scripts/599335-overleaf-comment-filter) で「スクリプトをインストール」を押します。
   - GitHub の [overleaf-comment-filter.user.js](https://raw.githubusercontent.com/mei28/overleaf-comment-filter/main/dist/overleaf-comment-filter.user.js) を開き、Tampermonkey が表示する画面でインストールのボタンを押します。
4. すでに開いていた Overleaf のタブを再読み込みします。

### 更新

更新は自動です。
Tampermonkey が、スクリプトを入れた配布元で定期的に新しい版を確認し、見つかれば入れ替えます。
Greasy Fork には、このリポジトリで公開した版が取り込まれます。
すぐに更新したいときは、Tampermonkey のメニューから「Check for userscript updates」を選びます。
(Tampermonkey の項目名は英語表示のものです。)

## 使い方

1. overleaf.com でプロジェクトを開きます。
2. 左端のアイコン列から、レビューパネルを開きます。
3. 並べ替えボタン (受信箱アイコンの左) を押し、並び順を選びます。
4. 元の表示に戻すときは「Document order」を選びます。

時刻の順を選んだまま別のファイルを開くと、そのファイルでも同じように文書を一度スクロールしてから一覧にします。

## 制限

- 対応しているのは overleaf.com の現行のエディタだけです。
- このスクリプトは、公開 API ではない Overleaf の内部に頼っています。頼っているのは、Overleaf が拡張機能向けに置いている `window.overleaf.unstable.store`、コメント要素に付いている React の内部データ、レビューパネルのクラス名の 3 つです。Overleaf の更新で並べ替えが動かなくなることがあります。その場合はメニューに理由を表示し、Overleaf 本来の表示のままにします。
- Current file での全件の読み込みは、タブが前面に出ていないと進みません。文書の画面 1 枚分あたり、約 0.2 秒かかります。
- Overview タブでは、折りたたまれたファイルのコメントを Overleaf が描画しません。ファイルを展開すると並べ替えられます。
- 変更履歴 (tracked changes) の項目は、コメントの後ろに Overleaf の順のまま並びます。
- 「最終返信」は、スレッドの中でいちばん新しいメッセージの時刻です。メッセージの編集は数えません。

## プライバシー

スクリプトはブラウザの中だけで動きます。
読み取るのは `GET /project/{id}/threads` (Overleaf のレビューパネル自身が使う通信) だけで、ログイン中のセッションをそのまま使います。
ほかの送信先にデータを送ることはなく、プロジェクトに書き込むこともありません。

## 開発

Node.js 24、pnpm、[just](https://github.com/casey/just) が必要です。

```sh
just install      # 依存パッケージを入れる
just test         # テストを実行する
just check        # lint、型検査、テスト、ビルド。コミット前に通す
just watch        # 変更のたびに .dev-dist/ を作り直す
just dist         # 配布用のファイルを dist/ に作る
just screenshots  # docs/screenshots/mock.html から docs/images/ の画像を作る
```

### ブラウザで変更を試す

overleaf.com のコンテンツセキュリティポリシー (CSP) は、ローカルの開発サーバーから読み込むスクリプトを止めます。
そのため Vite の開発サーバーは使わず、監視ビルドの結果をファイルとして読み込みます。

1. `just watch` を実行します。
2. `chrome://extensions` で Tampermonkey の「詳細」を開き、「ファイルの URL へのアクセスを許可する」をオンにします。
3. インストール済みのスクリプトを無効にし、次の読み込み用スクリプトを Tampermonkey に追加します。パスは手元のリポジトリの場所に書き換えてください。

   ```js
   // ==UserScript==
   // @name         Overleaf Comment Filter (dev)
   // @namespace    https://github.com/mei28/overleaf-comment-filter
   // @version      0.0.0
   // @match        https://www.overleaf.com/project/*
   // @grant        none
   // @run-at       document-idle
   // @noframes
   // @require      file:///path/to/overleaf-comment-filter/.dev-dist/overleaf-comment-filter.user.js
   // ==/UserScript==
   ```

4. ビルドし直すたびに、Overleaf のタブを再読み込みします。古い版が使われ続けるときは、Tampermonkey の設定で「Config mode」を「Advanced」にし、「Externals」の「Update Interval」を「Always」にします。

### Overleaf が変わったとき

Overleaf の画面についての前提は、すべて `src/overleaf/` にあります。
エラーメッセージには、合わなくなったセレクタ、store の値、フィールドの名前が出ます。

- API の応答が変わったとき: `test/fixtures/` の合成データを新しい形に直し、`just test` でデコーダのテストが失敗することを確かめてから、`src/api/` のデコーダを直します。実際の応答はコミットしないでください。共著者の名前、メールアドレス、コメントが含まれています。
- 画面が変わったとき: `src/overleaf/selectors.ts` など `src/overleaf/` のファイルと、Overleaf の markup を写したテストを直します。

### リリース

1. `package.json` の `version` を上げます。Tampermonkey は版が上がったときだけ更新します。
2. `just check` と `just dist` を実行します。
3. `dist/` をコミットし、`main` に push します。

## ライセンス

MIT
