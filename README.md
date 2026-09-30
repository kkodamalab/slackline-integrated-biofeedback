# Slackline Integrated Biofeedback

スラックライン研究用のバイオフィードバックWebプロトタイプです。SQアプリ `visual-biofeedback-vbf-pc-2-2` のPeerJS/WebRTC・QR接続と、SLアプリ `slackline-posture-demo` の身体軸表示を組み合わせています。

## 構成

- `index.html` / `app.js`: PCホスト画面。模擬データ、PCカメラA/B、BF切替、CSV/JSON出力、A/B QR生成。
- `camera-runtime.js`: MediaPipe Tasks Vision 0.10.35の動的初期化、PCカメラ、33点ランドマーク、visibility、推定状態。
- `capture.html` / `capture.js`: SQアプリと同じPeerJS 1.5.5方式のスマートフォン撮影ページ。A/B識別、前面・背面切替、MediaPipe推定結果送信。
- `styles.css`: 既存統合アプリのレイアウトを維持。SQアプリの配色・カード構成を参照。

身体軸は左右肩中点から左右骨盤中点へのベクトルとして定義し、画像鉛直との差を傾斜角とします。側方膝角度は股関節・膝・足首の内角です。座標はMediaPipeの正規化画像座標で、実寸ではありません。

## 実行・制約

HTTPSまたはローカルHTTPサーバーで配信してください。MediaPipe、モデル、PeerJSはCDNから取得します。スマートフォン2台の実機接続、カメラ権限、ブラウザごとのMediaPipe実行はこの環境では未検証です。接続先Peerが存在しない場合やCDN取得失敗時は画面にエラーを表示し、模擬データと実測データを混在させません。

## 開発・公開フロー

1. Codex Cloudで実装・テストします。
2. GitHub Pull Requestで変更内容をレビューします。
3. PR承認後にmainへマージします。
4. 既存のGitHub Pages公開設定を維持します。

## 検証

`node --check app.js`、`node --check camera-runtime.js`、`node --check capture.js`、既存の位相テスト（0/90/180度）は実行済みです。実機スマートフォン2台、実カメラのMediaPipe検出、Pages反映は未検証です。
