# slackline-integrated-biofeedback

研究開発中のスラックライン専用バイオフィードバックWebプロトタイプです。`kkodamalab/slackline-posture-demo` の身体軸定義と、`kkodamalab/visual-biofeedback-vbf-pc-2-2` の2視点・Remote Camera・CSV設計を基に、スクワット画面を持たない構成へ統合しています。

## 実装済み

- PC画面に前方（A）・側方（B）の2視点を並列表示
- 模擬データモード（左右手の既知の正弦波、位相差0.6 rad）
- 実カメラA/Bの独立`getUserMedia`接続（ブラウザで2台を選ぶ場合はデバイス選択UIを追加予定）
- MediaPipe Pose Landmarkerを利用するためのCDN依存とCanvas骨格描画基盤（本版のカメラ計測はブラウザ権限・端末で未検証）
- 身体軸：左右肩の中点から左右骨盤の中点へのベクトル。画面鉛直との角度を傾斜角とする
- 側方膝角度：股関節–膝–足首の内角。画像正規化座標であり実寸ではない
- BFなし、誤差修正、探索支援、相対位相の切替UI。誤差修正は目標・許容幅を設定できる
- FFTベースの簡易Hilbert変換による瞬時位相差（−180〜180度）と3〜8秒窓
- Canvas時系列表示、検出信頼性、同期差、全身映像・骨格・身体軸・BFエフェクトの表示切替
- CSV/JSON出力（timestamp、view、指標、confidence、BF条件）

## 実行

`index.html` をHTTPSまたはローカルHTTPサーバーで配信してください。MediaPipeモデルはCDNから取得します。GitHub PagesではPC画面の静的配信は可能ですが、スマートフォン2台からの接続には既存アプリ同様、PeerJS/WebRTCのシグナリングサーバーまたは同等の中継が必要です。GitHub Pagesだけで2台を自動接続することはできません。

## 解析上の注意

実測タイムスタンプを保存し、位相計算では3〜8秒の窓を使用します。低周波・非周期的な姿勢動揺、窓末端、欠損・低visibilityでは位相が不安定になるため、推定値を検証済み測定値として扱いません。模擬正弦波での算出確認は行いますが、実機2台の同期誤差・MediaPipe精度・HTTPS接続は未検証です。

## 既存リポジトリ調査

- `slackline-posture-demo`: MediaPipe Tasks Vision 0.10.0、単一カメラ、肩・骨盤中点による身体軸、鏡像補正
- `visual-biofeedback-vbf-pc-2-2`: MediaPipe Pose、2視点、QR/PeerJS/WebRTC Remote、角度・位置・CSV・Trial管理

本リポジトリは既存2リポジトリを変更せず、新規に作成したプロトタイプです。
