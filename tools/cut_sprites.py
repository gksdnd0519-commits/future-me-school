# =============================================================
# cut_sprites.py - 캐릭터 시트 그림을 한 명씩 잘라 게임용 그림(png)으로 만든다
# -------------------------------------------------------------
# 실행 :  python tools/cut_sprites.py <시트 그림 경로>
# 결과 :  web/static/art/<캐릭터>.png  (배경이 투명한 그림)
#         web/static/art/sprites.json  (발 위치·얼굴 위치 정보 → 게임이 크기를 맞출 때 사용)
#
# 하는 일
#   1. 그림 가장자리에서부터 "배경색과 비슷한 색"을 따라가며 투명하게 만든다 (flood fill)
#      → 캐릭터 안쪽의 흰 옷은 테두리 선에 막혀서 지워지지 않는다
#   2. 캐릭터 번호 칸마다 잘라 낸다
#   3. 칸 가운데를 지나지 않는 조각(옆 캐릭터의 소매 등)은 지운다
# 필요한 것 : Pillow  (python -m pip install pillow)
# =============================================================

import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "static" / "art"

# 시트에서 각 번호 캐릭터의 가운데 x 좌표 (그림 아래 번호 위치)
TOP_X = [85, 235, 382, 530, 680, 832, 985, 1140, 1290, 1440]      # 01 ~ 10
BOTTOM_X = [85, 233, 382, 530, 678, 843, 995, 1145, 1283, 1437]   # 11 ~ 20
TOP_Y, BOTTOM_Y = (0, 458), (490, 972)                            # 번호 글자는 빼고 자름

# 게임 캐릭터 ↔ 시트 번호
CAST = {
    "seorin": 1, "hayul": 2, "sion": 3, "bom": 6, "han": 8, "yuri": 9,
    "student": 14, "doyun": 16, "kim": 17, "future": 18,
}
TOL = 42          # 배경색과 이 정도까지 비슷하면 배경으로 봄
# 옆 캐릭터와 겹치는 칸은 경계를 직접 정함 : 번호 → (왼쪽, 오른쪽)
SLOT_OVERRIDE = {9: (1216, 1318), 14: (462, 602), 18: (1080, 1222), 8: (1068, 1205)}


def slot(num):
    """번호 → (가운데 x, 왼쪽 경계, 오른쪽 경계, 위, 아래)"""
    xs, (y0, y1) = (TOP_X, TOP_Y) if num <= 10 else (BOTTOM_X, BOTTOM_Y)
    i = (num - 1) % 10
    left = 0 if i == 0 else (xs[i - 1] + xs[i]) // 2
    right = 1536 if i == 9 else (xs[i] + xs[i + 1]) // 2
    left, right = SLOT_OVERRIDE.get(num, (left, right))
    return xs[i], left, right, y0, y1


def background_mask(img, bg):
    """가장자리에서부터 배경과 비슷한 색을 따라가며 True(배경) 표시"""
    w, h = img.size
    px = img.load()
    near = lambda p: abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) <= TOL
    mask = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    # 캐릭터 사이 빈칸(번호 줄)과 캐릭터 사이 세로줄에서도 시작
    for x in range(w):
        q.append((x, 470)); q.append((x, 980))
    for xs in (TOP_X, BOTTOM_X):
        for i in range(9):
            for y in range(h):
                q.append(((xs[i] + xs[i + 1]) // 2, y))
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or mask[y][x] or not near(px[x, y]):
            continue
        mask[y][x] = True
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return mask


def cut(img, mask, num):
    cx, left, right, y0, y1 = slot(num)
    w, h = right - left, y1 - y0
    src = img.load()
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    o = out.load()
    solid = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if not mask[y + y0][x + left]:
                r, g, b = src[x + left, y + y0]
                o[x, y] = (r, g, b, 255)
                solid[y][x] = True

    # 칸 가운데 세로 띠를 지나는 덩어리만 남김 (옆 캐릭터 조각 제거)
    keep = [[False] * w for _ in range(h)]
    band = range(max(0, cx - left - 22), min(w, cx - left + 22))
    q = deque((x, y) for y in range(h) for x in band if solid[y][x])
    while q:
        x, y = q.popleft()
        if not (0 <= x < w and 0 <= y < h) or keep[y][x] or not solid[y][x]:
            continue
        keep[y][x] = True
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    for y in range(h):
        for x in range(w):
            if solid[y][x] and not keep[y][x]:
                o[x, y] = (0, 0, 0, 0)
            elif keep[y][x]:
                # 배경과 닿은 가장자리는 살짝 투명하게 → 테두리가 부드럽게
                edge = any(0 <= x + dx < w and 0 <= y + dy < h and not keep[y + dy][x + dx]
                           for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                if edge:
                    r, g, b, _ = o[x, y]
                    o[x, y] = (r, g, b, 170)

    # 다리 사이처럼 바깥과 막혀 있는 배경 조각 지우기 (아래쪽 절반에서, 배경색과 아주 비슷한 덩어리만)
    bg = img.getpixel((5, 5))
    close = lambda p: abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) <= 26
    seen = [[False] * w for _ in range(h)]
    for sy in range(h // 2, h):
        for sx in range(w):
            if seen[sy][sx] or o[sx, sy][3] == 0 or not close(o[sx, sy]):
                continue
            blob, q = [], deque([(sx, sy)])
            while q:
                x, y = q.popleft()
                if not (0 <= x < w and h // 3 <= y < h) or seen[y][x] or o[x, y][3] == 0 or not close(o[x, y]):
                    continue
                seen[y][x] = True
                blob.append((x, y))
                q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            if len(blob) > 40:
                for x, y in blob:
                    o[x, y] = (0, 0, 0, 0)

    box = out.getbbox()
    sprite = out.crop(box)
    sw, sh = sprite.size
    a = sprite.load()
    # 발 위치 : 맨 아래 4% 줄의 불투명한 점들의 가운데
    feet = [x for y in range(int(sh * 0.96), sh) for x in range(sw) if a[x, y][3] > 200]
    # 얼굴 위치 : 위에서 5~11% 줄의 불투명한 점들의 가운데 (머리)
    head = [x for y in range(int(sh * 0.05), int(sh * 0.11)) for x in range(sw) if a[x, y][3] > 200]
    meta = {
        "w": sw, "h": sh,
        "footX": round(sum(feet) / len(feet), 1) if feet else sw / 2,
        "headX": round(sum(head) / len(head), 1) if head else sw / 2,
        "headY": round(sh * 0.085, 1),      # 얼굴 가운데 높이 (위에서)
        "headR": round(sh * 0.07, 1),       # 얼굴 크기 (반지름 정도)
    }
    return sprite, meta


def main():
    if len(sys.argv) < 2:
        print("사용법 : python tools/cut_sprites.py <시트 그림 경로>")
        return
    img = Image.open(sys.argv[1]).convert("RGB")
    bg = img.getpixel((5, 5))
    print("배경색", bg, "→ 배경 찾는 중…")
    mask = background_mask(img, bg)
    OUT.mkdir(parents=True, exist_ok=True)
    metas = {}
    for key, num in CAST.items():
        sprite, meta = cut(img, mask, num)
        sprite.save(OUT / f"{key}.png")
        metas[key] = meta
        print(f"  {num:02d} → {key}.png  {meta['w']}×{meta['h']}")
    (OUT / "sprites.json").write_text(json.dumps(metas, ensure_ascii=False, indent=1), encoding="utf-8")
    print("✅ 완료 :", OUT)


if __name__ == "__main__":
    main()
