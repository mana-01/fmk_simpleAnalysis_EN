# fmk_simpleAnalysis_EN
Simple body and color type analysis in EN
# ふくみっけ診断

パーソナルカラーと骨格診断を行うWebアプリケーション

## セットアップ

1. リポジトリをクローン
```bash
git clone [your-repository-url]
cd fukumikkeSimpleAnalysis
```

2. 設定ファイルの準備
```bash
cp config.example.js config.js
```

3. `config.js`を編集し、必要な設定を行う
- `API_URL`: Google Apps ScriptのデプロイURLを設定

## 開発環境の起動

1. ローカルサーバーの起動
```bash
# 例：Python3の場合
python3 -m http.server 8000
```

2. ブラウザで以下のURLにアクセス
```
http://localhost:8000
```

## セキュリティ注意事項

- `config.js`には機密情報が含まれるため、Gitリポジトリにコミットしないでください
- 本番環境では適切なセキュリティ対策を実施してください

## ライセンス

All Rights Reserved