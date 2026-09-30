import Peer from "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm";
import { createPose, draw, measure, setMetrics, getCamera } from "./pose.js";
document.head.insertAdjacentHTML("beforeend", '<link rel="stylesheet" href="./src/remote-camera.css">');

const $ = (s, r = document) => r.querySelector(s);
const target = new URLSearchParams(location.search).get("peer");
const source = new URLSearchParams(location.search).get("source") === "B" ? "B" : "A";
const sessionId = crypto.randomUUID();
const video = $("video"), canvas = $("canvas"), root = $(".capture-card");
$(".privacy-note").textContent = "Video is sent directly to the connected PC and is stored only when recording is started there.";
let stream, pose, conn, call, peer, last = -1, running = false, lastSent = 0;
let facing = "environment", lens = "wide", cameraDevices = [], ultraId = null, wideId = null;
let manualDevice = "", switching = false, generation = 0;
const feedbackReadout=document.createElement("div");feedbackReadout.className="phone-feedback";feedbackReadout.hidden=true;root.querySelector(".viewport").append(feedbackReadout);

const switcher = document.createElement("div");
switcher.className = "camera-switcher";
switcher.setAttribute("role", "group");
switcher.setAttribute("aria-label", "Front and rear cameras");
switcher.innerHTML = '<button type="button" class="active" data-facing="environment">Rear-facing</button><button type="button" data-facing="user">User-facing</button>';
$(".lens-controls").before(switcher);
if (!target) { $("#systemStatus").textContent = "Connection destination is missing"; $("#startCapture").disabled = true; }
else $("#systemStatus").textContent = `Device ${source === 'A' ? '1' : '2'} / ID ${sessionId.slice(0, 8)} ready to connect`;

