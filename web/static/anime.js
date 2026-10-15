// =============================================================
// anime.js - 애니메이션풍 캐릭터 그리기 담당
// -------------------------------------------------------------
// 그림 파일(png) 없이, 선과 도형만으로 캐릭터를 그린다.
// 같은 함수(drawFigure)로
//   - 지도 위의 작은 캐릭터 (크기 1배)
//   - 대화창의 큰 초상화   (크기 약 8배)
// 를 모두 그린다. 도형으로 그렸기 때문에 크게 늘려도 깨지지 않는다.
//
// 좌표 약속 : (0, 0) = 캐릭터의 "발" 위치, 위로 갈수록 y 가 작아짐(음수)
// =============================================================

const OUTLINE = "#3b2633";   // 외곽선 색 (애니메이션처럼 진한 갈색 테두리)
const SKIN = "#ffe6d5";

// 색을 밝게(+) / 어둡게(-) 만드는 도우미. amt : -1 ~ 1
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);          // "#ff8800" → 숫자
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255; // 빨강·초록·파랑 꺼내기
  const target = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (target - r) * p);
  g = Math.round(g + (target - g) * p);
  b = Math.round(b + (target - b) * p);
  return `rgb(${r},${g},${b})`;
}

// ─────────────────────────────────────────────────────────────
// 옷 색깔표
//   lower : 아래옷 종류 (skirt 치마 / shorts 반바지 / pants 바지)
// ─────────────────────────────────────────────────────────────
const OUTFITS = {
  blazer:  { top: "#2d3a6b", pants: "#555b70", shoe: "#5a3a28", shirt: "#ffffff", tie: "#d64157", lower: "pants" },
  suit:    { top: "#3d4255", pants: "#30344a", shoe: "#1f1f29", shirt: "#ffffff", tie: "#3d7bd9", lower: "pants" },
  sailor:  { top: "#fbfbff", collar: "#2b3566", skirt: "#2b3566", sock: "#2b2b3a", shoe: "#6b3f2a",
             scarf: "#e8455d", cuff: "#2b3566", lower: "skirt" },
  gakuran: { top: "#22243a", pants: "#22243a", shoe: "#3a2a22", button: "#f5c84b", lower: "pants" },
  pe:      { top: "#ffffff", trim: "#e8455d", shorts: "#2d4fa8", sock: "#ffffff", shoe: "#e9e9f2",
             shortSleeve: true, lower: "shorts" },
  teacher: { top: "#8a7a52", pants: "#5a4a3a", shoe: "#3a2a22", shirt: "#ffffff", tie: "#7a3a3a", lower: "pants" },
  nurse:   { top: "#ffffff", pants: "#9ec9ff", shoe: "#ffffff", inner: "#ff9cb8", coat: true, lower: "pants" },
  // 여학생 블레이저 + 체크무늬 치마
  blazer_girl: { top: "#2d3a6b", skirt: "#8a2b3c", plaid: "#e9c46a", sock: "#1f1f2b", shoe: "#5a3a28",
                 shirt: "#ffffff", tie: "#d64157", lower: "skirt" },
  // 3학년 선배 : 카디건 + 리본
  cardigan: { top: "#f0d6a8", skirt: "#3d4a7a", plaid: "#9fb3e8", sock: "#f5f5f5", shoe: "#6b3f2a",
              shirt: "#ffffff", scarf: "#e8455d", lower: "skirt" },
};

// ─────────────────────────────────────────────────────────────
// 등장인물 생김새
//   hair : 머리 모양,  hairColor : 머리색,  eye : 눈동자 색
//   legLen / torso : 다리·몸통 길이 (어른은 더 길다)
// ─────────────────────────────────────────────────────────────
const LOOKS = {
  // 주인공 두 명
  student: { hair: "messy",  hairColor: "#2f3352", eye: "#e0952f", outfit: "blazer",  legLen: 12, torso: 13, ahoge: true, bag: "backpack" },
  future:  { hair: "neat",   hairColor: "#2f3352", eye: "#e0952f", outfit: "suit",    legLen: 19, torso: 16, ahoge: true, glasses: true, bag: "briefcase" },
  // 히로인 5명
  seorin:  { hair: "long",   hairColor: "#1d1b33", eye: "#8f6bff", outfit: "sailor",  legLen: 12, torso: 12, hairpin: "#c9b6ff", scarf: "#5b4bb7" },
  yuri:    { hair: "twin",   hairColor: "#e0485e", eye: "#f2a93b", outfit: "blazer_girl", legLen: 11, torso: 12, ribbon: "#24203d" },
  bom:     { hair: "side",   hairColor: "#ff9a3c", eye: "#2fb37a", outfit: "pe",      legLen: 12, torso: 12, ribbon: "#ffe066" },
  hayul:   { hair: "wavy",   hairColor: "#a8673f", eye: "#c26b4a", outfit: "cardigan", legLen: 13, torso: 13, ribbon: "#ffb3c7" },
  sion:    { hair: "bob",    hairColor: "#e3e9f7", eye: "#4aa3ff", outfit: "sailor",  legLen: 11, torso: 12, hairpin: "#ffe066", scarf: "#4aa3ff", skin: "#fff0e8" },
  // 조연
  doyun:   { hair: "spiky",  hairColor: "#5a4232", eye: "#3fae5a", outfit: "gakuran", legLen: 13, torso: 14 },
  kim:     { hair: "neat",   hairColor: "#6b5a4e", eye: "#6b4a36", outfit: "teacher", legLen: 19, torso: 16 },
  han:     { hair: "pony",   hairColor: "#a0603e", eye: "#9a5a3a", outfit: "nurse",   legLen: 18, torso: 15, ribbon: "#ff9cb8" },
};

