// =============================================================
// anime.js - 애니메이션풍 캐릭터 그리기 담당 (6등신 패션 일러스트 스타일)
// -------------------------------------------------------------
// 그림 파일(png) 없이, 선과 도형만으로 캐릭터를 그린다.
// 같은 함수(drawFigure)로
//   - 지도 위의 작은 캐릭터
//   - 미연시 장면의 큰 전신 그림
//   - 대화창·수첩의 얼굴 초상화
// 를 모두 그린다. 도형으로 그렸기 때문에 크게 늘려도 깨지지 않는다.
//
// 좌표 약속 : (0, 0) = 캐릭터의 "발" 위치, 위로 갈수록 y 가 작아짐(음수)
// 옷은 겹쳐 입는다 : 다리(바지/맨다리) → 상의(inner) → 치마 → 겉옷(outer) → 팔 → 소품
// =============================================================

const OUTLINE = "#3b2633";   // 외곽선 색 (애니메이션처럼 진한 갈색 테두리)
const SKIN = "#ffe6d5";
const HEAD_K = 0.42;         // 얼굴 그림(머리 좌표)을 몸 크기에 맞추는 배율

// 색을 밝게(+) / 어둡게(-) 만드는 도우미. amt : -1 ~ 1
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const target = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (target - r) * p);
  g = Math.round(g + (target - g) * p);
  b = Math.round(b + (target - b) * p);
  return `rgb(${r},${g},${b})`;
}

// ─────────────────────────────────────────────────────────────
// 등장인물 생김새 (캐릭터 시트를 참고해 학교에 맞게 바꾼 디자인)
//   h : 키,  male : 남자 체형,  hair / hairColor / eye : 머리 모양·색, 눈 색
//   hairEnd : 긴 머리가 내려오는 위치 (0 = 어깨, 1 = 엉덩이)
//   inner : 안에 입은 옷,  outer : 겉옷,  bottom : 하의,  shoes : 신발
// ─────────────────────────────────────────────────────────────
const LOOKS = {
  // 14번 참고 : 갈색 곱슬머리, 크림 꽈배기 니트 + 셔츠·넥타이, 코듀로이 바지
  student: { h: 100, male: true, hair: "messy", hairColor: "#8a4a2e", eye: "#c9822e", ahoge: true,
             inner: { type: "knit", color: "#efe3c8", pattern: "#b5603a", collar: "#ffffff", tie: "#b33a3a" },
             bottom: { type: "cord", color: "#7a4a2c" }, shoes: { type: "sneaker", color: "#e9dfcc", accent: "#b5603a" },
             strap: "#5a3a28", pose: { back: "pocket" } },
  // 18번 참고 : 갈색 머리, 안경, 베이지 정장 + 조끼 + 넥타이, 서류가방
  future:  { h: 106, male: true, hair: "neat", hairColor: "#6b4430", eye: "#c9822e", ahoge: true, glasses: true,
             inner: { type: "shirt", color: "#ffffff", vest: "#8a6f55", tie: "#7a2e3a" },
             outer: { type: "blazer", color: "#c4ad8c", len: 0.12 },
             bottom: { type: "suit", color: "#bfae95" }, shoes: { type: "loafer", color: "#5a3a28" }, hold: "briefcase",
             pose: { back: "pocket" } },
  // 01번 참고 : 흑발 단발 + 안쪽 청록, 오버사이즈 블랙 재킷, 카고 바지, 청록 운동화
  seorin:  { h: 96, hair: "bob", hairColor: "#1b1b26", inner2: "#2bb5a8", eye: "#3fc7b8", hairpin: "#2bb5a8",
             inner: { type: "tee", color: "#20202b", collar: "#ffffff" },
             outer: { type: "jacket", color: "#22222e", trim: "#2bb5a8", len: 0.16, wide: 2.4 },
             bottom: { type: "cargo", color: "#262632", trim: "#2bb5a8" },
             shoes: { type: "sneaker", color: "#1f2b33", accent: "#2bb5a8" }, hold: "notebook" },
  // 09번 참고 : 남색 머리 단정하게 묶음, 남색 블레이저 + 넥타이 + 학생회 완장
  yuri:    { h: 96, hair: "pony", hairColor: "#23315e", eye: "#e0a53a", ribbon: "#c9334a", hairEnd: 0.45,
             inner: { type: "shirt", color: "#ffffff", tie: "#1d2340" },
             outer: { type: "blazer", color: "#1f2a4f", len: 0.1 },
             bottom: { type: "suit", color: "#1f2a4f" }, shoes: { type: "loafer", color: "#1b1b22" },
             armband: "#c9334a", pose: { back: "hip" } },
  // 06번 참고 : 꿀빛 단발을 질끈 묶음, 빨간 트레이닝복 + 흰 줄무늬
  bom:     { h: 95, hair: "pony", hairColor: "#e3a93c", eye: "#3aa36b", ribbon: "#ff5d6c", hairEnd: 0.18,
             inner: { type: "tee", color: "#ffffff" },
             outer: { type: "track", color: "#d23a3f", trim: "#ffffff", len: 0.02 },
             bottom: { type: "track", color: "#c9353b", trim: "#ffffff" },
             shoes: { type: "sneaker", color: "#ffffff", accent: "#d23a3f" }, pose: { front: "hip" } },
  // 02번 참고 : 갈색 웨이브 롱 + 리본, 크림 니트 카디건 + 블라우스, 긴 체크 치마, 갈색 부츠
  hayul:   { h: 98, hair: "wavy", hairColor: "#a5532e", eye: "#b8643c", ribbon: "#6b2e22", hairEnd: 0.7,
             inner: { type: "blouse", color: "#fffaf2", bow: "#8a4a2e" },
             outer: { type: "cardigan", color: "#efe1c4", len: 0.05 },
             bottom: { type: "longskirt", color: "#c9a77f", plaid: "#8a5a3a" },
             shoes: { type: "boot", color: "#6b4028" }, hold: "handbag" },
  // 03번 참고 : 은빛 긴 머리, 남색 하이넥 재킷 + 파란 포인트, 부츠
  sion:    { h: 94, hair: "long", hairColor: "#dfe4ee", eye: "#5aa8ff", hairpin: "#5aa8ff", skin: "#fff0e8", hairEnd: 0.75,
             inner: { type: "turtle", color: "#2a3358" },
             outer: { type: "jacket", color: "#1d2442", trim: "#5aa8ff", len: 0.08, high: true },
             bottom: { type: "slim", color: "#1d2442", trim: "#5aa8ff" },
             shoes: { type: "boot", color: "#222a44" }, pose: { back: "pocket" } },
  // 16번 참고 : 파란 머리, 주황·검정 후드 재킷, 흰 티, 주황 줄 트레이닝 바지
  doyun:   { h: 102, male: true, hair: "spiky", hairColor: "#2f6fd8", eye: "#3a7be0",
             inner: { type: "tee", color: "#ffffff" },
             outer: { type: "hoodie", color: "#f07a26", trim: "#1d1d26", len: 0.04 },
             bottom: { type: "track", color: "#1d1d26", trim: "#f07a26" },
             shoes: { type: "sneaker", color: "#f07a26", accent: "#1d1d26" }, pose: { front: "pocket", back: "pocket" } },
  // 17번 참고 : 검은 머리 뒤로 묶음, 와인색 정장 + 검은 조끼 + 빨간 넥타이
  kim:     { h: 108, male: true, hair: "neat", hairColor: "#1e1a22", eye: "#7a3a3a", tail: true, hairEnd: 0.35,
             inner: { type: "shirt", color: "#ffffff", vest: "#1e1a22", tie: "#b3282d", chain: "#d9b44a" },
             outer: { type: "blazer", color: "#6e1f2a", len: 0.22 },
             bottom: { type: "suit", color: "#5e1a24" }, shoes: { type: "loafer", color: "#16141a" },
             pose: { front: "pocket" } },
  // 08번 참고 : 분홍 웨이브, 라벤더 카디건 + 블라우스, 체크 치마, 청진기
  han:     { h: 100, hair: "wavy", hairColor: "#f2a3b8", eye: "#c9779a", hairEnd: 0.3,
             inner: { type: "blouse", color: "#ffffff" },
             outer: { type: "cardigan", color: "#c9b6ea", len: 0.03 },
             bottom: { type: "skirt", color: "#b9a8e0", plaid: "#ffffff" },
             shoes: { type: "sneaker", color: "#f4f0fb", accent: "#c9b6ea" }, socks: "#ffffff", stethoscope: true },
};

