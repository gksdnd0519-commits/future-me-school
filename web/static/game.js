// =============================================================
// 미래의 나와 하루 학교 - 게임 화면 (JavaScript)
// -------------------------------------------------------------
// 이 파일이 하는 일
//   1. 학교 지도와 캐릭터를 캔버스(canvas)에 1초에 60번 그린다   → "게임 루프"
//   2. 키보드로 캐릭터를 움직이고, 벽에 부딪히면 멈추게 한다       → "충돌 처리"
//   3. 행동을 고르면 서버(app.py)에 보내고, 대답에 맞춰 연출한다    → "API 통신"
//   4. 친구(NPC)들이 돌아다니고, 말을 걸면 대화창이 열린다        → "대화 시스템"
// 캐릭터 그림은 anime.js 의 drawFigure / drawPortrait 가 담당한다.
// 점수·역할 같은 규칙은 서버가 정하고, 여기서는 "보여 주기"만 한다.
// =============================================================


// ─────────────────────────────────────────────────────────────
// 0) 도우미
// ─────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);   // 두 점 사이 거리
const other = (role) => (role === "student" ? "future" : "student");
const rand = (a, b) => a + Math.random() * (b - a);
const STAT_ICON = { "체력": "💪", "성적": "📚", "우정": "🤝" };
const STAT_COLOR = { "체력": "#ff7a8a", "성적": "#6ea8ff", "우정": "#4fd6a0" };

// 한국어 조사 고르기 : 마지막 글자에 받침이 있으면 "과", 없으면 "와"
function josa(word, withBatchim, without) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return word + (code >= 0 && code % 28 !== 0 ? withBatchim : without);
}


// ─────────────────────────────────────────────────────────────
// 1) 등장인물 정보 (생김새는 anime.js 의 LOOKS)
// ─────────────────────────────────────────────────────────────
const CAST = {
  student:  { name: "나 (현재)",        voice: 520 },
  future:   { name: "나 (10년 후)",     voice: 330 },
  서아:     { name: "서아 · 반장",       voice: 700 },
  하린:     { name: "하린 · 응원단",     voice: 820 },
  도윤:     { name: "도윤 · 급식왕",     voice: 430 },
  유나:     { name: "유나 · 도서부",     voice: 640 },
  태오:     { name: "태오 · 축구부",     voice: 560 },
  김선생님: { name: "김 선생님 · 담임",  voice: 250 },
  한선생님: { name: "한 선생님 · 보건",  voice: 600 },
};

// 친구들 : 시작 위치, 돌아다니는 범위(zone = [x최소, x최대, y최소, y최대]), 혼잣말, 대화
//   대화 한 줄 = [누가("npc" 또는 "me"), 표정, 대사]
//   student : 내가 학생일 때 / future : 역할이 바뀌어 내가 미래의 나일 때 (반응이 다르다!)
const NPC_DATA = [
  { key: "서아", x: 700, y: 280, zone: [40, 920, 262, 300], speed: 45,
    idle: ["복도에선 걷기!", "출석부 어디 뒀더라…"],
    talk: {
      student: [["npc", "normal", "복도에서 뛰면 안 돼! …뭐, 오늘은 지각 안 했으니 봐줄게."], ["me", "happy", "헤헤, 고마워 반장!"]],
      future:  [["npc", "surprised", "저, 저기요! 외부인은 출입 명부를 쓰셔야… 어라? 얼굴이 낯익은데?"], ["me", "happy", "(10년 뒤에도 똑같구나, 반장.)"]],
    } },
  { key: "하린", x: 500, y: 540, zone: [370, 900, 390, 560], speed: 55,
    idle: ["태오 파이팅~!", "♪ 오늘도 힘내자~"],
    talk: {
      student: [["npc", "happy", "태오가 오늘 골 넣으면 떡볶이 쏜대! 같이 응원하자~♪"], ["me", "happy", "좋아, 파이팅!"]],
      future:  [["npc", "surprised", "꺅! 혹시… 새로 오신 체육 선생님이세요?"], ["me", "tired", "아, 아니… 그냥 지나가는 어른이야."]],
    } },
  { key: "도윤", x: 700, y: 100, zone: [665, 925, 75, 122], speed: 40,
    idle: ["돈가스 냄새…!", "배고프다아…"],
    talk: {
      student: [["npc", "happy", "오늘 메뉴 돈가스래! 내 거 반 줄까? …농담이야."], ["me", "surprised", "치사해!"]],
      future:  [["npc", "surprised", "아저씨도 급식 드시러 오셨어요? 돈가스는 양보 못 해요!"], ["me", "happy", "(넌 10년 뒤에 요리사가 돼, 도윤아.)"]],
    } },
  { key: "유나", x: 560, y: 100, zone: [345, 615, 80, 132], speed: 30,
    idle: ["…쉿.", "이 책 결말이…!"],
    talk: {
      student: [["npc", "normal", "쉿… 여긴 도서관이야. 이 책 진짜 재밌어. 다 읽으면 빌려줄게."], ["me", "happy", "고마워, 유나!"]],
      future:  [["npc", "normal", "…시간 여행 소설에 나오는 사람 같은 표정이시네요. 혹시 미래에서 오셨어요?"], ["me", "surprised", "(드, 들켰나?!)"]],
    } },
  { key: "태오", x: 760, y: 430, zone: [375, 900, 385, 560], speed: 105,
    idle: ["패스! 패스!", "슛~!"],
    talk: {
      student: [["npc", "happy", "패스! …아 미안, 공 갔다! 너도 같이 뛸래?"], ["me", "happy", "다음 시간에 꼭!"]],
      future:  [["npc", "surprised", "우와, 아저씨 공 엄청 잘 차시겠다! 한 판 해요!"], ["me", "tired", "허리가… 10년 뒤엔 허리가…"]],
    } },
  { key: "김선생님", x: 245, y: 100, zone: [205, 300, 80, 125], speed: 25,
    idle: ["복습은 그날그날!", "흠흠."],
    talk: {
      student: [["npc", "normal", "오, 일찍 왔구나. 오늘 배운 건 오늘 복습하는 거다. 알지?"], ["me", "happy", "네, 선생님!"]],
      future:  [["npc", "surprised", "어디서 많이 본 얼굴인데… 혹시 내 제자였나?"], ["me", "happy", "(네, 선생님. 10년 뒤에 꼭 인사드리러 올게요.)"]],
    } },
  { key: "한선생님", x: 240, y: 440, zone: [195, 300, 405, 500], speed: 25,
    idle: ["무리하지 마~", "밴드 어디 있더라?"],
    talk: {
      student: [["npc", "normal", "어디 아파서 왔니? 무리하지 말고, 피곤하면 꼭 쉬어야 해."], ["me", "happy", "네, 기억할게요!"]],
      future:  [["npc", "happy", "보호자분이세요? 이 학생, 요즘 너무 무리하는 것 같아요."], ["me", "tired", "(…그때 좀 더 쉴 걸 그랬지.)"]],
    } },
];


