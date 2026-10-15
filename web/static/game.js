// =============================================================
// 미래의 나와 은하제까지 14일 - 게임 화면 (JavaScript)
// -------------------------------------------------------------
// 이 파일이 하는 일
//   1. 학교 지도와 캐릭터를 캔버스에 1초에 60번 그린다            → "게임 루프"
//   2. 키보드로 캐릭터를 움직이고 벽에 부딪히면 멈춘다             → "충돌 처리"
//   3. 히로인에게 말을 걸면 미연시 장면(배경 + 전신 그림 + 선택지)  → "장면 시스템"
//   4. 14일 동안 아침 → 1~5교시 → 밤 순서로 하루가 흐른다          → "하루 흐름"
// 그림 : anime.js(캐릭터), scene-bg.js(장면 배경)
// 대사 : static/story/*.json (대본 파일)
// 규칙 : 서버(app.py) 또는 웹 공개 버전에서는 local-api.js
// =============================================================


// ─────────────────────────────────────────────────────────────
// 0) 도우미
// ─────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const other = (role) => (role === "student" ? "future" : "student");
const rand = (a, b) => a + Math.random() * (b - a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const STAT_ICON = { "체력": "💪", "성적": "📚", "우정": "🤝" };
const STAT_COLOR = { "체력": "#ff7a8a", "성적": "#6ea8ff", "우정": "#4fd6a0" };
const HEROINE_IDS = ["seorin", "yuri", "bom", "hayul", "sion"];

// 한국어 조사 : 받침이 있으면 앞의 것, 없으면 뒤의 것 ("서린과" / "유리와")
function josa(word, withBatchim, without) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (code >= 0 && code % 28 !== 0 ? withBatchim : without);
}


// ─────────────────────────────────────────────────────────────
// 1) 대본 불러오기
// ─────────────────────────────────────────────────────────────
const STORY = { common: null, heroines: {} };

async function loadStory() {
  STORY.common = await (await fetch("static/story/common.json")).json();
  for (const id of HEROINE_IDS) {
    try {
      const res = await fetch(`static/story/${id}.json`);
      if (res.ok) STORY.heroines[id] = await res.json();
    } catch (e) { /* 아직 없는 히로인은 건너뜀 */ }
  }
}

// 등장인물 이름표·목소리 (히로인 이름은 대본에서 가져옴)
const CAST = {
  student: { name: "나", voice: 520 },
  future:  { name: "미래의 나", voice: 330 },
  doyun:   { name: "도윤", voice: 430 },
  kim:     { name: "김 선생님", voice: 250 },
  han:     { name: "한 선생님", voice: 600 },
};
const VOICE = { seorin: 640, yuri: 760, bom: 820, hayul: 600, sion: 700 };
function castName(who) {
  if (who === "me" || who === "student") return (server && server.name) || "나";
  if (STORY.heroines[who]) return STORY.heroines[who].short;
  return CAST[who] ? CAST[who].name : "";
}
const lookOf = (who) => LOOKS[who === "me" ? "student" : who];
const fill = (text) => text.replaceAll("{name}", (server && server.name) || "한웅");

// 조연들이 교시마다 있는 곳
const SIDE_SCHEDULE = {
  doyun: ["교실", "복도", "교실", "급식실", "복도"],
  kim:   ["교실", "교실", "복도", "교실", "교실"],
  han:   ["보건실", "보건실", "보건실", "보건실", "보건실"],
};


// ─────────────────────────────────────────────────────────────
// 2) 지도
// ─────────────────────────────────────────────────────────────
const W = 960, H = 600;
const T = 12;

const ROOMS = {
  "교실":   { x: 0,   y: 0,   w: 320, h: 240, spot: { x: 160, y: 108 }, icon: "✏️", sign: { x: 16,  y: 250 } },
  "도서관": { x: 320, y: 0,   w: 320, h: 240, spot: { x: 480, y: 108 }, icon: "📖", sign: { x: 336, y: 250 } },
  "급식실": { x: 640, y: 0,   w: 320, h: 240, spot: { x: 800, y: 105 }, icon: "🍙", sign: { x: 656, y: 250 } },
  "보건실": { x: 0,   y: 340, w: 320, h: 260, spot: { x: 205, y: 480 }, icon: "🩹", sign: { x: 182, y: 352 } },
  "운동장": { x: 320, y: 340, w: 640, h: 260, spot: { x: 640, y: 470 }, icon: "⚽", sign: { x: 336, y: 352 } },
};
// 사람들이 서성이는 범위 [x최소, x최대, y최소, y최대]
const ZONES = {
  "교실":   [205, 300, 82, 128],
  "도서관": [345, 615, 80, 132],
  "급식실": [665, 925, 75, 122],
  "운동장": [375, 900, 390, 560],
  "보건실": [195, 300, 405, 500],
  "복도":   [40, 920, 262, 300],
};
const PLACE_BG = { "교실": "classroom", "도서관": "library", "급식실": "cafeteria",
                   "운동장": "field", "보건실": "infirmary", "복도": "hallway" };
const SPOT_RADIUS = 70;
const TALK_RADIUS = 52;

function hWall(y, x0, x1, doors) {
  const rects = [];
  let x = x0;
  for (const [d0, d1] of doors) {
    if (d0 > x) rects.push({ x, y: y - T / 2, w: d0 - x, h: T });
    x = d1;
  }
  if (x < x1) rects.push({ x, y: y - T / 2, w: x1 - x, h: T });
  return rects;
}
const vWall = (x, y0, y1) => [{ x: x - T / 2, y: y0, w: T, h: y1 - y0 }];
const WALLS = [
  { x: 0, y: 0, w: W, h: T }, { x: 0, y: H - T, w: W, h: T },
  { x: 0, y: 0, w: T, h: H }, { x: W - T, y: 0, w: T, h: H },
  ...hWall(240, 0, W, [[130, 210], [440, 520], [760, 840]]),
  ...vWall(320, 0, 240), ...vWall(640, 0, 240),
  ...hWall(340, 0, W, [[130, 210], [540, 700]]),
  ...vWall(320, 340, H),
];
const FURNITURE = [];
for (let r = 0; r < 2; r++)
  for (let c = 0; c < 4; c++) FURNITURE.push({ x: 40 + c * 68, y: 150 + r * 45, w: 36, h: 20, kind: "desk" });
FURNITURE.push({ x: 130, y: 64, w: 60, h: 22, kind: "teacher" });
FURNITURE.push({ x: 370, y: 150, w: 90, h: 40, kind: "readtable" });
FURNITURE.push({ x: 500, y: 150, w: 90, h: 40, kind: "readtable" });
for (const [x, y] of [[680, 140], [820, 140], [680, 190], [820, 190]])
  FURNITURE.push({ x, y, w: 110, h: 28, kind: "lunchtable" });
FURNITURE.push({ x: 30, y: 365, w: 60, h: 90, kind: "bed" });
FURNITURE.push({ x: 110, y: 365, w: 60, h: 90, kind: "bed" });
FURNITURE.push({ x: 250, y: 520, w: 50, h: 60, kind: "cabinet" });
FURNITURE.push({ x: 336, y: 430, w: 14, h: 80, kind: "goal" });
FURNITURE.push({ x: 930, y: 430, w: 14, h: 80, kind: "goal" });
for (const [x0, x1] of [[20, 125], [215, 535], [705, 945]])
  FURNITURE.push({ x: x0, y: 314, w: x1 - x0, h: 20, kind: "locker" });
const SOLIDS = [...WALLS, ...FURNITURE];

const CLOCK = ["09:00", "10:00", "11:00", "13:00", "14:00"];
const TINT  = ["rgba(255,240,200,0.05)", "rgba(255,255,255,0)", "rgba(255,255,255,0)",
               "rgba(255,200,120,0.08)", "rgba(255,150,80,0.14)"];


// ─────────────────────────────────────────────────────────────
// 3) 게임 상태 (화면 쪽)
// ─────────────────────────────────────────────────────────────
function makeActor(key, x, y, extra = {}) {
  return { key, look: LOOKS[key], x, y, dir: 1, walk: 0, moving: false,
           expr: "normal", exprT: 0, emote: null, bubble: null, spin: 0, hop: 0,
           blinkT: rand(1, 4), target: null, wait: rand(0, 2), ...extra };
}
const chars = { student: makeActor("student", 480, 292), future: makeActor("future", 430, 292) };
let npcs = [];               // 히로인 + 조연 (대본을 불러온 뒤 만듦)
let controlled = "student";
let trail = [];
const FOLLOW_GAP = 22;

let server = null;
let mode = "title";          // title | play | menu | scene | help | notebook | ending | daycard
let helpReturn = "play";
let menuSel = 0;
let busy = false;
let currentRoom = null;
let nearSpot = null;
let nearNpc = null;
let placedFor = "";          // 사람들을 어느 날·교시 기준으로 배치했는지

const keys = new Set();
let floaters = [];
let particles = [];
let petals = [];
let shake = 0;
let stepTimer = 0;
let clockTime = 0;
for (let i = 0; i < 26; i++) petals.push(newPetal(true));
function newPetal(anywhere) {
  return { x: rand(-40, W), y: anywhere ? rand(0, H) : -10, vx: rand(18, 40), vy: rand(22, 45),
           rot: rand(0, 6), vr: rand(-2, 2), size: rand(3, 5.5), sway: rand(0, 6) };
}