// 키 (머리끝 ~ 발) : 지도 위 이름표, 말풍선 높이 계산에 쓴다
function figureHeight(L) { return L.h; }

// 몸의 주요 위치 계산 (머리 가운데, 어깨, 허리, 엉덩이, 무릎)
function bodyMetrics(L) {
  const h = L.h;
  const headCY = -h + 21 * HEAD_K;               // 얼굴 가운데 (머리 좌표의 0,0)
  const chinY = headCY + 17.5 * HEAD_K;
  const shY = chinY + 3.4;                       // 어깨
  const hipY = -h * 0.47;                        // 엉덩이 (다리가 길게 보이도록 키의 47%)
  const waistY = shY + (hipY - shY) * 0.62;
  return {
    h, headCY, chinY, shY, hipY, waistY,
    kneeY: hipY * 0.5,
    sw: L.male ? 11.2 : 9.2,                     // 어깨 반폭
    ww: L.male ? 8.4 : 6.4,                      // 허리 반폭
    hw: L.male ? 8.8 : 9.0,                      // 엉덩이 반폭
  };
}

function fillStroke(c, fill) { c.fillStyle = fill; c.fill(); c.stroke(); }
function oval(c, x, y, rx, ry, fill) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
}
// 위가 넓고 아래가 좁은 막대 (팔·다리 한 마디)
function seg(c, len, wTop, wBot, fill) {
  c.beginPath();
  c.moveTo(-wTop, 0); c.lineTo(-wBot, len);
  c.quadraticCurveTo(0, len + wBot * 0.6, wBot, len);
  c.lineTo(wTop, 0);
  c.quadraticCurveTo(0, -wTop * 0.5, -wTop, 0);
  c.closePath();
  fillStroke(c, fill);
}
// 그림자 칠하기 : 방금 그린 모양 안쪽의 오른쪽을 살짝 어둡게 (셀 셰이딩)
function cellShade(c, x0, y0, w, h, color, alpha = 0.22) {
  c.save(); c.clip(); c.globalAlpha = alpha; c.fillStyle = shade(color, -0.45); c.fillRect(x0, y0, w, h); c.restore();
}