// 머리 모양별 앞머리 끝(tips) 위치. valley = 앞머리 사이 들어간 곳 높이, side = 옆머리 길이
const STYLES = {
  messy:  { tips: [[-14, 4], [-9.5, 0], [-5, 3], [0, -1], [5, 3], [10, 0], [14.5, 4]], valley: -6 },
  neat:   { tips: [[-14.5, 2], [-9, -3], [-2, -4], [6, -1], [14.5, 3]], valley: -9 },
  long:   { tips: [[-15, 8], [-10, 2], [-5, 3.5], [0, 1.5], [5, 3.5], [10, 2], [15, 8]], valley: -5, side: 22 },
  twin:   { tips: [[-15, 7], [-10, 2], [-5, 3], [0, 1], [5, 3], [10, 2], [15, 7]], valley: -5, side: 14 },
  spiky:  { tips: [[-14.5, 3], [-8, -1], [-2, 2.5], [4, -1], [10, 2], [15, 3]], valley: -7, spikes: "big" },
  bob:    { tips: [[-15, 9], [-10, 2.5], [-3.5, 3], [3.5, 3], [10, 2.5], [15, 9]], valley: -1.5, side: 12 },
  sporty: { tips: [[-14.5, 1], [-8, -2.5], [-1, -0.5], [6, -3], [14.5, 1]], valley: -9, spikes: "small" },
  pony:   { tips: [[-14.5, 5], [-7, -1], [2, -3], [9, 0], [15, 4]], valley: -8, side: 10 },
  side:   { tips: [[-15, 6], [-10, 1], [-4, 3], [2, 0], [8, 3], [14, 5]], valley: -6, side: 8 },
  wavy:   { tips: [[-15, 9], [-9, 2], [-3, 4], [3, 1], [9, 3], [15, 9]], valley: -5, side: 20 },
};

const BIG_SPIKES = [[-15, -6], [-21, -12], [-13, -15], [-14, -24], [-6, -19], [-2, -28], [3, -20],
                    [10, -26], [10, -17], [19, -17], [16, -8]];
const SMALL_SPIKES = [[-12, -14], [-15, -19], [-7, -19], [-4, -24], [1, -20], [6, -23], [8, -18], [14, -17], [13, -12]];

function fillStroke(c, fill) { c.fillStyle = fill; c.fill(); c.stroke(); }
function oval(c, x, y, rx, ry, fill) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
}


