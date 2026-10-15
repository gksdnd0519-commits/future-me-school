// =============================================================
// scene-bg.js - 미연시 장면 배경 그리기
// -------------------------------------------------------------
// 이벤트 장면 뒤에 깔리는 배경을 그림 파일 없이 도형으로 그린다.
// drawSceneBg(c, key, t) : c = 붓, key = 배경 이름, t = 흐른 시간(초, 움직이는 배경용)
// 좌표는 가로 960 × 세로 600 기준.
// =============================================================

const SW = 960, SH = 600;

function grad(c, y0, y1, stops) {          // 세로 그라데이션 채우기
  const g = c.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  return g;
}
function box(c, x, y, w, h, fill, r = 0) {
  c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill();
}
function cloud(c, x, y, s, alpha = 0.9) {   // 뭉게구름
  c.save(); c.globalAlpha = alpha; c.fillStyle = "#ffffff";
  for (const [dx, dy, r] of [[0, 0, 26], [28, -10, 30], [58, 0, 24], [30, 8, 26]]) {
    c.beginPath(); c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
function windowFrame(c, x, y, w, h, sky, t) {   // 하늘이 보이는 창문
  box(c, x, y, w, h, sky);
  cloud(c, x + ((t * 6) % (w + 120)) - 60, y + h * 0.35, 0.8, 0.85);
  c.strokeStyle = "#e9e4d6"; c.lineWidth = 8; c.strokeRect(x, y, w, h);
  c.lineWidth = 5; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h);
  c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.stroke();
}
function lightBeams(c, x, alpha = 0.18) {        // 창으로 들어오는 햇빛
  c.save(); c.globalAlpha = alpha; c.fillStyle = "#fff7d6";
  c.beginPath(); c.moveTo(x, 60); c.lineTo(x + 180, 60); c.lineTo(x + 420, SH); c.lineTo(x + 140, SH); c.fill();
  c.restore();
}
function stars(c, t, n = 90, h = SH * 0.7) {
  for (let i = 0; i < n; i++) {
    const x = (i * 97.3) % SW, y = (i * 53.7) % h;
    const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
    c.globalAlpha = 0.3 + tw * 0.7; c.fillStyle = "#ffffff";
    c.fillRect(x, y, 2, 2);
  }
  c.globalAlpha = 1;
}
function firework(c, cx, cy, r, color, life) {   // 불꽃 하나 (life 0~1)
  c.save(); c.globalAlpha = Math.max(0, 1 - life); c.strokeStyle = color; c.lineWidth = 3;
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2, rr = r * life;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * rr * 0.6, cy + Math.sin(a) * rr * 0.6);
    c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr + life * 20); c.stroke();
  }
  c.restore();
}
function schoolSilhouette(c, y, color, lit) {    // 학교 건물 실루엣
  c.fillStyle = color;
  c.fillRect(120, y, 720, SH - y);
  c.fillRect(420, y - 70, 120, 70);
  c.beginPath(); c.arc(480, y - 70, 26, Math.PI, 0); c.fill();
  if (lit) for (let r = 0; r < 3; r++) for (let k = 0; k < 12; k++) {
    if ((r * 7 + k * 3) % 4 === 0) continue;
    c.fillStyle = (r + k) % 3 ? "#ffd98a" : "#ffe9b8";
    c.fillRect(150 + k * 56, y + 24 + r * 46, 26, 22);
  }
}
function desksForeground(c) {
  for (const x of [-40, 240, 520, 800]) {
    box(c, x, 500, 220, 30, "#b98350", 6);
    box(c, x + 10, 530, 200, 80, "#9b6a3d", 4);
  }
}

