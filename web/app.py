# =============================================================
# 미래의 나와 하루 학교  -  웹 게임 백엔드 (app.py)
# -------------------------------------------------------------
# 백엔드(back-end) : 화면 뒤에서 "규칙 계산, 점수 저장"을 맡는 프로그램.
# 프론트엔드(front-end) : 브라우저에 보이는 게임 화면 (index.html, style.css, game.js).
# 둘은 "API" 라는 정해진 주소로 대화한다.
#   브라우저 → "도서관에서 공부하기 했어요" → 서버(app.py)
#   서버     → "점수가 이렇게 바뀌었어요"    → 브라우저
#
# 캐릭터 이동·그림·효과음은 브라우저(game.js)가,
# 점수·역할·되돌리기 같은 "게임 규칙"은 전부 서버(이 파일)가 결정한다.
#
# 실행 :  python app.py   →  브라우저에서 http://127.0.0.1:5000 열기
# =============================================================

import copy  # copy.deepcopy : 딕셔너리를 "통째로 복사" (되돌리기용 저장에 필요)

# Flask : 파이썬으로 웹 서버를 쉽게 만드는 도구 (pip install flask 로 설치)
#   jsonify         : 파이썬 딕셔너리를 브라우저가 읽는 JSON 글자로 바꿔 줌
#   request         : 브라우저가 보낸 내용을 꺼낼 때 사용
#   render_template : templates 폴더의 html 파일을 보여 줌
from flask import Flask, jsonify, request, render_template

# __name__ : "지금 이 파일"이라는 뜻. Flask가 templates, static 폴더를 찾는 기준이 됨
app = Flask(__name__)


# -------------------------------------------------------------
# 1) 게임 데이터 (규칙) - 숫자만 바꾸면 게임 밸런스가 바뀐다
# -------------------------------------------------------------

MAX_TURN = 5      # 하루 = 5교시
SWAP_TURN = 3     # 3교시가 시작될 때 돌발 상황(역할 바뀜)이 일어남
TIRED_LIMIT = 10  # 행동 후 체력이 이 값보다 낮아지면 "너무 피곤해서" 못 함
PLACE_BONUS = 5   # 장소와 어울리는 점수에 붙는 보너스

# 장소 : 그림(emoji)과 보너스 점수 종류
PLACES = {
    "교실":   {"emoji": "🏫", "bonus": "성적"},
    "도서관": {"emoji": "📚", "bonus": "성적"},
    "급식실": {"emoji": "🍱", "bonus": "우정"},
    "운동장": {"emoji": "⚽", "bonus": "체력"},
    "보건실": {"emoji": "🏥", "bonus": "체력"},
}

# 역할(role)마다 할 수 있는 행동이 다르다  ← 돌발 상황 해결의 핵심!
#   effect : 점수 변화
#   say    : 행동한 캐릭터의 말
#   reply  : 상대 캐릭터의 대답
ROLES = {
    "student": {
        "name": "학생 (현재의 나)",
        "actions": {
            "공부하기":  {"effect": {"체력": -12, "성적": 15},
                         "say": "수학 문제 다 풀었다!",
                         "reply": "그때 공부한 게 나중에 진짜 도움 돼!"},
            "친구 돕기": {"effect": {"체력": -5, "우정": 15},
                         "say": "괜찮아? 내가 같이 해 줄게.",
                         "reply": "그 친구, 10년 뒤에도 연락하는 사이야."},
            "쉬기":      {"effect": {"체력": 15, "성적": -5},
                         "say": "잠깐 눈 좀 붙이자… zzz",
                         "reply": "쉬는 것도 실력이야. 잘했어."},
        },
    },
    "future": {
        "name": "미래의 나 (10년 후)",
        "actions": {
            "힌트 주기": {"effect": {"성적": 10},
                         "say": "이번 시험엔 3단원이 꼭 나와!",
                         "reply": "헐, 미래에서 온 힌트다!"},
            "응원하기":  {"effect": {"체력": 10, "우정": 5},
                         "say": "넌 생각보다 훨씬 잘하고 있어.",
                         "reply": "고마워… 힘이 난다!"},
            "경고하기":  {"effect": {"성적": 5, "체력": -5},
                         "say": "그거 미루면 나중에 후회해!",
                         "reply": "으… 알았어, 지금 할게."},
        },
    },
}