// =============================================================
// 전신 그리기
//   o.moving / o.walk : 걷는 중인지, 걷기 박자
//   o.expr  : 표정 normal | happy | surprised | tired
//   o.blink : 눈 감는 순간인지
//   o.ol    : 외곽선 두께
// =============================================================
function drawFigure(c, L, o = {}) {
  const ol = o.ol ?? 1;                 // ?? : 앞의 값이 없으면 뒤의 값을 씀
  const leg = L.legLen ?? 12, tor = L.torso ?? 13;
  const hipY = -leg, shY = -leg - tor, headY = shY - 14.5;
  const swing = o.moving ? Math.sin(o.walk || 0) : 0;
  const skin = L.skin || SKIN;
  const F = OUTFITS[L.outfit];

  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
  c.lineWidth = ol;
  c.strokeStyle = OUTLINE;

  // 1) 뒷머리 (긴 머리·양갈래는 몸 뒤로 내려옴)
  // 뒷머리 흔들림 : 걸을 때는 걸음에 맞춰, 서 있을 때는 바람에 살랑 (o.sway)
  c.save(); c.translate(0, headY); backHair(c, L, o.moving ? swing : (o.sway || 0), tor); c.restore();

  // 2) 가방 (등 뒤)
  if (L.bag === "backpack") {
    c.beginPath(); c.roundRect(-14.5, shY + 1, 8, tor, 2.5); fillStroke(c, "#d9773a");
    c.beginPath(); c.moveTo(-13.5, shY + 5); c.lineTo(-7.5, shY + 5); c.stroke();
  }

  // 3) 뒤쪽 팔
  drawArm(c, L, F, -1, shY, tor, swing, skin, ol);

  // 4) 다리 (엉덩이를 중심으로 앞뒤로 흔들림)
  const bare = F.lower === "skirt" || F.lower === "shorts";
  for (const side of [-1, 1]) {
    c.save();
    c.translate(side * 3.1, hipY - 1);
    c.rotate(swing * 0.45 * side);
    c.beginPath(); c.roundRect(-2.3, 0, 4.6, leg + 1, 2); fillStroke(c, bare ? skin : F.pants);
    if (F.sock) { c.beginPath(); c.roundRect(-2.3, (leg + 1) * 0.5, 4.6, (leg + 1) * 0.5, 1.5); fillStroke(c, F.sock); }
    c.beginPath(); c.ellipse(1.3, leg + 0.6, 3.5, 1.9, 0, 0, Math.PI * 2); fillStroke(c, F.shoe);
    c.restore();
  }

  // 5) 아래옷
  if (F.lower === "skirt") {
    c.beginPath();
    c.moveTo(-7.4, hipY - 4); c.lineTo(7.4, hipY - 4);
    c.lineTo(10.5 + swing * 0.6, hipY + 4.5); c.lineTo(-10.5 + swing * 0.6, hipY + 4.5);
    c.closePath(); fillStroke(c, F.skirt);
    c.save();                                         // 주름 선
    c.lineWidth = ol * 0.6; c.strokeStyle = shade(F.skirt, 0.35);
    for (const k of [-6, -2, 2, 6]) { c.beginPath(); c.moveTo(k * 0.7, hipY - 3); c.lineTo(k + swing * 0.4, hipY + 4.2); c.stroke(); }
    if (F.plaid) {                                    // 체크무늬 가로줄
      c.strokeStyle = F.plaid; c.globalAlpha = 0.7;
      for (const y of [hipY - 1, hipY + 2]) { c.beginPath(); c.moveTo(-9, y); c.lineTo(9, y); c.stroke(); }
    }
    c.restore();
  } else if (F.lower === "shorts") {
    c.beginPath(); c.roundRect(-7.2, hipY - 3.5, 14.4, 6.5, 2); fillStroke(c, F.shorts);
  } else {
    c.beginPath(); c.roundRect(-7.2, hipY - 3.5, 14.4, 5, 1.5); fillStroke(c, F.pants);
  }

  // 6) 목
  c.beginPath(); c.roundRect(-2.2, shY - 3.5, 4.4, 4.5, 1); c.fillStyle = shade(skin.startsWith("#") ? skin : SKIN, -0.08); c.fill();

  // 7) 몸통 (가운은 엉덩이 아래까지 길게)
  const bottom = F.coat ? hipY + 5 : hipY - 2;
  const bw = F.coat ? 9.5 : 7.6;
  c.beginPath();
  c.moveTo(-8.8, shY + 2.5); c.quadraticCurveTo(-8.8, shY, -5.5, shY);
  c.lineTo(5.5, shY); c.quadraticCurveTo(8.8, shY, 8.8, shY + 2.5);
  c.lineTo(bw, bottom); c.lineTo(-bw, bottom); c.closePath();
  fillStroke(c, F.top);
  outfitDetails(c, L, F, shY, hipY, ol);

  // 8) 앞쪽 팔
  drawArm(c, L, F, 1, shY, tor, swing, skin, ol);

  // 9) 머리
  c.save(); c.translate(0, headY); drawHead(c, L, o, ol); c.restore();
  c.restore();
}

function drawArm(c, L, F, side, shY, tor, swing, skin, ol) {
  const len = tor * 0.85;
  c.save();
  c.translate(side * 8, shY + 2);
  c.rotate(-swing * 0.5 * side + side * 0.1);
  c.beginPath(); c.roundRect(-2, 0, 4, len, 2); fillStroke(c, F.shortSleeve ? skin : F.top);
  if (F.shortSleeve) {                                // 반팔 : 소매만 짧게
    c.beginPath(); c.roundRect(-2.4, -0.5, 4.8, len * 0.42, 2); fillStroke(c, F.top);
    c.save(); c.strokeStyle = F.trim; c.lineWidth = ol * 1.2;
    c.beginPath(); c.moveTo(-2.1, len * 0.42 - 0.8); c.lineTo(2.1, len * 0.42 - 0.8); c.stroke(); c.restore();
  }
  if (F.cuff) {                                       // 소맷부리 줄
    c.save(); c.strokeStyle = F.cuff; c.lineWidth = ol * 1.4;
    c.beginPath(); c.moveTo(-1.7, len - 1.2); c.lineTo(1.7, len - 1.2); c.stroke(); c.restore();
  }
  c.beginPath(); c.arc(0, len + 1.2, 1.9, 0, Math.PI * 2); fillStroke(c, skin);   // 손
  if (L.bag === "briefcase" && side === 1) {          // 서류가방
    c.beginPath(); c.roundRect(-4.5, len + 2, 9, 6.5, 1.2); fillStroke(c, "#7a4b26");
    c.beginPath(); c.moveTo(-1.5, len + 2); c.lineTo(-1.5, len + 0.8); c.lineTo(1.5, len + 0.8); c.lineTo(1.5, len + 2); c.stroke();
  }
  c.restore();
}

