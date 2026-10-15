# =============================================================
# 미래의 나와 함께하는 하루 학교 시뮬레이션  -  1단계 (가장 작은 실행 버전)
# -------------------------------------------------------------
# 1단계에서 되는 것
#   기능 1: 장소와 행동을 고른다
#   기능 2: [실행] 버튼을 누르면 체력·성적·우정 점수가 바뀌고 결과가 나온다
# 아직 없는 것 (다음 단계에서 추가)
#   2단계: 되돌리기 / 초기화
#   3단계: 돌발 상황 - 주인공의 역할이 서로 바뀐다
# =============================================================

# import : 다른 사람이 만들어 둔 도구 묶음(모듈)을 가져와 쓰겠다는 뜻
# tkinter : 파이썬에 기본으로 들어 있는 "창(윈도우) 만들기" 도구. 따로 설치 필요 없음
# as tk  : 긴 이름 대신 tk 라는 짧은 별명으로 부르겠다는 뜻
import tkinter as tk
from tkinter import ttk  # ttk : 조금 더 깔끔하게 생긴 버튼·선택상자 모음

# -------------------------------------------------------------
# 1) 데이터 : 게임 규칙을 숫자로 정리해 둔 곳
#    규칙을 코드 여기저기에 흩어 두지 않고 한 곳에 모아 두면
#    나중에 숫자만 바꿔서 쉽게 수정할 수 있다.
# -------------------------------------------------------------

# 리스트(list) [ ] : 여러 값을 순서대로 담는 상자
PLACES = ["교실", "도서관", "급식실", "운동장", "보건실"]

# 딕셔너리(dict) { 키: 값 } : 이름표(키)를 붙여서 값을 담는 상자
# 행동마다 점수가 얼마나 바뀌는지 적어 둠 (+는 올라감, -는 내려감)
ACTIONS = {
    "공부하기":  {"체력": -10, "성적": +15, "우정": 0},
    "친구 돕기": {"체력": -5,  "성적": 0,   "우정": +15},
    "쉬기":      {"체력": +15, "성적": -5,  "우정": 0},
}

# 장소 보너스 : 그 장소와 잘 어울리는 점수가 5 더 오름
PLACE_BONUS = {
    "교실": "성적",
    "도서관": "성적",
    "급식실": "우정",
    "운동장": "체력",
    "보건실": "체력",
}

# 미래의 나가 해 주는 한마디 (행동별)
FUTURE_TALK = {
    "공부하기":  "미래의 나: \"그때 공부한 게 나중에 진짜 도움 돼!\"",
    "친구 돕기": "미래의 나: \"그 친구, 10년 뒤에도 연락하는 사이야.\"",
    "쉬기":      "미래의 나: \"쉬는 것도 실력이야. 잘했어.\"",
}

# 하루는 5교시(5턴)로 끝남
MAX_TURN = 5


# -------------------------------------------------------------
# 2) 상태 : 게임이 진행되면서 바뀌는 값들
# -------------------------------------------------------------
state = {"체력": 50, "성적": 50, "우정": 50, "턴": 1}


# -------------------------------------------------------------
# 3) 기능 함수
#    def 함수이름(): 는 "이 이름으로 할 일 묶음을 만든다"는 뜻.
#    버튼을 누르면 연결된 함수가 실행된다.
# -------------------------------------------------------------

def clamp(value):
    """점수가 0보다 작거나 100보다 커지지 않게 막는다."""
    # min(a, b)는 둘 중 작은 값, max(a, b)는 둘 중 큰 값
    return max(0, min(100, value))


def update_score_label():
    """점수판 글자를 현재 state 값으로 다시 그린다."""
    # f"..." : 문자열 안에 {변수}를 넣으면 그 값으로 바뀌어 들어감
    score_label.config(
        text=f"⏰ {state['턴']}교시 / {MAX_TURN}교시     "
             f"💪 체력 {state['체력']}     📚 성적 {state['성적']}     🤝 우정 {state['우정']}"
    )


def write_result(message):
    """결과 영역(텍스트 상자) 맨 아래에 한 줄을 추가한다."""
    result_box.config(state="normal")      # 잠깐 쓰기 가능하게 열고
    result_box.insert("end", message + "\n")  # "end" = 맨 끝에 붙이기, "\n" = 줄바꿈
    result_box.see("end")                  # 스크롤을 맨 아래로
    result_box.config(state="disabled")    # 사용자가 직접 못 고치게 다시 잠금


