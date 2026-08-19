# おまつり ねこジグソーパズル

地域のお祭りで、iPad を使って遊ぶ子供向けのねこ写真ジグソーパズルです。

## 方針

- 小さな子供にも分かりやすい、タップ中心の操作にする
- サーバー、ログイン、個人情報の収集は使わない
- IT会社の仕事を紹介できるよう、制作の過程も展示する
- まずはインターネット接続なしでも動く、シンプルなWebアプリとして作る

## 開き方

`index.html` をSafariで開くと動作を確認できます。開発用サーバーを使う方法は、実装が進んだ段階で追加します。

## 記録

制作の判断と手順は [docs/PROJECT_LOG.md](docs/PROJECT_LOG.md) に追記します。実装の仕様は [docs/APP_SPECIFICATION.md](docs/APP_SPECIFICATION.md) を参照してください。

猫写真は `public/images/cat-images/` に配置し、選択画面に表示する写真は `public/data/cat-images.csv` で管理します。