function outfitDetails(c, L, F, shY, hipY, ol) {
  const scarf = L.scarf || F.scarf;                    // 캐릭터마다 스카프 색을 다르게 할 수 있음
  switch (L.outfit) {
    case "cardigan":
      c.beginPath(); c.moveTo(-3.6, shY); c.lineTo(3.6, shY); c.lineTo(0, shY + 7); c.closePath(); fillStroke(c, F.shirt);
      c.beginPath(); c.moveTo(-3.6, shY); c.lineTo(-0.6, shY + 11); c.moveTo(3.6, shY); c.lineTo(0.6, shY + 11); c.stroke();
      bow(c, 0, shY + 3, 0.55, scarf);                 // 가슴 리본
      c.fillStyle = shade(F.top, -0.35);              // 카디건 단추
      for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0.4, shY + 9 + k * 2.6, 0.65, 0, Math.PI * 2); c.fill(); }
      break;
    case "blazer": case "suit": case "teacher": case "blazer_girl":
      c.beginPath(); c.moveTo(-3.4, shY); c.lineTo(3.4, shY); c.lineTo(0, shY + 6.5); c.closePath(); fillStroke(c, F.shirt);
      c.beginPath();                                   // 넥타이
      c.moveTo(-0.9, shY + 1); c.lineTo(0.9, shY + 1); c.lineTo(1.4, shY + 8.5);
      c.lineTo(0, shY + 10); c.lineTo(-1.4, shY + 8.5); c.closePath(); fillStroke(c, F.tie);
      c.beginPath();                                   // 옷깃
      c.moveTo(-3.4, shY); c.lineTo(-1.3, shY + 9); c.moveTo(3.4, shY); c.lineTo(1.3, shY + 9); c.stroke();
      c.fillStyle = shade(F.top, -0.5);                // 단추
      for (const y of [hipY - 6, hipY - 3.4]) { c.beginPath(); c.arc(1.8, y, 0.7, 0, Math.PI * 2); c.fill(); }
      if (L.outfit === "blazer") { c.fillStyle = "#f5c84b"; c.fillRect(-6.6, shY + 5, 2.2, 2.2); }  // 교복 마크
      break;
    case "sailor":
      c.beginPath();                                   // 세일러 깃
      c.moveTo(-9, shY + 1.5); c.quadraticCurveTo(-8.5, shY - 0.5, -5, shY);
      c.lineTo(5, shY); c.quadraticCurveTo(8.5, shY - 0.5, 9, shY + 1.5);
      c.lineTo(5.5, shY + 5); c.lineTo(0, shY + 8.5); c.lineTo(-5.5, shY + 5); c.closePath();
      fillStroke(c, F.collar);
      c.save(); c.strokeStyle = "#ffffff"; c.lineWidth = ol * 0.7;   // 깃의 흰 줄
      c.beginPath(); c.moveTo(-7.6, shY + 2); c.lineTo(-4.6, shY + 4.4); c.lineTo(0, shY + 7.2);
      c.lineTo(4.6, shY + 4.4); c.lineTo(7.6, shY + 2); c.stroke(); c.restore();
      for (const s of [-1, 1]) {                       // 스카프 리본
        c.beginPath(); c.moveTo(0, shY + 8.5); c.lineTo(s * 4.2, shY + 6.3); c.lineTo(s * 3.8, shY + 10.7); c.closePath();
        fillStroke(c, scarf);
      }
      c.beginPath(); c.moveTo(-0.8, shY + 9.5); c.lineTo(-2, shY + 14); c.lineTo(0, shY + 13); c.lineTo(2, shY + 14); c.lineTo(0.8, shY + 9.5);
      fillStroke(c, scarf);
      c.beginPath(); c.arc(0, shY + 8.5, 1.3, 0, Math.PI * 2); fillStroke(c, scarf);
      break;
    case "gakuran":
      c.beginPath(); c.roundRect(-3.8, shY - 1, 7.6, 2.6, 1); fillStroke(c, F.top);   // 높은 깃
      c.beginPath(); c.moveTo(0.5, shY + 1.5); c.lineTo(0.5, hipY - 2); c.stroke();
      c.fillStyle = F.button;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0.5, shY + 3.5 + k * 3.6, 0.9, 0, Math.PI * 2); c.fill(); }
      break;
    case "pe":
      c.save(); c.strokeStyle = F.trim; c.lineWidth = ol * 1.3;
      c.beginPath(); c.moveTo(-3, shY + 0.3); c.lineTo(0, shY + 3.5); c.lineTo(3, shY + 0.3); c.stroke();
      c.fillStyle = F.trim; c.font = "bold 6px sans-serif"; c.textAlign = "center";
      c.fillText("7", 2, shY + 10.5);                  // 등번호(앞번호) 7
      c.restore();
      break;
    case "nurse":
      c.beginPath(); c.moveTo(-3.6, shY); c.lineTo(3.6, shY); c.lineTo(0, shY + 8); c.closePath(); fillStroke(c, F.inner);
      c.beginPath(); c.moveTo(0, shY + 8); c.lineTo(0, hipY + 5); c.stroke();
      c.beginPath(); c.roundRect(2.6, hipY - 4, 4, 3.5, 0.8); c.stroke();
      c.fillStyle = "#ff4d5e";                         // 가슴의 빨간 십자
      c.fillRect(-6.4, shY + 4, 2.6, 0.9); c.fillRect(-5.55, shY + 3.15, 0.9, 2.6);
      break;
  }
}

