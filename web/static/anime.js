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
};

// ─────────────────────────────────────────────────────────────
// 등장인물 생김새
//   hair : 머리 모양,  hairColor : 머리색,  eye : 눈동자 색
//   legLen / torso : 다리·몸통 길이 (어른은 더 길다)
// ─────────────────────────────────────────────────────────────
const LOOKS = {
  student:  { hair: "messy",  hairColor: "#2f3352", eye: "#e0952f", outfit: "blazer",  legLen: 12, torso: 13, ahoge: true, bag: "backpack" },
  future:   { hair: "neat",   hairColor: "#2f3352", eye: "#e0952f", outfit: "suit",    legLen: 19, torso: 16, ahoge: true, glasses: true, bag: "briefcase" },
  서아:     { hair: "long",   hairColor: "#1f1c30", eye: "#c23b3b", outfit: "sailor",  legLen: 12, torso: 12, ribbon: "#e8455d" },
  하린:     { hair: "twin",   hairColor: "#ff9cc4", eye: "#e0458f", outfit: "sailor",  legLen: 11, torso: 12, ribbon: "#ffd84a" },
  도윤:     { hair: "spiky",  hairColor: "#ff8a3d", eye: "#3fae5a", outfit: "gakuran", legLen: 13, torso: 14 },
  유나:     { hair: "bob",    hairColor: "#8c6bd6", eye: "#7b4fd1", outfit: "sailor",  legLen: 11, torso: 12, glasses: true, hairpin: "#7fd1ff" },
  태오:     { hair: "sporty", hairColor: "#3a7bd5", eye: "#2f80ed", outfit: "pe",      legLen: 13, torso: 13, headband: "#ff4757" },
  김선생님: { hair: "neat",   hairColor: "#6b5a4e", eye: "#6b4a36", outfit: "teacher", legLen: 19, torso: 16 },
  한선생님: { hair: "pony",   hairColor: "#a0603e", eye: "#9a5a3a", outfit: "nurse",   legLen: 18, torso: 15, ribbon: "#ff9cb8" },
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
  c.save(); c.translate(0, headY); backHair(c, L, swing, tor); c.restore();

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
  switch (L.outfit) {
    case "blazer": case "suit": case "teacher":
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
        fillStroke(c, F.scarf);
      }
      c.beginPath(); c.moveTo(-0.8, shY + 9.5); c.lineTo(-2, shY + 14); c.lineTo(0, shY + 13); c.lineTo(2, shY + 14); c.lineTo(0.8, shY + 9.5);
      fillStroke(c, F.scarf);
      c.beginPath(); c.arc(0, shY + 8.5, 1.3, 0, Math.PI * 2); fillStroke(c, F.scarf);
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
}

function bow(c, x, y, s, color) {                     // 리본
  c.save(); c.translate(x, y); c.scale(s, s);
  for (const d of [-1, 1]) {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(d * 6, -3.5); c.lineTo(d * 6, 3.5); c.closePath(); fillStroke(c, color);
  }
  c.beginPath(); c.arc(0, 0, 1.6, 0, Math.PI * 2); fillStroke(c, shade(color, -0.2));
  c.restore();
}

