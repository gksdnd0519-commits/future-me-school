# =============================================================
# 미래의 나와 은하제까지 14일  -  웹 게임 백엔드 (app.py)
# -------------------------------------------------------------
# 백엔드(back-end) : 화면 뒤에서 "규칙 계산, 점수 저장"을 맡는 프로그램.
# 프론트엔드(front-end) : 브라우저에 보이는 게임 화면 (index.html, game.js 등).
# 둘은 "API" 라는 정해진 주소로 대화한다.
#
# 이 파일이 정하는 규칙
#   - 14일 × 하루 5교시. 교시마다 행동하거나 히로인과 이벤트를 보면 시간이 흐른다.
#   - 히로인 5명의 호감도, 공략 이벤트 12개, 선택지 효과, 엔딩 판정
#   - ★ 돌발 상황 : 매일 3교시에 주인공과 미래의 나의 역할이 바뀌고, 4교시에 돌아온다.
#     역할마다 할 수 있는 행동이 다르다 (학생 = 연애 이벤트, 미래의 나 = 힌트).
#
# 대사(대본)는 static/story/*.json 에 있고, 여기서는 그 파일을 읽어 조건만 검사한다.
# 실행 :  python app.py   →  브라우저에서 http://127.0.0.1:5000 열기
# =============================================================

import copy   # copy.deepcopy : 딕셔너리를 통째로 복사 (되돌리기용)
import json   # json : 대본 파일(.json)과 세이브 파일을 읽고 쓰는 도구
from pathlib import Path

from flask import Flask, jsonify, request, render_template

app = Flask(__name__)
HERE = Path(__file__).parent
STORY_DIR = HERE / "static" / "story"
SAVE_FILE = HERE / "save.json"     # 진행 상황 자동 저장 파일


# -------------------------------------------------------------
# 1) 게임 규칙 숫자 - 여기만 바꾸면 밸런스가 바뀐다
#    (웹 공개 버전 static/local-api.js 에도 같은 숫자가 있으니 함께 바꿀 것)
# -------------------------------------------------------------
MAX_DAY = 14        # 은하제까지 14일
MAX_TURN = 5        # 하루 5교시
SWAP_TURN = 3       # 3교시 = 역할이 바뀌는 시간
TIRED_LIMIT = 10    # 행동 후 체력이 이보다 낮아지면 못 함
PLACE_BONUS = 5     # 장소 보너스
EVENT_BONUS = 3     # 이벤트를 끝까지 보면 기본 호감도
CHAT_BONUS = 1      # 그날 처음 잡담하면 호감도
SIDE_BONUS = 2      # 도윤·선생님과 그날 처음 대화하면 능력치
NIGHT_REST = 20     # 밤에 자고 나면 체력 회복
ENDING_AFF = 60     # 히로인 엔딩에 필요한 호감도 (+ 이벤트 12개 모두)
HEROINE_IDS = ["seorin", "yuri", "bom", "hayul", "sion"]
SIDE_NPCS = {"doyun": "우정", "kim": "성적", "han": "체력"}

PLACES = {
    "교실":   {"emoji": "🏫", "bonus": "성적"},
    "도서관": {"emoji": "📚", "bonus": "성적"},
    "급식실": {"emoji": "🍱", "bonus": "우정"},
    "운동장": {"emoji": "⚽", "bonus": "체력"},
    "보건실": {"emoji": "🏥", "bonus": "체력"},
}