// ─────────────────────────────────────────────────────────────
// 머리 (얼굴 + 눈 + 머리카락). 여기서 (0, 0) = 얼굴 가운데
// ─────────────────────────────────────────────────────────────
function backHair(c, L, swing, tor) {
  const col = L.hairColor;
  if (L.hair === "long") {
    c.beginPath(); c.moveTo(-16, -4);
    c.bezierCurveTo(-19, 10, -17, 24, -13 - swing * 0.5, 15 + tor);
    c.lineTo(13 - swing * 0.5, 15 + tor);
    c.bezierCurveTo(17, 24, 19, 10, 16, -4); c.closePath(); fillStroke(c, col);
  } else if (L.hair === "twin") {
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 13, -4);
      c.bezierCurveTo(s * 24, 0, s * 23 + swing, 16, s * 17 + swing * 1.5, 27);
      c.bezierCurveTo(s * 18, 18, s * 15, 8, s * 11, 2); c.closePath(); fillStroke(c, col);
    }
  } else if (L.hair === "bob") {
    c.beginPath(); c.moveTo(-16.5, -4); c.lineTo(-16.8, 12);
    c.quadraticCurveTo(0, 16, 16.8, 12); c.lineTo(16.5, -4); c.closePath(); fillStroke(c, col);
  } else if (L.hair === "pony") {
    c.beginPath(); c.moveTo(-10, -12);
    c.bezierCurveTo(-24 - swing, -8, -22 - swing, 12, -15 - swing * 1.5, 22);
    c.bezierCurveTo(-16, 10, -14, -2, -6, -8); c.closePath(); fillStroke(c, col);
  } else if (L.hair === "side") {                     // 사이드 포니테일 (한쪽으로 묶은 머리)
    c.beginPath(); c.moveTo(12, -10);
    c.bezierCurveTo(26 + swing, -6, 25 + swing, 10, 19 + swing * 1.5, 22);
    c.bezierCurveTo(18, 10, 17, 0, 10, -4); c.closePath(); fillStroke(c, col);
  } else if (L.hair === "wavy") {                     // 웨이브 롱 (물결치는 긴 머리)
    const end = 15 + tor;
    c.beginPath(); c.moveTo(-16, -4);
    c.quadraticCurveTo(-22, 4, -17, 11); c.quadraticCurveTo(-23, 18, -17, 24);
    c.quadraticCurveTo(-21 - swing * 0.5, end - 2, -14 - swing * 0.5, end);
    c.lineTo(14 - swing * 0.5, end);
    c.quadraticCurveTo(21 - swing * 0.5, end - 2, 17, 24); c.quadraticCurveTo(23, 18, 17, 11);
    c.quadraticCurveTo(22, 4, 16, -4); c.closePath(); fillStroke(c, col);
  }
}

function hairPath(c, st) {
  c.beginPath();
  c.moveTo(-16, 4);
  c.bezierCurveTo(-18.5, -25, 18.5, -25, 16, 4);     // 머리 윗부분 둥근 돔
  let px = 16, py = 4;
  for (let i = st.tips.length - 1; i >= 0; i--) {     // 오른쪽 → 왼쪽으로 앞머리 가닥
    const [tx, ty] = st.tips[i];
    c.quadraticCurveTo((px + tx) / 2 + 0.8, (py + ty) / 2 - 1, tx, ty);
    const [nx, ny] = i > 0 ? [(tx + st.tips[i - 1][0]) / 2, st.valley] : [-16, 4];
    c.quadraticCurveTo((tx + nx) / 2 + 0.6, (ty + ny) / 2 + 0.5, nx, ny);
    px = nx; py = ny;
  }
  c.closePath();
}

function frontHair(c, L, ol) {
  const st = STYLES[L.hair];
  const col = L.hairColor;

  if (st.side) {                                      // 옆머리
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 16, 0);
      c.quadraticCurveTo(s * 17.5, st.side * 0.6, s * 14.5, st.side);
      c.lineTo(s * 12.3, st.side * 0.55);
      c.quadraticCurveTo(s * 12.6, 4, s * 13, 0); c.closePath(); fillStroke(c, col);
    }
  }
  if (st.spikes) {                                    // 뾰족 머리
    const pts = st.spikes === "big" ? BIG_SPIKES : SMALL_SPIKES;
    c.beginPath(); c.moveTo(...pts[0]);
    for (const p of pts.slice(1)) c.lineTo(...p);
    c.closePath(); fillStroke(c, col);
  }
  hairPath(c, st);
  fillStroke(c, col);

  // 머리카락 광택 (애니메이션의 "천사의 고리") + 가닥 선
  c.save();
  hairPath(c, st); c.clip();                          // clip : 이 모양 안에만 그려지게 자름
  c.globalAlpha = 0.75; c.strokeStyle = shade(col, 0.5); c.lineWidth = 1.8;
  c.beginPath(); c.ellipse(-1, -9, 12, 4.5, -0.1, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
  c.globalAlpha = 0.45; c.strokeStyle = shade(col, -0.4); c.lineWidth = ol * 0.7;
  for (const x of [-8, -2, 4, 9]) { c.beginPath(); c.moveTo(x * 0.8, -16); c.quadraticCurveTo(x * 1.1, -10, x * 1.05, -3); c.stroke(); }
  c.restore();

  if (L.ahoge) {                                      // 아호게 (머리 위 삐죽 한 가닥)
    c.beginPath(); c.moveTo(1, -18.5);
    c.bezierCurveTo(2, -26, 9, -27, 7, -21.5);
    c.bezierCurveTo(6, -24, 3, -23, 3.2, -18.4); c.closePath(); fillStroke(c, col);
  }
  if (L.headband) {                                   // 머리띠
    c.save(); c.strokeStyle = L.headband; c.lineWidth = 2.6;
    c.beginPath(); c.ellipse(0, -5, 15.6, 7.5, 0, Math.PI * 1.02, Math.PI * 1.98); c.stroke(); c.restore();
  }
  if (L.hairpin) {                                    // 머리핀
    c.save(); c.strokeStyle = L.hairpin; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(-11.5, -5); c.lineTo(-7, -7); c.moveTo(-11, -3); c.lineTo(-6.5, -5); c.stroke(); c.restore();
  }
  if (L.ribbon && L.hair === "long") bow(c, -12, -12, 1.2, L.ribbon);
  if (L.ribbon && L.hair === "twin") { bow(c, -14, -4, 0.8, L.ribbon); bow(c, 14, -4, 0.8, L.ribbon); }
  if (L.ribbon && L.hair === "pony") bow(c, -11, -11, 0.6, L.ribbon);
  if (L.ribbon && L.hair === "side") bow(c, 13, -9, 0.75, L.ribbon);
  if (L.ribbon && L.hair === "wavy") bow(c, -13, -8, 0.8, L.ribbon);
}