// ─────────────────────────────────────────────────────────────
// 4) 효과음 (Web Audio 로 직접 만든 소리)
// ─────────────────────────────────────────────────────────────
let audio = null;
let muted = false;
function initAudio() { if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)(); }
function tone(freq, dur = 0.1, type = "square", vol = 0.05, delay = 0, slide = 0) {
  if (muted || !audio) return;
  const t = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(audio.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}
const SFX = {
  step:  () => tone(140 + Math.random() * 40, 0.04, "triangle", 0.02),
  blip:  (f) => tone(f * rand(0.95, 1.08), 0.03, "square", 0.014),
  open:  () => { tone(660, 0.06); tone(880, 0.08, "square", 0.05, 0.06); },
  move:  () => tone(520, 0.04, "square", 0.03),
  close: () => tone(440, 0.06, "square", 0.03, 0, 300),
  next:  () => tone(760, 0.04, "triangle", 0.03),
  pick:  () => { tone(880, 0.07, "triangle", 0.05); tone(1175, 0.1, "triangle", 0.05, 0.07); },
  ok:    () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.045, i * 0.07)),
  heart: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.14, "sine", 0.06, i * 0.08)),
  err:   () => { tone(180, 0.18, "sawtooth", 0.05); tone(140, 0.25, "sawtooth", 0.05, 0.12); },
  bell:  () => { tone(988, 0.35, "sine", 0.06); tone(784, 0.5, "sine", 0.06, 0.25); },
  swap:  () => { tone(200, 0.7, "sawtooth", 0.05, 0, 1400); tone(1400, 0.7, "triangle", 0.04, 0.35, 180); },
  undo:  () => [784, 659, 523].forEach((f, i) => tone(f, 0.08, "triangle", 0.05, i * 0.06)),
  end:   () => [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, "square", 0.045, i * 0.14)),
};


// ─────────────────────────────────────────────────────────────
// 5) 서버와 대화하기
// ─────────────────────────────────────────────────────────────
async function api(path, body) {
  if (busy) return null;
  busy = true;
  try {
    let data;
    if (window.LOCAL_API) {
      data = window.LOCAL_API(path, body);        // 웹 공개 버전 : 브라우저 안에서 계산
    } else {
      const options = body === undefined ? {} : {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      };
      data = await (await fetch(path, options)).json();   // 내 컴퓨터 버전 : 파이썬 서버
    }
    server = data;
    renderHUD(data);
    return data;
  } catch (err) {
    toast("서버와 연결이 안 돼요. 터미널에서 서버가 켜져 있는지 확인하세요.", "danger");
    return null;
  } finally {
    busy = false;
  }
}


// ─────────────────────────────────────────────────────────────
// 6) 미연시 장면 시스템
//    scene(lines, {bg}) : 대사를 한 줄씩 보여 주고, 끝나면 고른 선택지 번호 목록을 돌려준다
//    (async 함수라서 await scene(...) 으로 "장면이 끝날 때까지 기다리기" 가 된다)
// ─────────────────────────────────────────────────────────────
const vn = {
  open: false, bg: "classroom", lines: [], i: 0, chars: 0, picks: [], resolve: null,
  stage: [],                 // 화면에 서 있는 캐릭터들 [{key, expr, alpha, blinkT}]
  speaker: null, lastOther: null,
  choosing: null,            // 선택지를 고르는 중이면 그 선택지 목록
  auto: false, skip: false, autoT: 0, skipT: 0,
  voiceDone: true,           // 이번 대사의 더빙이 끝났는지
};
const backlog = [];           // 지나간 대사 기록 (L 키)

function scene(lines, opts = {}) {
  return new Promise((resolve) => {
    if (mode === "menu") closeMenu(false);
    vn.open = true;
    vn.bg = opts.bg || vn.bg;
    vn.lines = lines.map((l) => ({ ...l }));
    vn.i = 0;
    vn.picks = [];
    vn.resolve = resolve;
    vn.stage = [];
    vn.choosing = null;
    mode = "scene";
    $("vn").classList.remove("hidden");
    $("prompt").classList.add("hidden");
    showVnLine();
  });
}

function showVnLine() {
  if (vn.i >= vn.lines.length) return closeScene();
  const line = vn.lines[vn.i];
  if (line.choice) return showChoices(line.choice);

  const who = line.who === "student" ? "me" : line.who;
  const narr = who === "narr";
  vn.speaker = who;
  vn.chars = 0;
  vn.autoT = 0;
  $("vn-box").classList.toggle("narr", narr);
  $("vn-box").classList.remove("done");
  $("vn-name").classList.toggle("hidden", narr);
  $("vn-name").textContent = narr ? "" : castName(who);
  $("vn-name").style.background = narr ? "" : (lookOf(who) ? lookOf(who).hairColor : "#7c6cff");
  $("vn-text").textContent = "";
  // 주인공이 말할 때는 대화창 왼쪽에 작은 얼굴
  const showFace = who === "me";
  $("vn-face").classList.toggle("hidden", !showFace);
  if (showFace) drawPortrait($("vn-face"), LOOKS.student, line.expr || "normal");

  // 주인공이 아닌 사람이 말하면 무대에 세운다 (최대 2명)
  if (!narr && who !== "me" && LOOKS[who]) {
    let s = vn.stage.find((x) => x.key === who);
    if (!s) {
      if (vn.stage.length >= 2) vn.stage.splice(vn.stage.findIndex((x) => x.key !== vn.lastOther), 1);
      s = { key: who, expr: "normal", alpha: 0, blinkT: rand(1, 3), x: null };
      vn.stage.push(s);
    }
    if (s.expr !== (line.expr || "normal") || s.motionT === undefined) s.motionT = 0;   // 표정이 바뀌면 감정 동작 다시
    s.expr = line.expr || "normal";
    vn.lastOther = who;
  }
  // 🎙 더빙 : 스킵 중이 아니면 이 대사를 캐릭터 목소리로 읽는다
  vn.voiceDone = false;
  if (!vn.skip) Voice.speakLine(fill(line.text), who, () => { vn.voiceDone = true; });
  else vn.voiceDone = true;
  backlog.push({ name: narr ? "" : castName(who), text: fill(line.text) });
  if (backlog.length > 300) backlog.shift();
}

function showChoices(options) {
  vn.choosing = options;
  vn.skip = false;
  $("vn-skip").classList.remove("on");
  const box = $("vn-choices");
  box.innerHTML = "";
  options.forEach((o, i) => {
    const b = document.createElement("button");
    b.className = "vn-choice";
    b.innerHTML = `<span class="num">${i + 1}</span>${fill(o.text)}`;
    b.onclick = (e) => { e.stopPropagation(); pickChoice(i); };
    box.appendChild(b);
  });
  box.classList.remove("hidden");
  $("vn-box").classList.add("done");
}

function pickChoice(i) {
  const opt = vn.choosing[i];
  vn.choosing = null;
  $("vn-choices").classList.add("hidden");
  vn.picks.push(i);
  SFX.pick();
  backlog.push({ name: "▶ 선택", text: fill(opt.text) });
  // 고른 선택지의 대사들을 바로 다음 순서에 끼워 넣는다
  vn.lines.splice(vn.i + 1, 0, ...opt.lines);
  vn.i += 1;
  showVnLine();
}

function advanceVn() {
  if (!vn.open || vn.choosing) return;
  const line = vn.lines[vn.i];
  const text = fill(line.text);
  if (vn.chars < text.length) {                 // 아직 글자가 나오는 중이면 한 번에 다 보여 줌
    vn.chars = text.length;
    $("vn-text").textContent = text;
    $("vn-box").classList.add("done");
    return;
  }
  vn.i += 1;
  if (!vn.skip) SFX.next();
  showVnLine();
}

function closeScene() {
  Voice.stop();
  vn.open = false;
  vn.auto = false;
  if (!$("vn-skip").classList.contains("on")) vn.skip = false;
  $("vn-auto").classList.remove("on");
  $("vn").classList.add("hidden");
  $("vn-choices").classList.add("hidden");
  if (mode === "scene") mode = "play";
  const r = vn.resolve;
  vn.resolve = null;
  if (r) r(vn.picks);
}

function updateVn(dt) {
  if (!vn.open) return;
  for (const s of vn.stage) {
    s.motionT = (s.motionT || 0) + dt;
    s.alpha = Math.min(1, s.alpha + dt * 5);
    s.blinkT -= dt;
    if (s.blinkT < -0.13) s.blinkT = rand(2, 5);
  }
  if (vn.choosing) return;
  const line = vn.lines[vn.i];
  if (!line || line.choice) return;
  const text = fill(line.text);
  if (vn.skip) {                                   // 스킵 : 빠르게 넘기기
    vn.skipT += dt;
    if (vn.skipT > 0.05) { vn.skipT = 0; vn.chars = text.length; advanceVn(); }
    return;
  }
  if (vn.chars < text.length) {
    const before = Math.floor(vn.chars);
    vn.chars = Math.min(text.length, vn.chars + dt * 40);
    const now = Math.floor(vn.chars);
    if (now !== before) {
      $("vn-text").textContent = text.slice(0, now);
      const dubbing = Voice.enabled && Voice.hasVoices() && vn.speaker !== "narr";
      if (!dubbing && now % 2 === 0 && vn.speaker !== "narr" && text[now - 1] !== " ")
        SFX.blip(VOICE[vn.speaker] || (CAST[vn.speaker === "me" ? "student" : vn.speaker] || {}).voice || 500);
      if (now >= text.length) $("vn-box").classList.add("done");
    }
  } else if (vn.auto) {                            // 오토 : 글이 다 나오고 (더빙도 끝나면) 잠시 뒤 자동 진행
    if (!vn.voiceDone && Voice.speaking()) { vn.autoT = 0; return; }
    vn.autoT += dt;
    if (vn.autoT > (Voice.enabled && Voice.hasVoices() ? 0.6 : 1.1 + text.length * 0.035)) advanceVn();
  }
}

