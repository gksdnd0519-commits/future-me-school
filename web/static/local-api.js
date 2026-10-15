// =============================================================
// local-api.js - "서버 없이" 돌아가는 웹 공개용 게임 규칙
// -------------------------------------------------------------
// GitHub Pages 같은 곳에서는 파이썬(app.py)을 실행할 수 없다.
// 그래서 app.py 의 규칙을 그대로 자바스크립트로 옮겨서, 브라우저 안에서 계산한다.
//   - 내 컴퓨터에서 python 한웅.py 로 실행할 때 : 이 파일은 쓰이지 않음 (app.py 가 규칙 담당)
//   - 인터넷 공개 주소로 접속할 때            : 이 파일이 app.py 대신 규칙 담당
// 접속한 사람마다 자기 브라우저에서 계산·저장하므로 각자 따로 플레이된다.
//
// ※ 규칙(숫자)을 바꿀 때는 app.py 와 이 파일을 똑같이 바꿔야 한다.
// =============================================================

(function () {
  // ----- 1) 규칙 숫자 (app.py 와 같음) -----
  const MAX_DAY = 14, MAX_TURN = 5, SWAP_TURN = 3, TIRED_LIMIT = 10, PLACE_BONUS = 5;
  const EVENT_BONUS = 3, CHAT_BONUS = 1, SIDE_BONUS = 2, NIGHT_REST = 20, ENDING_AFF = 60;
  const HEROINE_IDS = ["seorin", "yuri", "bom", "hayul", "sion"];
  const SIDE_NPCS = { doyun: "우정", kim: "성적", han: "체력" };

  const PLACES = {
    "교실":   { emoji: "🏫", bonus: "성적" },
    "도서관": { emoji: "📚", bonus: "성적" },
    "급식실": { emoji: "🍱", bonus: "우정" },
    "운동장": { emoji: "⚽", bonus: "체력" },
    "보건실": { emoji: "🏥", bonus: "체력" },
  };

  const ROLES = {
    student: {
      name: "학생 (현재의 나)",
      actions: {
        "공부하기":  { effect: { "체력": -12, "성적": 15 }, say: "수학 문제 다 풀었다!", reply: "그때 공부한 게 나중에 진짜 도움 돼!" },
        "친구 돕기": { effect: { "체력": -5, "우정": 15 }, say: "괜찮아? 내가 같이 해 줄게.", reply: "그 친구, 10년 뒤에도 연락하는 사이야." },
        "쉬기":      { effect: { "체력": 15, "성적": -5 }, say: "잠깐 눈 좀 붙이자… zzz", reply: "쉬는 것도 실력이야. 잘했어." },
      },
    },
    future: {
      name: "미래의 나 (10년 후)",
      actions: {
        "힌트 주기": { effect: { "성적": 10 }, say: "이번 시험엔 3단원이 꼭 나와!", reply: "헐, 미래에서 온 힌트다!" },
        "응원하기":  { effect: { "체력": 10, "우정": 5 }, say: "넌 생각보다 훨씬 잘하고 있어.", reply: "고마워… 힘이 난다!" },
        "경고하기":  { effect: { "성적": 5, "체력": -5 }, say: "그거 미루면 나중에 후회해!", reply: "으… 알았어, 지금 할게." },
      },
    },
  };
  const GRADES = [[240, "S"], [215, "A"], [190, "B"], [0, "C"]];

  let HEROINES = {};      // init() 에서 대본을 받아 채움

  // ----- 2) 상태 -----
  const SAVE_KEY = "future-me-school-save-v2";
  const newState = () => ({
    name: "", intro_done: false, day: 1, turn: 1, role: "student", fix_on: true,
    stats: { "체력": 50, "성적": 50, "우정": 50 },
    aff: Object.fromEntries(HEROINE_IDS.map((h) => [h, 0])),
    done: Object.fromEntries(HEROINE_IDS.map((h) => [h, []])),
    chat_n: Object.fromEntries(HEROINE_IDS.map((h) => [h, 0])),
    today: { met: [], event: [], side: [] },
    pending: null, ended: false, ending: null, alert: "",
    talk: { student: "오늘도 학교 가자!", future: "내가 옆에서 도와줄게." },
    log: ["🌅 1일째 아침. 은하제까지 14일!"],
  });

  let state = newState();
  let history = [];
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && saved.state) { state = { ...newState(), ...saved.state }; history = saved.history || []; }
    } catch (e) { /* 저장소를 못 쓰는 환경이면 새 게임 */ }
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state, history: history.slice(-30) })); } catch (e) {}
  }

  const copy = (o) => JSON.parse(JSON.stringify(o));
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const other = (r) => (r === "student" ? "future" : "student");
  const saveHistory = () => { history.push(copy(state)); if (history.length > 50) history.shift(); };
  const log = (t) => { state.log.push(t); state.log = state.log.slice(-60); };

  function swapRoles(reason) {
    state.role = other(state.role);
    const name = ROLES[state.role].name;
    log(`🚨 ${reason} 이제 나는 '${name}' 역할!`);
    state.alert = `역할 체인지! 이제 나는 ${name}`;
  }

  function endDay() {
    if (state.day >= MAX_DAY) {
      state.ended = true;
      state.ending = decideEnding();
      log("🎆 은하제의 밤. 불꽃놀이가 시작된다.");
      return;
    }
    state.day += 1;
    state.turn = 1;
    state.role = "student";
    state.today = { met: [], event: [], side: [] };
    state.stats["체력"] = clamp(state.stats["체력"] + NIGHT_REST);
    log(`🌙 하루 끝. 푹 자고 체력 +${NIGHT_REST}`);
    log(`🌅 ${state.day}일째 아침. 은하제까지 ${MAX_DAY - state.day + 1}일!`);
  }

  function advanceTurn() {
    const info = { swap: null, day_end: false };
    state.turn += 1;
    if (state.turn === SWAP_TURN && state.role === "student") {
      swapRoles("3교시 종이 울리자 회중시계가 지직거렸다!");
      info.swap = "swap";
    } else if (state.turn === SWAP_TURN + 1 && state.role === "future") {
      swapRoles("4교시 종소리와 함께 시간이 제자리로 돌아왔다.");
      info.swap = "unswap";
    }
    if (state.turn > MAX_TURN) { endDay(); info.day_end = true; }
    return info;
  }

  function decideEnding() {
    let best = null;
    for (const h of Object.keys(HEROINES)) {
      if (state.done[h].length >= HEROINES[h].events.length && state.aff[h] >= ENDING_AFF)
        if (best === null || state.aff[h] > state.aff[best]) best = h;
    }
    if (best) return { type: "heroine", id: best };
    const stat = Object.keys(state.stats).reduce((a, b) => (state.stats[b] > state.stats[a] ? b : a));
    return { type: "normal", stat };
  }

  function nextEvent(hid) {
    const h = HEROINES[hid];
    const k = state.done[hid].length;
    if (k >= h.events.length) return [null, "done"];
    const e = h.events[k];
    if (state.today.event.includes(hid)) return [null, "today"];
    if (state.day < e.min_day) return [null, "day"];
    if (state.aff[hid] < e.min_aff) return [null, "aff"];
    for (const [stat, need] of Object.entries(e.need || {}))
      if (state.stats[stat] < need) return [null, `need:${stat}:${need}`];
    return [e, null];
  }

  function choiceDelta(lines, picks) {
    let total = 0, i = 0;
    for (const ln of lines) {
      if (ln.choice) {
        if (i >= picks.length || !Number.isInteger(picks[i]) || picks[i] < 0 || picks[i] >= ln.choice.length) return null;
        total += ln.choice[picks[i]].aff;
        i += 1;
      }
    }
    return i === picks.length ? total : null;
  }

  function view(event = null) {
    const role = state.role;
    const buttonRole = state.fix_on ? role : "student";        // ★ 돌발 상황 해결
    const buttons = Object.keys(ROLES[buttonRole].actions);
    const action_info = {};
    for (const b of buttons) action_info[b] = ROLES[buttonRole].actions[b].effect;
    const total = Object.values(state.stats).reduce((a, b) => a + b, 0);
    persist();
    return copy({
      ...state,
      role_name: ROLES[role].name, buttons, action_info,
      mismatch: !state.fix_on && role !== "student",
      places: PLACES, place_bonus: PLACE_BONUS, max_turn: MAX_TURN, max_day: MAX_DAY, ending_aff: ENDING_AFF,
      can_undo: history.length > 0,
      grade: GRADES.find(([limit]) => total >= limit)[1],
      event,
    });
  }
  function blocked(msg) { state.alert = msg; return view({ type: "blocked" }); }

  // ----- 3) API 주소별 처리 (app.py 의 함수들과 같음) -----
  const routes = {
    "/api/state": () => view(),

    "/api/name": ({ name } = {}) => {
      state.name = String(name ?? "").trim().slice(0, 8) || "한웅";
      return view({ type: "name" });
    },

    "/api/intro": () => { state.intro_done = true; return view({ type: "intro" }); },

    "/api/act": ({ place, action } = {}) => {
      state.alert = "";
      if (state.ended) return blocked("은하제가 끝났어요. 새 게임으로 다시 시작!");
      if (!PLACES[place]) return blocked("교실·도서관 같은 장소 안에서만 행동할 수 있어요.");
      const role = state.role;
      let info = ROLES[role].actions[action], bug = false;
      if (!info) {
        if (state.fix_on) return blocked(`⛔ 지금 역할(${ROLES[role].name})은 '${action}'을(를) 할 수 없어요.`);
        info = ROLES[other(role)].actions[action];
        if (!info) return blocked("알 수 없는 행동이에요.");
        bug = true;
      }
      const hp = info.effect["체력"] || 0;
      if (hp < 0 && state.stats["체력"] + hp < TIRED_LIMIT)
        return blocked("😵 너무 피곤해요! 쉬기를 하거나 운동장·보건실에서 체력을 채우세요.");

      saveHistory();
      const before = { ...state.stats };
      for (const [k, v] of Object.entries(info.effect)) state.stats[k] = clamp(state.stats[k] + v);
      const bonus = PLACES[place].bonus;
      state.stats[bonus] = clamp(state.stats[bonus] + PLACE_BONUS);
      const delta = {};
      for (const k of Object.keys(before)) if (state.stats[k] !== before[k]) delta[k] = state.stats[k] - before[k];

      const reply = bug ? "어?! 그건 내가 할 일인데?!" : info.reply;
      state.talk = { [role]: info.say, [other(role)]: reply };
      log(`[${state.day}일 ${state.turn}교시] ${PLACES[place].emoji} ${place}에서 '${action}'`);
      if (bug) {
        log(`⚠️ 버그! ${ROLES[role].name} 역할인데 학생 행동 '${action}'이 실행됐어요.`);
        state.alert = "⚠️ 버그 재현: 역할은 바뀌었는데 버튼이 그대로예요!";
      }
      const turnInfo = advanceTurn();
      return view({ type: "act", actor: role, action, say: info.say, reply, delta, bug, ...turnInfo });
    },

    "/api/meet": ({ who } = {}) => {
      state.alert = "";
      if (state.ended) return blocked("은하제가 끝났어요.");
      if (SIDE_NPCS[who]) {
        const first = !state.today.side.includes(who);
        const delta = {};
        if (first) {
          saveHistory();
          const stat = SIDE_NPCS[who], before = state.stats[stat];
          state.stats[stat] = clamp(before + SIDE_BONUS);
          delta[stat] = state.stats[stat] - before;
          state.today.side.push(who);
        }
        return view({ type: "meet", kind: "side", who, idx: state.day * 3 + state.turn, delta });
      }
      if (!HEROINES[who]) return blocked("지금은 만날 수 없어요.");
      if (state.role === "future" && state.fix_on)
        return view({ type: "meet", kind: "hint", who, idx: state.day % HEROINES[who].hints.length });

      const [e, reason] = nextEvent(who);
      if (e) {
        state.pending = { who, id: e.id };
        return view({ type: "meet", kind: "event", who, id: e.id, bug: state.role === "future" });
      }
      const idx = state.chat_n[who] % HEROINES[who].chat.length;
      state.chat_n[who] += 1;
      let delta = 0;
      if (!state.today.met.includes(who)) {
        saveHistory();
        state.today.met.push(who);
        state.aff[who] = clamp(state.aff[who] + CHAT_BONUS);
        delta = CHAT_BONUS;
      }
      return view({ type: "meet", kind: "chat", who, idx, aff: delta, reason });
    },

    "/api/event": ({ who, id, choices = [] } = {}) => {
      const p = state.pending;
      if (!p || p.who !== who || p.id !== id) return blocked("이벤트 정보가 맞지 않아요.");
      const e = HEROINES[who].events.find((x) => x.id === id);
      let gained = e ? choiceDelta(e.lines, choices) : null;
      if (gained === null) return blocked("선택지 정보가 이상해요.");
      saveHistory();
      gained += EVENT_BONUS;
      const before = state.aff[who];
      state.aff[who] = clamp(before + gained);
      state.done[who].push(id);
      state.today.event.push(who);
      state.today.met.push(who);
      state.pending = null;
      log(`💗 [${state.day}일 ${state.turn}교시] ${HEROINES[who].short} 이벤트 「${e.title}」 호감도 ${gained >= 0 ? "+" : ""}${state.aff[who] - before}`);
      const turnInfo = advanceTurn();
      return view({ type: "event_done", who, aff: state.aff[who] - before, ...turnInfo });
    },

    "/api/swap": () => {
      state.alert = "";
      if (state.ended) return blocked("은하제가 끝났어요.");
      saveHistory();
      swapRoles("[역할 바꾸기]로 역할이 뒤바뀌었다!");
      return view({ type: "swap" });
    },

    "/api/undo": () => {
      if (!history.length) return blocked("더 되돌릴 기록이 없어요.");
      state = history.pop();
      state.alert = "↩ 한 단계 되돌렸어요.";
      return view({ type: "undo" });
    },

    "/api/reset": () => {
      const keep = { name: state.name, fix_on: state.fix_on };
      state = { ...newState(), ...keep };
      history = [];
      return view({ type: "reset" });
    },

    "/api/fix": ({ on } = {}) => {
      state.fix_on = !!on;
      state.alert = on ? "✅ 해결 기능 켜짐 : 역할에 맞는 행동만 나와요."
                       : "⚠️ 해결 기능 꺼짐 : 역할이 바뀌어도 행동이 안 바뀌어요. (버그 재현)";
      log(state.alert);
      return view({ type: "fix" });
    },
  };

  // game.js 가 서버 대신 부르는 함수. init(대본) 을 먼저 한 번 불러야 한다.
  window.LOCAL_API = (path, body) => routes[path](body);
  window.LOCAL_API.init = (heroines) => {
    HEROINES = heroines;
    load();
  };
})();
