# =============================================================
# check_story.py - 대본(JSON) 형식 검사기
# -------------------------------------------------------------
# web/static/story/ 안의 대본 파일이 게임이 읽을 수 있는 모양인지 검사한다.
# 실행 :  python tools/check_story.py            (전체 검사)
#         python tools/check_story.py seorin     (한 파일만)
# 문제가 있으면 무엇이 틀렸는지 알려 주고, 없으면 대사 수를 세어 준다.
# =============================================================

import json
import sys
from pathlib import Path

STORY = Path(__file__).resolve().parent.parent / "web" / "static" / "story"

HEROINES = ["seorin", "yuri", "bom", "hayul", "sion"]
WHO = set(HEROINES) | {"me", "future", "doyun", "kim", "han", "narr"}
EXPR = {"normal", "happy", "surprised", "tired", "angry", "blush", "sad"}
PLACES = {"교실", "도서관", "급식실", "운동장", "보건실", "복도"}
BGS = {"classroom", "library", "cafeteria", "field", "infirmary", "hallway",
       "rooftop", "sunset", "night", "festival", "rain"}
STATS = {"체력", "성적", "우정"}
MAX_TEXT = 80
MIN_DAY = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
MIN_AFF = [0, 3, 6, 10, 14, 19, 24, 29, 34, 39, 44, 50]


class Checker:
    def __init__(self, name):
        self.name = name
        self.errors = []
        self.lines = 0
        self.choices = 0

    def err(self, where, msg):
        self.errors.append(f"[{self.name}] {where}: {msg}")

    def line_list(self, lines, where, allow_choice=True, min_len=1):
        if not isinstance(lines, list) or len(lines) < min_len:
            self.err(where, f"대사 목록이 비었거나 {min_len}줄보다 적음")
            return
        for i, ln in enumerate(lines):
            p = f"{where}[{i}]"
            if not isinstance(ln, dict):
                self.err(p, "대사는 { } 모양이어야 함")
                continue
            if "choice" in ln:
                if not allow_choice:
                    self.err(p, "선택지 안에 또 선택지를 넣을 수 없음")
                    continue
                opts = ln["choice"]
                if not isinstance(opts, list) or not 2 <= len(opts) <= 3:
                    self.err(p, "choice 는 선택지 2~3개")
                    continue
                self.choices += 1
                for k, o in enumerate(opts):
                    q = f"{p}.choice[{k}]"
                    if not isinstance(o.get("text"), str) or not 1 <= len(o["text"]) <= 40:
                        self.err(q, "text 는 1~40자 문자열")
                    if not isinstance(o.get("aff"), int) or not -3 <= o["aff"] <= 6:
                        self.err(q, "aff 는 -3~6 정수")
                    self.line_list(o.get("lines"), f"{q}.lines", allow_choice=False)
                continue
            who, text = ln.get("who"), ln.get("text")
            if who not in WHO:
                self.err(p, f"who 가 이상함: {who!r}")
            if not isinstance(text, str) or not text.strip():
                self.err(p, "text 가 비었음")
            elif len(text) > MAX_TEXT:
                self.err(p, f"text 가 {len(text)}자 (최대 {MAX_TEXT})")
            if "expr" in ln and ln["expr"] not in EXPR:
                self.err(p, f"expr 가 이상함: {ln['expr']!r}")
            extra = set(ln) - {"who", "text", "expr"}
            if extra:
                self.err(p, f"모르는 키: {extra}")
            self.lines += 1

    def convo_list(self, convos, where, min_count):
        if not isinstance(convos, list) or len(convos) < min_count:
            self.err(where, f"대화 묶음이 {min_count}개 이상 필요")
            return
        for i, c in enumerate(convos):
            self.line_list(c, f"{where}[{i}]", allow_choice=False, min_len=2)