# 역할(role)마다 할 수 있는 행동이 다르다  ← 돌발 상황 해결의 핵심!
ROLES = {
    "student": {
        "name": "학생 (현재의 나)",
        "actions": {
            "공부하기":  {"effect": {"체력": -12, "성적": 15}, "say": "수학 문제 다 풀었다!",
                         "reply": "그때 공부한 게 나중에 진짜 도움 돼!"},
            "친구 돕기": {"effect": {"체력": -5, "우정": 15}, "say": "괜찮아? 내가 같이 해 줄게.",
                         "reply": "그 친구, 10년 뒤에도 연락하는 사이야."},
            "쉬기":      {"effect": {"체력": 15, "성적": -5}, "say": "잠깐 눈 좀 붙이자… zzz",
                         "reply": "쉬는 것도 실력이야. 잘했어."},
        },
    },
    "future": {
        "name": "미래의 나 (10년 후)",
        "actions": {
            "힌트 주기": {"effect": {"성적": 10}, "say": "이번 시험엔 3단원이 꼭 나와!",
                         "reply": "헐, 미래에서 온 힌트다!"},
            "응원하기":  {"effect": {"체력": 10, "우정": 5}, "say": "넌 생각보다 훨씬 잘하고 있어.",
                         "reply": "고마워… 힘이 난다!"},
            "경고하기":  {"effect": {"성적": 5, "체력": -5}, "say": "그거 미루면 나중에 후회해!",
                         "reply": "으… 알았어, 지금 할게."},
        },
    },
}

GRADES = [(240, "S"), (215, "A"), (190, "B"), (0, "C")]


def load_heroines():
    """static/story 의 히로인 대본을 읽는다. 아직 없는 파일은 건너뛴다."""
    found = {}
    for hid in HEROINE_IDS:
        path = STORY_DIR / f"{hid}.json"
        if path.exists():
            found[hid] = json.loads(path.read_text(encoding="utf-8"))
    return found


HEROINES = load_heroines()


# -------------------------------------------------------------
# 2) 상태(state) : 게임 진행 중 바뀌는 값 + 되돌리기 기록(history)
# -------------------------------------------------------------

def new_state():
    """새 게임의 처음 상태"""
    return {
        "name": "",                                   # 주인공 이름 (시작 화면에서 입력)
        "intro_done": False,                          # 프롤로그를 봤는지
        "day": 1,
        "turn": 1,
        "role": "student",
        "fix_on": True,                               # 돌발 상황 '해결 기능' (시연용 스위치)
        "stats": {"체력": 50, "성적": 50, "우정": 50},
        "aff": {h: 0 for h in HEROINE_IDS},           # 히로인별 호감도 0~100
        "done": {h: [] for h in HEROINE_IDS},         # 히로인별로 본 이벤트 id 목록
        "chat_n": {h: 0 for h in HEROINE_IDS},        # 잡담을 몇 번 했는지 (다음 잡담 고르기용)
        "today": {"met": [], "event": [], "side": []},  # 오늘 이미 한 것 (하루 한 번 제한)
        "pending": None,                              # 지금 보고 있는 이벤트 (끝나면 확인용)
        "ended": False,
        "ending": None,
        "alert": "",
        "talk": {"student": "오늘도 학교 가자!", "future": "내가 옆에서 도와줄게."},
        "log": ["🌅 1일째 아침. 은하제까지 14일!"],
    }


def load_save():
    """저장 파일이 있으면 이어서, 없거나 망가졌으면 새 게임"""
    try:
        data = json.loads(SAVE_FILE.read_text(encoding="utf-8"))
        base = new_state()
        base.update(data["state"])                    # 새로 생긴 칸은 기본값 유지
        return base, data.get("history", [])
    except (OSError, ValueError, KeyError, TypeError):
        return new_state(), []


state, history = load_save()


def save():
    """진행 상황을 파일에 저장 (게임을 껐다 켜도 이어서 할 수 있게)"""
    try:
        SAVE_FILE.write_text(json.dumps({"state": state, "history": history[-30:]}, ensure_ascii=False),
                             encoding="utf-8")
    except OSError:
        pass   # 저장에 실패해도 게임은 계속


def save_history():
    history.append(copy.deepcopy(state))
    del history[:-50]          # 되돌리기는 최근 50번까지만 기억


def clamp(value):
    return max(0, min(100, value))


def other_role(role):
    return "future" if role == "student" else "student"


def log(text):
    state["log"].append(text)
    state["log"] = state["log"][-60:]


def swap_roles(reason):
    """돌발 상황 : 주인공의 역할을 서로 바꾼다."""
    state["role"] = other_role(state["role"])
    new_name = ROLES[state["role"]]["name"]
    log(f"🚨 {reason} 이제 나는 '{new_name}' 역할!")
    state["alert"] = f"역할 체인지! 이제 나는 {new_name}"