// ─────────────────────────────────────────────────────────────
// 2) 지도 데이터
//    게임 속 좌표는 항상 가로 960 × 세로 600 으로 계산한다.
// ─────────────────────────────────────────────────────────────
const W = 960, H = 600;
const T = 12;  // 벽 두께

// 방(장소) : 위치·크기, 행동하는 곳(spot), 빛나는 아이콘, 이름표 위치(sign)
const ROOMS = {
  "교실":   { x: 0,   y: 0,   w: 320, h: 240, spot: { x: 160, y: 108 }, icon: "✏️", sign: { x: 16,  y: 250 } },
  "도서관": { x: 320, y: 0,   w: 320, h: 240, spot: { x: 480, y: 108 }, icon: "📖", sign: { x: 336, y: 250 } },
  "급식실": { x: 640, y: 0,   w: 320, h: 240, spot: { x: 800, y: 105 }, icon: "🍙", sign: { x: 656, y: 250 } },
  "보건실": { x: 0,   y: 340, w: 320, h: 260, spot: { x: 205, y: 480 }, icon: "🩹", sign: { x: 182, y: 352 } },
  "운동장": { x: 320, y: 340, w: 640, h: 260, spot: { x: 640, y: 470 }, icon: "⚽", sign: { x: 336, y: 352 } },
};
const SPOT_RADIUS = 70;   // spot 에서 이 거리 안에 있어야 행동 가능
const TALK_RADIUS = 52;   // 친구와 이 거리 안이면 대화 가능

// 가로 벽 만들기 : doors 에 적힌 구간은 비워서 "문"을 만든다
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
  ...hWall(240, 0, W, [[130, 210], [440, 520], [760, 840]]),   // 위쪽 방들의 문
  ...vWall(320, 0, 240), ...vWall(640, 0, 240),
  ...hWall(340, 0, W, [[130, 210], [540, 700]]),               // 아래쪽 방들의 문
  ...vWall(320, 340, H),
];

// 부딪히는 가구
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

// 교시별 시계와 화면 색조 (아침 → 오후 → 노을)
const CLOCK = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:30"];
const TINT  = ["rgba(255,240,200,0.05)", "rgba(255,255,255,0)", "rgba(255,255,255,0)",
               "rgba(255,200,120,0.08)", "rgba(255,150,80,0.14)", "rgba(120,60,140,0.22)"];


// ─────────────────────────────────────────────────────────────
// 3) 게임 상태 (화면 쪽)
// ─────────────────────────────────────────────────────────────
// 캐릭터 만들기 : 위치(x, y)는 "발" 위치
function makeActor(key, x, y, extra = {}) {
  return { key, look: LOOKS[key], x, y, dir: 1, walk: 0, moving: false,
           expr: "normal", exprT: 0, emote: null, bubble: null, spin: 0, hop: 0,
           blinkT: rand(1, 4), ...extra };
}
const chars = {
  student: makeActor("student", 480, 292),
  future:  makeActor("future", 430, 292),
};
const npcs = NPC_DATA.map((d) =>
  makeActor(d.key, d.x, d.y, { data: d, target: null, wait: rand(0, 2), idleT: rand(4, 12) }));

let controlled = "student";  // 지금 키보드로 조종하는 캐릭터
let trail = [];              // 조종하는 캐릭터가 지나간 길 (상대가 이 길을 따라옴)
const FOLLOW_GAP = 22;

let server = null;           // 서버에서 마지막으로 받은 상태
let mode = "title";          // title | play | menu | dialog | help | ending
let helpReturn = "play";
let menuSel = 0;
let busy = false;            // 서버 대답을 기다리는 중이면 true (연타 방지)
let pendingSwap = false;     // 역할 바뀜 연출을 기다리는 중
let currentRoom = null;      // 지금 서 있는 방 이름
let nearSpot = null;         // 행동 가능한 곳 근처면 그 방 이름
let nearNpc = null;          // 대화 가능한 친구
let talkingTo = null;        // 지금 대화 중인 친구

const keys = new Set();
let floaters = [];           // 떠오르는 숫자
let particles = [];          // 반짝이 / 색종이
let petals = [];             // 벚꽃잎
let shake = 0;
let stepTimer = 0;
let clockTime = 0;

for (let i = 0; i < 26; i++) petals.push(newPetal(true));
function newPetal(anywhere) {
  return { x: rand(-40, W), y: anywhere ? rand(0, H) : -10, vx: rand(18, 40), vy: rand(22, 45),
           rot: rand(0, 6), vr: rand(-2, 2), size: rand(3, 5.5), sway: rand(0, 6) };
}


// ─────────────────────────────────────────────────────────────
// 4) 효과음 : 파일 없이 브라우저가 직접 소리를 만든다 (Web Audio)
// ─────────────────────────────────────────────────────────────
let audio = null;
let muted = false;
function initAudio() {
  if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
}
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
  step:  () => tone(140 + Math.random() * 40, 0.04, "triangle", 0.022),
  blip:  (f) => tone(f * rand(0.95, 1.08), 0.035, "square", 0.018),   // 대사 한 글자씩 나올 때 "삑삑"
  open:  () => { tone(660, 0.06); tone(880, 0.08, "square", 0.05, 0.06); },
  move:  () => tone(520, 0.04, "square", 0.03),
  close: () => tone(440, 0.06, "square", 0.03, 0, 300),
  next:  () => tone(760, 0.05, "triangle", 0.04),
  ok:    () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, "square", 0.045, i * 0.07)),
  err:   () => { tone(180, 0.18, "sawtooth", 0.05); tone(140, 0.25, "sawtooth", 0.05, 0.12); },
  bell:  () => { tone(988, 0.35, "sine", 0.06); tone(784, 0.5, "sine", 0.06, 0.25); },
  swap:  () => { tone(200, 0.7, "sawtooth", 0.05, 0, 1400); tone(1400, 0.7, "triangle", 0.04, 0.35, 180); },
  undo:  () => [784, 659, 523].forEach((f, i) => tone(f, 0.08, "triangle", 0.05, i * 0.06)),
  end:   () => [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, "square", 0.045, i * 0.14)),
};