// 감정에 따른 몸 동작 : t = 표정이 바뀐 뒤 흐른 시간(초). 돌려주는 값 = 위치 이동과 기울기
function emotionMotion(expr, t) {
  const fade = (len) => Math.max(0, 1 - t / len);
  switch (expr) {
    case "surprised": return { x: 0, y: -Math.sin(Math.min(1, t / 0.35) * Math.PI) * 34, rot: 0 };          // 깡충!
    case "angry":     return { x: Math.sin(t * 55) * 6 * fade(0.6), y: 0, rot: 0 };                            // 부들부들
    case "happy":     return { x: 0, y: -Math.abs(Math.sin(t * 9)) * 12 * fade(0.7), rot: 0 };                  // 통통
    case "sad":       return { x: 0, y: 14 * Math.min(1, t / 0.6), rot: 0 };                                     // 축 처짐
    case "tired":     return { x: 0, y: 8 * Math.min(1, t / 0.5), rot: Math.sin(t * 1.5) * 0.01 };               // 휘청
    case "blush":     return { x: Math.sin(t * 3) * 5, y: 0, rot: Math.sin(t * 3) * 0.025 };                    // 살랑살랑
    default:          return { x: 0, y: 0, rot: 0 };
  }
}

// 장면 그리기 : 배경 + 서 있는 캐릭터
const vnCanvas = $("vn-canvas");
const vctx = vnCanvas.getContext("2d");
function drawVn() {
  if (!vn.open) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = vnCanvas.getBoundingClientRect();
  const wpx = Math.round(r.width * dpr), hpx = Math.round(r.height * dpr);
  if (vnCanvas.width !== wpx || vnCanvas.height !== hpx) { vnCanvas.width = wpx; vnCanvas.height = hpx; }
  const s = wpx / W;
  vctx.setTransform(s, 0, 0, s, 0, 0);
  drawSceneBg(vctx, vn.bg, clockTime);
  // 주인공이 말하는 중이면 대화창 얼굴도 입을 움직임
  if (vn.speaker === "me" && !vn.choosing) {
    const line = vn.lines[vn.i];
    const typing = line && line.text && vn.chars < fill(line.text).length;
    const on = typing || (Voice.speaking() && !vn.voiceDone);
    drawPortrait($("vn-face"), LOOKS.student, (line && line.expr) || "normal",
                 { talk: on ? Math.abs(Math.sin(clockTime * 13)) : 0, blink: Math.sin(clockTime * 2.1) > 0.97 });
  }

  const n = vn.stage.length;
  vn.stage.forEach((st, i) => {
    const L = LOOKS[st.key];
    const S = 8.2;                                    // 모두 같은 배율 → 키 차이가 그대로 보임 (무릎 아래는 화면 밖)
    const targetX = n === 1 ? 480 : i === 0 ? 300 : 660;
    // 처음 등장할 때는 옆에서 미끄러져 들어온다
    st.x = st.x === null ? targetX + (targetX < 480 ? -90 : 90) : st.x + (targetX - st.x) * 0.15;
    const speaking = st.key === vn.speaker;
    const breath = 1 + Math.sin(clockTime * 2 + i) * 0.006;
    const m = emotionMotion(st.expr, st.motionT || 0);
    // 립싱크 : 글자가 나오는 중이거나 목소리가 나오는 동안 입을 여닫는다
    const line = vn.lines[vn.i];
    const typing = line && line.text && vn.chars < fill(line.text).length;
    const mouthOn = speaking && (typing || (Voice.speaking() && !vn.voiceDone));
    const talk = mouthOn ? Math.abs(Math.sin(clockTime * 13)) * (0.6 + 0.4 * Math.sin(clockTime * 5.3)) : 0;
    vctx.save();
    vctx.globalAlpha = st.alpha;
    if (!speaking && vn.speaker !== "narr") vctx.filter = "brightness(0.62)";   // 말하지 않는 사람은 어둡게
    vctx.translate(st.x + m.x, 880 + (speaking ? 0 : 8) + m.y);
    vctx.rotate(m.rot);
    vctx.scale(S * (n === 2 && i === 1 ? -1 : 1), S * breath);              // 오른쪽 사람은 왼쪽을 보게
    drawFigure(vctx, L, { expr: st.expr, blink: st.blinkT < 0, ol: 0.24, talk,
                          sway: Math.sin(clockTime * 1.7 + i * 2) * 0.9 });
    vctx.restore();
  });
}


// ─────────────────────────────────────────────────────────────
// 7) 하루 흐름 · 이벤트 연출
// ─────────────────────────────────────────────────────────────
const commonConvo = (list, k) => list[((k % list.length) + list.length) % list.length];

// 교시가 지났을 때 생기는 일 (역할 바뀜 / 하루 끝) 을 순서대로 보여 준다
async function afterTurn(data, info) {
  if (info.swap === "swap") {
    flash(); shake = 18; SFX.swap();
    banner(`⚡ 역할 체인지! ⚡<small>3교시 동안 나는 미래의 나</small>`);
    switchControl(data.role);
    await sleep(900);
    await scene(commonConvo(STORY.common.swap, data.day), { bg: "hallway" });
    toast("3교시 : 미래의 나로 움직여요. 히로인에게 말을 걸면 힌트를 얻어요 💡", "good");
  } else if (info.swap === "unswap") {
    SFX.bell();
    switchControl(data.role);
    await scene(commonConvo(STORY.common.unswap, data.day), { bg: PLACE_BG[currentRoom] || "hallway" });
  }
  if (info.day_end) await dayEnd(data);
  else if (!info.swap) { SFX.bell(); toast(`🔔 ${CLOCK[data.turn - 1]} · ${data.turn}교시`); }
  placeNpcs();
}

async function dayEnd(data) {
  const finished = data.ended ? 14 : data.day - 1;      // 방금 끝난 날
  const night = STORY.common.days[String(finished)];
  if (!data.ended) {
    await scene(night.night, { bg: finished % 3 === 0 ? "night" : "sunset" });
    await dayCard(data.day);
    resetPositions();
    placeNpcs();
    const morning = STORY.common.days[String(data.day)];
    await scene(morning.morning, { bg: morning.bg });
  } else {
    await scene(night.night, { bg: "festival" });
    await scene(STORY.common.festival, { bg: "festival" });
    await playEnding(data);
  }
}

async function playEnding(data) {
  const e = data.ending;
  let title = "";
  if (e.type === "heroine") {
    const h = STORY.heroines[e.id];
    title = h.ending.title;
    await scene(h.ending.lines, { bg: h.ending.bg });
    saveEnding(`h:${e.id}`);
  } else {
    title = { "체력": "건강한 내일", "성적": "꿈을 향한 한 걸음", "우정": "곁에 있는 사람들" }[e.stat];
    await scene(STORY.common.normal_endings[e.stat], { bg: "night" });
    saveEnding(`n:${e.stat}`);
  }
  showEnding(data, title);
}

function dayCard(day) {
  return new Promise((resolve) => {
    mode = "daycard";
    const card = $("daycard");
    $("daycard-day").textContent = `${day}일째`;
    $("daycard-dday").textContent = day === 14 ? "은하제 당일!" : `은하제까지 D-${14 - day}`;
    card.classList.remove("hidden", "show");
    void card.offsetWidth;
    card.classList.add("show");
    SFX.bell();
    setTimeout(() => { card.classList.add("hidden"); mode = "play"; resolve(); }, 2200);
  });
}

function switchControl(role) {
  if (controlled === role) return;
  const from = chars[controlled], to = chars[role];
  controlled = role;
  trail = [];
  for (const c of Object.values(chars)) { c.spin = 0.6; burst(c.x, c.y - 30, "#a99bff", 24); }
  renderRole(server);
  if (dist(from, to) > 80) Object.assign(to, { x: from.x + 30, y: from.y });
}

// 행동 결과 (빛나는 곳)
async function playAct(data) {
  const ev = data.event;
  const actor = chars[ev.actor];
  actor.hop = 0.45;
  burst(actor.x, actor.y - 40, ev.bug ? "#ff5d6c" : "#ffc94a", 22);
  showDelta(actor, ev.delta);
  if (ev.bug) { SFX.err(); shake = 10; toast("⚠️ 버그 재현: 역할은 바뀌었는데 버튼이 그대로예요!", "danger"); } else SFX.ok();
  await sleep(500);
  await scene([
    { who: ev.actor === "student" ? "me" : "future", expr: "happy", text: ev.say },
    { who: ev.actor === "student" ? "future" : "me", expr: ev.bug ? "surprised" : "happy", text: ev.reply },
  ], { bg: PLACE_BG[currentRoom] || "classroom" });
  await afterTurn(data, ev);
}

// 사람에게 말 걸기
async function talkTo(n) {
  const data = await api("/api/meet", { who: n.key });
  if (!data) return;
  const ev = data.event;
  if (ev.type === "blocked") { SFX.err(); toast(data.alert, "danger"); return; }
  n.dir = chars[controlled].x > n.x ? 1 : -1;
  const bg = PLACE_BG[placeOf(n.key)] || "hallway";

  if (ev.kind === "side") {
    const list = STORY.common[`${n.key}_chat`];
    const lines = [...commonConvo(list, ev.idx)];
    if (n.key === "doyun") lines.push(...doyunReport());
    await scene(lines, { bg });
    if (Object.keys(ev.delta).length) {
      const [stat, v] = Object.entries(ev.delta)[0];
      showDelta(chars[controlled], ev.delta);
      toast(`✨ ${josa(castName(n.key), "과", "와")} 이야기했다! ${STAT_ICON[stat]} ${stat} +${v}`, "good");
    }
    return;
  }

  const h = STORY.heroines[n.key];
  if (ev.kind === "hint") {
    await scene(commonConvo(h.hints, ev.idx), { bg });
    toast(`💡 ${h.short} 공략 힌트 : 좋아하는 능력치는 ${STAT_ICON[h.likes]} ${h.likes}`, "good");
    return;
  }
  if (ev.kind === "chat") {
    await scene(commonConvo(h.chat, ev.idx), { bg });
    if (ev.aff) { heartBurst(n); toast(`💗 ${h.short} 호감도 +${ev.aff} (오늘 첫 대화)`, "good"); }
    const why = reasonText(h, ev.reason);
    if (why) setTimeout(() => toast(why), ev.aff ? 3100 : 0);
    return;
  }
  if (ev.kind === "event") {
    const e = h.events.find((x) => x.id === ev.id);
    banner(`💗 ${h.short} 이벤트<small>「${e.title}」</small>`);
    SFX.heart();
    await sleep(1300);
    const picks = await scene(e.lines, { bg: e.bg });
    const done = await api("/api/event", { who: n.key, id: ev.id, choices: picks });
    if (!done || done.event.type !== "event_done") return;
    heartBurst(n);
    SFX.heart();
    const a = done.event.aff;
    toast(`💗 ${h.short} 호감도 ${a >= 0 ? "+" : ""}${a}  (이야기 ${done.done[n.key].length}/12)`, "good");
    await sleep(600);
    await afterTurn(done, done.event);
  }
}