def check_heroine(hid):
    c = Checker(hid)
    path = STORY / f"{hid}.json"
    if not path.exists():
        c.err("파일", f"{path.name} 없음")
        return c
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        c.err("JSON", str(e))
        return c
    for key in ["id", "name", "short", "title", "profile", "likes", "schedule", "chat", "hints", "events", "ending"]:
        if key not in d:
            c.err("맨 위", f"{key} 없음")
    if c.errors:
        return c
    if d["id"] != hid:
        c.err("id", f"{hid} 여야 함")
    if d["likes"] not in STATS:
        c.err("likes", "체력/성적/우정 중 하나")
    if not (isinstance(d["schedule"], list) and len(d["schedule"]) == 5 and all(p in PLACES for p in d["schedule"])):
        c.err("schedule", f"장소 5개 ({', '.join(sorted(PLACES))})")
    c.convo_list(d["chat"], "chat", 12)
    c.convo_list(d["hints"], "hints", 6)
    for i, h in enumerate(d.get("hints", [])):
        if not any(l.get("who") == "future" for l in h if isinstance(l, dict)):
            c.err(f"hints[{i}]", "미래의 나(future)가 한 번은 말해야 함")
    ev = d["events"]
    if not isinstance(ev, list) or len(ev) != 12:
        c.err("events", "이벤트는 정확히 12개")
    else:
        for k, e in enumerate(ev):
            w = f"events[{k}]"
            if e.get("id") != f"{hid}_{k + 1:02d}":
                c.err(w, f"id 는 {hid}_{k + 1:02d}")
            if e.get("min_day") != MIN_DAY[k]:
                c.err(w, f"min_day 는 {MIN_DAY[k]}")
            if e.get("min_aff") != MIN_AFF[k]:
                c.err(w, f"min_aff 는 {MIN_AFF[k]}")
            if e.get("bg") not in BGS:
                c.err(w, f"bg 는 {sorted(BGS)} 중 하나")
            if not isinstance(e.get("title"), str):
                c.err(w, "title 없음")
            need = e.get("need", {})
            if not isinstance(need, dict) or any(s not in STATS or not isinstance(v, int) for s, v in need.items()):
                c.err(w, "need 는 {\"성적\": 55} 모양")
            before = c.lines
            c.line_list(e.get("lines"), f"{w}.lines", min_len=20)
            if not any("choice" in l for l in e.get("lines", []) if isinstance(l, dict)):
                c.err(w, "선택지가 최소 1개 필요")
            if c.lines - before < 30:
                c.err(w, f"대사가 {c.lines - before}줄 (선택지 포함 30줄 이상)")
    end = d["ending"]
    if end.get("bg") not in BGS or not isinstance(end.get("title"), str):
        c.err("ending", "title, bg 필요")
    before = c.lines
    c.line_list(end.get("lines"), "ending.lines", allow_choice=False, min_len=40)
    return c


def check_common():
    c = Checker("common")
    path = STORY / "common.json"
    if not path.exists():
        c.err("파일", "common.json 없음")
        return c
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        c.err("JSON", str(e))
        return c
    c.line_list(d.get("prologue"), "prologue", allow_choice=False, min_len=30)
    days = d.get("days", {})
    for n in range(1, 15):
        day = days.get(str(n))
        if not isinstance(day, dict):
            c.err("days", f"{n}일째 없음")
            continue
        if day.get("bg") not in BGS:
            c.err(f"days.{n}", "bg 필요")
        c.line_list(day.get("morning"), f"days.{n}.morning", allow_choice=False, min_len=5)
        c.line_list(day.get("night"), f"days.{n}.night", allow_choice=False, min_len=6)
    c.convo_list(d.get("swap"), "swap", 6)
    c.convo_list(d.get("unswap"), "unswap", 4)
    c.line_list(d.get("festival"), "festival", allow_choice=False, min_len=20)
    ne = d.get("normal_endings", {})
    for s in STATS:
        c.line_list(ne.get(s), f"normal_endings.{s}", allow_choice=False, min_len=15)
    c.convo_list(d.get("doyun_chat"), "doyun_chat", 10)
    c.convo_list(d.get("kim_chat"), "kim_chat", 5)
    c.convo_list(d.get("han_chat"), "han_chat", 5)
    return c


def main():
    targets = sys.argv[1:] or ["common"] + HEROINES
    total, bad = 0, False
    for t in targets:
        c = check_common() if t == "common" else check_heroine(t)
        if c.errors:
            bad = True
            print(f"❌ {t}: 문제 {len(c.errors)}개")
            for e in c.errors[:40]:
                print("   ", e)
        else:
            print(f"✅ {t}: 대사 {c.lines}줄, 선택지 {c.choices}개")
        total += c.lines
    print(f"합계 대사 {total}줄")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
