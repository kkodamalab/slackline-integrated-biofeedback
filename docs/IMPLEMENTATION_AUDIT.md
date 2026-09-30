# Final integration audit

This audit was performed against the repository state at commit `1569065`, before the final integration changes.

## A — Already fully implemented and retained

- PeerJS/WebRTC QR pairing and independent Device 1 / Device 2 metadata channels.
- MediaPipe Pose with all 33 landmarks retained for measurement, relative-phase calculation, Hilbert transform, low-pass filtering, simulation, and CSV/JSON export.
- Target transition/cooldown logic for Enter, Exit, and Outside events and No BF, Concurrent, and Terminal timing.
- Absolute, relative, and window Z-score graph transforms, invalid zero-SD handling, mixed-unit protection, camera aspect ratios, fit modes, and coordinate mapping.

## B — Partially implemented and completed

- The current screen already loaded the ported VBF stylesheet/component stack (`src/styles.css`, `src/lab.css`, `src/lecture.css`) and used its camera cards, control grouping, feedback hierarchy, remote capture, and transport visual language. The final pass preserves that base rather than replacing it.
- Camera source selection was routed through video and landmark inputs, but duplicate PC-camera selection silently changed Camera 2. It now preserves both choices and asks the researcher to resolve the conflict.
- Face suppression existed in the primary overlay, but not in the legacy capture preview. Every drawing path now suppresses landmarks 0–10 while measurement continues to receive all 33.
- Skeleton and joint styling existed, but their visibility was coupled; reference and measured axes also shared one color. They are now independent visual objects and controls.
- Most requested graph and target behavior already had tests and was retained. UI and runtime status text still contained Japanese and is now English.

## C — Missing or broken and implemented

- Independent Camera 1 / Camera 2 background modes and exportable settings were missing. Original, person-segmented background blur, and solid background compositing are now available, with safe Original fallback when a segmentation mask is unavailable.
- Background settings serialization tests and practical English-UI checks were missing.
- The obsolete `lab.html` referenced a nonexistent runtime and exposed an incompatible direction-bound camera UI. It now redirects to the canonical integrated VBF-based screen.

## Upstream VBF components

The integration already contained the VBF-derived `lab.html`/`index.html` structure, `src/styles.css`, `src/lab.css`, `src/lecture.css`, remote camera component in `src/capture.js`, and pose drawing component in `src/pose.js`. This pass directly extends those existing ported components. A fresh upstream clone was attempted during the audit, but the execution environment's GitHub CONNECT tunnel returned HTTP 403; therefore no unverified upstream code was newly copied in this pass.

## Manual verification boundary

Automated tests validate state transitions, transforms, serialization, DOM wiring, source-routing contracts, and drawing-path face suppression. Real PC/phone cameras, PeerJS networking, QR scanning, MediaPipe GPU/WASM behavior, person segmentation quality, AudioContext output, speech synthesis, recording, and browser-specific performance still require manual hardware/browser verification.