function reasonText(h, reason) {
  if (!reason) return "";
  if (reason === "aff") return `💭 ${josa(h.short, "과", "와")} 조금 더 친해져야 다음 이야기가 있을 것 같다. (매일 말 걸기 💗+1)`;
  if (reason === "day") return `💭 ${h.short}의 다음 이야기는 며칠 뒤에 볼 수 있을 것 같다.`;
  if (reason.startsWith("need:")) {
    const [, stat, need] = reason.split(":");
    return `💭 ${h.short}의 마음을 열려면 ${STAT_ICON[stat]} ${stat} ${need} 이상이 필요해 보인다.`;
  }
  return "";
}

// 도윤의 연애 정보 : 호감도가 높은 히로인 두 명의 마음을 알려 줌
function doyunReport() {
  const ranked = HEROINE_IDS.filter((h) => STORY.heroines[h])
    .sort((a, b) => server.aff[b] - server.aff[a]).slice(0, 2);
  const feel = (v) => v >= 60 ? "완전 너한테 빠졌던데?!" : v >= 40 ? "너를 꽤 특별하게 보는 것 같아."
    : v >= 20 ? "너한테 관심이 생긴 눈치야." : v > 0 ? "아직은 그냥 아는 사이 정도?" : "너를 잘 모르는 것 같아.";
  return [{ who: "doyun", expr: "happy", text: "참, 내 정보망에 따르면 말이지…" },
    ...ranked.map((h) => ({ who: "doyun", expr: "normal", text: `${STORY.heroines[h].short}${josa(STORY.heroines[h].short, "은", "는").slice(STORY.heroines[h].short.length)} ${feel(server.aff[h])}` }))];
}

function showDelta(actor, delta) {
  Object.entries(delta || {}).forEach(([stat, v], i) => {
    setTimeout(() => {
      floaters.push({ x: actor.x + (i - 0.5) * 34, y: actor.y - 78, life: 1.4,
                      text: `${STAT_ICON[stat]} ${v > 0 ? "+" : ""}${v}`, color: STAT_COLOR[stat] });
      popStat(stat);
    }, i * 160);
  });
}
function heartBurst(n) {
  for (let i = 0; i < 14; i++) floaters.push({ x: n.x + rand(-30, 30), y: n.y - 60 - rand(0, 30), life: rand(0.8, 1.6),
                                                text: "💗", color: "#ff7ab8" });
}


// ─────────────────────────────────────────────────────────────
// 8) 사람 배치 (교시마다 시간표대로 장소를 옮김)
// ─────────────────────────────────────────────────────────────
function placeOf(key) {
  const turn = server ? Math.min(server.turn, 5) : 1;
  if (STORY.heroines[key]) return STORY.heroines[key].schedule[turn - 1];
  return SIDE_SCHEDULE[key] ? SIDE_SCHEDULE[key][turn - 1] : null;
}
function randomIn(place) {
  const [x0, x1, y0, y1] = ZONES[place];
  for (let k = 0; k < 30; k++) {
    const p = { x: rand(x0, x1), y: rand(y0, y1) };
    if (!isBlocked(p.x, p.y)) return p;
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}
function buildNpcs() {
  npcs = [...HEROINE_IDS.filter((h) => STORY.heroines[h]), "doyun", "kim", "han"].map((k) => makeActor(k, 0, 0));
  placedFor = "";
  placeNpcs();
}
function placeNpcs() {
  if (!server) return;
  const key = `${server.day}-${server.turn}`;
  if (placedFor === key) return;
  placedFor = key;
  for (const n of npcs) {
    const p = randomIn(placeOf(n.key));
    Object.assign(n, p, { target: null, wait: rand(0, 2), bubble: null });
  }
}
function resetPositions() {
  Object.assign(chars.student, { x: 480, y: 292, dir: 1 });
  Object.assign(chars.future, { x: 430, y: 292, dir: 1 });
  controlled = server ? server.role : "student";
  trail = [];
}

// 히로인 이벤트를 지금 볼 수 있는지 (서버와 같은 조건 · 화면 표시용)
function eventStatus(hid) {
  const h = STORY.heroines[hid];
  const k = server.done[hid].length;
  if (k >= h.events.length) return { ready: false, all: true };
  const e = h.events[k];
  const needs = Object.entries(e.need || {});
  const ok = {
    day: server.day >= e.min_day,
    aff: server.aff[hid] >= e.min_aff,
    need: needs.every(([s, v]) => server.stats[s] >= v),
    today: !server.today.event.includes(hid),
  };
  return { ready: ok.day && ok.aff && ok.need && ok.today, ok, e, k, needs };
}


// ─────────────────────────────────────────────────────────────
// 9) HUD
// ─────────────────────────────────────────────────────────────
function renderHUD(d) {
  for (const stat of ["체력", "성적", "우정"]) {
    $(`bar-${stat}`).style.width = `${d.stats[stat]}%`;
    $(`val-${stat}`).textContent = d.stats[stat];
  }
  $("bar-체력").classList.toggle("low", d.stats["체력"] < 25);
  $("day").textContent = d.ended ? "은하제의 밤" : `${d.day}일째 · D-${d.max_day - d.day}`;
  $("clock").textContent = d.ended ? "20:00" : CLOCK[Math.min(d.turn, 5) - 1];
  $("turn").textContent = d.ended ? "" : `${Math.min(d.turn, d.max_turn)}교시`;
  $("periods").innerHTML = "";
  for (let i = 1; i <= d.max_turn; i++) {
    const dot = document.createElement("i");
    if (i < d.turn) dot.className = "done";
    else if (i === d.turn) dot.className = "now";
    if (i === 3) dot.classList.add("swap");
    $("periods").appendChild(dot);
  }
  renderRole(d);
  $("fix-state").textContent = d.fix_on ? "✅ 해결 기능 ON" : "⚠️ 해결 기능 OFF (버그)";
  $("fix-state").classList.toggle("off", !d.fix_on);
  $("fix-toggle").checked = d.fix_on;
  $("btn-undo").disabled = !d.can_undo;
  $("log").innerHTML = "";
  for (const line of [...d.log].reverse()) {
    const li = document.createElement("li");
    li.textContent = line;
    $("log").appendChild(li);
  }
}
let lastRoleDrawn = "";
function renderRole(d) {
  if (!d) return;
  const card = document.querySelector(".hud-card.role");
  $("role-name").textContent = d.role === "student" ? `${d.name || "나"} (학생)` : "미래의 나";
  card.classList.toggle("future", d.role === "future");
  if (lastRoleDrawn !== d.role) {
    drawPortrait($("role-face"), LOOKS[d.role], "normal");
    lastRoleDrawn = d.role;
    card.classList.add("bump");
    setTimeout(() => card.classList.remove("bump"), 300);
  }
}
function popStat(stat) {
  const el = $(`val-${stat}`).parentElement;
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}


// ─────────────────────────────────────────────────────────────
// 10) 호감도 수첩 (Tab)
// ─────────────────────────────────────────────────────────────
function openNotebook() {
  if (!server) return;
  const grid = $("nb-grid");
  grid.innerHTML = "";
  for (const hid of HEROINE_IDS) {
    const h = STORY.heroines[hid];
    if (!h) continue;
    const st = eventStatus(hid);
    const aff = server.aff[hid];
    const full = Math.min(5, Math.floor(aff / 20));
    const hearts = "♥".repeat(full) + "♡".repeat(5 - full);
    let next;
    if (st.all) next = aff >= server.ending_aff ? "✨ 모든 이야기를 봤어요! 은하제 밤을 기다려요."
                                               : `모든 이야기를 봤어요. 엔딩까지 호감도 ${server.ending_aff} 필요`;
    else {
      const parts = [`${st.ok.day ? "✅" : "⬜"} ${st.e.min_day}일째부터`, `${st.ok.aff ? "✅" : "⬜"} 호감도 ${st.e.min_aff}`];
      for (const [s, v] of st.needs) parts.push(`${server.stats[s] >= v ? "✅" : "⬜"} ${STAT_ICON[s]}${s} ${v}`);
      if (!st.ok.today) parts.push("⏳ 오늘은 이미 만남");
      next = `다음 이야기 (${st.k + 1}/12) : ${parts.join(" · ")}`;
    }
    const card = document.createElement("div");
    card.className = "nb-card";
    card.style.setProperty("--c", LOOKS[hid].hairColor);
    card.innerHTML = `
      <canvas class="nb-face"></canvas>
      <div class="nb-info">
        <div class="nb-name">${h.name} <small>${h.title}</small></div>
        <div class="nb-hearts">${hearts} <small>${aff}</small></div>
        <div class="nb-place">📍 지금 ${placeOf(hid)} · 좋아하는 능력치 ${STAT_ICON[h.likes]} ${h.likes} · 이야기 ${server.done[hid].length}/12</div>
        <div class="nb-profile">${h.profile}</div>
        <div class="nb-next ${st.ready ? "ready" : ""}">${st.ready ? "💗 지금 만나면 이벤트가 있어요!" : next}</div>
      </div>`;
    grid.appendChild(card);
    drawPortrait(card.querySelector("canvas"), LOOKS[hid], aff >= 40 ? "blush" : aff >= 15 ? "happy" : "normal");
  }
  $("nb-endings").textContent = endingSummary();
  helpReturn = mode;
  mode = "notebook";
  $("notebook").classList.remove("hidden");
}
function closeNotebook() {
  $("notebook").classList.add("hidden");
  mode = helpReturn === "notebook" ? "play" : helpReturn;
}

// 엔딩 수집 (브라우저에 저장)
const ENDING_KEY = "future-me-school-endings";
function loadEndings() { try { return JSON.parse(localStorage.getItem(ENDING_KEY)) || []; } catch (e) { return []; } }
function saveEnding(k) {
  try { const s = new Set(loadEndings()); s.add(k); localStorage.setItem(ENDING_KEY, JSON.stringify([...s])); } catch (e) {}
}
function endingSummary() {
  const got = loadEndings();
  const names = HEROINE_IDS.filter((h) => got.includes(`h:${h}`)).map((h) => (STORY.heroines[h] ? STORY.heroines[h].short : h));
  return `🏆 모은 엔딩 ${got.length}/8${names.length ? " · 💗 " + names.join(", ") : ""}`;
}


// ─────────────────────────────────────────────────────────────
// 11) 행동 메뉴 (빛나는 곳)
// ─────────────────────────────────────────────────────────────
function openMenu() {
  if (!server || !nearSpot) return;
  mode = "menu";
  const room = nearSpot;
  const place = server.places[room];
  const roleName = server.role_name;
  $("menu-title").textContent = `${place.emoji} ${room} — ${roleName}의 행동`;
  $("menu").classList.toggle("bug", server.mismatch);
  $("menu-warn").classList.toggle("hidden", !server.mismatch);
  $("menu-warn").textContent = `⚠️ 버그 재현 중 : 지금 역할은 ${roleName}인데 학생 행동이 나와요!`;
  const list = $("menu-list");
  list.innerHTML = "";
  server.buttons.forEach((name, i) => {
    const fx = { ...server.action_info[name] };
    fx[place.bonus] = (fx[place.bonus] || 0) + server.place_bonus;
    const fxHtml = Object.entries(fx).filter(([, v]) => v !== 0)
      .map(([k, v]) => `<span class="${v > 0 ? "up" : "down"}">${STAT_ICON[k]}${v > 0 ? "+" : ""}${v}</span>`).join(" ");
    const hp = server.action_info[name]["체력"] || 0;
    const tired = hp < 0 && server.stats["체력"] + hp < 10;
    const btn = document.createElement("button");
    btn.className = "menu-item";
    btn.innerHTML = `<span class="num">${i + 1}</span><span>${name}${tired ? " 😵" : ""}</span><span class="fx">${fxHtml}</span>`;
    btn.onmouseenter = () => { menuSel = i; paintMenu(); };
    btn.onclick = () => chooseAction(i);
    list.appendChild(btn);
  });
  menuSel = Math.min(menuSel, server.buttons.length - 1);
  paintMenu();
  $("menu").classList.remove("hidden");
  $("prompt").classList.add("hidden");
}
function paintMenu() { [...$("menu-list").children].forEach((el, i) => el.classList.toggle("sel", i === menuSel)); }
function closeMenu(sound = true) {
  $("menu").classList.add("hidden");
  if (mode === "menu") mode = "play";
  if (sound) SFX.close();
}
async function chooseAction(i) {
  const name = server.buttons[i];
  const room = nearSpot;
  closeMenu(false);
  if (!name || !room) return;
  const data = await api("/api/act", { place: room, action: name });
  if (!data) return;
  if (data.event.type === "blocked") {
    SFX.err(); shake = 6; toast(data.alert, "danger");
    const me = chars[controlled]; me.expr = "tired"; me.exprT = 2; me.emote = { text: "💦", t: 1.6 };
    return;
  }
  await playAct(data);
}


// ─────────────────────────────────────────────────────────────
// 12) 키보드
//    e.code 는 "키의 위치" 이름이라서 한글 입력 상태에서도 WASD 가 동작한다
// ─────────────────────────────────────────────────────────────
const MOVE = { left: ["ArrowLeft", "KeyA"], right: ["ArrowRight", "KeyD"], up: ["ArrowUp", "KeyW"], down: ["ArrowDown", "KeyS"] };
const held = (dir) => MOVE[dir].some((code) => keys.has(code));

window.addEventListener("keydown", (e) => {
  if (document.activeElement && document.activeElement.tagName === "INPUT" && e.code !== "Enter") return;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code.startsWith("Control")) vn.skip = true;          // Ctrl 을 누르고 있는 동안 스킵
  if (e.shiftKey) keys.add("Shift");
  if (e.repeat) return;
  onKey(e.code);
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (!e.shiftKey) keys.delete("Shift");
  if (e.code.startsWith("Control") && !$("vn-skip").classList.contains("on")) vn.skip = false;
});
window.addEventListener("blur", () => { keys.clear(); if (!$("vn-skip").classList.contains("on")) vn.skip = false; });

