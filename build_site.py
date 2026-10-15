# =============================================================
# build_site.py - 인터넷 공개용(GitHub Pages) 사이트 만들기
# -------------------------------------------------------------
# web/ 폴더의 게임을 "서버 없이 열리는" 파일 묶음(site/ 폴더)으로 바꾼다.
#   1. templates/index.html 의 {{ url_for(...) }} 를 평범한 주소(static/...)로 바꾸고
#   2. 파이썬 서버 대신 규칙을 계산하는 local-api.js 를 끼워 넣고
#   3. static 폴더를 통째로 복사한다.
# GitHub 에 올리면 .github/workflows/pages.yml 이 이 파일을 자동으로 실행한다.
# 직접 실행 :  python build_site.py   → site/index.html 이 생김
# =============================================================

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).parent
WEB = ROOT / "web"
# 만들 폴더 : 보통은 site/, 다른 곳에 만들고 싶으면  python build_site.py <폴더>
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "site"


def main():
    # 예전에 만든 site 폴더가 있으면 지우고 새로 만든다
    if OUT.exists():
        shutil.rmtree(OUT, ignore_errors=True)   # OneDrive 가 잡고 있으면 남은 파일 위에 덮어씀
    shutil.copytree(WEB / "static", OUT / "static", dirs_exist_ok=True)

    html = (WEB / "templates" / "index.html").read_text(encoding="utf-8")

    # {{ url_for('static', filename='game.js') }}  →  static/game.js
    # re.sub(찾을 모양, 바꿀 내용, 글) : 정규식(글자 모양 규칙)으로 찾아서 바꾸기
    html = re.sub(r"\{\{\s*url_for\('static',\s*filename='([^']+)'\)\s*\}\}", r"static/\1", html)

    # anime.js 보다 먼저 local-api.js 를 불러오게 끼워 넣기
    html = html.replace('<script src="static/anime.js">',
                        '<script src="static/local-api.js"></script>\n  <script src="static/anime.js">')

    if "{{" in html:
        raise SystemExit("❌ 바꾸지 못한 {{ }} 가 남아 있어요. index.html 을 확인하세요.")

    (OUT / "index.html").write_text(html, encoding="utf-8")
    print("✅ 공개용 사이트를 만들었어요 →", OUT / "index.html")


if __name__ == "__main__":
    main()
