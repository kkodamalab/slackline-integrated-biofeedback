# 最終統合監査

この監査は、最終統合の変更を加える前のリポジトリ状態（コミット `1569065`）を対象として実施しました。

## A — 実装済みであり、そのまま維持した項目

- PeerJS/WebRTCによるQRペアリングと、Device 1 / Device 2の独立したメタデータチャンネル。
- 計測用の全33ランドマークを保持するMediaPipe Pose、相対位相計算、Hilbert変換、ローパスフィルタ、シミュレーション、CSV/JSONエクスポート。
- Enter、Exit、Outsideイベント、およびNo BF、Concurrent、Terminalの提示タイミングに対応するTarget遷移・クールダウン処理。
- Absolute、Relative、ウィンドウ内Z-scoreのグラフ変換、標準偏差0の無効値処理、異なる単位の混在防止、カメラのアスペクト比、Fit Mode、座標変換。

## B — 部分実装であり、不足分を補完した項目

- 現行画面は、移植済みのVBFスタイルシートおよびコンポーネント群（`src/styles.css`、`src/lab.css`、`src/lecture.css`）をすでに読み込み、カメラカード、設定グループ、Feedback階層、Remote Capture、Transportの視覚表現を使用していました。最終修正ではこれらを別実装に置き換えず、既存のVBFベースを維持しました。
- カメラソース選択は映像とランドマーク入力に接続されていましたが、両方でPC Cameraを選択するとCamera 2を暗黙的に変更していました。現在はユーザーの選択を維持し、競合の解消を促す警告を表示します。
- 顔ランドマークの非表示処理はメインOverlayにはありましたが、旧Capture Previewには適用されていませんでした。現在は全描画経路でランドマーク0〜10を描画せず、計測処理には全33ランドマークを引き続き渡します。
- SkeletonとJointのスタイル設定は存在していましたが、表示切替が連動していました。また、Reference LineとMeasured Body Axisは同じ色を共有していました。現在は、それぞれを独立した表示オブジェクトおよび設定として扱います。
- 要求されたGraphおよびTargetの大部分はすでにテストされていたため、その実装を維持しました。UIと実行時ステータスに残っていた日本語は、アプリ上に表示される箇所のみ英語化しました。

## C — 未実装または正常に動作しておらず、今回実装した項目

- Camera 1 / Camera 2ごとの独立した背景処理と、設定のエクスポートが未実装でした。現在はOriginal、人物Segmentationを利用したBackground Blur、Solid Backgroundを選択でき、Segmentation Maskを利用できない場合は安全にOriginalへフォールバックします。
- 背景設定のシリアライズテストと、実用的な範囲での英語UIチェックがありませんでした。
- 旧`lab.html`は存在しないRuntimeを参照し、撮影方向に固定された互換性のないカメラUIを表示していました。現在はVBFベースの統合画面を正規画面として開くようにしています。

## 参照元VBFから移植済みのコンポーネント

統合前から、VBF由来の`lab.html` / `index.html`の構造、`src/styles.css`、`src/lab.css`、`src/lecture.css`、`src/capture.js`のRemote Cameraコンポーネント、`src/pose.js`のPose描画コンポーネントが含まれていました。今回の修正では、これらの移植済みコンポーネントを直接拡張しています。監査時に参照元リポジトリの再Cloneを試みましたが、実行環境のGitHub CONNECT TunnelがHTTP 403を返したため、この修正では未確認の上流コードを新たにコピーしていません。

## 手動検証が必要な範囲

自動テストでは、状態遷移、変換処理、設定のシリアライズ、DOM接続、ソースルーティングの契約、全描画経路における顔ランドマークの非表示を検証しています。実際のPC/スマートフォンカメラ、PeerJSネットワーク、QRスキャン、MediaPipe GPU/WASMの挙動、人物Segmentationの品質、AudioContextの出力、Speech Synthesis、録画、ブラウザ固有のパフォーマンスについては、引き続き実機および実ブラウザでの手動検証が必要です。