function onKey(code) {
  if (code === "KeyM") return toggleMute();
  if (code === "KeyV") return toggleVoice();
  if (mode === "title") { if (code === "Enter") startGame(!(server && server.intro_done && !server.ended)); return; }
  if (mode === "help") { if (["KeyH", "Escape", "Enter"].includes(code)) toggleHelp(); return; }
  if (mode === "notebook") { if (["Tab", "KeyP", "Escape"].includes(code)) closeNotebook(); return; }
  if (!$("vn-log").classList.contains("hidden")) { if (["KeyL", "Escape"].includes(code)) toggleLog(); return; }
  if (mode === "scene") {
    if (vn.choosing) {
      if (code.startsWith("Digit")) { const i = Number(code.slice(5)) - 1; if (i >= 0 && i < vn.choosing.length) pickChoice(i); }
      return;
    }
    if (["Space", "Enter", "KeyE"].includes(code)) advanceVn();
    else if (code === "KeyA") toggleAuto();
    else if (code === "KeyL") toggleLog();
    return;
  }
  if (mode === "daycard") return;
  if (code === "KeyH") return toggleHelp();
  if (mode === "ending") { if (code === "Enter") newGame(); return; }
  if (code === "Tab" || code === "KeyP") return openNotebook();

  if (mode === "menu") {
    const n = server.buttons.length;
    if (code === "ArrowUp" || code === "KeyW") { menuSel = (menuSel - 1 + n) % n; paintMenu(); SFX.move(); }
    else if (code === "ArrowDown" || code === "KeyS") { menuSel = (menuSel + 1) % n; paintMenu(); SFX.move(); }
    else if (["Enter", "Space", "KeyE"].includes(code)) chooseAction(menuSel);
    else if (code.startsWith("Digit")) { const i = Number(code.slice(5)) - 1; if (i >= 0 && i < n) chooseAction(i); }
    else if (code === "Escape" || code === "Backspace") closeMenu();
    return;
  }

  if (["Space", "KeyE", "Enter"].includes(code)) {
    if (busy || !server || server.ended) return;
    if (nearNpc) talkTo(nearNpc);
    else if (nearSpot) { SFX.open(); openMenu(); }
    else toast("빛나는 곳이나 사람 가까이 가서 눌러 주세요 ✨");
  }
  else if (code === "KeyU") doUndo();
  else if (code === "KeyQ") doSwap();
  else if (code === "KeyF" && server) doFix(!server.fix_on);
}

async function doUndo() {
  const d = await api("/api/undo", {});
  if (!d) return;
  if (d.event.type === "blocked") { toast(d.alert, "danger"); return; }
  SFX.undo(); toast(d.alert);
  if (d.role !== controlled) switchControl(d.role);
  hideEnding();
  placeNpcs();
}
async function doSwap() {
  const d = await api("/api/swap", {});
  if (!d) return;
  if (d.event.type === "blocked") { toast(d.alert, "danger"); return; }
  flash(); shake = 14; SFX.swap();
  banner(`⚡ 역할 체인지! ⚡<small>이제 나는 ${d.role_name}</small>`);
  switchControl(d.role);
}
async function doFix(on) {
  const d = await api("/api/fix", { on });
  if (!d) return;
  SFX.move();
  toast(d.alert, d.fix_on ? "good" : "danger");
  if (mode === "menu") openMenu();
}
function toggleAuto() { vn.auto = !vn.auto; $("vn-auto").classList.toggle("on", vn.auto); }
function toggleSkip() { vn.skip = !vn.skip; $("vn-skip").classList.toggle("on", vn.skip); }
function toggleLog() {
  const box = $("vn-log");
  if (box.classList.contains("hidden")) {
    $("vn-log-list").innerHTML = backlog.slice(-120).map((b) =>
      `<div class="lg"><b>${b.name}</b><span>${b.text.replace(/</g, "&lt;")}</span></div>`).join("");
    box.classList.remove("hidden");
    $("vn-log-list").scrollTop = 1e9;
  } else box.classList.add("hidden");
}


// ─────────────────────────────────────────────────────────────
// 13) 움직임 (매 프레임)
// ─────────────────────────────────────────────────────────────
const SPEED = 190;
function isBlocked(x, y) {
  const b = { x: x - 10, y: y - 6, w: 20, h: 12 };
  return SOLIDS.some((r) => b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y);
}
function moveBy(c, dx, dy) {
  if (!isBlocked(c.x + dx, c.y)) c.x += dx;
  if (!isBlocked(c.x, c.y + dy)) c.y += dy;
}
function roomAt(x, y) {
  for (const [name, r] of Object.entries(ROOMS))
    if (x > r.x + T / 2 && x < r.x + r.w - T / 2 && y > r.y + T / 2 && y < r.y + r.h - T / 2) return name;
  return null;
}