def run_turn():
    """[실행] 버튼을 눌렀을 때 : 선택한 장소·행동에 따라 점수를 바꾼다. (기능 2)"""
    # 하루가 끝났으면 더 진행하지 않음
    if state["턴"] > MAX_TURN:
        write_result("오늘 수업은 모두 끝났어요.")
        return  # return : 함수를 여기서 끝냄

    place = place_var.get()    # .get() : 선택상자에 지금 골라진 값을 꺼냄
    action = action_var.get()

    # 행동에 따른 점수 변화 적용
    changes = ACTIONS[action]
    # for 키, 값 in 딕셔너리.items() : 딕셔너리 안의 항목을 하나씩 꺼내 반복
    for stat, amount in changes.items():
        state[stat] = clamp(state[stat] + amount)

    # 장소 보너스 적용
    bonus_stat = PLACE_BONUS[place]
    state[bonus_stat] = clamp(state[bonus_stat] + 5)

    # 결과 보여주기
    write_result(f"[{state['턴']}교시] {place}에서 '{action}' → {bonus_stat} 보너스 +5")
    write_result("   " + FUTURE_TALK[action])

    state["턴"] += 1  # += 1 : 원래 값에 1을 더해서 다시 저장

    # 마지막 교시가 끝나면 하루 결과 정리
    if state["턴"] > MAX_TURN:
        write_result("🔔 하루 끝! 최종 점수를 확인하세요.")

    update_score_label()


# -------------------------------------------------------------
# 4) 화면(UI) 만들기
#    위에서 아래로 : 제목 → 입력/선택 영역 → 실행 버튼 → 점수판 → 결과 영역
# -------------------------------------------------------------

window = tk.Tk()                       # 창 하나 만들기
window.title("미래의 나와 함께하는 하루 학교")  # 창 위쪽 제목줄 글자
window.geometry("620x480")             # 창 크기 : 가로 x 세로 (픽셀)

FONT = ("맑은 고딕", 11)               # 글꼴 이름과 크기

# --- 제목 / 현재 역할 표시 (3단계에서 역할이 바뀌면 이 글자가 바뀜) ---
role_label = tk.Label(window, text="🎒 현재 역할: 학생 (현재의 나)",
                      font=("맑은 고딕", 14, "bold"), fg="navy")
role_label.pack(pady=10)  # pack() : 창에 위에서부터 차곡차곡 붙이기, pady = 위아래 여백

# --- 입력/선택 영역 ---
# Frame : 여러 위젯을 한 줄로 묶어 두는 투명한 상자
select_frame = tk.Frame(window)
select_frame.pack(pady=5)

tk.Label(select_frame, text="장소:", font=FONT).grid(row=0, column=0, padx=5)
# StringVar : 화면의 선택값과 연결된 "글자 변수". 사용자가 바꾸면 자동으로 값이 바뀜
place_var = tk.StringVar(value=PLACES[0])
# Combobox : 아래로 펼쳐지는 선택 목록, state="readonly"는 직접 타이핑 금지
place_box = ttk.Combobox(select_frame, textvariable=place_var,
                         values=PLACES, state="readonly", width=10, font=FONT)
# grid(row, column) : 표처럼 행·열 위치를 정해서 붙이기
place_box.grid(row=0, column=1, padx=5)

tk.Label(select_frame, text="행동:", font=FONT).grid(row=0, column=2, padx=(20, 5))
action_var = tk.StringVar(value="공부하기")
# 라디오버튼 : 여러 개 중 하나만 고를 수 있는 동그라미 버튼
# list(ACTIONS) : 딕셔너리의 키(행동 이름)만 뽑아서 리스트로 만듦
# enumerate : 순서 번호(i)와 값(name)을 같이 꺼내 줌
for i, name in enumerate(list(ACTIONS)):
    tk.Radiobutton(select_frame, text=name, variable=action_var,
                   value=name, font=FONT).grid(row=0, column=3 + i)

# --- 실행 버튼 ---
# command=run_turn : 버튼을 누르면 run_turn 함수를 실행하라는 뜻 (괄호 () 없이 이름만 씀)
run_button = tk.Button(window, text="▶ 실행", font=FONT, width=12,
                       bg="#4CAF50", fg="white", command=run_turn)
run_button.pack(pady=8)

# --- 점수판 ---
score_label = tk.Label(window, text="", font=("맑은 고딕", 12), bg="#f0f0f0",
                       width=60, pady=6)
score_label.pack(pady=5)

# --- 결과 영역 ---
result_box = tk.Text(window, height=12, width=70, font=("맑은 고딕", 10),
                     state="disabled")
result_box.pack(padx=10, pady=10)

# 처음 화면에 점수와 안내 문구 표시
update_score_label()
write_result("장소와 행동을 고르고 [▶ 실행]을 눌러 보세요.")

# mainloop() : 창을 띄워 두고 사용자가 버튼을 누르기를 계속 기다림
# (이 줄이 없으면 창이 바로 꺼짐)
window.mainloop()