# 학교 친구들(NPC) : 하루에 한 번 대화하면 그 친구와 관련된 점수 +3
TALK_BONUS = 3
NPCS = {
    "서아": "우정",       # 반장
    "하린": "우정",       # 응원단
    "도윤": "우정",       # 급식왕
    "유나": "성적",       # 도서부
    "태오": "체력",       # 축구부
    "김선생님": "성적",   # 담임
    "한선생님": "체력",   # 보건 선생님
}

# 하루가 끝났을 때 가장 높은 점수에 따라 엔딩이 달라짐
ENDINGS = {
    "체력": "💪 \"덕분에 지금도 매일 아침 달리기를 해. 건강한 어른이 됐어!\"",
    "성적": "📚 \"그날의 공부가 쌓여서 꿈꾸던 일을 하고 있어!\"",
    "우정": "🤝 \"그때 도와준 친구들이 지금도 내 곁에 있어!\"",
}

# 세 점수의 합으로 등급을 매김 (위에서부터 먼저 맞는 것)
GRADES = [(240, "S"), (215, "A"), (190, "B"), (0, "C")]


# -------------------------------------------------------------
# 2) 상태(state) : 게임 진행 중 바뀌는 값 + 되돌리기 기록(history)
# -------------------------------------------------------------

def new_state():
    """처음 시작할 때의 상태를 새로 만들어 돌려준다."""
    return {
        "stats": {"체력": 50, "성적": 50, "우정": 50},
        "turn": 1,
        "role": "student",      # 지금 내가 조종하는 역할
        "fix_on": True,         # 돌발 상황 '해결 기능' 켜짐/꺼짐 (시연용)
        "swap_done": False,     # 3교시 자동 역할 바뀜이 이미 일어났는지
        "talked": [],           # 오늘 이미 대화한 친구 목록
        "alert": "",            # 화면에 잠깐 띄울 알림 문구
        "talk": {"student": "오늘도 학교 가자!", "future": "내가 옆에서 도와줄게."},
        "log": ["🌅 아침 등교! 빛나는 곳이나 친구 앞에서 Space를 눌러 보세요."],
    }


state = new_state()
history = []  # 행동하기 전 상태를 차곡차곡 쌓아 두는 곳 (되돌리기용)


def save_history():
    """지금 상태를 복사해서 history에 쌓는다. (deepcopy : 안쪽 딕셔너리까지 통째로 복사)"""
    history.append(copy.deepcopy(state))


def clamp(value):
    """점수가 0~100 사이를 넘지 않게 한다."""
    return max(0, min(100, value))


def other_role(role):
    """student ↔ future 반대 역할 이름을 돌려준다."""
    return "future" if role == "student" else "student"


def swap_roles(reason):
    """돌발 상황 : 주인공의 역할을 서로 바꾼다."""
    state["role"] = other_role(state["role"])
    new_name = ROLES[state["role"]]["name"]
    state["log"].append(f"🚨 {reason} 이제 나는 '{new_name}' 역할!")
    state["alert"] = f"역할 체인지! 이제 나는 {new_name}"
    if state["role"] == "future":
        state["talk"] = {"student": "어? 내가 왜 따라가고 있지…?", "future": "이번엔 네가 미래의 나야!"}
    else:
        state["talk"] = {"student": "휴, 원래대로 돌아왔다!", "future": "다시 내가 도와줄게."}


def grade_of(stats):
    """점수 합계로 등급(S/A/B/C)을 구한다."""
    total = sum(stats.values())  # sum : 목록의 숫자를 모두 더함
    for limit, grade in GRADES:
        if total >= limit:
            return grade


def view(event=None):
    """브라우저에 보낼 '화면용 정보'를 만든다.
    event : 방금 무슨 일이 있었는지 (연출용) - 예) {"type": "act", ...}
    """
    role = state["role"]

    # ★ 돌발 상황 해결 부분 ★
    # 해결 기능이 켜져 있으면 → 현재 역할에 맞는 버튼만 보냄
    # 꺼져 있으면(버그 재현)   → 역할이 바뀌어도 학생 버튼이 그대로 남음
    button_role = role if state["fix_on"] else "student"
    buttons = list(ROLES[button_role]["actions"])
    # 메뉴에 "체력 -12 · 성적 +15" 처럼 미리보기를 띄우려고 효과도 같이 보냄
    action_info = {name: ROLES[button_role]["actions"][name]["effect"] for name in buttons}

    ended = state["turn"] > MAX_TURN
    ending = ""
    if ended:
        # max(딕셔너리, key=딕셔너리.get) : 값이 가장 큰 키를 찾음
        best = max(state["stats"], key=state["stats"].get)
        ending = ENDINGS[best]

    # {**state, ...} : state의 내용을 그대로 펼쳐 넣고 몇 가지를 더 붙인 새 딕셔너리
    return jsonify({
        **state,
        "role_name": ROLES[role]["name"],
        "buttons": buttons,
        "action_info": action_info,
        "mismatch": (not state["fix_on"]) and role != "student",  # 버튼과 역할이 안 맞는 중인지
        "places": PLACES,
        "place_bonus": PLACE_BONUS,
        "max_turn": MAX_TURN,
        "can_undo": len(history) > 0,
        "ended": ended,
        "ending": ending,
        "grade": grade_of(state["stats"]),
        "event": event,
    })