function update(dt) {
  clockTime += dt;
  const me = chars[controlled];
  const buddy = chars[other(controlled)];

  me.moving = false;
  if (mode === "play") {
    const dx = (held("right") ? 1 : 0) - (held("left") ? 1 : 0);
    const dy = (held("down") ? 1 : 0) - (held("up") ? 1 : 0);
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const run = keys.has("Shift");
      const speed = SPEED * (run ? 1.6 : 1);
      const ox = me.x, oy = me.y;
      moveBy(me, (dx / len) * speed * dt, (dy / len) * speed * dt);
      if (dx) me.dir = Math.sign(dx);
      if (me.x !== ox || me.y !== oy) {
        me.moving = true;
        me.walk += dt * (run ? 16 : 11);
        trail.push({ x: me.x, y: me.y });
        if (trail.length > 400) trail.shift();
        stepTimer -= dt;
        if (stepTimer <= 0) { SFX.step(); stepTimer = run ? 0.18 : 0.27; }
      }
    }
  }

  buddy.moving = false;
  if (trail.length > FOLLOW_GAP && dist(buddy, me) > 42) {
    const target = trail[trail.length - FOLLOW_GAP];
    const d = dist(buddy, target);
    if (d > 1) {
      const step = Math.min(d, SPEED * 1.15 * dt);
      const vx = ((target.x - buddy.x) / d) * step;
      buddy.x += vx;
      buddy.y += ((target.y - buddy.y) / d) * step;
      if (Math.abs(vx) > 0.1) buddy.dir = Math.sign(vx);
      buddy.moving = true;
      buddy.walk += dt * 11;
    }
  } else if (dist(buddy, me) < 120) buddy.dir = me.x > buddy.x ? 1 : -1;

  for (const n of npcs) updateNpc(n, dt, me);

  for (const c of [chars.student, chars.future, ...npcs]) {
    if (!c.moving) c.walk = 0;
    if (c.spin > 0) c.spin = Math.max(0, c.spin - dt);
    if (c.hop > 0) c.hop = Math.max(0, c.hop - dt);
    if (c.exprT > 0) c.exprT -= dt;
    if (c.emote) { c.emote.t -= dt; if (c.emote.t <= 0) c.emote = null; }
    if (c.bubble) { c.bubble.t -= dt; if (c.bubble.t <= 0) c.bubble = null; }
    c.blinkT -= dt;
    if (c.blinkT < -0.13) c.blinkT = rand(2, 5);
  }

  currentRoom = roomAt(me.x, me.y);
  nearSpot = currentRoom && dist(me, ROOMS[currentRoom].spot) < SPOT_RADIUS ? currentRoom : null;
  nearNpc = null;
  let best = TALK_RADIUS;
  for (const n of npcs) { const d = dist(n, me); if (d < best) { best = d; nearNpc = n; } }

  const canPrompt = mode === "play" && server && !server.ended;
  if (canPrompt && nearNpc) {
    const name = castName(nearNpc.key);
    const isH = !!STORY.heroines[nearNpc.key];
    const ready = isH && controlled === "student" && eventStatus(nearNpc.key).ready;
    const tag = controlled === "future" && isH ? " <small>💡 힌트</small>" : ready ? " <small>💗 이벤트!</small>" : "";
    $("prompt").innerHTML = `<kbd>Space</kbd> 💬 ${josa(name, "과", "와")} 대화하기${tag}`;
  } else if (canPrompt && nearSpot) {
    $("prompt").innerHTML = `<kbd>Space</kbd> ${server.places[nearSpot].emoji} ${nearSpot}에서 행동하기`;
  }
  $("prompt").classList.toggle("hidden", !(canPrompt && (nearNpc || nearSpot)));

  updateVn(dt);

  // 점수판 뒤에 사람(나 또는 히로인·조연)이 가려지면 그 점수판을 반투명하게
  const cr = canvas.getBoundingClientRect();
  const spots = [me, ...npcs].map((c) => ({ x: cr.left + (c.x / W) * cr.width, y: cr.top + ((c.y - 30) / H) * cr.height }));
  for (const el of document.querySelectorAll(".hud-card")) {
    const r = el.getBoundingClientRect();
    el.classList.toggle("faded", spots.some((p) => p.x > r.left - 20 && p.x < r.right + 20 && p.y > r.top - 30 && p.y < r.bottom + 40));
  }

  floaters = floaters.filter((f) => (f.life -= dt) > 0);
  for (const f of floaters) f.y -= 38 * dt;
  particles = particles.filter((p) => (p.life -= dt) > 0);
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.rot += p.vr * dt; }
  for (const p of petals) {
    p.x += (p.vx + Math.sin(clockTime * 1.5 + p.sway) * 20) * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.y > H + 10 || p.x > W + 20) Object.assign(p, newPetal(false));
  }
  shake = Math.max(0, shake - dt * 40);
}

function updateNpc(n, dt, me) {
  n.moving = false;
  if (dist(n, me) < 60) { n.dir = me.x > n.x ? 1 : -1; return; }
  if (n.wait > 0) { n.wait -= dt; return; }
  const place = placeOf(n.key);
  if (!place) return;
  const [x0, x1, y0, y1] = ZONES[place];
  if (!n.target) n.target = { x: rand(x0, x1), y: rand(y0, y1) };
  const dd = dist(n, n.target);
  if (dd < 3) { n.target = null; n.wait = rand(1.5, 4); return; }
  const speed = n.key === "bom" ? 70 : 32;
  const step = Math.min(dd, speed * dt);
  const vx = ((n.target.x - n.x) / dd) * step;
  const ox = n.x, oy = n.y;
  moveBy(n, vx, ((n.target.y - n.y) / dd) * step);
  if (n.x === ox && n.y === oy) { n.target = null; n.wait = 0.4; return; }
  n.moving = true;
  n.walk += dt * (speed > 60 ? 14 : 9);
  if (Math.abs(vx) > 0.05) n.dir = Math.sign(vx);
}


// ─────────────────────────────────────────────────────────────
// 14) 지도 그리기
// ─────────────────────────────────────────────────────────────
const canvas = $("world");
const ctx = canvas.getContext("2d");
let scale = 1;
const SPRITE = 0.62;   // 지도 위 캐릭터 크기 배율 (키 약 100 → 62픽셀)
function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  scale = canvas.width / W;
}
window.addEventListener("resize", () => { resize(); if (STORY.common) drawTitleArt(); });

function rr(x, y, w, h, r, fillC, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fillC) { ctx.fillStyle = fillC; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function ellipse(x, y, rx, ry, fillC) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fillC;
  ctx.fill();
}
const FONT = (size) => `${size}px Jua, "Malgun Gothic", sans-serif`;

function draw() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  drawFloors();
  drawFurniture();
  drawSpots();
  drawWalls();
  drawRoomSigns();
  const me = chars[controlled];
  const all = [chars.student, chars.future, ...npcs].sort((a, b) => a.y - b.y);
  for (const c of all) drawActor(c, c === me, me);
  for (const c of all) if (c.bubble) drawBubble(c);
  if (server) {
    ctx.fillStyle = TINT[Math.min(server.turn, 5) - 1];
    ctx.fillRect(0, 0, W, H);
  }
  drawPetals();
  drawParticles();
  drawFloaters();
  drawVn();
}

function drawFloors() {
  ctx.fillStyle = "#d9d5e6";
  ctx.fillRect(0, 240, W, 100);
  ctx.strokeStyle = "#c7c2d8";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 240); ctx.lineTo(x, 340); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(0, 290); ctx.lineTo(W, 290); ctx.stroke();
  floorPlanks(ROOMS["교실"], "#efd3a0", "#e3c48e");
  floorPlanks(ROOMS["도서관"], "#d8b083", "#cca274");
  rr(360, 120, 240, 100, 10, "#b5544c55");
  checker(ROOMS["급식실"], "#f6f2e8", "#e6dfcf", 30);
  checker(ROOMS["보건실"], "#e9faf3", "#d4f0e5", 32);
  const g = ROOMS["운동장"];
  for (let x = g.x; x < g.x + g.w; x += 40) {
    ctx.fillStyle = (x / 40) % 2 ? "#78c862" : "#6dbb58";
    ctx.fillRect(x, g.y, 40, g.h);
  }
  ctx.strokeStyle = "#ffffffaa";
  ctx.lineWidth = 3;
  ctx.strokeRect(350, 372, 580, 200);
  ctx.beginPath(); ctx.moveTo(640, 372); ctx.lineTo(640, 572); ctx.stroke();
  ctx.beginPath(); ctx.arc(640, 472, 46, 0, Math.PI * 2); ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.12 + Math.sin(clockTime * 0.6) * 0.03;
  ctx.fillStyle = "#fffbe0";
  for (const x0 of [40, 360, 680]) {
    ctx.beginPath();
    ctx.moveTo(x0, 12); ctx.lineTo(x0 + 60, 12); ctx.lineTo(x0 + 140, 230); ctx.lineTo(x0 + 80, 230);
    ctx.fill();
  }
  ctx.restore();
}
function floorPlanks(r, a, b) {
  for (let y = r.y; y < r.y + r.h; y += 20) { ctx.fillStyle = (y / 20) % 2 ? a : b; ctx.fillRect(r.x, y, r.w, 20); }
}
function checker(r, a, b, s) {
  for (let y = r.y; y < r.y + r.h; y += s)
    for (let x = r.x; x < r.x + r.w; x += s) { ctx.fillStyle = ((x + y) / s) % 2 ? a : b; ctx.fillRect(x, y, s, s); }
}