// 하의 종류별 다리 굵기 (허벅지, 무릎, 발목)
const LEGWEAR = {
  slim:  [4.0, 3.1, 2.5], suit: [4.3, 3.5, 3.1], cargo: [5.0, 4.4, 3.8],
  track: [4.6, 3.8, 3.0], cord: [4.8, 4.3, 4.1], skin: [3.7, 2.6, 1.8],
};


// =============================================================
// 전신 그리기
//   o.moving / o.walk : 걷는 중인지, 걷기 박자
//   o.expr  : 표정 normal | happy | surprised | tired | angry | blush | sad
//   o.blink : 눈 감는 순간인지,  o.talk : 입 벌림 (립싱크),  o.sway : 서 있을 때 머리 흔들림
//   o.ol    : 외곽선 두께
// =============================================================
function drawFigure(c, L, o = {}) {
  const ol = o.ol ?? 1;
  const M = bodyMetrics(L);
  const swing = o.moving ? Math.sin(o.walk || 0) : 0;
  const skin = L.skin || SKIN;

  c.save();
  c.lineJoin = "round";
  c.lineCap = "round";
  c.lineWidth = ol;
  c.strokeStyle = OUTLINE;

  // 1) 뒷머리 (어깨·등 뒤로 내려오는 머리)
  const hairEnd = M.shY + (M.hipY - M.shY) * (L.hairEnd ?? 0.4);
  c.save(); c.translate(0, M.headCY); c.scale(HEAD_K, HEAD_K);
  c.lineWidth = ol / HEAD_K;
  backHair(c, L, o.moving ? swing : (o.sway || 0), (hairEnd - M.headCY) / HEAD_K);
  c.restore();

  // 2) 뒤쪽 팔과 다리 (조금 어둡게 → 입체감)
  drawArm(c, L, M, -1, swing, skin, ol);
  drawLeg(c, L, M, -1, swing, skin, ol);
  drawLeg(c, L, M, 1, swing, skin, ol);

  // 3) 바지 윗부분 (골반)
  const B = L.bottom;
  if (!B.type.includes("skirt")) {
    c.beginPath();
    c.moveTo(-M.ww - 0.4, M.waistY + 1); c.lineTo(-M.hw - 0.6, M.hipY + 3);
    c.quadraticCurveTo(0, M.hipY + 6, M.hw + 0.6, M.hipY + 3); c.lineTo(M.ww + 0.4, M.waistY + 1);
    c.closePath(); fillStroke(c, B.color);
  }

  // 4) 후드 (목 뒤에 걸쳐진 모자) → 목 + 상의(inner)
  if (L.outer && L.outer.type === "hoodie") {
    c.beginPath(); c.moveTo(-7.5, M.shY + 1.5); c.quadraticCurveTo(-7, M.chinY - 2.5, 0, M.chinY - 3);
    c.quadraticCurveTo(7, M.chinY - 2.5, 7.5, M.shY + 1.5); c.closePath(); fillStroke(c, shade(L.outer.color, -0.18));
  }
  c.beginPath(); c.roundRect(-1.9, M.chinY - 1.5, 3.8, M.shY - M.chinY + 3, 1.2);
  c.fillStyle = shade(skin, -0.06); c.fill(); c.stroke();
  drawInner(c, L, M, ol);

  // 5) 치마 (상의 위에)
  if (B.type.includes("skirt")) drawSkirt(c, L, M, swing, ol);
  else {                                               // 벨트
    c.beginPath(); c.roundRect(-M.ww - 0.5, M.waistY + 0.4, (M.ww + 0.5) * 2, 1.8, 0.6);
    fillStroke(c, shade(B.color, -0.35));
  }

  // 6) 겉옷
  if (L.outer) drawOuter(c, L, M, ol);

  // 7) 소품 (가방끈, 청진기)
  if (L.strap) {
    c.save(); c.strokeStyle = L.strap; c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(M.sw - 2.5, M.shY + 0.5); c.lineTo(-M.hw + 1, M.hipY + 1); c.stroke(); c.restore();
  }
  if (L.stethoscope) {
    c.save(); c.strokeStyle = "#7b8496"; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(-3.2, M.shY + 0.3); c.quadraticCurveTo(-4.2, M.shY + 9, -1.2, M.shY + 12);
    c.moveTo(3.2, M.shY + 0.3); c.quadraticCurveTo(4.2, M.shY + 7, 2.2, M.shY + 9); c.stroke();
    oval(c, 2.4, M.shY + 10, 1.2, 1.2, "#c9d1de"); c.stroke(); c.restore();
  }

  // 8) 앞쪽 팔
  drawArm(c, L, M, 1, swing, skin, ol);

  // 9) 머리 (얼굴은 머리 좌표로 그린 뒤 HEAD_K 배율로 줄인다)
  c.save(); c.translate(0, M.headCY); c.scale(HEAD_K, HEAD_K);
  c.lineWidth = ol / HEAD_K;
  drawHead(c, L, o, ol / HEAD_K);
  c.restore();
  c.restore();
}