def blocked(message):
    """행동을 막고 이유를 알려 준다. (점수는 바뀌지 않음)"""
    state["alert"] = message
    return view({"type": "blocked"})


# -------------------------------------------------------------
# 3) API 주소들 : 브라우저가 이 주소로 요청을 보낸다
#    @app.get / @app.post : "이 주소로 요청이 오면 아래 함수를 실행해"
#    GET  = 정보 달라고 할 때,  POST = 무언가 바꿔 달라고 할 때
# -------------------------------------------------------------

@app.get("/")
def home():
    """첫 화면 : templates/index.html 을 보여 준다."""
    return render_template("index.html")


@app.get("/api/state")
def get_state():
    """현재 상태 보기"""
    return view()


@app.post("/api/act")
def act():
    """기능 1+2 : 캐릭터가 서 있는 장소에서 행동하고 점수를 바꾼다."""
    # silent=True : 이상한 요청이 와도 오류 대신 None 을 돌려줌 → or {} 로 빈 딕셔너리 처리
    data = request.get_json(silent=True) or {}
    place = data.get("place")
    action = data.get("action")
    state["alert"] = ""

    if state["turn"] > MAX_TURN:
        return blocked("오늘 수업은 모두 끝났어요. R 키로 다시 시작!")
    if place not in PLACES:
        return blocked("교실·도서관 같은 장소 안에서만 행동할 수 있어요.")

    role = state["role"]
    my_actions = ROLES[role]["actions"]

    if action in my_actions:
        info = my_actions[action]
        bug = False
    elif state["fix_on"]:
        # ★ 해결 : 서버도 한 번 더 검사해서 역할에 안 맞는 행동은 막는다
        return blocked(f"⛔ 지금 역할({ROLES[role]['name']})은 '{action}'을(를) 할 수 없어요.")
    else:
        # ✗ 버그 재현 : 검사 없이 다른 역할의 행동이 실행돼 버림
        info = ROLES[other_role(role)]["actions"].get(action)
        if info is None:
            return blocked("알 수 없는 행동이에요.")
        bug = True

    # 피로 규칙 : 체력이 너무 떨어지는 행동은 못 함 → 쉬거나 체력 장소로 가야 함
    hp_change = info["effect"].get("체력", 0)  # .get(키, 기본값) : 키가 없으면 0
    if hp_change < 0 and state["stats"]["체력"] + hp_change < TIRED_LIMIT:
        return blocked("😵 너무 피곤해요! 쉬기를 하거나 운동장·보건실에서 체력을 채우세요.")

    save_history()  # 바꾸기 직전 상태를 저장해 둬야 되돌리기가 가능
    before = dict(state["stats"])  # 바뀌기 전 점수 (얼마나 변했는지 계산용)

    # 점수 바꾸기 : 행동 효과 + 장소 보너스
    for stat, amount in info["effect"].items():
        state["stats"][stat] = clamp(state["stats"][stat] + amount)
    bonus = PLACES[place]["bonus"]
    state["stats"][bonus] = clamp(state["stats"][bonus] + PLACE_BONUS)

    # 실제로 변한 양 (0~100 제한 때문에 효과와 다를 수 있음)
    delta = {k: state["stats"][k] - before[k] for k in before if state["stats"][k] != before[k]}

    # 캐릭터 대사 : 행동한 쪽이 say, 상대가 reply
    say, reply = info["say"], info["reply"]
    if bug:
        reply = "어?! 그건 내가 할 일인데?!"
    state["talk"] = {role: say, other_role(role): reply}
    state["log"].append(f"[{state['turn']}교시] {PLACES[place]['emoji']} {place}에서 "
                        f"'{action}' ({ROLES[role]['name']}) → {bonus} 보너스 +{PLACE_BONUS}")
    if bug:
        state["log"].append(f"⚠️ 버그! {ROLES[role]['name']} 역할인데 학생 버튼 '{action}'이 눌렸어요.")
        state["alert"] = "⚠️ 버그 재현: 역할은 바뀌었는데 버튼이 그대로예요!"

    state["turn"] += 1

    # 돌발 상황 : 3교시가 시작될 때 한 번 자동으로 역할이 바뀜
    swapped = False
    if state["turn"] == SWAP_TURN and not state["swap_done"]:
        state["swap_done"] = True
        swap_roles("쉬는 시간 종이 울리자 몸이 뒤바뀌었다!")
        swapped = True

    if state["turn"] > MAX_TURN:
        state["log"].append("🔔 하루 끝! 엔딩을 확인하세요.")

    state["log"] = state["log"][-40:]  # 기록은 최근 40줄만 남김
    return view({"type": "act", "actor": role, "action": action, "say": say,
                 "reply": reply, "delta": delta, "bug": bug, "swapped": swapped})