const BOOK_COLORS = ["#e85d75", "#4f86f7", "#ffcf4a", "#3ec28f", "#a26bf5", "#ff9548"];
function drawFurniture() {
  for (const f of FURNITURE) if (f.kind !== "goal") rr(f.x + 2, f.y + 4, f.w, f.h, 4, "rgba(40,20,60,0.13)");
  rr(70, 16, 180, 36, 4, "#8a5a2b");
  rr(74, 19, 172, 30, 3, "#2f5d4a");
  ctx.fillStyle = "#ffffffcc";
  ctx.font = FONT(13);
  ctx.textAlign = "center";
  ctx.fillText(server ? `은하제까지 D-${server.max_day - server.day}` : "은하제 준비 중!", 160, 39);
  for (let i = 0; i < 4; i++) {
    const x = 338 + i * 74;
    rr(x, 14, 66, 50, 3, "#7a4b26");
    for (let row = 0; row < 2; row++)
      for (let k = 0; k < 8; k++) {
        ctx.fillStyle = BOOK_COLORS[(i * 7 + row * 3 + k) % BOOK_COLORS.length];
        ctx.fillRect(x + 4 + k * 7.4, 18 + row * 23, 6, 19 - ((k + row) % 3) * 2);
      }
  }
  rr(660, 14, 280, 40, 6, "#bfc4d1");
  rr(660, 14, 280, 10, 6, "#d7dbe5");
  [["#ff8a5c", 700], ["#ffe066", 760], ["#7bd389", 820], ["#f5f5f5", 880]].forEach(([c, x]) => {
    ellipse(x, 38, 20, 9, "#8f95a5");
    ellipse(x, 36, 17, 7, c);
  });
  rr(40, 520, 40, 40, 6, "#ffffff");
  ctx.fillStyle = "#ff4d5e";
  ctx.fillRect(56, 526, 8, 28);
  ctx.fillRect(46, 536, 28, 8);
  for (const f of FURNITURE) {
    if (f.kind === "desk") { rr(f.x, f.y, f.w, f.h, 3, "#c8955c"); rr(f.x, f.y, f.w, 4, 3, "#dcae78"); rr(f.x + 8, f.y + f.h + 2, 20, 8, 2, "#8c6239"); }
    else if (f.kind === "teacher") { rr(f.x, f.y, f.w, f.h, 3, "#9c6b3d"); rr(f.x, f.y, f.w, 4, 3, "#b98450"); }
    else if (f.kind === "readtable") { rr(f.x, f.y, f.w, f.h, 4, "#8f5e34"); ellipse(f.x + f.w - 16, f.y + 12, 8, 8, "#3ec28f"); rr(f.x + 12, f.y + 10, 22, 16, 2, "#fff8e7"); }
    else if (f.kind === "lunchtable") { rr(f.x, f.y, f.w, f.h, 6, "#f0a35e"); for (let k = 0; k < 3; k++) rr(f.x + 12 + k * 34, f.y + 7, 20, 14, 3, "#d8dde6"); }
    else if (f.kind === "bed") { rr(f.x, f.y, f.w, f.h, 6, "#ffffff", "#c9d6e2"); rr(f.x + 8, f.y + 6, f.w - 16, 18, 6, "#a8d5ff"); rr(f.x + 4, f.y + 40, f.w - 8, f.h - 46, 6, "#7fc7b5"); }
    else if (f.kind === "cabinet") { rr(f.x, f.y, f.w, f.h, 4, "#e5ecf4", "#aab8c8"); ctx.fillStyle = "#ff4d5e"; ctx.fillRect(f.x + 21, f.y + 10, 8, 20); ctx.fillRect(f.x + 15, f.y + 16, 20, 8); }
    else if (f.kind === "goal") {
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 3; ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.strokeStyle = "#ffffff66"; ctx.lineWidth = 1;
      for (let y = f.y; y < f.y + f.h; y += 8) { ctx.beginPath(); ctx.moveTo(f.x, y); ctx.lineTo(f.x + f.w, y); ctx.stroke(); }
    } else if (f.kind === "locker") {
      for (let x = f.x; x < f.x + f.w - 2; x += 22) {
        rr(x, f.y, 20, f.h, 2, "#5b7bd5");
        ctx.fillStyle = "#3f5bb0"; ctx.fillRect(x + 4, f.y + 4, 12, 2); ctx.fillRect(x + 4, f.y + 8, 12, 2);
      }
    }
  }
}
function drawSpots() {
  for (const [name, r] of Object.entries(ROOMS)) {
    const s = r.spot;
    const near = nearSpot === name;
    const pulse = (Math.sin(clockTime * 4) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = near ? 0.55 : 0.25 + pulse * 0.2;
    ellipse(s.x, s.y, 34 + pulse * 6, 14 + pulse * 3, near ? "#ffe27a" : "#fff3b0");
    ctx.restore();
    ctx.strokeStyle = near ? "#ffc94a" : "#ffffffaa";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, 34, 14, 0, 0, Math.PI * 2); ctx.stroke();
    const bob = Math.sin(clockTime * 3 + s.x) * 4;
    ctx.font = FONT(near ? 30 : 24);
    ctx.textAlign = "center";
    ctx.fillText(r.icon, s.x, s.y - 18 + bob);
  }
}
function drawWalls() {
  for (const w of WALLS) {
    ctx.fillStyle = "#3a3560"; ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = "#5c5592"; ctx.fillRect(w.x, w.y, w.w, Math.min(4, w.h));
  }
}
function drawRoomSigns() {
  ctx.font = FONT(15);
  ctx.textAlign = "left";
  for (const [name, r] of Object.entries(ROOMS)) {
    const p = server ? server.places[name] : null;
    const label = p ? `${p.emoji} ${name}  ${STAT_ICON[p.bonus]}+5` : name;
    const tw = ctx.measureText(label).width;
    const { x, y } = r.sign;
    const here = currentRoom === name;
    rr(x, y, tw + 16, 24, 12, here ? "#1b1930ee" : "#1b193099");
    ctx.fillStyle = here ? "#ffc94a" : "#ffffff";
    ctx.fillText(label, x + 8, y + 17);
  }
}

