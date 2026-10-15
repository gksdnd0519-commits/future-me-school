// =============================================================
// local-api.js - "서버 없이" 돌아가는 웹 공개용 게임 규칙
// -------------------------------------------------------------
// GitHub Pages 같은 곳에서는 파이썬(app.py)을 실행할 수 없다.
// 그래서 app.py 의 규칙을 그대로 자바스크립트로 옮겨서, 브라우저 안에서 계산한다.
//   - 내 컴퓨터에서 python 한웅.py 로 실행할 때 : 이 파일은 쓰이지 않음 (app.py 가 규칙 담당)
//   - 인터넷 공개 주소로 접속할 때            : 이 파일이 app.py 대신 규칙 담당
// 접속한 사람마다 자기 브라우저에서 계산하므로, 여러 명이 동시에 해도 각자 따로 플레이된다.
//
// ※ 규칙(숫자)을 바꿀 때는 app.py 와 이 파일을 똑같이 바꿔야 한다.
// =============================================================

(function () {
  // ----- 1) 게임 데이터 (app.py 와 같음) -----
  const MAX_TURN = 5, SWAP_TURN = 3, TIRED_LIMIT = 10, PLACE_BONUS = 5, TALK_BONUS = 3;

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

  const NPCS = { "서아": "우정", "하린": "우정", "도윤": "우정", "유나": "성적",
                 "태오": "체력", "김선생님": "성적", "한선생님": "체력" };

  const ENDINGS = {
    "체력": "💪 \"덕분에 지금도 매일 아침 달리기를 해. 건강한 어른이 됐어!\"",
    "성적": "📚 \"그날의 공부가 쌓여서 꿈꾸던 일을 하고 있어!\"",
    "우정": "🤝 \"그때 도와준 친구들이 지금도 내 곁에 있어!\"",
  };
  const GRADES = [[240, "S"], [215, "A"], [190, "B"], [0, "C"]];

  // ----- 2) 상태 -----
  const SAVE_KEY = "future-me-school-save";
  const newState = () => ({
    stats: { "체력": 50, "성적": 50, "우정": 50 },
    turn: 1, role: "student", fix_on: true, swap_done: false, talked: [], alert: "",
    talk: { student: "오늘도 학교 가자!", future: "내가 옆에서 도와줄게." },
    log: ["🌅 아침 등교! 빛나는 곳이나 친구 앞에서 Space를 눌러 보세요."],
  });

  let state = newState();
  let history = [];
  // 새로고침해도 이어서 할 수 있게 브라우저에 저장 (실패해도 게임은 그대로 됨)
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && saved.state) { state = saved.state; history = saved.history || []; }
  } catch (e) { /* 저장소를 못 쓰는 환경이면 무시 */ }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state, history: history.slice(-30) })); } catch (e) {}
  }

  const copy = (o) => JSON.parse(JSON.stringify(o));     // 통째로 복사 (파이썬의 deepcopy)
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const other = (r) => (r === "student" ? "future" : "student");
  const saveHistory = () => history.push(copy(state));

  function swapRoles(reason) {
    state.role = other(state.role);
    const name = ROLES[state.role].name;
    state.log.push(`🚨 ${reason} 이제 나는 '${name}' 역할!`);
    state.alert = `역할 체인지! 이제 나는 ${name}`;
    state.talk = state.role === "future"
      ? { student: "어? 내가 왜 따라가고 있지…?", future: "이번엔 네가 미래의 나야!" }
      : { student: "휴, 원래대로 돌아왔다!", future: "다시 내가 도와줄게." };
  }

  function view(event = null) {
    const role = state.role;
    const buttonRole = state.fix_on ? role : "student";        // ★ 돌발 상황 해결 (app.py 의 view 와 같음)
    const buttons = Object.keys(ROLES[buttonRole].actions);
    const action_info = {};
    for (const b of buttons) action_info[b] = ROLES[buttonRole].actions[b].effect;
    const ended = state.turn > MAX_TURN;
    const best = Object.keys(state.stats).reduce((a, b) => (state.stats[b] > state.stats[a] ? b : a));
    const total = Object.values(state.stats).reduce((a, b) => a + b, 0);
    persist();
    return copy({
      ...state,
      role_name: ROLES[role].name, buttons, action_info,
      mismatch: !state.fix_on && role !== "student",
      places: PLACES, place_bonus: PLACE_BONUS, max_turn: MAX_TURN,
      can_undo: history.length > 0, ended, ending: ended ? ENDINGS[best] : "",
      grade: GRADES.find(([limit]) => total >= limit)[1],
      event,
    });
  }
  function blocked(msg) { state.alert = msg; return view({ type: "blocked" }); }

  // ----- 3) API 주소별 처리 (app.py 의 @app.post 함수들과 같음) -----
  const routes = {
    "/api/state": () => view(),

    "/api/act": ({ place, action } = {}) => {
      state.alert = "";
      if (state.turn > MAX_TURN) return blocked("오늘 수업은 모두 끝났어요. R 키로 다시 시작!");
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
      state.log.push(`[${state.turn}교시] ${PLACES[place].emoji} ${place}에서 '${action}' (${ROLES[role].name}) → ${bonus} 보너스 +${PLACE_BONUS}`);
      if (bug) {
        state.log.push(`⚠️ 버그! ${ROLES[role].name} 역할인데 학생 버튼 '${action}'이 눌렸어요.`);
        state.alert = "⚠️ 버그 재현: 역할은 바뀌었는데 버튼이 그대로예요!";
      }
      state.turn += 1;
      let swapped = false;
      if (state.turn === SWAP_TURN && !state.swap_done) {
        state.swap_done = true;
        swapRoles("쉬는 시간 종이 울리자 몸이 뒤바뀌었다!");
        swapped = true;
      }
      if (state.turn > MAX_TURN) state.log.push("🔔 하루 끝! 엔딩을 확인하세요.");
      state.log = state.log.slice(-40);
      return view({ type: "act", actor: role, action, say: info.say, reply, delta, bug, swapped });
    },

    "/api/talk": ({ npc } = {}) => {
      state.alert = "";
      if (!NPCS[npc]) return blocked("그런 친구는 없어요.");
      const first = !state.talked.includes(npc) && state.turn <= MAX_TURN;
      const delta = {};
      if (first) {
        saveHistory();
        const stat = NPCS[npc], before = state.stats[stat];
        state.stats[stat] = clamp(before + TALK_BONUS);
        delta[stat] = state.stats[stat] - before;
        state.talked.push(npc);
        state.log.push(`💬 ${npc}와(과) 이야기했다 → ${stat} +${TALK_BONUS}`);
      }
      return view({ type: "talk", npc, first, delta });
    },

    "/api/swap": () => {
      state.alert = "";
      if (state.turn > MAX_TURN) return blocked("하루가 끝났어요. R 키로 다시 시작!");
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
      const fix = state.fix_on;
      state = newState();
      state.fix_on = fix;
      history = [];
      return view({ type: "reset" });
    },

    "/api/fix": ({ on } = {}) => {
      state.fix_on = !!on;
      state.alert = on ? "✅ 해결 기능 켜짐 : 역할에 맞는 행동만 나와요."
                       : "⚠️ 해결 기능 꺼짐 : 역할이 바뀌어도 행동 목록이 안 바뀌어요. (버그 재현)";
      state.log.push(state.alert);
      return view({ type: "fix" });
    },
  };

  // game.js 가 서버 대신 부르는 함수
  window.LOCAL_API = (path, body) => routes[path](body);
})();