// ─────────────────────────────────────────────────────────────
// 5) 서버와 대화하기
//    async / await : 서버 대답이 올 때까지 기다렸다가 다음 줄 실행
// ─────────────────────────────────────────────────────────────
async function api(path, body) {
  if (busy) return null;
  busy = true;
  try {
    const options = body === undefined ? {} : {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
    const res = await fetch(path, options);
    const data = await res.json();
    server = data;
    renderHUD(data);
    handleEvent(data);
    return data;
  } catch (err) {
    toast("서버와 연결이 안 돼요. 터미널에서 서버가 켜져 있는지 확인하세요.", "danger");
    return null;
  } finally {
    busy = false;
  }
}


// ─────────────────────────────────────────────────────────────
// 6) 서버 대답에 맞춰 연출하기
// ─────────────────────────────────────────────────────────────
function handleEvent(data) {
  const ev = data.event;
  if (!ev) return;

  if (ev.type === "act") {
    const actor = chars[ev.actor];
    actor.hop = 0.45;
    burst(actor.x, actor.y - 40, ev.bug ? "#ff5d6c" : "#ffc94a", 22);
    setEmote(actor, ev.bug ? "💦" : "♪");
    showDelta(actor, ev.delta);
    if (ev.bug) { SFX.err(); shake = 10; toast(data.alert, "danger"); } else SFX.ok();
    if (ev.swapped) pendingSwap = true;

    // 행동한 캐릭터 → 상대 캐릭터 순서로 대화창
    const lines = [
      { who: ev.actor, expr: "happy", text: ev.say },
      { who: other(ev.actor), expr: ev.bug ? "surprised" : "happy", text: ev.reply },
    ];
    setTimeout(() => dialog(lines, () => {
      if (ev.swapped) { SFX.bell(); swapSequence(data); }
      else if (data.ended) showEnding(data);
      else { SFX.bell(); toast(`🔔 ${CLOCK[data.turn - 1]} · ${data.turn}교시 시작!`); }
    }), 650);
  }

  else if (ev.type === "swap") swapSequence(data);

  else if (ev.type === "blocked") {
    SFX.err();
    shake = 6;
    toast(data.alert, "danger");
    const me = chars[controlled];
    setExpr(me, "tired", 2);
    setEmote(me, "💦");
  }

  else if (ev.type === "undo") {
    SFX.undo();
    toast(data.alert);
    closeDialog();
    if (data.role !== controlled) { controlled = data.role; trail = []; spinBoth(); }
    renderRole(data);
  }

  else if (ev.type === "reset") {
    resetWorld();
    toast("🌅 새로운 하루가 시작됐어요!", "good");
  }

  else if (ev.type === "fix") {
    SFX.move();
    toast(data.alert, data.fix_on ? "good" : "danger");
    if (mode === "menu") openMenu();
  }
  // "talk" 는 talkTo() 에서 직접 처리
}

// ★ 돌발 상황 연출 : 번쩍 + 흔들림 + 큰 글씨 + 조종하는 캐릭터가 바뀜
function swapSequence(data) {
  pendingSwap = false;
  if (mode === "menu") closeMenu(false);
  flash();
  shake = 18;
  SFX.swap();
  banner(`⚡ 역할 체인지! ⚡<small>이제 나는 ${data.role_name}</small>`);
  controlled = data.role;   // 키보드로 움직이는 캐릭터가 바뀐다
  trail = [];
  spinBoth();
  for (const c of Object.values(chars)) {
    burst(c.x, c.y - 30, "#a99bff", 30);
    setEmote(c, "!!");
    setExpr(c, "surprised", 2.5);
  }
  renderRole(data);
  setTimeout(() => dialog([
    { who: "student", expr: "surprised", text: data.talk.student },
    { who: "future", expr: "happy", text: data.talk.future },
  ], () => { if (data.ended) showEnding(data); }), 1700);
}

function spinBoth() { chars.student.spin = 0.6; chars.future.spin = 0.6; }

// 점수 변화를 머리 위에 하나씩 띄우기
function showDelta(actor, delta) {
  Object.entries(delta || {}).forEach(([stat, v], i) => {
    setTimeout(() => {
      floaters.push({ x: actor.x + (i - 0.5) * 34, y: actor.y - 78, life: 1.4,
                      text: `${STAT_ICON[stat]} ${v > 0 ? "+" : ""}${v}`, color: STAT_COLOR[stat] });
      popStat(stat);
    }, i * 160);
  });
}

function setExpr(c, expr, t = 2.5) { c.expr = expr; c.exprT = t; }
function setEmote(c, text) { c.emote = { text, t: 1.6 }; }


// ─────────────────────────────────────────────────────────────
// 7) 대화창 (비주얼 노벨 방식)
//    lines : [{ who, expr, text }, ...] 를 한 줄씩 보여 주고, 끝나면 onDone 실행
// ─────────────────────────────────────────────────────────────
let dlg = null;

function actorOf(who) {
  return chars[who] || npcs.find((n) => n.key === who);
}

function dialog(lines, onDone) {
  if (!lines.length) { if (onDone) onDone(); return; }
  if (mode === "menu") closeMenu(false);
  // "me" 는 지금 내가 조종하는 캐릭터로 바꿔 둔다
  const fixed = lines.map((l) => ({ ...l, who: l.who === "me" ? controlled : l.who }));
  dlg = { lines: fixed, i: 0, chars: 0, onDone, back: mode === "help" ? helpReturn : (mode === "dialog" ? "play" : mode) };
  if (dlg.back !== "title" && dlg.back !== "ending") dlg.back = "play";
  mode = "dialog";
  $("dialog").classList.remove("hidden");
  $("prompt").classList.add("hidden");
  showLine();
}

function showLine() {
  const line = dlg.lines[dlg.i];
  const cast = CAST[line.who];
  $("dlg-name").textContent = cast.name;
  $("dlg-name").style.background = LOOKS[line.who].hairColor;
  $("dlg-text").textContent = "";
  $("dialog").classList.remove("done");
  $("dialog").classList.toggle("right", line.who !== controlled);   // 상대 대사면 초상화를 오른쪽에
  drawPortrait($("dlg-portrait"), LOOKS[line.who], line.expr);
  $("dlg-portrait").classList.remove("pop");
  void $("dlg-portrait").offsetWidth;
  $("dlg-portrait").classList.add("pop");
  dlg.chars = 0;
  const a = actorOf(line.who);
  if (a) {
    setExpr(a, line.expr, 99);
    if (line.expr === "surprised") setEmote(a, "!");
    if (line.expr === "happy") setEmote(a, "♪");
    if (line.expr === "tired") setEmote(a, "💦");
  }
}

function advanceDialog() {
  if (!dlg) return;
  const line = dlg.lines[dlg.i];
  if (dlg.chars < line.text.length) {           // 아직 글자가 나오는 중 → 한 번에 다 보여 주기
    dlg.chars = line.text.length;
    $("dlg-text").textContent = line.text;
    $("dialog").classList.add("done");
    return;
  }
  const a = actorOf(line.who);
  if (a) a.exprT = 1.2;                         // 말을 끝낸 캐릭터 표정은 잠시 뒤 원래대로
  dlg.i++;
  SFX.next();
  if (dlg.i >= dlg.lines.length) closeDialog(true);
  else showLine();
}

function closeDialog(runDone = false) {
  if (!dlg) return;
  const { onDone, back } = dlg;
  dlg = null;
  for (const c of [chars.student, chars.future, ...npcs]) if (c.exprT > 5) c.exprT = 1;  // 굳은 표정 풀기
  $("dialog").classList.add("hidden");
  if (mode === "dialog") mode = back;
  if (runDone && onDone) onDone();
}

function updateDialog(dt) {
  if (!dlg) return;
  const line = dlg.lines[dlg.i];
  if (dlg.chars >= line.text.length) return;
  const before = Math.floor(dlg.chars);
  dlg.chars = Math.min(line.text.length, dlg.chars + dt * 38);   // 1초에 38글자
  const now = Math.floor(dlg.chars);
  if (now !== before) {
    $("dlg-text").textContent = line.text.slice(0, now);
    if (now % 2 === 0 && line.text[now - 1] !== " ") SFX.blip(CAST[line.who].voice);
    if (now >= line.text.length) $("dialog").classList.add("done");
  }
}

// 친구에게 말 걸기
async function talkTo(n) {
  const data = await api("/api/talk", { npc: n.key });
  if (!data) return;
  const ev = data.event || {};
  talkingTo = n;
  n.dir = chars[controlled].x > n.x ? 1 : -1;
  const lines = n.data.talk[controlled].map(([who, expr, text]) => ({ who: who === "npc" ? n.key : "me", expr, text }));
  dialog(lines, () => {
    talkingTo = null;
    if (ev.first && Object.keys(ev.delta || {}).length) {
      const me = chars[controlled];
      showDelta(me, ev.delta);
      burst(me.x, me.y - 40, "#ff9cc4", 18);
      SFX.ok();
      const [stat, v] = Object.entries(ev.delta)[0];
      toast(`✨ ${josa(n.key, "과", "와")} 친해졌다! ${STAT_ICON[stat]} ${stat} +${v}`, "good");
    }
  });
}


// ─────────────────────────────────────────────────────────────
// 8) HUD (점수판·시계·역할)
// ─────────────────────────────────────────────────────────────
function renderHUD(d) {
  for (const stat of ["체력", "성적", "우정"]) {
    $(`bar-${stat}`).style.width = `${d.stats[stat]}%`;
    $(`val-${stat}`).textContent = d.stats[stat];
  }
  $("bar-체력").classList.toggle("low", d.stats["체력"] < 25);

  $("clock").textContent = CLOCK[d.turn - 1] || CLOCK.at(-1);
  $("turn").textContent = d.ended ? "하교 시간" : `${Math.min(d.turn, d.max_turn)}교시 / ${d.max_turn}`;
  $("periods").innerHTML = "";
  for (let i = 1; i <= d.max_turn; i++) {
    const dot = document.createElement("i");
    if (i < d.turn) dot.className = "done";
    else if (i === d.turn) dot.className = "now";
    if (i === 3) dot.classList.add("swap");
    $("periods").appendChild(dot);
  }
  $("friends").textContent = `💬 친구 ${d.talked.length}/7`;

  if (!pendingSwap) renderRole(d);
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
  const card = document.querySelector(".hud-card.role");
  $("role-name").textContent = d.role_name;
  card.classList.toggle("future", d.role === "future");
  if (lastRoleDrawn !== d.role) {               // 역할이 바뀔 때만 얼굴을 다시 그림
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
// 9) 행동 메뉴
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
    const fxHtml = Object.entries(fx)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `<span class="${v > 0 ? "up" : "down"}">${STAT_ICON[k]}${v > 0 ? "+" : ""}${v}</span>`)
      .join(" ");
    // 피로 표시 : 서버와 같은 규칙 (장소 보너스 빼고 행동 효과만으로 계산)
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

function paintMenu() {
  [...$("menu-list").children].forEach((el, i) => el.classList.toggle("sel", i === menuSel));
}

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
  await api("/api/act", { place: room, action: name });
}


// ─────────────────────────────────────────────────────────────
// 10) 키보드 조작
//    e.code 는 "키의 위치" 이름이라서 한글 입력 상태에서도 WASD 가 동작한다
// ─────────────────────────────────────────────────────────────
const MOVE = {
  left:  ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  up:    ["ArrowUp", "KeyW"],
  down:  ["ArrowDown", "KeyS"],
};
const held = (dir) => MOVE[dir].some((code) => keys.has(code));

window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.shiftKey) keys.add("Shift");
  if (e.repeat) return;
  onKey(e.code);
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (!e.shiftKey) keys.delete("Shift");
});
window.addEventListener("blur", () => keys.clear());

