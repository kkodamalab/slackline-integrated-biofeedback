# Background・Target連動・聴覚BF 不具合修正

## 原因

1. **Background Blur**: MediaPipeのSegmentation Maskを`getAsImageData()`の赤チャンネルからアルファへ変換する経路だけに依存しており、実機で返されるFloat32 Maskを確実に扱えていませんでした。また、Mask未取得時はOriginalへ戻るだけで、画面上に理由が表示されませんでした。
2. **Target連動**: Researcher Gauge、Participant Gauge、Participant Waveform、`participantState()`がRelative Phaseの値と`-180〜180°`範囲を前提としていました。研究用の複数系列GraphとTarget用Waveformの責務も分離されていませんでした。
3. **聴覚BF**: Beep / Voiceの有効状態をHOWの視覚Target表示へ連動させていたため、視覚TargetがOFFだと聴覚設定がONでも無効になりました。また、Enter判定が`previousOnTarget === false`のみを許可しており、試行開始後の最初の有効値がTarget内の場合は鳴りませんでした。Terminal判定も直前フレームの状態を参照していました。

## 修正

- Float32 Segmentation Maskを人物信頼度のAlpha Maskへ変換し、人物を原映像のまま保持して背景だけをBlur / Solid合成します。Cameraごとの画面に`Original`、`Blur active`、`Solid active`、または英語のFallback理由を表示します。
- Target変数のLabel、Unit、Range、Circular判定を`target-feedback.mjs`へ集約しました。Relative Phase、Body Axis、左右Knee、左右Hand、左右Footについて、現在値、Target、Tolerance、Gauge、Target Waveform、Participant View、Target判定、聴覚判定が同じSnapshotを利用します。
- Target連動Waveformを追加し、既存の複数変数Research Graphは別表示として維持しました。
- Auditory BFを視覚TargetのON/OFFから分離しました。最初の有効値がTarget内ならEnterを1回許可し、Invalid値は状態を変更せず、Terminalは試行結果だけで判定します。CooldownとOutside反復は維持しています。
- 折りたたみ式DEBUGパネルに、Target変数、現在値、Target、Tolerance、Inside / Outside / Invalid、Beep、AudioContext、最終Beep時刻、Camera別Segmentation状態を表示します。

## 元VBF参照について

`src/target-beep.js`、`src/experiment.js`、`src/gauge.js`、`src/experiment-math.js`のRaw URL取得を試みましたが、実行環境のGitHub CONNECT制限によりHTTP 403となりました。そのため、取得できていない上流処理を再利用済みとは報告しません。今回の遷移Gateは提示されたTargetEntryGate仕様に基づき、既存`auditory-feedback.mjs`の判定関数を拡張しています。

## 手動検証範囲

自動テストではMask合成順序とFloat32 Alpha変換、Target別Range / Unit / Circular判定、Participant State、Enter / Exit / Outside / Cooldown / Concurrent / Terminal / No BF / Invalid、視覚Targetからの独立、DOM接続を検証します。PC Camera、Device 1 / Device 2、実際のMediaPipe Mask品質、2台同時性能、AudioContextの実音、Speech Synthesisは実機・実ブラウザでの確認が必要です。

## PR #11レビュー後の追加修正

- Hand / Footを選択した場合、TargetとToleranceの入力欄から角度単位を除去し、変数メタデータのUnit、Range、Stepを入力欄・Gauge・Waveform・Participant Viewへ共通反映するようにしました。
- Relative PhaseのTarget Rangeを円環区間として計算し、179°±5°のように-180°境界をまたぐ場合はGaugeの左右端に2つの許容範囲を描画します。到達判定と表示は同じTarget Metadataを使用します。
- Beep出力はAudioContextが`running`の場合だけ成功として記録します。`suspended`、`closed`、Resume失敗、出力Node生成失敗では最終Beep時刻を更新せず、DEBUGのAudioContext欄へ英語の理由を表示します。
- Float32 Segmentation Mask、PC Camera Mask、Device 1 / Device 2のホスト側Segmentation、OriginalへのFallbackは維持しています。

### mainとの競合解消について

最新mainの取得を`git fetch origin main`で試みましたが、実行環境のGitHub CONNECT TunnelがHTTP 403を返しました。また、この作業Checkoutには`main`参照や`origin/main`が含まれていません。そのため、GitHub上の実際の最新mainを取り込んだMerge / Rebaseと、`mergeable_state=dirty`解消の確認はこの環境では実行できていません。PR #10を含むとされる未取得のmainに対して競合解消済みとは報告しません。
