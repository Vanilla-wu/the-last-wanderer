"""
從 pixelfx 匯出遊戲用的特效 sprite sheet：assets/fx/*.png 與 data/fxsheets.js

用法（需要 Node 18 以上）：
    git clone https://github.com/patch-gg/pixelfx.git <資料夾>
    python tools/build_fx.py <pixelfx 資料夾>

要換特效、換色或增減連擊數，改下面的 SHEETS 後重新執行即可。
tools/pixelfx/ 裡是本專案自己修改過的 pixelfx 特效，匯出前會先複製進 pixelfx 的 src/fx/。
"""
import json, os, shutil, subprocess, sys, tempfile

if len(sys.argv) < 2:
    sys.exit(__doc__)
PFX = os.path.abspath(sys.argv[1])
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(tempfile.gettempdir(), 'tlw_fxbuild')

ICE = ["#212f6b", "#2c58aa", "#3a8bd8", "#62c8f4", "#b8c9e8", "#e8f1ff", "#ffffff"]
GOLD = ["#1a1205", "#3d2a0a", "#70501a", "#b08a2f", "#f5c84c", "#ffe3a8", "#fff4d6", "#ffffff"]

# 遊戲中的名稱 -> (pixelfx id, 選項[, fps])
SHEETS = {
    'slash': ('melee/sword-slash', {}),                    # 三連擊第一擊：斜劈；轉 90 度成上劈 / 下劈
    'cross': ('melee/double-slash', {'palette': ICE}),     # 三連擊第二擊：交叉雙斬（換成冰藍色）
    'cleave': ('melee/clean-cleave', {'palette': ICE}),    # 三連擊第三擊：雙手重劈（拿掉碎裂地板的版本，換成冰藍色）
    'hitSpark': ('impacts/hit-spark', {}),
    'crit': ('impacts/crit-hit', {}),                      # 收尾、螺旋斬最後一斬
    'parry': ('impacts/parry', {}),                        # 一般攻擊砍到冰壁
}
for n in (1, 2):
    SHEETS[f'dmg{n}'] = ('ui/damage-number', {'text': f'-{n}'})
for n in range(2, 21):
    SHEETS[f'combo{n}'] = ('ui/combo-counter', {'count': n, 'palette': GOLD}, 20)   # 20 fps：檔案小一點

# 本專案修改過的特效（tools/pixelfx/<分類>/<名稱>.js）
CUSTOM = os.path.join(GAME, 'tools', 'pixelfx')
for root, _, files in os.walk(CUSTOM):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), CUSTOM)
        shutil.copy(os.path.join(root, f), os.path.join(PFX, 'src', 'fx', rel))

shutil.rmtree(OUT, ignore_errors=True)
dst_dir = os.path.join(GAME, 'assets', 'fx')
shutil.rmtree(dst_dir, ignore_errors=True)
os.makedirs(dst_dir)
meta = {}
for name, (fid, opts, *fps) in SHEETS.items():
    out = os.path.join(OUT, name)
    cmd = ['node', 'tools/render.mjs', fid, '--sheet', '--no-actor', '--out', out]
    if opts:
        cmd += ['--opts', json.dumps(opts)]
    if fps:
        cmd += ['--fps', str(fps[0])]
    r = subprocess.run(cmd, cwd=PFX, capture_output=True, text=True)
    if r.returncode:
        sys.exit(r.stdout + r.stderr)
    base = os.path.join(out, *fid.split('/'))
    leaf = fid.split('/')[-1]
    m = json.load(open(os.path.join(base, leaf + '.json'), encoding='utf-8'))['meta']['pixelfx']
    shutil.copy(os.path.join(base, leaf + '.png'), os.path.join(dst_dir, name + '.png'))
    entry = {k: m[k] for k in ('fps', 'frames', 'frameSize', 'columns', 'pivot')}
    entry['source'] = fid
    if 'act' in m:
        entry['hits'] = [{k: h[k] for k in ('t', 'freeze', 'shake', 'amp') if k in h} for h in m['act'].get('hits', [])]
    meta[name] = entry

for f in ('LICENSE', 'NOTICE.md'):
    shutil.copy(os.path.join(PFX, f), os.path.join(dst_dir, 'pixelfx-' + f))

body = json.dumps(meta, ensure_ascii=False, indent=2)
js = f"""/**
 * pixelfx 特效的 sprite sheet 資料（由 tools/build_fx.py 從 pixelfx 匯出，勿手動修改）
 *
 * 來源：https://github.com/patch-gg/pixelfx（MIT），授權見 assets/fx/pixelfx-LICENSE 與 pixelfx-NOTICE.md
 * 圖檔在 assets/fx/<名稱>.png；pivot 是特效錨點（角色腳底或擊中點），特效預設朝右。
 */
window.FX_SHEETS = {body};
"""
open(os.path.join(GAME, 'data', 'fxsheets.js'), 'w', encoding='utf-8').write(js)
total = sum(os.path.getsize(os.path.join(dst_dir, f)) for f in os.listdir(dst_dir))
print(len(meta), 'sheets,', round(total / 1024), 'KB')