// ----- 다리 : 허벅지 → 무릎 → 종아리 → 신발 -----
function drawLeg(c, L, M, side, swing, skin, ol) {
  const B = L.bottom;
  const bare = B.type.includes("skirt");
  const [w1, w2, w3] = LEGWEAR[bare ? "skin" : B.type] || LEGWEAR.slim;
  const top = M.hipY + 1;
  const thigh = (-2.4 - top) / 2, calf = thigh;
  const a1 = swing * 0.32 * side;                       // 허벅지 앞뒤 흔들기
  const bend = Math.max(0, -swing * side) * 0.35;        // 뒤로 간 다리는 무릎을 굽힘
  const back = side < 0;
  const col = bare ? skin : B.color;
  const fill = back ? shade(col.startsWith("#") ? col : "#ffffff", -0.12) : col;

  c.save();
  c.translate(side * (L.male ? 4.6 : 4.2), top);
  c.rotate(a1);
  seg(c, thigh + 0.8, w1, w2, fill);
  if (!bare && B.type === "cargo") {                    // 카고 바지 옆주머니
    c.beginPath(); c.roundRect(-w1 + 0.4, thigh * 0.45, w1 * 1.1, 5.5, 0.8); fillStroke(c, shade(B.color, 0.08));
  }
  c.translate(0, thigh);
  c.rotate(bend);
  seg(c, calf, w2, w3, fill);
  // 바지 줄무늬 / 코듀로이 결 / 정장 주름선
  if (!bare && (B.trim || B.type === "cord" || B.type === "suit")) {
    c.save(); c.lineWidth = ol * 0.7;
    if (B.type === "track") { c.strokeStyle = B.trim; c.lineWidth = 1.1; c.beginPath(); c.moveTo(w2 - 0.8, -thigh); c.lineTo(w3 - 0.6, calf); c.stroke(); }
    if (B.type === "cord")  { c.strokeStyle = shade(B.color, -0.3); for (const x of [-2, 0, 2]) { c.beginPath(); c.moveTo(x, -thigh + 2); c.lineTo(x * 0.9, calf - 1); c.stroke(); } }
    if (B.type === "suit")  { c.strokeStyle = shade(B.color, -0.25); c.beginPath(); c.moveTo(0, -thigh + 3); c.lineTo(0, calf - 1); c.stroke(); }
    if (B.type === "slim" || B.type === "cargo") { c.strokeStyle = B.trim; c.beginPath(); c.moveTo(-w2 + 0.6, 2); c.lineTo(-w3 + 0.5, calf - 2); c.stroke(); }
    c.restore();
  }
  if (bare && L.socks) { c.save(); c.beginPath(); c.roundRect(-w2 + 0.2, calf * 0.45, (w2 - 0.2) * 2, calf * 0.55, 0.8); fillStroke(c, L.socks); c.restore(); }
  if (!bare && (B.type === "cargo" || B.type === "track")) {   // 발목 밴드
    c.beginPath(); c.roundRect(-w3 - 0.3, calf - 1.8, (w3 + 0.3) * 2, 1.8, 0.6); fillStroke(c, shade(B.color, -0.2));
  }
  c.translate(0, calf);
  c.rotate(-(a1 + bend));                                // 신발은 바닥에 평평하게
  drawShoe(c, L.shoes, ol, back);
  c.restore();
}

function drawShoe(c, S, ol, back) {
  const col = back ? shade(S.color, -0.12) : S.color;
  if (S.type === "boot") {
    c.beginPath(); c.moveTo(-2.6, -6.5); c.lineTo(2.4, -6.5); c.lineTo(2.6, -1.4);
    c.quadraticCurveTo(6.2, -1.2, 6.4, 0.6); c.lineTo(-2.9, 0.6); c.closePath(); fillStroke(c, col);
    c.beginPath(); c.roundRect(-3, 0.4, 9.6, 1.4, 0.6); fillStroke(c, shade(S.color, -0.45));
  } else if (S.type === "loafer") {
    c.beginPath(); c.moveTo(-2.6, -1.8); c.quadraticCurveTo(1, -2.6, 2.6, -1.6);
    c.quadraticCurveTo(6.4, -1, 6.4, 0.6); c.lineTo(-2.8, 0.6); c.closePath(); fillStroke(c, col);
    c.beginPath(); c.roundRect(-2.9, 0.4, 9.4, 1.1, 0.5); fillStroke(c, shade(S.color, -0.5));
  } else {                                               // 운동화
    c.beginPath(); c.moveTo(-2.8, -2.8); c.quadraticCurveTo(0.5, -3.6, 2.4, -2.4);
    c.quadraticCurveTo(6.6, -1.4, 6.8, 0.6); c.lineTo(-3, 0.6); c.closePath(); fillStroke(c, col);
    c.beginPath(); c.roundRect(-3.2, 0.3, 10.2, 1.9, 0.9); fillStroke(c, "#ffffff");
    if (S.accent) {
      c.save(); c.strokeStyle = S.accent; c.lineWidth = 1;
      c.beginPath(); c.moveTo(-1.6, -1.2); c.quadraticCurveTo(2, -0.2, 4.6, -1); c.stroke(); c.restore();
    }
  }
}