def end_day():
    """5교시가 끝나면 : 다음 날로 넘어가거나, 14일째면 엔딩을 정한다."""
    if state["day"] >= MAX_DAY:
        state["ended"] = True
        state["ending"] = decide_ending()
        log("🎆 은하제의 밤. 불꽃놀이가 시작된다.")
        return
    state["day"] += 1
    state["turn"] = 1
    state["role"] = "student"
    state["today"] = {"met": [], "event": [], "side": []}
    state["stats"]["체력"] = clamp(state["stats"]["체력"] + NIGHT_REST)
    log(f"🌙 하루 끝. 푹 자고 체력 +{NIGHT_REST}")
    log(f"🌅 {state['day']}일째 아침. 은하제까지 {MAX_DAY - state['day'] + 1}일!")


def advance_turn():
    """한 교시를 보낸다. 3교시엔 역할이 바뀌고 4교시엔 돌아온다.
    돌려주는 값 : 무슨 일이 있었는지 (화면 연출용)"""
    info = {"swap": None, "day_end": False}
    state["turn"] += 1
    if state["turn"] == SWAP_TURN and state["role"] == "student":
        swap_roles("3교시 종이 울리자 회중시계가 지직거렸다!")
        info["swap"] = "swap"
    elif state["turn"] == SWAP_TURN + 1 and state["role"] == "future":
        swap_roles("4교시 종소리와 함께 시간이 제자리로 돌아왔다.")
        info["swap"] = "unswap"
    if state["turn"] > MAX_TURN:
        end_day()
        info["day_end"] = True
    return info


def decide_ending():
    """이벤트 12개를 모두 보고 호감도가 충분한 히로인 중 가장 높은 사람 → 그 히로인 엔딩.
    아무도 없으면 가장 높은 능력치에 따른 노멀 엔딩."""
    best = None
    for h in HEROINES:
        if len(state["done"][h]) >= len(HEROINES[h]["events"]) and state["aff"][h] >= ENDING_AFF:
            if best is None or state["aff"][h] > state["aff"][best]:
                best = h
    if best:
        return {"type": "heroine", "id": best}
    stat = max(state["stats"], key=state["stats"].get)
    return {"type": "normal", "stat": stat}


def grade_of(stats):
    total = sum(stats.values())
    for limit, grade in GRADES:
        if total >= limit:
            return grade


def next_event(hid):
    """히로인의 다음 이벤트와, 볼 수 없다면 그 이유를 돌려준다."""
    h = HEROINES[hid]
    k = len(state["done"][hid])
    if k >= len(h["events"]):
        return None, "done"
    e = h["events"][k]
    if hid in state["today"]["event"]:
        return None, "today"
    if state["day"] < e["min_day"]:
        return None, "day"
    if state["aff"][hid] < e["min_aff"]:
        return None, "aff"
    for stat, need in e.get("need", {}).items():
        if state["stats"][stat] < need:
            return None, f"need:{stat}:{need}"
    return e, None


def choice_delta(lines, picks):
    """이벤트 대사를 따라가며 고른 선택지(picks)의 호감도를 더한다. 잘못된 선택 번호면 None."""
    total, i = 0, 0
    for ln in lines:
        if "choice" in ln:
            if i >= len(picks) or not isinstance(picks[i], int) or not 0 <= picks[i] < len(ln["choice"]):
                return None
            total += ln["choice"][picks[i]]["aff"]
            i += 1
    return total if i == len(picks) else None


def view(event=None):
    """브라우저에 보낼 '화면용 정보'를 만든다."""
    role = state["role"]
    # ★ 돌발 상황 해결 : 해결 기능이 켜져 있으면 현재 역할에 맞는 버튼만 보낸다
    button_role = role if state["fix_on"] else "student"
    buttons = list(ROLES[button_role]["actions"])
    action_info = {name: ROLES[button_role]["actions"][name]["effect"] for name in buttons}
    save()
    return jsonify({
        **state,
        "role_name": ROLES[role]["name"],
        "buttons": buttons,
        "action_info": action_info,
        "mismatch": (not state["fix_on"]) and role != "student",
        "places": PLACES,
        "place_bonus": PLACE_BONUS,
        "max_turn": MAX_TURN,
        "max_day": MAX_DAY,
        "ending_aff": ENDING_AFF,
        "can_undo": len(history) > 0,
        "grade": grade_of(state["stats"]),
        "event": event,
    })