function onKey(code) {
  if (code === "KeyM") return toggleMute();

  if (mode === "title") {
    if (code === "Enter" || code === "Space") startGame();
    return;
  }
  if (mode === "help") {
    if (code === "KeyH" || code === "Escape" || code === "Enter") toggleHelp();
    return;
  }
  if (mode === "dialog") {
    if (code === "Space" || code === "Enter" || code === "KeyE") advanceDialog();
    return;
  }
  if (code === "KeyH") return toggleHelp();

  if (mode === "ending") {
    if (code === "KeyR" || code === "Enter") api("/api/reset", {});
    if (code === "KeyU") { hideEnding(); api("/api/undo", {}); }
    return;
  }

  if (mode === "menu") {
    const n = server.buttons.length;
    if (code === "ArrowUp" || code === "KeyW") { menuSel = (menuSel - 1 + n) % n; paintMenu(); SFX.move(); }
    else if (code === "ArrowDown" || code === "KeyS") { menuSel = (menuSel + 1) % n; paintMenu(); SFX.move(); }
    else if (code === "Enter" || code === "Space" || code === "KeyE") chooseAction(menuSel);
    else if (code.startsWith("Digit")) {
      const i = Number(code.slice(5)) - 1;     // "Digit2" → 2 → 번호 1
      if (i >= 0 && i < n) chooseAction(i);
    }
    else if (code === "Escape" || code === "Backspace") closeMenu();
    return;
  }

  // mode === "play"
  if (code === "Space" || code === "KeyE" || code === "Enter") {
    if (pendingSwap || busy || !server) return;
    if (nearNpc) talkTo(nearNpc);                    // 친구가 가까우면 대화가 먼저
    else if (nearSpot && !server.ended) { SFX.open(); openMenu(); }
    else toast("빛나는 곳이나 친구 가까이 가서 눌러 주세요 ✨");
  }
  else if (code === "KeyU") api("/api/undo", {});
  else if (code === "KeyQ") api("/api/swap", {});
  else if (code === "KeyR") api("/api/reset", {});
  else if (code === "KeyF" && server) api("/api/fix", { on: !server.fix_on });
}


