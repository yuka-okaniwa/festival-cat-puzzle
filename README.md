# ねこパズル

地域のお祭りで、iPad を使って遊ぶ子供向けのねこ写真ジグソーパズルです。

## 方針

- 小さな子供にも分かりやすい、ドラッグ中心の操作にする
- サーバー、ログイン、個人情報の収集は使わない
- IT会社の仕事を紹介できるよう、制作の過程も展示する
- 会場内の簡易Webサーバーで動く、シンプルなWebアプリとして作る

## 開き方

Dockerを使う場合は、プロジェクトフォルダで次のコマンドを実行します。

```bash
docker compose up --build
```

Macでは `http://localhost:8080` を開きます。iPadでは、Macと同じWi-Fiへ接続し、MacのIPアドレスに `:8080` を付けてSafariで開きます。たとえばMacのIPアドレスが `192.168.1.20` なら、開くURLは `http://192.168.1.20:8080` です。

終了するときは、起動したターミナルで `Ctrl + C` を押します。バックグラウンドで起動した場合は、`docker compose down` で停止します。

## 記録

制作の判断と手順は [docs/PROJECT_LOG.md](docs/PROJECT_LOG.md) に追記します。実装の仕様は [docs/APP_SPECIFICATION.md](docs/APP_SPECIFICATION.md) を参照してください。

猫写真は `/public/images/cat-images/` に配置し、選択画面に表示する写真は `public/data/cat-images.json` で管理します。