function bow(c, x, y, s, color) {                     // 리본
  c.save(); c.translate(x, y); c.scale(s, s);
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(d * 6, -3.5); c.lineTo(d * 6, 3.5); c.closePath(); fillStroke(c, color);
  }
  c.beginPath(); c.arc(0, 0, 1.6, 0, Math.PI * 2); fillStroke(c, shade(color, -0.2));
  c.restore();
}

// 표정마다 눈썹 모양 : base = 높이, inner = 안쪽 끝, outer = 바깥쪽 끝 (+ 는 아래로)
const BROWS = {
  normal:    { base: 0.2,  inner: 0,    outer: 0 },
  happy:     { base: -0.6, inner: 0,    outer: 0 },
  surprised: { base: -2.2, inner: 0,    outer: 0 },
  tired:     { base: 0.2,  inner: -1.4, outer: 0.8 },
  angry:     { base: 0.4,  inner: 1.8,  outer: -1.2 },   // V 모양 (츤데레 화남)
  blush:     { base: 0,    inner: -0.9, outer: 0.4 },
  sad:       { base: 0.2,  inner: -1.8, outer: 1.0 },
};

function drawHead(c, L, o, ol) {
  const skin = L.skin || SKIN;
  const fx = 1.2;                    // 얼굴이 살짝 오른쪽을 보도록 이목구비를 옮김 (3/4 방향)
  const expr = BROWS[o.expr] ? o.expr : "normal";

  // 얼굴형 : 둥근 이마 + 뾰족한 턱 (애니메이션 얼굴형)
  c.beginPath();
  c.moveTo(-14, -1);
  c.bezierCurveTo(-14.5, -20, 14.5, -20, 14, -1);
  c.bezierCurveTo(14, 7, 9, 13.5, 1.8, 15.5);
  c.bezierCurveTo(-5.5, 13.5, -14, 7.5, -14, -1);
  c.closePath(); fillStroke(c, skin);

  // 볼터치 : 부끄러울 때·화날 때는 더 진하고 넓게
  const strong = expr === "blush" ? 1 : expr === "angry" ? 0.55 : 0;
  const ba = 0.35 + strong * 0.3;
  oval(c, -6.5 + fx, 10, 3.2 + strong * 1.3, 1.5 + strong * 0.6, `rgba(255,110,135,${ba})`);
  oval(c, 8 + fx, 10, 3 + strong * 1.3, 1.5 + strong * 0.6, `rgba(255,110,135,${ba})`);
  c.save(); c.strokeStyle = "rgba(230,80,105,0.55)"; c.lineWidth = ol * 0.45;
  const hatch = 3 + Math.round(strong * 2);
  for (const bx of [-7.8 + fx, 6.6 + fx]) for (let k = 0; k < hatch; k++) {
    c.beginPath(); c.moveTo(bx + k * 1.1, 10.9); c.lineTo(bx + k * 1.1 + 0.8, 9.1); c.stroke();
  }
  c.restore();

  // 코 (아주 작은 선)
  c.save(); c.lineWidth = ol * 0.6; c.strokeStyle = "#d9a08a";
  c.beginPath(); c.moveTo(fx + 1.8, 8.3); c.lineTo(fx + 2.4, 9.4); c.stroke(); c.restore();

  drawMouth(c, fx + 1.5, 12, expr, ol, o.talk || 0);
  frontHair(c, L, ol);

  // 눈은 앞머리 위에 그려서 항상 잘 보이게 (애니메이션식 표현)
  drawEye(c, -5.6 + fx, 5.8, L, expr, o.blink, ol, -1);
  drawEye(c, 6.4 + fx, 5.8, L, expr, o.blink, ol, 1);

  // 눈썹 : 앞머리 너머로 비쳐 보이게 반투명
  const B = BROWS[expr];
  c.save(); c.globalAlpha = 0.85; c.lineWidth = ol * 1.15; c.strokeStyle = shade(L.hairColor, -0.45);
  for (const [bx, s] of [[-5.6 + fx, -1], [6.4 + fx, 1]]) {
    const inner = s < 0 ? bx + 2.6 : bx - 2.6, outer = s < 0 ? bx - 2.6 : bx + 2.6;
    c.beginPath(); c.moveTo(outer, B.base + B.outer);
    c.quadraticCurveTo(bx, B.base - 1.3, inner, B.base + B.inner); c.stroke();
  }
  c.restore();

  if (L.glasses) {                                    // 안경
    c.save(); c.lineWidth = ol * 0.9; c.strokeStyle = "#2b2b3d"; c.fillStyle = "rgba(180,220,255,0.18)";
    for (const ex of [-5.6 + fx, 6.4 + fx]) {
      c.beginPath(); c.roundRect(ex - 4.3, 2, 8.6, 7.6, 2.4); c.fill(); c.stroke();
    }
    c.beginPath(); c.moveTo(-1.3 + fx, 4.5); c.lineTo(2.1 + fx, 4.5); c.stroke();
    c.strokeStyle = "rgba(255,255,255,0.8)"; c.lineWidth = ol * 0.6;
    c.beginPath(); c.moveTo(-8 + fx, 7.5); c.lineTo(-6 + fx, 3.5); c.stroke();
    c.restore();
  }

  if (expr === "tired" || expr === "blush") {         // 땀방울
    c.beginPath(); c.moveTo(15, -4); c.quadraticCurveTo(17.5, 0, 15.5, 1.5); c.quadraticCurveTo(13.5, 0, 15, -4);
    c.save(); c.lineWidth = ol * 0.6; fillStroke(c, "#9fd8ff"); c.restore();
  }
  if (expr === "angry") {                             // 화남 표시 (이마의 십자 핏대)
    c.save(); c.strokeStyle = "#ff4d5e"; c.lineWidth = ol * 1.1;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      c.beginPath(); c.moveTo(-9 + dx * 0.6, -11 + dy * 0.6); c.quadraticCurveTo(-9 + dx * 2.4, -11 + dy * 0.4, -9 + dx * 2.6, -11 + dy * 2.4); c.stroke();
    }
    c.restore();
  }
}