function drawActor(c, isMe, me) {
  const L = c.look;
  const tall = figureHeight(L) * SPRITE;
  const bob = c.moving ? Math.abs(Math.sin(c.walk)) * 1.6 : Math.sin(clockTime * 2.2 + c.x) * 0.35;
  const hop = c.hop > 0 ? Math.sin((c.hop / 0.45) * Math.PI) * 14 : 0;
  ellipse(c.x, c.y + 1, 13, 4.5, "rgba(30,10,40,0.22)");
  ctx.save();
  ctx.translate(c.x, c.y - bob - hop);
  if (c.spin > 0) ctx.scale(Math.cos(c.spin * 21), 1);
  ctx.scale(c.dir * SPRITE, SPRITE);
  drawFigure(ctx, L, { moving: c.moving, walk: c.walk, expr: c.exprT > 0 ? c.expr : "normal", blink: c.blinkT < 0, ol: 1.3,
                       sway: Math.sin(clockTime * 1.7 + c.x) * 0.8 });
  ctx.restore();

  const top = c.y - tall - bob - hop;
  const isHero = c === chars.student || c === chars.future;
  const isH = !!STORY.heroines[c.key];
  if (isHero || isH || dist(c, me) < 150) {
    ctx.font = FONT(isHero ? 13 : 12);
    ctx.textAlign = "center";
    const label = isMe ? `${castName(c.key)} (나)` : castName(c.key);
    const tw = ctx.measureText(label).width;
    const bgc = isMe ? "#7c6cff" : isHero ? "#1b1930bb" : isH ? LOOKS[c.key].hairColor : "#ffffffdd";
    rr(c.x - tw / 2 - 6, top - 14, tw + 12, 17, 8.5, bgc);
    ctx.fillStyle = isMe || isHero || isH ? "#fff" : "#2a2742";
    if (isH && c.key === "sion") ctx.fillStyle = "#2a2742";     // 밝은 머리색엔 어두운 글씨
    ctx.fillText(label, c.x, top - 1.5);
  }
  if (isMe) {
    const ay = top - 22 + Math.sin(clockTime * 6) * 3;
    ctx.fillStyle = "#ffc94a";
    ctx.beginPath(); ctx.moveTo(c.x - 6, ay - 6); ctx.lineTo(c.x + 6, ay - 6); ctx.lineTo(c.x, ay + 1); ctx.fill();
  }
  // 히로인 머리 위 표시 : 💗 = 이벤트 있음, 💡 = (미래의 나일 때) 힌트
  if (isH && server && !server.ended) {
    let mark = "";
    if (controlled === "future") mark = "💡";
    else if (eventStatus(c.key).ready) mark = "💗";
    if (mark) {
      ctx.font = FONT(20);
      ctx.textAlign = "center";
      ctx.fillText(mark, c.x, top - 20 + Math.sin(clockTime * 4 + c.x) * 3);
    }
  }
  if (c.emote) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, c.emote.t * 3);
    ctx.font = FONT(20);
    ctx.textAlign = "center";
    ctx.lineWidth = 4; ctx.strokeStyle = "#ffffff"; ctx.fillStyle = "#ff7ab8";
    ctx.strokeText(c.emote.text, c.x + 20, top - 16);
    ctx.fillText(c.emote.text, c.x + 20, top - 16);
    ctx.restore();
  }
}
function wrapText(text, maxW) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}
function drawBubble(c) {
  ctx.font = FONT(13);
  const lines = wrapText(c.bubble.text, 150);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
  const h = lines.length * 17 + 10;
  const tall = figureHeight(c.look) * SPRITE;
  const x = Math.min(Math.max(c.x - w / 2, 8), W - w - 8);
  const y = Math.max(6, c.y - tall - 24 - h);
  ctx.save();
  ctx.globalAlpha = Math.min(1, c.bubble.t * 3);
  rr(x, y, w, h, 9, "#ffffff", "#1b193033");
  ctx.fillStyle = "#2a2742"; ctx.textAlign = "left";
  lines.forEach((l, i) => ctx.fillText(l, x + 9, y + 18 + i * 17));
  ctx.restore();
}
function drawPetals() {
  for (const p of petals) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = 0.85;
    ellipse(0, 0, p.size, p.size * 0.55, "#ffc4dd");
    ellipse(-p.size * 0.3, 0, p.size * 0.35, p.size * 0.2, "#ff9cc4");
    ctx.restore();
  }
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 260, life: 0.7 + Math.random() * 0.5,
                     color, size: 3 + Math.random() * 3, rot: 0, vr: 0 });
  }
}
function confetti() {
  const colors = ["#ffc94a", "#7c6cff", "#ff5d7a", "#4fd6a0", "#6ea8ff", "#ffc4dd"];
  for (let i = 0; i < 160; i++)
    particles.push({ x: Math.random() * W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 60,
                     vy: 60 + Math.random() * 100, g: 30, life: 4 + Math.random() * 2, color: colors[i % colors.length],
                     size: 5 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, flat: true });
}
function drawParticles() {
  for (const p of particles) {
    ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color;
    if (p.flat) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
function drawFloaters() {
  ctx.textAlign = "center";
  ctx.font = FONT(22);
  for (const f of floaters) {
    ctx.save(); ctx.globalAlpha = Math.min(1, f.life * 1.5);
    ctx.lineWidth = 4; ctx.strokeStyle = "#1b1930"; ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}


// ─────────────────────────────────────────────────────────────
// 15) 화면 전환 / 알림 / 시작 · 엔딩
// ─────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(text, kind = "") {
  const t = $("toast");
  t.textContent = text;
  t.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}
function banner(html) { const b = $("banner"); b.innerHTML = html; b.classList.remove("show"); void b.offsetWidth; b.classList.add("show"); }
function flash() { const f = $("flash"); f.classList.remove("show"); void f.offsetWidth; f.classList.add("show"); }

function drawTitleArt() {
  document.querySelectorAll("#title-heroines canvas").forEach((cv) => drawPortrait(cv, LOOKS[cv.dataset.key], "happy"));
  drawPortrait($("tp-student"), LOOKS.student, "normal");
  drawPortrait($("tp-future"), LOOKS.future, "happy");
}
function buildTitle() {
  const box = $("title-heroines");
  box.innerHTML = "";
  for (const hid of HEROINE_IDS) {
    const h = STORY.heroines[hid];
    if (!h) continue;
    const item = document.createElement("div");
    item.className = "th-item";
    item.style.setProperty("--c", LOOKS[hid].hairColor);
    item.innerHTML = `<canvas data-key="${hid}"></canvas><b>${h.short}</b><small>${h.title}</small>`;
    box.appendChild(item);
  }
  const saved = server && server.intro_done && !server.ended;
  $("btn-continue").classList.toggle("hidden", !saved);
  $("btn-start").innerHTML = saved ? "✨ 새 게임" : "▶ 시작하기 <small>(Enter)</small>";
  $("name-input").value = (server && server.name) || "";
  $("title-endings").textContent = endingSummary();
  drawTitleArt();
}

async function startGame(fresh) {
  initAudio();
  SFX.ok();
  if (fresh) await api("/api/reset", {});
  const name = $("name-input").value.trim();
  if (name !== server.name) await api("/api/name", { name });
  $("title").classList.add("hidden");
  mode = "play";
  resetPositions();
  placedFor = "";
  placeNpcs();
  lastRoleDrawn = "";
  renderRole(server);
  if (!server.intro_done) {
    await scene(STORY.common.prologue, { bg: STORY.common.days["1"].bg });
    await api("/api/intro", {});
    await dayCard(1);
    await scene(STORY.common.days["1"].morning, { bg: STORY.common.days["1"].bg });
    toast("WASD/방향키 이동 · 사람이나 빛나는 곳에서 Space · Tab 호감도 수첩 📒", "good");
  } else {
    toast(`📂 ${server.day}일째 ${server.turn}교시부터 이어서 해요!`, "good");
  }
}
function newGame() {
  hideEnding();
  $("title").classList.remove("hidden");
  mode = "title";
  buildTitle();
}

function toggleHelp() {
  const help = $("help");
  if (mode === "help") { help.classList.add("hidden"); mode = helpReturn; }
  else { if (mode === "menu") closeMenu(false); helpReturn = mode; help.classList.remove("hidden"); mode = "help"; }
}
// 🎙 더빙 켜기/끄기 (설정은 브라우저에 기억)
function toggleVoice() {
  Voice.enabled = !Voice.enabled;
  try { localStorage.setItem("future-me-school-voice", Voice.enabled ? "1" : "0"); } catch (e) {}
  paintVoice();
  if (!Voice.enabled) toast("🔇 더빙 꺼짐");
  else if (Voice.hasVoices()) toast(`🎙 더빙 켜짐 (여: ${Voice.voiceName("f")} / 남: ${Voice.voiceName("m")})`, "good");
  else toast("🎙 더빙 켜짐 — 이 브라우저에는 한국어 음성이 없어요. Edge 브라우저를 추천해요.", "danger");
}
function paintVoice() {
  $("btn-voice").innerHTML = `${Voice.enabled ? "🎙" : "🔇"} 더빙 <kbd>V</kbd>`;
  $("vn-voice").classList.toggle("on", Voice.enabled);
}
function loadVoicePref() {
  try { const v = localStorage.getItem("future-me-school-voice"); if (v !== null) Voice.enabled = v === "1"; } catch (e) {}
  paintVoice();
}

function toggleMute() {
  muted = !muted;
  $("btn-mute").innerHTML = `${muted ? "🔇" : "🔊"} 소리 <kbd>M</kbd>`;
  toast(muted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐");
}

function showEnding(d, title) {
  mode = "ending";
  const e = d.ending;
  const hero = e.type === "heroine" ? e.id : "future";
  $("ending-kind").textContent = e.type === "heroine" ? `💗 ${STORY.heroines[e.id].short} 엔딩` : "🌙 노멀 엔딩";
  $("ending-title").textContent = `「${title}」`;
  $("ending-grade").textContent = d.grade;
  $("ending-stats").innerHTML = Object.entries(d.stats).map(([k, v]) => `<span>${STAT_ICON[k]} ${k} ${v}</span>`).join("");
  $("ending-hearts").innerHTML = HEROINE_IDS.filter((h) => STORY.heroines[h])
    .map((h) => `<span style="--c:${LOOKS[h].hairColor}">${STORY.heroines[h].short} 💗${d.aff[h]}</span>`).join("");
  $("ending-collect").textContent = endingSummary();
  $("ending").classList.remove("hidden");
  drawPortrait($("ep-face"), LOOKS[hero], "happy");
  confetti();
  SFX.end();
}
function hideEnding() { $("ending").classList.add("hidden"); if (mode === "ending") mode = "play"; }


// ─────────────────────────────────────────────────────────────
// 16) 버튼 연결 + 시작
// ─────────────────────────────────────────────────────────────
$("btn-start").onclick = () => startGame(true);
$("btn-continue").onclick = () => startGame(false);
$("btn-help").onclick = toggleHelp;
$("btn-help-close").onclick = toggleHelp;
$("btn-mute").onclick = toggleMute;
$("btn-note").onclick = () => (mode === "notebook" ? closeNotebook() : mode === "play" && openNotebook());
$("nb-close").onclick = closeNotebook;
$("btn-undo").onclick = () => mode === "play" && doUndo();
$("btn-swap").onclick = () => mode === "play" && doSwap();
$("btn-reset").onclick = () => { if (mode !== "scene" && mode !== "title" && confirmReset()) newGame(); };
$("btn-again").onclick = newGame;
$("fix-toggle").onchange = (e) => doFix(e.target.checked);
$("vn").onclick = (e) => { if (!e.target.closest("button")) advanceVn(); };
$("vn-auto").onclick = (e) => { e.stopPropagation(); toggleAuto(); };
$("vn-skip").onclick = (e) => { e.stopPropagation(); toggleSkip(); };
$("vn-logbtn").onclick = (e) => { e.stopPropagation(); toggleLog(); };
$("vn-voice").onclick = (e) => { e.stopPropagation(); toggleVoice(); };
$("btn-voice").onclick = toggleVoice;
$("vn-log").onclick = (e) => { e.stopPropagation(); toggleLog(); };
document.querySelectorAll("#toolbar button, #toolbar input, .vn-tools button").forEach((el) =>
  el.addEventListener("click", () => el.blur()));
// 실수로 누르지 않게 한 번 더 누르게 하기 (브라우저 확인창 대신)
let resetArmed = 0;
function confirmReset() {
  if (Date.now() - resetArmed < 3000) return true;
  resetArmed = Date.now();
  toast("⟳ 한 번 더 누르면 시작 화면으로 가요 (진행은 저장되어 있어요)", "danger");
  return false;
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

(async function boot() {
  resize();
  loadVoicePref();
  requestAnimationFrame(loop);
  try {
    await loadStory();
  } catch (e) {
    $("title-loading").textContent = "대본 파일을 불러오지 못했어요.";
    return;
  }
  if (window.LOCAL_API) window.LOCAL_API.init(STORY.heroines);
  await api("/api/state");
  if (!server) return;
  controlled = server.role;
  buildNpcs();
  buildTitle();
  $("title-loading").classList.add("hidden");
  $("title-buttons").classList.remove("hidden");
})();