def blocked(message):
    state["alert"] = message
    return view({"type": "blocked"})


def body():
    """브라우저가 보낸 JSON. 이상한 요청이면 빈 딕셔너리"""
    return request.get_json(silent=True) or {}


# -------------------------------------------------------------
# 3) API 주소들
# -------------------------------------------------------------

@app.get("/")
def home():
    return render_template("index.html")


@app.get("/api/state")
def get_state():
    return view()


@app.post("/api/name")
def set_name():
    """주인공 이름 정하기 (최대 8글자, 비우면 '한웅')"""
    name = str(body().get("name", "")).strip()[:8] or "한웅"
    state["name"] = name
    return view({"type": "name"})


@app.post("/api/intro")
def intro_done():
    state["intro_done"] = True
    return view({"type": "intro"})


@app.post("/api/act")
def act():
    """장소의 빛나는 곳에서 행동 → 능력치가 바뀌고 한 교시가 지난다."""
    data = body()
    place, action = data.get("place"), data.get("action")
    state["alert"] = ""
    if state["ended"]:
        return blocked("은하제가 끝났어요. 새 게임으로 다시 시작!")
    if place not in PLACES:
        return blocked("교실·도서관 같은 장소 안에서만 행동할 수 있어요.")

    role = state["role"]
    info = ROLES[role]["actions"].get(action)
    bug = False
    if info is None:
        if state["fix_on"]:
            # ★ 해결 : 서버도 한 번 더 검사해서 역할에 안 맞는 행동은 막는다
            return blocked(f"⛔ 지금 역할({ROLES[role]['name']})은 '{action}'을(를) 할 수 없어요.")
        info = ROLES[other_role(role)]["actions"].get(action)   # ✗ 버그 재현
        if info is None:
            return blocked("알 수 없는 행동이에요.")
        bug = True

    hp = info["effect"].get("체력", 0)
    if hp < 0 and state["stats"]["체력"] + hp < TIRED_LIMIT:
        return blocked("😵 너무 피곤해요! 쉬기를 하거나 운동장·보건실에서 체력을 채우세요.")

    save_history()
    before = dict(state["stats"])
    for stat, amount in info["effect"].items():
        state["stats"][stat] = clamp(state["stats"][stat] + amount)
    bonus = PLACES[place]["bonus"]
    state["stats"][bonus] = clamp(state["stats"][bonus] + PLACE_BONUS)
    delta = {k: state["stats"][k] - before[k] for k in before if state["stats"][k] != before[k]}

    reply = "어?! 그건 내가 할 일인데?!" if bug else info["reply"]
    state["talk"] = {role: info["say"], other_role(role): reply}
    log(f"[{state['day']}일 {state['turn']}교시] {PLACES[place]['emoji']} {place}에서 '{action}'")
    if bug:
        log(f"⚠️ 버그! {ROLES[role]['name']} 역할인데 학생 행동 '{action}'이 실행됐어요.")
        state["alert"] = "⚠️ 버그 재현: 역할은 바뀌었는데 버튼이 그대로예요!"
    turn_info = advance_turn()
    return view({"type": "act", "actor": role, "action": action, "say": info["say"],
                 "reply": reply, "delta": delta, "bug": bug, **turn_info})