// ─────────────────────────────────────────────────────────────
// 11) 움직임 계산 (매 프레임)
// ─────────────────────────────────────────────────────────────
const SPEED = 190;

function isBlocked(x, y) {   // 발 밑 상자가 벽·가구와 겹치는지
  const b = { x: x - 10, y: y - 6, w: 20, h: 12 };
  return SOLIDS.some((r) => b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y);
}
function moveBy(c, dx, dy) {  // 가로·세로를 따로 움직여 벽에 미끄러지듯
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

  // --- 내 캐릭터 이동 ---
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

  // --- 상대 캐릭터 : 내가 지나간 길을 따라옴 ---
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
  } else if (!buddy.moving && dist(buddy, me) < 120) {
    buddy.dir = me.x > buddy.x ? 1 : -1;        // 멈춰 있으면 나를 바라봄
  }

  // --- 친구들 ---
  for (const n of npcs) updateNpc(n, dt, me);

  // --- 모든 캐릭터 공통 타이머 ---
  for (const c of [chars.student, chars.future, ...npcs]) {
    if (!c.moving) c.walk = 0;
    if (c.spin > 0) c.spin = Math.max(0, c.spin - dt);
    if (c.hop > 0) c.hop = Math.max(0, c.hop - dt);
    if (c.exprT > 0 && !(dlg && actorOf(dlg.lines[dlg.i].who) === c)) c.exprT -= dt;
    if (c.emote) { c.emote.t -= dt; if (c.emote.t <= 0) c.emote = null; }
    if (c.bubble) { c.bubble.t -= dt; if (c.bubble.t <= 0) c.bubble = null; }
    c.blinkT -= dt;
    if (c.blinkT < -0.13) c.blinkT = rand(2, 5);   // 0 ~ -0.13 초 동안 눈을 감음
  }

  // --- 지금 어디 있는지 / 무엇을 할 수 있는지 ---
  currentRoom = roomAt(me.x, me.y);
  nearSpot = currentRoom && dist(me, ROOMS[currentRoom].spot) < SPOT_RADIUS ? currentRoom : null;
  nearNpc = null;
  let best = TALK_RADIUS;
  for (const n of npcs) { const d = dist(n, me); if (d < best) { best = d; nearNpc = n; } }

  const canPrompt = mode === "play" && !pendingSwap && server;
  if (canPrompt && nearNpc) {
    const done = server.talked.includes(nearNpc.key);
    $("prompt").innerHTML = `<kbd>Space</kbd> 💬 ${josa(nearNpc.key, "과", "와")} 대화하기${done ? " <small>(오늘 대화함)</small>" : ""}`;
  } else if (canPrompt && nearSpot && !server.ended) {
    $("prompt").innerHTML = `<kbd>Space</kbd> ${server.places[nearSpot].emoji} ${nearSpot}에서 행동하기`;
  }
  $("prompt").classList.toggle("hidden", !(canPrompt && (nearNpc || (nearSpot && !server.ended))));

  updateDialog(dt);

  // --- 효과들 ---
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

// 친구 한 명 움직이기 : 범위 안에서 목적지를 골라 걷고, 도착하면 잠깐 쉼
function updateNpc(n, dt, me) {
  n.moving = false;
  const d = dist(n, me);
  if (talkingTo === n || d < 60) {             // 내가 가까이 오면 멈춰서 나를 바라봄
    n.dir = me.x > n.x ? 1 : -1;
  } else if (n.wait > 0) {
    n.wait -= dt;
  } else {
    const [x0, x1, y0, y1] = n.data.zone;
    if (!n.target) n.target = { x: rand(x0, x1), y: rand(y0, y1) };
    const dd = dist(n, n.target);
    if (dd < 3) {
      n.target = null;
      n.wait = rand(1, 3.5);
    } else {
      const step = Math.min(dd, n.data.speed * dt);
      const vx = ((n.target.x - n.x) / dd) * step;
      const ox = n.x, oy = n.y;
      moveBy(n, vx, ((n.target.y - n.y) / dd) * step);
      if (n.x === ox && n.y === oy) { n.target = null; n.wait = 0.4; }   // 막히면 다른 곳으로
      else {
        n.moving = true;
        n.walk += dt * (n.data.speed > 80 ? 15 : 9);
        if (Math.abs(vx) > 0.05) n.dir = Math.sign(vx);
      }
    }
  }
  // 가끔 혼잣말 (화면이 살아 있는 느낌)
  n.idleT -= dt;
  if (n.idleT <= 0) {
    n.idleT = rand(7, 15);
    if (mode === "play" && d < 320) n.bubble = { text: n.data.idle[Math.floor(Math.random() * n.data.idle.length)], t: 2.6 };
  }
}