@app.post("/api/talk")
def talk():
    """친구(NPC)와 대화 : 하루에 한 번만 점수 보너스. 교시(턴)는 지나가지 않는다."""
    data = request.get_json(silent=True) or {}
    npc = data.get("npc")
    state["alert"] = ""
    if npc not in NPCS:
        return blocked("그런 친구는 없어요.")

    first = npc not in state["talked"] and state["turn"] <= MAX_TURN
    delta = {}
    if first:
        save_history()                      # 점수가 바뀌니까 되돌리기용으로 저장
        stat = NPCS[npc]
        before = state["stats"][stat]
        state["stats"][stat] = clamp(before + TALK_BONUS)
        delta = {stat: state["stats"][stat] - before}
        state["talked"].append(npc)
        state["log"].append(f"💬 {npc}와(과) 이야기했다 → {stat} +{TALK_BONUS}")
    return view({"type": "talk", "npc": npc, "first": first, "delta": delta})


@app.post("/api/swap")
def swap():
    """돌발 상황 재현 버튼 : 언제든 역할을 직접 바꿔 볼 수 있다."""
    state["alert"] = ""
    if state["turn"] > MAX_TURN:
        return blocked("하루가 끝났어요. R 키로 다시 시작!")
    save_history()
    swap_roles("[역할 바꾸기]로 역할이 뒤바뀌었다!")
    return view({"type": "swap"})


@app.post("/api/undo")
def undo():
    """기능 3-1 : 바로 전 상태로 되돌린다."""
    if not history:
        return blocked("더 되돌릴 기록이 없어요.")
    # state = ... 로 새로 만들면 다른 함수가 보는 state와 달라지므로
    # 안의 내용만 비우고(clear) 옛 내용으로 채운다(update)
    state.clear()
    state.update(history.pop())  # pop() : 리스트 맨 끝 하나를 꺼내면서 지움
    state["alert"] = "↩ 한 단계 되돌렸어요."
    return view({"type": "undo"})


@app.post("/api/reset")
def reset():
    """기능 3-2 : 처음부터 다시 시작 (해결 기능 켜짐/꺼짐 설정은 유지)"""
    fix_on = state["fix_on"]
    state.clear()
    state.update(new_state())
    state["fix_on"] = fix_on
    history.clear()
    return view({"type": "reset"})


@app.post("/api/fix")
def set_fix():
    """시연용 스위치 : 돌발 상황 '해결 기능'을 켜고 끈다."""
    data = request.get_json(silent=True) or {}
    on = bool(data.get("on"))
    state["fix_on"] = on
    state["alert"] = "✅ 해결 기능 켜짐 : 역할에 맞는 행동만 나와요." if on \
        else "⚠️ 해결 기능 꺼짐 : 역할이 바뀌어도 행동 목록이 안 바뀌어요. (버그 재현)"
    state["log"].append(state["alert"])
    return view({"type": "fix"})


# -------------------------------------------------------------
# 4) 서버 켜기
#    if __name__ == "__main__" : 이 파일을 직접 실행했을 때만 아래를 실행
#    (바탕화면의 한웅.py 처럼 다른 파일이 import 할 때는 실행되지 않음)
#    debug=True : 코드를 고치면 서버가 자동으로 다시 켜지고, 오류를 자세히 보여 줌
# -------------------------------------------------------------
if __name__ == "__main__":
    print("브라우저에서 http://127.0.0.1:5000 을 열어 주세요. (끄기: Ctrl + C)")
    app.run(debug=True)