// ----- 팔 : 어깨 → 팔꿈치 → 손 -----
function drawArm(c, L, M, side, swing, skin, ol) {
  const out = L.outer;
  const inner = L.inner;
  const back = side < 0;
  const upper = M.h * 0.17, fore = M.h * 0.15;
  const sleeveCol = out ? out.color : inner.color;
  const short = !out && inner.type === "tee";            // 반팔이면 아래팔은 맨살
  const wide = out && out.wide ? out.wide * 0.4 : 0;
  const col = (x) => (back ? shade(x, -0.14) : x);
  // 서 있을 때 자세 : hip = 허리에 손, pocket = 주머니에 손 (걷는 중이면 자연스럽게 흔듦)
  const pose = !swing && L.pose ? L.pose[side > 0 ? "front" : "back"] : null;
  const upA = pose === "hip" ? -side * 0.62 : pose === "pocket" ? -side * 0.14 : side * 0.1 - swing * 0.42 * side;
  const foreA = pose === "hip" ? side * 1.75 : pose === "pocket" ? side * 0.42 : -0.16 - Math.max(0, swing * side) * 0.25;
  c.save();
  c.translate(side * (M.sw - 1.2), M.shY + 1.8);
  c.rotate(upA);
  seg(c, upper + 0.6, 3.0 + wide, 2.6 + wide, col(short ? sleeveCol : sleeveCol));
  if (short) { c.save(); c.beginPath(); c.moveTo(-2.5, upper * 0.55); c.lineTo(2.5, upper * 0.55); c.stroke(); c.restore(); }
  if (L.armband && side > 0) {                           // 학생회 완장
    c.beginPath(); c.roundRect(-3.2, upper * 0.35, 6.4, 3.2, 0.6); fillStroke(c, L.armband);
    c.fillStyle = "#ffe066"; c.fillRect(-1.6, upper * 0.35 + 1.2, 3.2, 0.7);
  }
  if (out && (out.type === "track") ) {                  // 소매 줄무늬
    c.save(); c.strokeStyle = out.trim; c.lineWidth = 0.9;
    c.beginPath(); c.moveTo(2.4, 1); c.lineTo(2.1, upper); c.stroke(); c.restore();
  }
  c.translate(0, upper);
  c.rotate(foreA);                                       // 팔꿈치 굽힘
  seg(c, fore, 2.6 + wide, 2.1 + wide, col(short ? skin : sleeveCol));
  if (!short) {                                          // 소맷부리
    c.beginPath(); c.roundRect(-2.4 - wide, fore - 1.6, (2.4 + wide) * 2, 1.8, 0.6);
    fillStroke(c, col(out && out.type === "cardigan" ? shade(sleeveCol, -0.08) : out && out.trim ? out.trim : shade(sleeveCol, -0.12)));
    if (out && out.type !== "cardigan" && out.type !== "track" && inner.type === "shirt") {   // 셔츠 소매가 살짝 보임
      c.beginPath(); c.roundRect(-1.9, fore - 0.2, 3.8, 1, 0.4); fillStroke(c, "#ffffff");
    }
  }
  c.translate(0, fore + 1.2);
  if (pose !== "pocket") { oval(c, 0.2, 0.6, 1.8, 2.3, skin); c.stroke(); }   // 손 (주머니 속이면 안 보임)
  if (side > 0 && L.hold && !pose) drawHeld(c, L.hold);
  c.restore();
}

function drawHeld(c, what) {
  if (what === "briefcase") {
    c.beginPath(); c.roundRect(-5, 2, 10, 7.5, 1.2); fillStroke(c, "#6b4028");
    c.beginPath(); c.moveTo(-1.8, 2); c.lineTo(-1.8, 0.6); c.lineTo(1.8, 0.6); c.lineTo(1.8, 2); c.stroke();
    c.fillStyle = "#d9b44a"; c.fillRect(-0.8, 4.6, 1.6, 1.2);
  } else if (what === "notebook") {                     // 서린의 남색 노트
    c.save(); c.rotate(-0.25);
    c.beginPath(); c.roundRect(-2.5, -1, 6.5, 8.5, 0.6); fillStroke(c, "#2b3a6b");
    c.fillStyle = "#e9e3d3"; c.fillRect(3.4, -0.4, 0.6, 7.4);
    c.restore();
  } else if (what === "handbag") {
    c.beginPath(); c.moveTo(-2.4, 2); c.quadraticCurveTo(0, -2.4, 2.4, 2); c.stroke();
    c.beginPath(); c.roundRect(-4.4, 2, 8.8, 6.4, 1.4); fillStroke(c, "#7a4a2c");
    c.fillStyle = "#d9b44a"; c.fillRect(-0.6, 3.6, 1.2, 1);
  }
}