function drawHead(c, L, o, ol) {
  const skin = L.skin || SKIN;
  const fx = 1.2;                    // 얼굴이 살짝 오른쪽을 보도록 이목구비를 옮김 (3/4 방향)
  const expr = o.expr || "normal";

  // 얼굴형 : 둥근 이마 + 뾰족한 턱 (애니메이션 얼굴형)
  c.beginPath();
  c.moveTo(-14, -1);
  c.bezierCurveTo(-14.5, -20, 14.5, -20, 14, -1);
  c.bezierCurveTo(14, 7, 9, 13.5, 1.8, 15.5);
  c.bezierCurveTo(-5.5, 13.5, -14, 7.5, -14, -1);
  c.closePath(); fillStroke(c, skin);

  // 볼터치 + 빗금
  oval(c, -6.5 + fx, 10, 3.2, 1.5, "rgba(255,120,140,0.35)");
  oval(c, 8 + fx, 10, 3, 1.5, "rgba(255,120,140,0.35)");
  c.save(); c.strokeStyle = "rgba(230,90,110,0.5)"; c.lineWidth = ol * 0.45;
  for (const bx of [-7.5 + fx, 7 + fx]) for (let k = 0; k < 3; k++) {
    c.beginPath(); c.moveTo(bx + k * 1.2, 10.8); c.lineTo(bx + k * 1.2 + 0.8, 9.2); c.stroke();
  }
  c.restore();

  // 코 (아주 작은 선)
  c.save(); c.lineWidth = ol * 0.6; c.strokeStyle = "#d9a08a";
  c.beginPath(); c.moveTo(fx + 1.8, 8.3); c.lineTo(fx + 2.4, 9.4); c.stroke(); c.restore();

  drawMouth(c, fx + 1.5, 12, expr, ol);
  frontHair(c, L, ol);

  // 눈은 앞머리 위에 그려서 항상 잘 보이게 (애니메이션식 표현)
  drawEye(c, -5.6 + fx, 5.8, L, expr, o.blink, ol, -1);
  drawEye(c, 6.4 + fx, 5.8, L, expr, o.blink, ol, 1);

  // 눈썹 : 앞머리 너머로 비쳐 보이게 반투명
  c.save(); c.globalAlpha = 0.8; c.lineWidth = ol * 1.1; c.strokeStyle = shade(L.hairColor, -0.45);
  const base = expr === "surprised" ? -2.2 : 0.2;
  for (const [bx, s] of [[-5.6 + fx, -1], [6.4 + fx, 1]]) {
    const inner = s < 0 ? bx + 2.6 : bx - 2.6, outer = s < 0 ? bx - 2.6 : bx + 2.6;
    const yi = base + (expr === "tired" ? -1.4 : 0), yo = base + (expr === "tired" ? 0.8 : 0);
    c.beginPath(); c.moveTo(outer, yo); c.quadraticCurveTo(bx, base - 1.3, inner, yi); c.stroke();
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

  if (expr === "tired") {                             // 땀방울
    c.beginPath(); c.moveTo(15, -4); c.quadraticCurveTo(17.5, 0, 15.5, 1.5); c.quadraticCurveTo(13.5, 0, 15, -4);
    c.save(); c.lineWidth = ol * 0.6; fillStroke(c, "#9fd8ff"); c.restore();
  }
}

function drawEye(c, cx, cy, L, expr, blink, ol, side) {
  const w = 6.4, h = 8;
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
  const tired = expr === "tired", surprised = expr === "surprised";

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
  c.beginPath(); c.ellipse(cx + 0.4, cy + 0.6, w * ir, h * (ir + 0.06), 0, 0, Math.PI * 2);
  c.fillStyle = g; c.fill();
  oval(c, cx + 0.4, cy + 0.9, w * ir * 0.45, h * ir * 0.5, shade(L.eye, -0.7));   // 동공
  // 반짝임 (큰 것 하나 + 작은 것 하나)
  oval(c, cx - 0.8, cy - 1.2, surprised ? 1.1 : 1.4, surprised ? 1.1 : 1.4, "#ffffff");
  oval(c, cx + 1.4, cy + 2.2, 0.6, 0.6, "#ffffff");
  if (tired) { c.fillStyle = L.skin || SKIN; c.fillRect(cx - w, cy - h, w * 2, h * 0.92); }  // 반쯤 감긴 눈꺼풀
  c.restore();

  // 윗속눈썹 (굵게) + 눈꼬리
  const lidL = tired ? cy - 0.2 : cy - h * 0.12;
  const lidR = tired ? cy - 0.2 : cy - h * 0.28;
  const lidTop = tired ? cy - 0.4 : cy - h / 2 - 1.2;
  c.lineWidth = ol * 1.9;
  c.beginPath(); c.moveTo(cx - w / 2 - 0.5, side > 0 ? lidL : lidR);
  c.quadraticCurveTo(cx - 0.3, lidTop, cx + w / 2 + 0.5, side > 0 ? lidR : lidL); c.stroke();
  const ox = side > 0 ? cx + w / 2 + 0.5 : cx - w / 2 - 0.5;
  c.lineWidth = ol * 1.2;
  c.beginPath(); c.moveTo(ox, lidR); c.lineTo(ox + side * 1.5, lidR - 1.2); c.stroke();
  // 아랫선
  c.lineWidth = ol * 0.6;
  c.beginPath(); c.moveTo(cx - w * 0.22, cy + h / 2 - 0.2); c.lineTo(cx + w * 0.22, cy + h / 2 - 0.2); c.stroke();
  c.restore();
}

function drawMouth(c, x, y, expr, ol) {
  c.save(); c.lineWidth = ol * 0.9; c.strokeStyle = OUTLINE;
  if (expr === "happy") {                             // 활짝 웃는 입
    c.beginPath(); c.moveTo(x - 2.4, y - 0.6); c.quadraticCurveTo(x, y + 3.8, x + 2.4, y - 0.6); c.closePath();
    fillStroke(c, "#c8475b");
    oval(c, x, y + 1.6, 1.2, 0.7, "#ff8fa3");
  } else if (expr === "surprised") {                  // 동그란 입
    c.beginPath(); c.ellipse(x, y + 0.5, 1.3, 1.8, 0, 0, Math.PI * 2); fillStroke(c, "#c8475b");
  } else if (expr === "tired") {                      // 물결 입
    c.beginPath(); c.moveTo(x - 2.2, y); c.quadraticCurveTo(x - 1.1, y - 1, x, y);
    c.quadraticCurveTo(x + 1.1, y + 1, x + 2.2, y); c.stroke();
  } else {
    c.beginPath(); c.moveTo(x - 1.6, y); c.quadraticCurveTo(x, y + 1.2, x + 1.6, y); c.stroke();
  }
  c.restore();
}


// =============================================================
// 초상화 : 캔버스 하나에 캐릭터의 상반신을 크게 그린다
// =============================================================
function drawPortrait(canvas, look, expr = "normal") {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = canvas.clientWidth || 160;
  canvas.width = Math.round(size * dpr);
  canvas.height = Math.round(size * dpr);
  const c = canvas.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  const leg = look.legLen ?? 12, tor = look.torso ?? 13;
  const headY = -leg - tor - 14.5;
  const S = canvas.width / 54;                        // 가로 54칸 분량을 캔버스 크기에 맞춤
  c.setTransform(S, 0, 0, S, canvas.width / 2, (-headY + 28) * S);   // 머리 위 아호게까지 보이게
  drawFigure(c, look, { expr, ol: 0.45 });
}
