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