// ─────────────────────────────────────────────────────────────
// 12) 그리기 (매 프레임)
// ─────────────────────────────────────────────────────────────
const canvas = $("world");
const ctx = canvas.getContext("2d");
let scale = 1;
const SPRITE = 1.08;   // 지도 위 캐릭터 크기 배율

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  scale = canvas.width / W;
}
window.addEventListener("resize", () => { resize(); drawTitleArt(); });

function rr(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function ellipse(x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
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

  // 아래(y가 큰) 캐릭터를 나중에 그려야 앞에 있는 것처럼 보임
  const me = chars[controlled];
  const all = [chars.student, chars.future, ...npcs].sort((a, b) => a.y - b.y);
  for (const c of all) drawActor(c, c === me, me);
  for (const c of all) if (c.bubble) drawBubble(c);

  if (server) {                                      // 시간대 색조
    ctx.fillStyle = TINT[Math.min(server.turn - 1, TINT.length - 1)];
    ctx.fillRect(0, 0, W, H);
  }
  drawPetals();
  drawParticles();
  drawFloaters();
}

// --- 바닥 ---
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

  // 창문에서 들어오는 햇빛 (교실·도서관·급식실 바닥에 비스듬한 빛)
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
  for (let y = r.y; y < r.y + r.h; y += 20) {
    ctx.fillStyle = (y / 20) % 2 ? a : b;
    ctx.fillRect(r.x, y, r.w, 20);
  }
}
function checker(r, a, b, s) {
  for (let y = r.y; y < r.y + r.h; y += s)
    for (let x = r.x; x < r.x + r.w; x += s) {
      ctx.fillStyle = ((x + y) / s) % 2 ? a : b;
      ctx.fillRect(x, y, s, s);
    }
}

// --- 가구 ---
const BOOK_COLORS = ["#e85d75", "#4f86f7", "#ffcf4a", "#3ec28f", "#a26bf5", "#ff9548"];
function drawFurniture() {
  // 가구 그림자 (살짝 아래로 어둡게 → 입체감)
  for (const f of FURNITURE) if (f.kind !== "goal") rr(f.x + 2, f.y + 4, f.w, f.h, 4, "rgba(40,20,60,0.13)");

  rr(70, 16, 180, 36, 4, "#8a5a2b");                   // 칠판
  rr(74, 19, 172, 30, 3, "#2f5d4a");
  ctx.fillStyle = "#ffffffcc";
  ctx.font = FONT(13);
  ctx.textAlign = "center";
  ctx.fillText("오늘의 목표: 후회 없는 하루", 160, 39);

  for (let i = 0; i < 4; i++) {                        // 도서관 책장
    const x = 338 + i * 74;
    rr(x, 14, 66, 50, 3, "#7a4b26");
    for (let row = 0; row < 2; row++)
      for (let k = 0; k < 8; k++) {
        ctx.fillStyle = BOOK_COLORS[(i * 7 + row * 3 + k) % BOOK_COLORS.length];
        ctx.fillRect(x + 4 + k * 7.4, 18 + row * 23, 6, 19 - ((k + row) % 3) * 2);
      }
  }
  rr(660, 14, 280, 40, 6, "#bfc4d1");                  // 배식대
  rr(660, 14, 280, 10, 6, "#d7dbe5");
  [["#ff8a5c", 700], ["#ffe066", 760], ["#7bd389", 820], ["#f5f5f5", 880]].forEach(([c, x]) => {
    ellipse(x, 38, 20, 9, "#8f95a5");
    ellipse(x, 36, 17, 7, c);
  });
  rr(40, 520, 40, 40, 6, "#ffffff");                   // 보건실 십자 표시
  ctx.fillStyle = "#ff4d5e";
  ctx.fillRect(56, 526, 8, 28);
  ctx.fillRect(46, 536, 28, 8);

  for (const f of FURNITURE) {
    if (f.kind === "desk") {
      rr(f.x, f.y, f.w, f.h, 3, "#c8955c");
      rr(f.x, f.y, f.w, 4, 3, "#dcae78");
      rr(f.x + 8, f.y + f.h + 2, 20, 8, 2, "#8c6239");
    } else if (f.kind === "teacher") {
      rr(f.x, f.y, f.w, f.h, 3, "#9c6b3d");
      rr(f.x, f.y, f.w, 4, 3, "#b98450");
    } else if (f.kind === "readtable") {
      rr(f.x, f.y, f.w, f.h, 4, "#8f5e34");
      ellipse(f.x + f.w - 16, f.y + 12, 8, 8, "#3ec28f");
      rr(f.x + 12, f.y + 10, 22, 16, 2, "#fff8e7");
    } else if (f.kind === "lunchtable") {
      rr(f.x, f.y, f.w, f.h, 6, "#f0a35e");
      for (let k = 0; k < 3; k++) rr(f.x + 12 + k * 34, f.y + 7, 20, 14, 3, "#d8dde6");
    } else if (f.kind === "bed") {
      rr(f.x, f.y, f.w, f.h, 6, "#ffffff", "#c9d6e2");
      rr(f.x + 8, f.y + 6, f.w - 16, 18, 6, "#a8d5ff");
      rr(f.x + 4, f.y + 40, f.w - 8, f.h - 46, 6, "#7fc7b5");
    } else if (f.kind === "cabinet") {
      rr(f.x, f.y, f.w, f.h, 4, "#e5ecf4", "#aab8c8");
      ctx.fillStyle = "#ff4d5e";
      ctx.fillRect(f.x + 21, f.y + 10, 8, 20);
      ctx.fillRect(f.x + 15, f.y + 16, 20, 8);
    } else if (f.kind === "goal") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.strokeStyle = "#ffffff66";
      ctx.lineWidth = 1;
      for (let y = f.y; y < f.y + f.h; y += 8) { ctx.beginPath(); ctx.moveTo(f.x, y); ctx.lineTo(f.x + f.w, y); ctx.stroke(); }
    } else if (f.kind === "locker") {
      for (let x = f.x; x < f.x + f.w - 2; x += 22) {
        rr(x, f.y, 20, f.h, 2, "#5b7bd5");
        ctx.fillStyle = "#3f5bb0";
        ctx.fillRect(x + 4, f.y + 4, 12, 2);
        ctx.fillRect(x + 4, f.y + 8, 12, 2);
      }
    }
  }
}