// ----- 상의 (셔츠·티·니트·블라우스·터틀넥) -----
function torsoPath(c, M, bottomY, extra = 0) {
  c.beginPath();
  c.moveTo(-M.sw + 1.4, M.shY - 0.4);
  c.quadraticCurveTo(-M.sw - 0.2 - extra, M.shY, -M.sw - extra, M.shY + 3);
  c.lineTo(-M.ww - extra, M.waistY);
  c.lineTo(-M.hw - extra * 1.4, bottomY);
  c.quadraticCurveTo(0, bottomY + 1.4, M.hw + extra * 1.4, bottomY);
  c.lineTo(M.ww + extra, M.waistY);
  c.lineTo(M.sw + extra, M.shY + 3);
  c.quadraticCurveTo(M.sw + 0.2 + extra, M.shY, M.sw - 1.4, M.shY - 0.4);
  c.closePath();
}

function drawInner(c, L, M, ol) {
  const I = L.inner;
  const tucked = I.type === "shirt" || I.type === "blouse" || I.type === "turtle";
  const bottomY = tucked ? M.waistY + 2 : M.hipY + 1;
  torsoPath(c, M, bottomY);
  fillStroke(c, I.color);
  torsoPath(c, M, bottomY); cellShade(c, M.sw * 0.35, M.shY - 2, 20, 60, I.color);

  if (I.vest) {                                          // 조끼
    c.beginPath();
    c.moveTo(-M.sw + 2.4, M.shY + 0.6); c.lineTo(-2.4, M.shY + 9); c.lineTo(0, M.waistY + 3.5);
    c.lineTo(2.4, M.shY + 9); c.lineTo(M.sw - 2.4, M.shY + 0.6);
    c.lineTo(M.ww + 0.4, M.waistY + 1); c.lineTo(0, M.waistY + 4.2); c.lineTo(-M.ww - 0.4, M.waistY + 1); c.closePath();
    fillStroke(c, I.vest);
    c.fillStyle = shade(I.vest, 0.35);
    for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0.6, M.shY + 11 + k * 3, 0.5, 0, Math.PI * 2); c.fill(); }
    if (I.chain) { c.save(); c.strokeStyle = I.chain; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0.6, M.shY + 14); c.quadraticCurveTo(3.4, M.shY + 17, 5.4, M.shY + 14.5); c.stroke(); c.restore(); }
  }
  if (I.type === "knit") {                               // 꽈배기 무늬 + 가슴 다이아몬드 띠
    c.save(); torsoPath(c, M, bottomY); c.clip();
    c.strokeStyle = shade(I.color, -0.18); c.lineWidth = ol * 0.8;
    for (const x of [-5, 5]) {
      c.beginPath();
      for (let y = M.shY + 2; y < bottomY; y += 2.4) { c.moveTo(x - 0.9, y); c.quadraticCurveTo(x + 1.2, y + 1.2, x - 0.9, y + 2.4); }
      c.stroke();
    }
    c.strokeStyle = I.pattern; c.lineWidth = ol * 1.1;
    c.beginPath();
    for (let x = -M.sw; x < M.sw; x += 2.6) { c.lineTo(x, M.shY + 8); c.lineTo(x + 1.3, M.shY + 6.2); }
    c.stroke();
    c.beginPath(); c.roundRect(-M.hw - 2, bottomY - 2.2, (M.hw + 2) * 2, 2.6, 0); c.fillStyle = shade(I.color, -0.1); c.fill();
    c.restore();
  }
  // 깃·넥타이·리본
  if (I.collar || I.tie || I.type === "shirt") {
    const col = I.collar || "#ffffff";
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(0, M.shY + 2.2); c.lineTo(s * 3.6, M.shY - 0.6); c.lineTo(s * 2.4, M.shY + 2.8); c.closePath();
      fillStroke(c, col);
    }
  }
  if (I.type === "tee") {
    c.beginPath(); c.moveTo(-2.6, M.shY - 0.2); c.quadraticCurveTo(0, M.shY + 2.6, 2.6, M.shY - 0.2); c.stroke();
  }
  if (I.type === "turtle") {
    c.beginPath(); c.roundRect(-2.5, M.chinY + 0.4, 5, M.shY - M.chinY + 0.4, 1); fillStroke(c, I.color);
  }
  if (I.tie) {
    c.beginPath();
    c.moveTo(-0.8, M.shY + 1.6); c.lineTo(0.8, M.shY + 1.6); c.lineTo(1.3, M.shY + 10.5);
    c.lineTo(0, M.shY + 12); c.lineTo(-1.3, M.shY + 10.5); c.closePath(); fillStroke(c, I.tie);
    c.beginPath(); c.roundRect(-1, M.shY + 0.8, 2, 1.6, 0.4); fillStroke(c, shade(I.tie, -0.15));
  }
  if (I.bow) bow(c, 0, M.shY + 2, 0.42, I.bow);
}