@app.post("/api/meet")
def meet():
    """히로인이나 도윤·선생님에게 말 걸기 → 무엇을 볼지 정해 준다.
    kind : event(공략 이벤트) | chat(잡담) | hint(미래의 나 힌트) | side(조연 잡담)"""
    who = body().get("who")
    state["alert"] = ""
    if state["ended"]:
        return blocked("은하제가 끝났어요.")

    if who in SIDE_NPCS:
        first = who not in state["today"]["side"]
        delta = {}
        if first:
            save_history()
            stat = SIDE_NPCS[who]
            before = state["stats"][stat]
            state["stats"][stat] = clamp(before + SIDE_BONUS)
            delta = {stat: state["stats"][stat] - before}
            state["today"]["side"].append(who)
        return view({"type": "meet", "kind": "side", "who": who, "idx": state["day"] * 3 + state["turn"],
                     "delta": delta})

    if who not in HEROINES:
        return blocked("지금은 만날 수 없어요.")

    # ★ 돌발 상황 해결 : 미래의 나 역할일 때는 연애 이벤트 대신 힌트만
    if state["role"] == "future" and state["fix_on"]:
        return view({"type": "meet", "kind": "hint", "who": who,
                     "idx": state["day"] % len(HEROINES[who]["hints"])})

    e, reason = next_event(who)
    if e:
        state["pending"] = {"who": who, "id": e["id"]}
        return view({"type": "meet", "kind": "event", "who": who, "id": e["id"],
                     "bug": state["role"] == "future"})

    # 이벤트가 없으면 잡담 (그날 처음이면 호감도 +1)
    idx = state["chat_n"][who] % len(HEROINES[who]["chat"])
    state["chat_n"][who] += 1
    delta = 0
    if who not in state["today"]["met"]:
        save_history()
        state["today"]["met"].append(who)
        state["aff"][who] = clamp(state["aff"][who] + CHAT_BONUS)
        delta = CHAT_BONUS
    return view({"type": "meet", "kind": "chat", "who": who, "idx": idx, "aff": delta, "reason": reason})


@app.post("/api/event")
def event_done():
    """공략 이벤트를 끝까지 봤을 때 : 고른 선택지로 호감도를 바꾸고 한 교시가 지난다."""
    data = body()
    who, eid, picks = data.get("who"), data.get("id"), data.get("choices", [])
    p = state["pending"]
    if not p or p["who"] != who or p["id"] != eid:
        return blocked("이벤트 정보가 맞지 않아요.")
    e = next((x for x in HEROINES[who]["events"] if x["id"] == eid), None)
    gained = choice_delta(e["lines"], picks) if e else None
    if gained is None:
        return blocked("선택지 정보가 이상해요.")

    save_history()
    gained += EVENT_BONUS
    before = state["aff"][who]
    state["aff"][who] = clamp(before + gained)
    state["done"][who].append(eid)
    state["today"]["event"].append(who)
    state["today"]["met"].append(who)
    state["pending"] = None
    log(f"💗 [{state['day']}일 {state['turn']}교시] {HEROINES[who]['short']} 이벤트 「{e['title']}」 "
        f"호감도 {'+' if gained >= 0 else ''}{state['aff'][who] - before}")
    turn_info = advance_turn()
    return view({"type": "event_done", "who": who, "aff": state["aff"][who] - before, **turn_info})


@app.post("/api/swap")
def swap():
    """돌발 상황 재현 버튼 : 언제든 역할을 직접 바꿔 볼 수 있다."""
    state["alert"] = ""
    if state["ended"]:
        return blocked("은하제가 끝났어요.")
    save_history()
    swap_roles("[역할 바꾸기]로 역할이 뒤바뀌었다!")
    return view({"type": "swap"})


@app.post("/api/undo")
def undo():
    if not history:
        return blocked("더 되돌릴 기록이 없어요.")
    state.clear()
    state.update(history.pop())
    state["alert"] = "↩ 한 단계 되돌렸어요."
    return view({"type": "undo"})


@app.post("/api/reset")
def reset():
    """새 게임 (이름과 해결 기능 설정은 유지)"""
    keep = {"name": state["name"], "fix_on": state["fix_on"]}
    state.clear()
    state.update(new_state())
    state.update(keep)
    history.clear()
    return view({"type": "reset"})


@app.post("/api/fix")
def set_fix():
    on = bool(body().get("on"))
    state["fix_on"] = on
    state["alert"] = "✅ 해결 기능 켜짐 : 역할에 맞는 행동만 나와요." if on \
        else "⚠️ 해결 기능 꺼짐 : 역할이 바뀌어도 행동이 안 바뀌어요. (버그 재현)"
    log(state["alert"])
    return view({"type": "fix"})


if __name__ == "__main__":
    print("브라우저에서 http://127.0.0.1:5000 을 열어 주세요. (끄기: Ctrl + C)")
    app.run(debug=True)