// --- 행동 가능한 곳 ---
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
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, 34, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    const bob = Math.sin(clockTime * 3 + s.x) * 4;
    ctx.font = FONT(near ? 30 : 24);
    ctx.textAlign = "center";
    ctx.fillText(r.icon, s.x, s.y - 18 + bob);
  }
}

function drawWalls() {
  for (const w of WALLS) {
    ctx.fillStyle = "#3a3560";
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = "#5c5592";
    ctx.fillRect(w.x, w.y, w.w, Math.min(4, w.h));
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

// --- 캐릭터 (그림은 anime.js 의 drawFigure) ---
function drawActor(c, isMe, me) {
  const L = c.look;
  const tall = (L.legLen + L.torso + 33) * SPRITE;   // 발에서 머리끝까지 높이
  const bob = c.moving ? Math.abs(Math.sin(c.walk)) * 1.6 : Math.sin(clockTime * 2.2 + c.x) * 0.35;  // 숨쉬기
  const hop = c.hop > 0 ? Math.sin((c.hop / 0.45) * Math.PI) * 14 : 0;

  ellipse(c.x, c.y + 1, 13, 4.5, "rgba(30,10,40,0.22)");   // 그림자

  ctx.save();
  ctx.translate(c.x, c.y - bob - hop);
  if (c.spin > 0) ctx.scale(Math.cos(c.spin * 21), 1);      // 역할 바뀔 때 빙글
  ctx.scale(c.dir * SPRITE, SPRITE);                        // dir = -1 이면 좌우 뒤집기
  drawFigure(ctx, L, {
    moving: c.moving, walk: c.walk,
    expr: c.exprT > 0 ? c.expr : "normal",
    blink: c.blinkT < 0,
    ol: 0.95,
  });
  ctx.restore();

  const top = c.y - tall - bob - hop;
  const isHero = c === chars.student || c === chars.future;
  const showTag = isHero || dist(c, me) < 130;
  if (showTag) {
    ctx.font = FONT(isHero ? 13 : 12);
    ctx.textAlign = "center";
    const label = isMe ? `${CAST[c.key].name.split(" ")[0]} (나)` : (isHero ? CAST[c.key].name : c.key);
    const tw = ctx.measureText(label).width;
    rr(c.x - tw / 2 - 6, top - 14, tw + 12, 17, 8.5, isMe ? "#7c6cff" : (isHero ? "#1b1930bb" : "#ffffffdd"));
    ctx.fillStyle = isMe || isHero ? "#fff" : "#2a2742";
    ctx.fillText(label, c.x, top - 1.5);
  }
  if (isMe) {                                               // 내 캐릭터 위 노란 화살표
    const ay = top - 22 + Math.sin(clockTime * 6) * 3;
    ctx.fillStyle = "#ffc94a";
    ctx.beginPath(); ctx.moveTo(c.x - 6, ay - 6); ctx.lineTo(c.x + 6, ay - 6); ctx.lineTo(c.x, ay + 1); ctx.fill();
  }
  if (c === nearNpc && mode === "play") {                   // 말 걸 수 있는 친구 위 말풍선 아이콘
    ctx.font = FONT(18);
    ctx.fillText("💬", c.x + 18, top - 4 + Math.sin(clockTime * 5) * 2);
  }
  if (c.emote) {                                            // 감정 표시 (! ♪ 💦)
    const a = Math.min(1, c.emote.t * 3);
    const pop = 1 + Math.max(0, c.emote.t - 1.3) * 2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = FONT(20 * pop);
    ctx.textAlign = "center";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = c.emote.text === "!!" || c.emote.text === "!" ? "#ff4d5e" : "#ff7ab8";
    ctx.strokeText(c.emote.text, c.x + 20, top - 16);   // 이름표와 안 겹치게 오른쪽 위
    ctx.fillText(c.emote.text, c.x + 20, top - 16);
    ctx.restore();
  }
}

// --- 말풍선 (혼잣말) ---
function wrapText(text, maxW) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}
function drawBubble(c) {
  ctx.font = FONT(13);
  const lines = wrapText(c.bubble.text, 150);
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
  const h = lines.length * 17 + 10;
  const tall = (c.look.legLen + c.look.torso + 33) * SPRITE;
  const x = Math.min(Math.max(c.x - w / 2, 8), W - w - 8);
  const y = Math.max(6, c.y - tall - 24 - h);   // 화면 위로 잘리지 않게
  ctx.save();
  ctx.globalAlpha = Math.min(1, c.bubble.t * 3);
  rr(x, y, w, h, 9, "#ffffff", "#1b193033");
  ctx.fillStyle = "#ffffff";
  ctx.beginPath(); ctx.moveTo(c.x - 5, y + h - 1); ctx.lineTo(c.x + 5, y + h - 1); ctx.lineTo(c.x, y + h + 7); ctx.fill();
  ctx.fillStyle = "#2a2742";
  ctx.textAlign = "left";
  lines.forEach((l, i) => ctx.fillText(l, x + 9, y + 18 + i * 17));
  ctx.restore();
}

// --- 벚꽃 / 반짝이 / 떠오르는 숫자 ---
function drawPetals() {
  for (const p of petals) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = 0.85;
    ellipse(0, 0, p.size, p.size * 0.55, "#ffc4dd");
    ellipse(-p.size * 0.3, 0, p.size * 0.35, p.size * 0.2, "#ff9cc4");
    ctx.restore();
  }
}
function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 260,
                     life: 0.7 + Math.random() * 0.5, color, size: 3 + Math.random() * 3, rot: 0, vr: 0 });
  }
}
function confetti() {
  const colors = ["#ffc94a", "#7c6cff", "#ff5d7a", "#4fd6a0", "#6ea8ff", "#ffc4dd"];
  for (let i = 0; i < 160; i++)
    particles.push({ x: Math.random() * W, y: -20 - Math.random() * 200, vx: (Math.random() - 0.5) * 60,
                     vy: 60 + Math.random() * 100, g: 30, life: 4 + Math.random() * 2,
                     color: colors[i % colors.length], size: 5 + Math.random() * 4,
                     rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, flat: true });
}
function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.flat) ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
function drawFloaters() {
  ctx.textAlign = "center";
  ctx.font = FONT(22);
  for (const f of floaters) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, f.life * 1.5);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1b1930";
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}