function drawEye(c, cx, cy, L, expr, blink, ol, side) {
  const w = 6.4, h = 8;
  const skin = L.skin || SKIN;
  c.save();
  c.strokeStyle = OUTLINE;
  if (blink) {                                        // 깜빡임 : 아래로 휜 선
    c.lineWidth = ol * 1.4;
    c.beginPath(); c.moveTo(cx - w / 2, cy + 0.5); c.quadraticCurveTo(cx, cy + 2.2, cx + w / 2, cy + 0.5); c.stroke();
    c.restore(); return;
  }
  if (expr === "happy") {                             // 웃는 눈 ^ ^
    c.lineWidth = ol * 1.6;
    c.beginPath(); c.moveTo(cx - w / 2, cy + 1.5); c.quadraticCurveTo(cx, cy - 3, cx + w / 2, cy + 1.5); c.stroke();
    c.restore(); return;
  }
  const surprised = expr === "surprised";
  // 눈꺼풀이 내려온 정도 (눈 높이에 대한 비율)
  const cover = { tired: 0.46, angry: 0.24, sad: 0.14, blush: 0.06 }[expr] || 0;

  // 흰자
  c.beginPath(); c.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  c.fillStyle = "#ffffff"; c.fill();
  c.save(); c.clip();

  // 눈동자 : 위는 어둡고 아래로 갈수록 밝아지는 그라데이션 (애니메이션 눈의 핵심)
  const ir = surprised ? 0.3 : 0.43;
  const g = c.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  g.addColorStop(0, shade(L.eye, -0.6));
  g.addColorStop(0.55, L.eye);
  g.addColorStop(1, shade(L.eye, 0.5));
  const look = expr === "blush" ? -0.8 * side : 0;    // 부끄러우면 시선을 살짝 피함
  c.beginPath(); c.ellipse(cx + 0.4 + look, cy + 0.6, w * ir, h * (ir + 0.06), 0, 0, Math.PI * 2);
  c.fillStyle = g; c.fill();
  oval(c, cx + 0.4 + look, cy + 0.9, w * ir * 0.45, h * ir * 0.5, shade(L.eye, -0.7));   // 동공
  // 반짝임 (큰 것 하나 + 작은 것 하나). 슬플 때는 촉촉하게 더 크게
  const big = surprised ? 1.1 : expr === "sad" ? 1.7 : 1.4;
  oval(c, cx - 0.8 + look, cy - 1.2, big, big, "#ffffff");
  oval(c, cx + 1.4 + look, cy + 2.2, expr === "sad" ? 0.9 : 0.6, expr === "sad" ? 0.9 : 0.6, "#ffffff");
  if (cover) { c.fillStyle = skin; c.fillRect(cx - w, cy - h, w * 2, h / 2 + h * cover); }   // 내려온 눈꺼풀
  c.restore();

  // 윗속눈썹 (굵게) + 눈꼬리
  const top = cy - h / 2;
  let yIn, yOut, yMid;
  if (cover) {
    const lid = top + h * cover;
    yIn = lid + 0.4 + (expr === "angry" ? 1.1 : 0);   // 화나면 안쪽 끝이 내려감
    yOut = lid + 0.4 - (expr === "sad" ? -0.8 : 0);
    yMid = lid - 0.4;
  } else {
    yIn = cy - h * 0.12; yOut = cy - h * 0.28; yMid = top - 1.2;
  }
  const xIn = side > 0 ? cx - w / 2 - 0.5 : cx + w / 2 + 0.5;
  const xOut = side > 0 ? cx + w / 2 + 0.5 : cx - w / 2 - 0.5;
  c.lineWidth = ol * 1.9;
  c.beginPath(); c.moveTo(xIn, yIn); c.quadraticCurveTo(cx - 0.3, yMid, xOut, yOut); c.stroke();
  c.lineWidth = ol * 1.2;
  c.beginPath(); c.moveTo(xOut, yOut); c.lineTo(xOut + side * 1.5, yOut - 1.2); c.stroke();
  // 아랫선
  c.lineWidth = ol * 0.6;
  c.beginPath(); c.moveTo(cx - w * 0.22, cy + h / 2 - 0.2); c.lineTo(cx + w * 0.22, cy + h / 2 - 0.2); c.stroke();
  if (expr === "sad") {                               // 눈가에 맺힌 눈물
    c.strokeStyle = "rgba(120,190,255,0.9)"; c.lineWidth = ol * 0.9;
    c.beginPath(); c.moveTo(cx - w * 0.35, cy + h / 2 + 0.4); c.quadraticCurveTo(cx, cy + h / 2 + 1.3, cx + w * 0.35, cy + h / 2 + 0.4); c.stroke();
  }
  c.restore();
}

