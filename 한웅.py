# =============================================================
# 한웅.py  -  "미래의 나와 하루 학교" 게임 실행기 (저장소 안 버전)
# -------------------------------------------------------------
# 이 파일을 실행하면
#   1. 게임 서버(web/app.py)를 켜고
#   2. 1.5초 뒤에 브라우저로 게임 화면을 자동으로 열어 준다.
#
# 실행 방법
#   - VS Code에서 이 파일을 열고 ▷ 버튼 (또는 Ctrl + F5)
#   - 또는 터미널에서 :  python 한웅.py
# 끄기 : 터미널에서 Ctrl + C (또는 검은 창 닫기)
#
# 게임 본체 파일 위치 :  이 파일 옆의 web 폴더
#   app.py               ← 게임 규칙 (백엔드)
#   templates/index.html ← 화면 뼈대
#   static/anime.js      ← 애니메이션풍 캐릭터 그림
#   static/game.js       ← 캐릭터 이동·대화·효과음
#   static/style.css     ← 꾸미기
# =============================================================

import socket        # 포트(가게 문 번호 같은 것)가 이미 쓰이는지 확인할 때 사용
import sys           # 파이썬이 모듈을 찾는 경로(sys.path)를 바꿀 때 사용
import threading     # "잠시 뒤에 브라우저 열기"를 서버와 동시에 하려고 사용
import webbrowser    # 기본 브라우저로 주소를 여는 도구 (파이썬 기본 포함)
from pathlib import Path  # 폴더·파일 경로를 쉽게 다루는 도구

PORT = 5000
URL = f"http://127.0.0.1:{PORT}"   # 127.0.0.1 = "내 컴퓨터 자신"이라는 뜻의 주소

# __file__ : 지금 이 파일(한웅.py)의 위치 → .parent : 그 파일이 있는 폴더(저장소 맨 위)
GAME_DIR = Path(__file__).parent / "web"


def port_in_use(port):
    """이미 다른 프로그램(예: 켜 둔 게임 서버)이 그 포트를 쓰는지 확인한다."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0   # 0 이면 연결 성공 = 사용 중


def main():
    # 1) 게임 폴더가 제자리에 있는지 확인
    if not (GAME_DIR / "app.py").exists():
        print("❌ 게임 폴더를 찾을 수 없어요:", GAME_DIR)
        input("엔터를 누르면 닫혀요...")
        return

    # 2) 이미 서버가 켜져 있으면 브라우저만 열고 끝
    if port_in_use(PORT):
        print("ℹ️ 게임 서버가 이미 켜져 있어요. 브라우저만 열게요 →", URL)
        webbrowser.open(URL)
        return

    # 3) Flask 가 설치돼 있는지 확인
    try:
        import flask  # noqa: F401  (설치 확인용으로만 가져옴)
    except ImportError:
        print("❌ Flask 가 설치되어 있지 않아요. 터미널에 아래를 입력하세요:")
        print("    python -m pip install -r requirements.txt")
        input("엔터를 누르면 닫혀요...")
        return

    # 4) 게임 폴더를 파이썬이 찾을 수 있게 등록하고 app.py 를 불러옴
    sys.path.insert(0, str(GAME_DIR))
    from app import app

    # 5) 1.5초 뒤 브라우저 열기 (threading.Timer : 정해진 시간 뒤 함수를 실행)
    threading.Timer(1.5, lambda: webbrowser.open(URL)).start()

    print("=" * 50)
    print("  ⏳ 미래의 나와 하루 학교")
    print(f"  브라우저가 자동으로 열려요 → {URL}")
    print("  끄려면 이 창에서 Ctrl + C")
    print("=" * 50)

    app.run(port=PORT, debug=False)


if __name__ == "__main__":
    main()