const SCENE_BG = {
  classroom(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#f6eedd"], [0.68, "#efe2c6"], [0.68, "#d9b27c"], [1, "#c99a62"]]);
    c.fillRect(0, 0, SW, SH);
    for (const x of [40, 250]) windowFrame(c, x, 70, 180, 240, grad(c, 70, 310, [[0, "#8fd0ff"], [1, "#d9f0ff"]]), t);
    box(c, 520, 90, 380, 190, "#7a5233", 6);              // 칠판
    box(c, 530, 100, 360, 170, "#2f5d4a", 4);
    c.fillStyle = "#ffffffcc"; c.font = "26px Jua, sans-serif"; c.textAlign = "center";
    c.fillText("은하제까지 D-day!", 710, 170);
    c.font = "18px Jua, sans-serif"; c.fillText("☆ 협동 · 열정 · 추억 ☆", 710, 210);
    lightBeams(c, 40);
    desksForeground(c);
  },
  library(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#6b4428"], [0.7, "#8a5a36"], [0.7, "#5a3a24"], [1, "#4a2f1c"]]);
    c.fillRect(0, 0, SW, SH);
    const colors = ["#e85d75", "#4f86f7", "#ffcf4a", "#3ec28f", "#a26bf5", "#ff9548", "#e9e3d3"];
    for (const sx of [0, 640]) {
      box(c, sx + 20, 40, 300, 420, "#4a2c18", 4);
      for (let r = 0; r < 5; r++) for (let k = 0; k < 18; k++) {
        c.fillStyle = colors[(r * 5 + k * 3 + sx) % colors.length];
        c.fillRect(sx + 32 + k * 16, 52 + r * 80, 12, 64 - ((k + r) % 3) * 8);
      }
    }
    windowFrame(c, 380, 60, 200, 300, grad(c, 60, 360, [[0, "#a7d8ff"], [1, "#fff2d6"]]), t);
    lightBeams(c, 380, 0.14);
    c.save(); c.globalAlpha = 0.35 + 0.05 * Math.sin(t * 2);   // 스탠드 불빛
    c.fillStyle = "#ffe7a3"; c.beginPath(); c.arc(480, 470, 160, 0, Math.PI * 2); c.fill(); c.restore();
    box(c, 200, 480, 560, 40, "#7a4b26", 8);
  },
  cafeteria(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#fff6e6"], [0.62, "#f6e7cf"], [0.62, "#e8e2d6"], [1, "#d6cfc2"]]);
    c.fillRect(0, 0, SW, SH);
    for (let i = 0; i < 4; i++) windowFrame(c, 60 + i * 230, 60, 160, 170, grad(c, 60, 230, [[0, "#8fd0ff"], [1, "#e6f6ff"]]), t + i * 5);
    box(c, 0, 300, SW, 70, "#c9ccd6", 0);                // 배식대
    box(c, 0, 290, SW, 16, "#e2e5ec", 0);
    [["#ff8a5c", 120], ["#ffe066", 300], ["#7bd389", 480], ["#f5f5f5", 660], ["#ff9cc4", 840]].forEach(([col, x]) => {
      c.fillStyle = "#8f95a5"; c.beginPath(); c.ellipse(x, 320, 60, 18, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = col; c.beginPath(); c.ellipse(x, 316, 52, 13, 0, 0, Math.PI * 2); c.fill();
    });
    for (const x of [-60, 520]) box(c, x, 470, 500, 40, "#f0a35e", 10);
  },
  field(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#6ec3ff"], [0.5, "#cdeeff"], [0.5, "#7cc865"], [1, "#5aa548"]]);
    c.fillRect(0, 0, SW, SH);
    cloud(c, 80 + (t * 8) % 1000 - 100, 90, 1.2); cloud(c, 600 + (t * 5) % 900 - 300, 60, 0.9);
    c.fillStyle = "#d7d2e6"; c.fillRect(200, 210, 560, 90);            // 멀리 보이는 학교
    for (let k = 0; k < 10; k++) { c.fillStyle = "#9fb4d9"; c.fillRect(220 + k * 54, 228, 30, 22); c.fillRect(220 + k * 54, 262, 30, 22); }
    c.strokeStyle = "#ffffffcc"; c.lineWidth = 6;                       // 트랙
    for (const r of [0, 40, 80]) { c.beginPath(); c.ellipse(480, 470, 520 + r, 120 + r * 0.4, 0, Math.PI, Math.PI * 2); c.stroke(); }
    c.strokeStyle = "#ffffff"; c.lineWidth = 5; c.strokeRect(820, 330, 120, 70);   // 골대
  },
  infirmary(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#eefcf6"], [0.66, "#dff5ec"], [0.66, "#cbe8dc"], [1, "#b7dccd"]]);
    c.fillRect(0, 0, SW, SH);
    windowFrame(c, 380, 70, 220, 220, grad(c, 70, 290, [[0, "#8fd0ff"], [1, "#e9f8ff"]]), t);
    c.save(); c.globalAlpha = 0.85;                                     // 커튼
    for (const x of [40, 660]) {
      c.fillStyle = "#f4f7fb"; c.fillRect(x, 40, 260, 460);
      c.strokeStyle = "#d3dde8"; c.lineWidth = 2;
      for (let k = 0; k < 9; k++) { c.beginPath(); c.moveTo(x + 15 + k * 28, 40); c.lineTo(x + 20 + k * 28, 500); c.stroke(); }
    }
    c.restore();
    box(c, 400, 330, 180, 120, "#ffffff", 8);
    c.fillStyle = "#ff4d5e"; c.fillRect(476, 350, 28, 80); c.fillRect(450, 376, 80, 28);
    lightBeams(c, 380, 0.12);
  },
  hallway(c, t) {
    c.fillStyle = "#e9e5f2"; c.fillRect(0, 0, SW, SH);
    c.fillStyle = grad(c, 300, SH, [[0, "#cfc9de"], [1, "#b3abc9"]]);
    c.beginPath(); c.moveTo(0, SH); c.lineTo(400, 300); c.lineTo(560, 300); c.lineTo(SW, SH); c.fill();
    c.fillStyle = "#f6f3fb"; c.beginPath(); c.moveTo(0, 0); c.lineTo(400, 180); c.lineTo(560, 180); c.lineTo(SW, 0); c.fill();
    box(c, 400, 180, 160, 120, "#fff7e3");                               // 복도 끝 빛
    for (let k = 0; k < 4; k++) {                                       // 왼쪽 창문 (원근)
      const x0 = 20 + k * 95, w = 70 - k * 12, y0 = 70 + k * 30, h = 260 - k * 60;
      box(c, x0, y0, w, h, "#a9dbff"); c.strokeStyle = "#ffffff"; c.lineWidth = 4; c.strokeRect(x0, y0, w, h);
    }
    for (let k = 0; k < 5; k++) {                                       // 오른쪽 사물함
      const x0 = SW - 110 - k * 80, w = 90 - k * 13, y0 = 150 + k * 28, h = 300 - k * 50;
      box(c, x0, y0, w, h, "#5b7bd5", 3);
      c.fillStyle = "#3f5bb0"; c.fillRect(x0 + 10, y0 + 20, w - 20, 4);
    }
    c.strokeStyle = "#ffffff55"; c.lineWidth = 2;
    for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(400 - k * 60, 300 + k * 40); c.lineTo(560 + k * 60, 300 + k * 40); c.stroke(); }
  },
  rooftop(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#4fa8ff"], [0.75, "#c9ecff"], [0.75, "#9aa3b5"], [1, "#7f889b"]]);
    c.fillRect(0, 0, SW, SH);
    cloud(c, (t * 10) % 1100 - 100, 120, 1.4); cloud(c, (t * 6 + 500) % 1100 - 100, 220, 1, 0.8);
    c.strokeStyle = "#5d6577"; c.lineWidth = 3;                           // 철망 울타리
    for (let x = -20; x < SW; x += 30) { c.beginPath(); c.moveTo(x, 330); c.lineTo(x + 60, 450); c.moveTo(x + 60, 330); c.lineTo(x, 450); c.stroke(); }
    c.lineWidth = 8; c.beginPath(); c.moveTo(0, 330); c.lineTo(SW, 330); c.moveTo(0, 450); c.lineTo(SW, 450); c.stroke();
  },
  sunset(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#3b2a6b"], [0.35, "#ff7b6b"], [0.6, "#ffc27a"], [0.6, "#4a3550"], [1, "#2e2238"]]);
    c.fillRect(0, 0, SW, SH);
    c.fillStyle = "#ffe0a3"; c.beginPath(); c.arc(700, 350, 70, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2e2238";                                             // 마을 실루엣
    for (let k = 0; k < 14; k++) c.fillRect(k * 72, 330 - ((k * 37) % 70), 64, 60 + ((k * 37) % 70));
    c.strokeStyle = "#ffffff44"; c.lineWidth = 2;                         // 전깃줄
    c.beginPath(); c.moveTo(0, 180); c.quadraticCurveTo(480, 240, SW, 170); c.stroke();
    c.fillStyle = "#3e3046"; c.fillRect(0, 470, SW, 130);
  },
  night(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#0b1030"], [0.7, "#27306a"], [1, "#1a1d3a"]]);
    c.fillRect(0, 0, SW, SH);
    stars(c, t);
    c.fillStyle = "#fff6cf"; c.beginPath(); c.arc(800, 110, 42, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#27306a"; c.beginPath(); c.arc(818, 100, 38, 0, Math.PI * 2); c.fill();
    schoolSilhouette(c, 330, "#141838", true);
  },
  festival(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#1a1240"], [0.6, "#5a2c78"], [1, "#2a1838"]]);
    c.fillRect(0, 0, SW, SH);
    stars(c, t, 60, SH * 0.5);
    const shots = [[260, 150, "#ff6b9a"], [620, 110, "#ffd166"], [800, 200, "#7ad7ff"], [420, 220, "#b28dff"]];
    shots.forEach(([x, y, col], i) => firework(c, x, y, 110, col, ((t * 0.45 + i * 0.27) % 1)));
    schoolSilhouette(c, 380, "#1c1230", true);
    c.strokeStyle = "#ffffff55"; c.lineWidth = 2;                         // 전구 줄
    for (const yy of [300, 340]) {
      c.beginPath(); c.moveTo(0, yy); c.quadraticCurveTo(480, yy + 60, SW, yy); c.stroke();
      for (let k = 0; k < 24; k++) {
        const x = k * 42 + 10, y = yy + Math.sin((x / SW) * Math.PI) * 45;
        c.fillStyle = ["#ffd166", "#ff8fab", "#8be9fd"][k % 3];
        c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 3 + k); c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
    }
  },
  rain(c, t) {
    c.fillStyle = grad(c, 0, SH, [[0, "#5d6b85"], [1, "#8a97ad"]]);
    c.fillRect(0, 0, SW, SH);
    schoolSilhouette(c, 300, "#4a5670", false);
    c.save(); c.strokeStyle = "#dfe8ff88"; c.lineWidth = 1.5;            // 빗줄기
    for (let i = 0; i < 140; i++) {
      const x = (i * 71.3 + t * 60) % SW, y = (i * 37.1 + t * 520) % SH;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 6, y + 22); c.stroke();
    }
    c.restore();
    c.strokeStyle = "#e9e4d6"; c.lineWidth = 26; c.strokeRect(13, 13, SW - 26, SH - 26);   // 창틀
    c.lineWidth = 14; c.beginPath(); c.moveTo(SW / 2, 0); c.lineTo(SW / 2, SH); c.stroke();
    c.fillStyle = "#cdb48f"; c.fillRect(0, SH - 70, SW, 70);            // 창턱
  },
};

function drawSceneBg(c, key, t) {
  (SCENE_BG[key] || SCENE_BG.classroom)(c, t);
}