// talk : 말하는 중 입이 벌어진 정도 (0 = 닫힘 ~ 1 = 크게) → 립싱크
function drawMouth(c, x, y, expr, ol, talk = 0) {
  c.save(); c.lineWidth = ol * 0.9; c.strokeStyle = OUTLINE;
  if (expr === "happy") {                             // 활짝 웃는 입 (말하면 위아래로 움직임)
    const k = 0.55 + talk * 0.6;
    c.beginPath(); c.moveTo(x - 2.4, y - 0.6); c.quadraticCurveTo(x, y - 0.6 + 4.4 * k, x + 2.4, y - 0.6); c.closePath();
    fillStroke(c, "#c8475b");
    oval(c, x, y - 0.6 + 2.2 * k, 1.2, 0.7 * k, "#ff8fa3");
  } else if (expr === "surprised") {                  // 동그란 입
    c.beginPath(); c.ellipse(x, y + 0.5, 1.3, 1.4 + talk * 0.8, 0, 0, Math.PI * 2); fillStroke(c, "#c8475b");
  } else if (talk > 0.12) {                           // 그 밖의 표정 : 말하는 동안 벌어진 입
    const w = expr === "angry" ? 2.3 : expr === "blush" || expr === "sad" ? 1.3 : 1.7;
    c.beginPath(); c.ellipse(x, y + 0.4, w, 0.35 + talk * 1.5, 0, 0, Math.PI * 2); fillStroke(c, "#c8475b");
    if (talk > 0.5) oval(c, x, y + 0.4 + talk * 0.8, w * 0.55, 0.4, "#ff8fa3");
  } else if (expr === "angry") {                      // 소리치는 입 (위로 볼록)
    c.beginPath(); c.moveTo(x - 2.3, y + 1); c.quadraticCurveTo(x, y - 2, x + 2.3, y + 1); c.closePath();
    fillStroke(c, "#c8475b");
    c.fillStyle = "#ffffff"; c.fillRect(x - 1.2, y - 0.6, 2.4, 0.6);   // 이빨
  } else if (expr === "tired" || expr === "blush") {  // 물결 입
    const k = expr === "blush" ? 0.75 : 1;
    c.beginPath(); c.moveTo(x - 2.2 * k, y); c.quadraticCurveTo(x - 1.1 * k, y - 1, x, y);
    c.quadraticCurveTo(x + 1.1 * k, y + 1, x + 2.2 * k, y); c.stroke();
  } else if (expr === "sad") {                        // 아래로 처진 입
    c.beginPath(); c.moveTo(x - 1.8, y + 0.9); c.quadraticCurveTo(x, y - 0.9, x + 1.8, y + 0.9); c.stroke();
  } else {
    c.beginPath(); c.moveTo(x - 1.6, y); c.quadraticCurveTo(x, y + 1.2, x + 1.6, y); c.stroke();
  }
  c.restore();
}


// =============================================================
// 초상화 : 캔버스 하나에 캐릭터의 상반신을 크게 그린다
// =============================================================
// extra : 립싱크(talk)·눈 깜빡임(blink) 같은 추가 옵션
function drawPortrait(canvas, look, expr = "normal", extra = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = canvas.clientWidth || 160;
  const px = Math.round(size * dpr);
  if (canvas.width !== px) { canvas.width = px; canvas.height = px; }   // 크기가 바뀔 때만 새로 정함
  const c = canvas.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  const leg = look.legLen ?? 12, tor = look.torso ?? 13;
  const headY = -leg - tor - 14.5;
  const S = canvas.width / 54;                        // 가로 54칸 분량을 캔버스 크기에 맞춤
  c.setTransform(S, 0, 0, S, canvas.width / 2, (-headY + 28) * S);   // 머리 위 아호게까지 보이게
  drawFigure(c, look, { expr, ol: 0.45, ...extra });
}