// ----- 치마 (무릎 위 주름치마 / 긴 체크 치마) -----
function drawSkirt(c, L, M, swing, ol) {
  const B = L.bottom;
  const long = B.type === "longskirt";
  const hem = long ? M.kneeY + 9 : M.hipY + 11;
  const flare = long ? 6.5 : 4.5;
  const sx = swing * 0.8;
  const path = () => {
    c.beginPath();
    c.moveTo(-M.ww - 0.6, M.waistY + 1);
    c.lineTo(M.ww + 0.6, M.waistY + 1);
    c.lineTo(M.hw + flare + sx, hem);
    c.quadraticCurveTo(sx, hem + 2, -M.hw - flare + sx, hem);
    c.closePath();
  };
  path(); fillStroke(c, B.color);
  c.save(); path(); c.clip();
  c.globalAlpha = 0.18; c.fillStyle = "#000"; c.fillRect(M.hw * 0.3, M.waistY, 30, 80);   // 오른쪽 그늘
  c.globalAlpha = 1;
  c.strokeStyle = shade(B.color, -0.25); c.lineWidth = ol * 0.7;                       // 주름
  for (const k of [-0.6, -0.2, 0.2, 0.6]) { c.beginPath(); c.moveTo(k * M.ww * 2, M.waistY + 2); c.lineTo(k * (M.hw + flare) * 2 + sx, hem); c.stroke(); }
  if (B.plaid) {                                         // 체크무늬
    c.strokeStyle = B.plaid; c.globalAlpha = 0.55; c.lineWidth = ol * 0.8;
    for (let y = M.waistY + 4; y < hem; y += 4) { c.beginPath(); c.moveTo(-30, y); c.lineTo(30, y); c.stroke(); }
    for (let x = -24; x < 24; x += 4) { c.beginPath(); c.moveTo(x, M.waistY); c.lineTo(x * 1.3, hem); c.stroke(); }
  }
  c.restore();
}

// ----- 겉옷 (재킷·블레이저·카디건·후드·트레이닝) : 앞이 열린 두 쪽 판 -----
function drawOuter(c, L, M, ol) {
  const O = L.outer;
  const hem = M.hipY + 3 + (O.len || 0) * M.h;
  const ex = O.wide || 1.2;                              // 몸보다 얼마나 넉넉한지
  const gapT = O.type === "track" ? 1.2 : 2.6;           // 앞 트임 (위)
  const gapB = O.type === "blazer" ? 4.2 : 3.4;          // 앞 트임 (아래)
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 2.6, M.shY - 0.8);
    c.quadraticCurveTo(s * (M.sw + ex), M.shY - 0.6, s * (M.sw + ex), M.shY + 3);
    c.lineTo(s * (M.ww + ex), M.waistY);
    c.lineTo(s * (M.hw + ex * 1.6), hem);
    c.lineTo(s * gapB, hem + 0.6);
    c.lineTo(s * gapT, M.shY + 9);
    c.closePath();
    fillStroke(c, s > 0 ? shade(O.color, -0.1) : O.color);
    // 옷 결 · 장식
    if (O.type === "cardigan") {                         // 카디건 단추 + 밑단 고무단
      c.fillStyle = shade(O.color, -0.35);
      for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(s * (gapT + 0.9 + k * 0.2), M.shY + 11 + k * 4, 0.6, 0, Math.PI * 2); c.fill(); }
      c.save(); c.strokeStyle = shade(O.color, -0.2); c.lineWidth = ol * 0.6;
      c.beginPath(); c.moveTo(s * gapB, hem - 1.6); c.lineTo(s * (M.hw + ex * 1.6), hem - 1.6); c.stroke(); c.restore();
    }
    if (O.trim && O.type !== "cardigan") {               // 지퍼선 · 포인트 색
      c.save(); c.strokeStyle = O.trim; c.lineWidth = O.type === "track" ? 1.2 : 0.9;
      c.beginPath(); c.moveTo(s * gapT, M.shY + 9); c.lineTo(s * gapB, hem); c.stroke();
      if (O.type === "jacket") {                         // 주머니
        c.beginPath(); c.roundRect(s > 0 ? M.ww - 4 : -M.ww - 0.6, M.waistY + 2, 4.4, 3.4, 0.6); c.stroke();
      }
      c.restore();
    }
    if (O.type === "blazer") {                           // 옷깃(라펠)
      c.beginPath(); c.moveTo(s * 2.6, M.shY - 0.6); c.lineTo(s * 6.4, M.shY + 4.6); c.lineTo(s * gapT, M.shY + 10); c.closePath();
      fillStroke(c, shade(O.color, s > 0 ? -0.2 : -0.08));
      c.fillStyle = shade(O.color, -0.45); c.beginPath(); c.arc(s * (gapB + 0.8), M.waistY + 3, 0.6, 0, Math.PI * 2); c.fill();
    }
  }
  if (O.type === "hoodie") {                             // 후드 끈
    c.save(); c.strokeStyle = "#ffffff"; c.lineWidth = 0.6;
    c.beginPath(); c.moveTo(-1.6, M.shY + 1); c.lineTo(-1.8, M.shY + 6); c.moveTo(1.6, M.shY + 1); c.lineTo(1.8, M.shY + 5); c.stroke(); c.restore();
  }
  if (O.type === "track" || O.high) {                    // 세운 깃
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 2.4, M.shY + 1); c.lineTo(s * 2.8, M.chinY + 0.8); c.lineTo(s * 4.8, M.shY - 0.4); c.closePath();
      fillStroke(c, O.color);
    }
  }
}

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