// ─────────────────────────────────────────────────────────────
// 13) 화면 전환 / 알림
// ─────────────────────────────────────────────────────────────
let toastTimer = null;
function toast(text, kind = "") {
  const t = $("toast");
  t.textContent = text;
  t.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}
function banner(html) {
  const b = $("banner");
  b.innerHTML = html;
  b.classList.remove("show");
  void b.offsetWidth;
  b.classList.add("show");
}
function flash() {
  const f = $("flash");
  f.classList.remove("show");
  void f.offsetWidth;
  f.classList.add("show");
}

// 시작 화면의 주인공 그림 + 등장인물 목록
function drawTitleArt() {
  drawPortrait($("tp-student"), LOOKS.student, "happy");
  drawPortrait($("tp-future"), LOOKS.future, "normal");
  document.querySelectorAll("#cast canvas").forEach((cv) => drawPortrait(cv, LOOKS[cv.dataset.key], "normal"));
}
function buildCast() {
  const box = $("cast");
  for (const d of NPC_DATA) {
    const item = document.createElement("div");
    item.className = "cast-item";
    item.innerHTML = `<canvas data-key="${d.key}"></canvas><span>${CAST[d.key].name.replace(" · ", "<br>")}</span>`;
    box.appendChild(item);
  }
}

function startGame() {
  initAudio();
  SFX.ok();
  $("title").classList.add("hidden");
  mode = "play";
  if (server && server.ended) return showEnding(server);
  if (server && server.turn === 1 && !server.can_undo) {
    // 첫 시작 : 미래의 나와 만나는 장면
    setTimeout(() => dialog([
      { who: "future", expr: "happy", text: "안녕? 놀라지 마. 나는 10년 뒤의 너야." },
      { who: "student", expr: "surprised", text: "에엣?! 미, 미래의… 나?!" },
      { who: "future", expr: "normal", text: "오늘 하루를 후회 없이 보내도록 도와주러 왔어. 빛나는 곳에서 행동하고, 친구들과도 이야기해 봐." },
      { who: "future", expr: "tired", text: "아, 그리고… 3교시 종이 울릴 때 조심해. 그때 뭔가가 뒤바뀌거든." },
      { who: "student", expr: "happy", text: "뭔지 모르겠지만… 좋아, 가 보자!" },
    ], () => toast("WASD / 방향키로 이동 · 빛나는 곳이나 친구 앞에서 Space ✨", "good")), 300);
  } else {
    toast("다시 왔구나! 이어서 진행해요 ✨", "good");
  }
}

function toggleHelp() {
  const help = $("help");
  if (mode === "help") {
    help.classList.add("hidden");
    mode = helpReturn;
  } else {
    if (mode === "menu") closeMenu(false);
    helpReturn = mode;
    help.classList.remove("hidden");
    mode = "help";
  }
}

function toggleMute() {
  muted = !muted;
  $("btn-mute").innerHTML = `${muted ? "🔇" : "🔊"} 소리 <kbd>M</kbd>`;
  toast(muted ? "🔇 소리 꺼짐" : "🔊 소리 켜짐");
}

function showEnding(d) {
  if (mode === "menu") closeMenu(false);
  closeDialog();
  mode = "ending";
  $("ending-grade").textContent = d.grade;
  $("ending-text").textContent = d.ending;
  $("ending-stats").innerHTML = Object.entries(d.stats)
    .map(([k, v]) => `<span>${STAT_ICON[k]} ${k} ${v}</span>`).join("") +
    `<span>💬 친구 ${d.talked.length}/7</span>`;
  $("ending").classList.remove("hidden");
  drawPortrait($("ep-future"), LOOKS.future, "happy");
  confetti();
  SFX.end();
}
function hideEnding() {
  $("ending").classList.add("hidden");
  if (mode === "ending") mode = "play";
}

function resetWorld() {
  hideEnding();
  closeDialog();
  Object.assign(chars.student, { x: 480, y: 292, dir: 1, bubble: null, spin: 0, exprT: 0 });
  Object.assign(chars.future,  { x: 430, y: 292, dir: 1, bubble: null, spin: 0, exprT: 0 });
  NPC_DATA.forEach((d, i) => Object.assign(npcs[i], { x: d.x, y: d.y, target: null, wait: rand(0, 2), bubble: null }));
  controlled = "student";
  trail = [];
  pendingSwap = false;
  talkingTo = null;
  particles = [];
  floaters = [];
  if (mode !== "title") mode = "play";
  renderRole(server);
  setExpr(chars.student, "happy", 2);
  setEmote(chars.student, "♪");
}


// ─────────────────────────────────────────────────────────────
// 14) 버튼 연결 + 게임 시작
// ─────────────────────────────────────────────────────────────
$("btn-start").onclick = startGame;
$("btn-help").onclick = toggleHelp;
$("btn-help-close").onclick = toggleHelp;
$("btn-mute").onclick = toggleMute;
$("btn-undo").onclick = () => { if (mode === "ending") hideEnding(); api("/api/undo", {}); };
$("btn-swap").onclick = () => { if (mode !== "ending") api("/api/swap", {}); };
$("btn-reset").onclick = () => api("/api/reset", {});
$("btn-again").onclick = () => api("/api/reset", {});
$("fix-toggle").onchange = (e) => api("/api/fix", { on: e.target.checked });
$("dialog").onclick = advanceDialog;
// 도구 막대 버튼을 누른 뒤 Space 를 누르면 그 버튼이 또 눌리는 문제 방지 → 포커스 해제
document.querySelectorAll("#toolbar button, #toolbar input").forEach((el) =>
  el.addEventListener("click", () => el.blur()));

// 게임 루프 : requestAnimationFrame 은 "다음 화면 그릴 때 이 함수 불러 줘" (보통 1초에 60번)
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

buildCast();
resize();
drawTitleArt();
api("/api/state").then((d) => { if (d) controlled = d.role; });
requestAnimationFrame(loop);
