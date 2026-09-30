# Slackline Integrated Biofeedback

スラックライン研究用のバイオフィードバックWebプロトタイプです。SQアプリ `visual-biofeedback-vbf-pc-2-2` のPeerJS/WebRTC・QR接続と、SLアプリ `slackline-posture-demo` の身体軸表示を組み合わせています。

## 構成

- `index.html` / `app.js`: PCホスト画面。模擬データ、Camera 1/2、BF切替、CSV/JSON出力、Device 1/2 QR生成。
- `camera-runtime.js`: MediaPipe Tasks Vision 0.10.35の動的初期化、PCカメラ、33点ランドマーク、visibility、推定状態。
- `capture.html` / `capture.js`: SQアプリと同じPeerJS 1.5.5方式のスマートフォン撮影ページ。A/B識別、前面・背面切替、MediaPipe推定結果送信。
- `styles.css`: 既存統合アプリのレイアウトを維持。SQアプリの配色・カード構成を参照。

## 計測定義

座標はMediaPipe Poseの画像正規化座標（左上原点、右向きが +x、下向きが +y）です。左右は鏡像画面の見た目ではなく、MediaPipeの被験者の解剖学的左右（左手首 15、右手首 16、左足首 27、右足首 28）です。

- **頭部代表点**: 鼻（0）・左耳（7）・右耳（8）のうち visibility が 0.5 以上の点の重心。利用可能な点がなければ欠損です。
- **頭部身体軸**: 頭部代表点から左右股関節（23, 24）中点への線。画像鉛直下向きを 0° とし、下端（骨盤）が画像右へ傾く向きを正とします。
- **従来身体軸**: 左右肩（11, 12）中点から左右股関節中点への線。同じ符号規約を使います。
- **膝角度**: 股関節・膝・足首が作る内角。左右を独立に算出します。
- **速度**: 単調増加時刻の差を使った正規化 y 座標の差分（normalized-coordinate/s）。

必要なランドマークの visibility が 0.5 未満なら値を `null`（欠損）にします。相対位相は左右手首 y の不規則時刻系列を中央値サンプリング間隔へ線形補間し、平均除去後の離散Hilbert変換から瞬時位相を求めます。位相差は `left - right` を −180°〜180°へ折り返します。短い窓、70%未満の有効標本、または低振幅では算出しません。

## 実験操作と記録

Camera 1 / Camera 2 は撮影方向を意味しない独立した入力枠です。各枠の Source には `PC Camera`、QRから接続する `Device 1`、`Device 2` のいずれも選択できます。同じスマートフォンを両枠へ表示することもできますが、ブラウザの同一ローカルカメラ競合を避けるため `PC Camera` は同時に一枠だけ使用します。Device 1/2 の識別は既存のPeerJS/WebRTC接続メタデータ A/B を維持し、表示先だけをSource設定で割り当てます。

波形はVARIABLESで選択した対応済み時系列を表示します。Absoluteは実測単位（Auto rangeまたはY min/max）、RelativeはWindow startまたはTrial startからの差、Standardizedは現在窓の平均・標準偏差によるZ-scoreです。標準偏差0または標本不足は描画しません。Absoluteで異なる単位を同時選択した場合は、誤解を招く共通軸へ重ねず警告します。Y軸モード、range、baseline、標準化方式、seriesはCSV各行のBF settingsおよびJSON settingsに保存されます。

`index.html` が唯一のPC操作画面です。WHEN（No BF / Concurrent / Terminal）、WHAT（KR / KP）、情報量、提示方法、複数の計測変数、左右、目標と許容範囲を試行ごとに設定します。No BFでも計測記録は継続します。Terminalは停止時に試行要約を表示します。Exploratory は研究上の定義が確定していないため選択肢として提供していません。

CSV/JSONにはセッションID、試行メタデータ、実時刻、単調増加時刻、入力元とカメラ情報、測定値、欠損、信頼性、鮮度、A/B時刻差およびBF設定を保存します。「計測開始」は前試行のメモリ上の標本を消去してから新しい試行を始めるため、試行間で混在しません。必要な試行は次の試行開始前にダウンロードしてください。

## 実行・制約

HTTPSまたはローカルHTTPサーバーで配信してください。MediaPipe、モデル、PeerJSはCDNから取得します。スマートフォン2台の実機接続、カメラ権限、ブラウザごとのMediaPipe実行はこの環境では未検証です。接続先Peerが存在しない場合やCDN取得失敗時は画面にエラーを表示し、模擬データと実測データを混在させません。

## 開発・公開フロー

1. Codex Cloudで実装・テストします。
2. GitHub Pull Requestで変更内容をレビューします。
3. PR承認後にmainへマージします。
4. 既存のGitHub Pages公開設定を維持します。

## 検証

`node --check app.js`、`node --check camera-runtime.js`、`node --check src/capture.js`、位相テスト（不規則サンプリングの0/90/180度、低振幅、欠損、短い窓）、姿勢変数・visibility、座標変換、remote Bの更新・期限切れテストを用意しています。実機スマートフォン2台、iPhoneのレンズ公開状況、実カメラのMediaPipe検出、PeerJS越しの映像同期、Pages反映は未検証です。0.5倍レンズをブラウザが個別デバイスとして公開しない場合は使用できず、撮影画面に理由を表示します。