// ─────────────────────────────────────────────────────────────
// 머리 (얼굴 + 눈 + 머리카락). 여기서 (0, 0) = 얼굴 가운데
// ─────────────────────────────────────────────────────────────
function backHair(c, L, swing, end) {
  const col = L.hairColor;
  const e = Math.max(16, end);                        // 머리끝 위치 (머리 좌표)
  if (L.hair === "long") {
    c.beginPath(); c.moveTo(-16, -4);
    c.bezierCurveTo(-19, 10, -18, e * 0.6, -14 - swing * 0.6, e);
    c.lineTo(14 - swing * 0.6, e);
    c.bezierCurveTo(18, e * 0.6, 19, 10, 16, -4); c.closePath(); fillStroke(c, col);
  } else if (L.hair === "twin") {
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(s * 13, -4);
      c.bezierCurveTo(s * 24, 0, s * 23 + swing, e * 0.6, s * 17 + swing * 1.5, e);
      c.bezierCurveTo(s * 18, e * 0.6, s * 15, 8, s * 11, 2); c.closePath(); fillStroke(c, col);
    }
  } else if (L.hair === "bob") {
    if (L.inner2) {                                   // 안쪽에 다른 색이 살짝 보이는 단발 (이너 컬러)
      c.beginPath(); c.moveTo(-17, -2); c.lineTo(-17.4, 15); c.quadraticCurveTo(0, 19, 17.4, 15); c.lineTo(17, -2); c.closePath();
      fillStroke(c, L.inner2);
    }
    c.beginPath(); c.moveTo(-16.5, -4); c.lineTo(-16.8, 12);
    c.quadraticCurveTo(0, 16, 16.8, 12); c.lineTo(16.5, -4); c.closePath(); fillStroke(c, col);
  } else if (L.hair === "pony") {
    const tip = Math.max(22, e);
    c.beginPath(); c.moveTo(-10, -12);
    c.bezierCurveTo(-24 - swing, -8, -22 - swing, tip * 0.6, -15 - swing * 1.5, tip);
    c.bezierCurveTo(-16, tip * 0.45, -14, -2, -6, -8); c.closePath(); fillStroke(c, col);
  } else if (L.hair === "side") {
    const tip = Math.max(22, e);
    c.beginPath(); c.moveTo(12, -10);
    c.bezierCurveTo(26 + swing, -6, 25 + swing, tip * 0.5, 19 + swing * 1.5, tip);
    c.bezierCurveTo(18, tip * 0.45, 17, 0, 10, -4); c.closePath(); fillStroke(c, col);
  } else if (L.hair === "wavy") {
    c.beginPath(); c.moveTo(-16, -4);
    c.quadraticCurveTo(-22, 4, -17, 11); c.quadraticCurveTo(-23, e * 0.55, -17, e * 0.75);
    c.quadraticCurveTo(-21 - swing * 0.6, e - 2, -14 - swing * 0.6, e);
    c.lineTo(14 - swing * 0.6, e);
    c.quadraticCurveTo(21 - swing * 0.6, e - 2, 17, e * 0.75); c.quadraticCurveTo(23, e * 0.55, 17, 11);
    c.quadraticCurveTo(22, 4, 16, -4); c.closePath(); fillStroke(c, col);
  }
  if (L.tail) {                                       // 짧은 머리를 뒤로 묶은 꽁지
    c.beginPath(); c.moveTo(-12, -4);
    c.bezierCurveTo(-20 - swing, 4, -18 - swing, e * 0.7, -14 - swing * 1.4, e);
    c.bezierCurveTo(-13, e * 0.6, -12, 6, -8, 0); c.closePath(); fillStroke(c, col);
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
  c.bezierCurveTo(14, 8, 9, 15.5, 1.8, 17.5);
  c.bezierCurveTo(-5.5, 15.5, -14, 8.5, -14, -1);
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
// 초상화 : 캔버스 하나에 캐릭터의 얼굴과 어깨를 크게 그린다
// extra : 립싱크(talk)·눈 깜빡임(blink) 같은 추가 옵션
// =============================================================
function drawPortrait(canvas, look, expr = "normal", extra = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = canvas.clientWidth || 160;
  const px = Math.round(size * dpr);
  if (canvas.width !== px) { canvas.width = px; canvas.height = px; }   // 크기가 바뀔 때만 새로 정함
  const c = canvas.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);
  const M = bodyMetrics(look);
  const S = canvas.width / 30;                        // 가로 30칸 분량 (얼굴 + 어깨)
  c.setTransform(S, 0, 0, S, canvas.width / 2, canvas.width * 0.5 - (M.headCY + 3) * S);
  drawFigure(c, look, { expr, ol: (1.3 * dpr) / S, ...extra });
}