function classify(label) {
  if (/front|face\s*time|selfie|user-facing/i.test(label)) return "front";
  if (/ultra[\s-]*wide|ultrawide|super[\s-]*wide|0[.,]5\s*[x×]/i.test(label)) return "ultra";
  if (/telephoto|tele\b/i.test(label)) return "tele";
  if (/\bwide\b|back|rear|environment/i.test(label)) return "wide";
  return "unknown";
}
function updateButtons() {
  $("[data-lens=ultra]").disabled = !ultraId;
  document.querySelectorAll("[data-lens]").forEach(b => b.classList.toggle("active", facing === "environment" && !manualDevice && b.dataset.lens === lens));
  switcher.querySelectorAll("button").forEach(b => b.classList.toggle("active", b.dataset.facing === facing));
  $("#lensStatus").textContent = ultraId
    ? "A physical ultra-wide camera was found. You can switch to 0.5×."
    : "This device or browser does not expose a 0.5× camera. Check manual camera selection.";
}
async function cameras() {
  try {
    cameraDevices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput");
    ultraId = cameraDevices.find(d => classify(d.label) === "ultra")?.deviceId || null;
    wideId = cameraDevices.find(d => classify(d.label) === "wide")?.deviceId || null;
    const select = $("#cameraSelect");
    select.replaceChildren(new Option("Automatic selection", ""), ...cameraDevices.map((d, i) => new Option(d.label || `Camera ${i + 1}`, d.deviceId)));
    if (manualDevice && cameraDevices.some(d => d.deviceId === manualDevice)) select.value = manualDevice;
    else { manualDevice = ""; select.value = ""; }
    updateButtons();
  } catch (error) { $("#lensStatus").textContent = `Could not list cameras: ${error.message}`; }
}
function closeConnection() {
  running = false; generation++;
  $("#statusDot").classList.remove("active");
  stream?.getTracks().forEach(t => t.stop());
  call?.close(); conn?.close(); peer?.destroy();
  stream = call = conn = peer = null;
  video.srcObject = null;
}
async function start() {
  if (switching) return;
  switching = true;
  const button = $("#startCapture"); button.disabled = true;
  try {
    closeConnection(); last = -1;
    const deviceId = manualDevice || (facing === "environment" ? lens === "ultra" ? ultraId : wideId : cameraDevices.find(d => classify(d.label) === "front")?.deviceId);
    if (lens === "ultra" && facing === "environment" && !manualDevice && !ultraId) throw new Error("A 0.5× camera is unavailable");
    stream = await getCamera({ video: { ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facing } }), width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24 } }, audio: false });
    const actualId = stream.getVideoTracks()[0].getSettings().deviceId;
    if (lens === "ultra" && !manualDevice && actualId && actualId !== ultraId) throw new Error("Could not start the ultra-wide camera");
    video.srcObject = stream; await video.play();
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    $(".placeholder", root).classList.add("hidden");
    await cameras(); // Device names may become available after permission is granted
    pose ??= await createPose();
    peer = new Peer();
    await new Promise((resolve, reject) => { peer.on("open", resolve); peer.on("error", reject); });
    call = peer.call(target, stream, { metadata: { source, sessionId } });
    conn = peer.connect(target, { reliable: false, metadata: { source, sessionId } });
    conn.on("data", message => {
      if (message.type !== "feedback") return;
      const numericEnabled = !Array.isArray(message.how) || message.how.includes("numeric");
      const show = message.visible && numericEnabled;
      root.classList.toggle("feedback-suppressed", !message.visible); feedbackReadout.hidden=!show;
      feedbackReadout.textContent=show?`${Number.isFinite(message.value) ? Number(message.value).toFixed(1) + "°" : "—"} / TARGET ${message.target}°`:"";
      if (!message.visible) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    });
    conn.on("open", () => {
      $("#statusDot").classList.add("active");
      $("#systemStatus").textContent = `Device ${source === 'A' ? '1' : '2'} · ${facing === "user" ? "User-facing" : lens === "ultra" ? "0.5× Ultra Wide" : "Rear-facing"} streaming to PC`;
      button.textContent = "Reconnect Camera";
      running = true; const current = generation; requestAnimationFrame(t => loop(t, current));
    });
    peer.on("error", e => { $("#systemStatus").textContent = `Connection error: ${e.type}`; });
  } catch (error) {
    closeConnection();
    $("#systemStatus").textContent = error.name === "NotAllowedError" ? "Allow camera access" : error.message;
  } finally { button.disabled = false; switching = false; }
}
function loop(t, current) {
  if (!running || current !== generation) return;
  if (video.readyState >= 2 && video.currentTime !== last) {
    last = video.currentTime;
    pose.detectForVideo(video, t, result => {
      if (current !== generation) return;
      const landmarks = result.landmarks?.[0];
      if (conn?.open && t - lastSent > 66) { conn.send({ type: "pose", timestamp: Date.now(), frameTime: t, videoWidth: video.videoWidth, videoHeight: video.videoHeight, mirror: facing === "user", status: landmarks ? "detected" : "no-person", metrics: landmarks ? measure(landmarks) : null, landmarks: landmarks || null, facing, lens }); lastSent = t; }
      if (!landmarks) { canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height); return; }
      draw(canvas, landmarks); const metrics = measure(landmarks); setMetrics(root, metrics);
    });
  }
  requestAnimationFrame(next => loop(next, current));
}
switcher.addEventListener("click", async event => {
  const b = event.target.closest("button[data-facing]"); if (!b || b.dataset.facing === facing || switching) return;
  facing = b.dataset.facing; manualDevice = ""; $("#cameraSelect").value = ""; updateButtons();
  if (stream) await start();
});
$(".lens-switcher").addEventListener("click", async event => {
  const b = event.target.closest("button[data-lens]"); if (!b || b.disabled || switching || (lens === b.dataset.lens && facing === "environment" && !manualDevice)) return;
  lens = b.dataset.lens; facing = "environment"; manualDevice = ""; $("#cameraSelect").value = ""; updateButtons();
  if (stream) await start();
});
$("#cameraSelect").addEventListener("change", async event => {
  if (switching) return;
  manualDevice = event.target.value;
  const type = classify(cameraDevices.find(d => d.deviceId === manualDevice)?.label || "");
  if (type === "front") facing = "user";
  else if (manualDevice) facing = "environment";
  if (type === "ultra") lens = "ultra"; else if (type === "wide") lens = "wide";
  updateButtons(); if (stream) await start();
});
$("#fullBody").addEventListener("change", e => root.classList.toggle("full-body", e.target.checked));
root.classList.add("full-body");
$("#startCapture").addEventListener("click", start);
cameras(); navigator.mediaDevices?.addEventListener("devicechange", cameras);
