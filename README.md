# The Last Wanderer · 末路行者

2D 像素風武士動作平台遊戲 Demo（HTML5 Canvas + 原生 JavaScript，無任何外部依賴）。
實作 GDD v1.0 的第一階段範圍：第一章「霧隱山道」完整關卡。

## 如何遊玩

直接用瀏覽器開啟 `index.html` 即可（不需要伺服器）。
若想用本機伺服器：

```bash
python serve.py
```

然後開啟 http://localhost:8765

`serve.py` 會要求瀏覽器不要快取。若改用 `python -m http.server`，更新程式後瀏覽器可能混用新舊版本的 .js，
導致開始遊戲後黑屏；遇到時按 Ctrl + F5 強制重新整理即可。

| 按鍵 | 功能 |
|---|---|
| A / D 或 ← → | 移動 |
| Space | 跳躍（長按跳得更高） |
| 空中 Space | 二段跳（需先取得「天狗之羽」） |
| ↓ + Space | 穿越木板平台 |
| J | 揮刀（連按最多三段連擊，任何一段後不再按就收刀） |
| ↑ + J | 上劈 |
| 空中 ↓ + J | 下劈（命中敵人或尖刺會向上彈起） |
| 按住 J | 蓄力斬：揮刀後持續按住蓄力，放開時斬出劍氣並向前突進（需先取得「居合之卷」） |
| 蓄滿後按住 W，放開 J | 螺旋斬：原地旋身騰起，連斬周圍三次（每次 1 傷害，最後一斬把敵人甩開），也能斬開冰壁；旋轉期間不會被接觸傷害 |
| K | 衝刺：短暫無敵，空中每次滯空限一次（需先取得「疾風之履」） |
| L | 殘影視界：看見過去的世界 4.5 秒（需先取得「殘影之眼」） |
| I | 風縛：圍巾抓住風鈴飛過去、拉動鈴緒、把妖怪拉近（需先取得「蒼風之結」） |
| ESC / P | 暫停 |
| M | 靜音 |

## 已實作內容

- **核心**：Fixed Timestep（60Hz）主迴圈、動作導向的 InputManager、遊戲狀態機（MAIN_MENU / PLAYING / PAUSED / PLAYER_HURT / GAME_OVER / VICTORY）
- **移動**：加減速、Coyote Time、Jump Buffer、Variable Jump Height、單向平台與向下穿越
- **物理碰撞**：重力、分軸 AABB 圖塊碰撞、尖刺判定
- **戰鬥**：長刀揮砍（AABB Hitbox、每次揮砍同一敵人只命中一次）、擊退、Hit Pause、畫面震動、受傷無敵時間
- **三段連擊**：橫斬 → 反手上撩 → 踏步橫掃收尾（傷害 2、擊退更遠）；揮刀中再按 J 預約下一擊，收刀後 0.3 秒內再按也能接續；不再按就在該段結束時直接收刀
- **三方向攻擊**：橫斬、上劈、空中下劈；下劈命中敵人或尖刺會彈起（pogo），並恢復二段跳與衝刺
- **能力道具**（依取得順序；每個能力取得後，緊接著就有一段非它不可的關卡）：
  - 天狗之羽（B 區岩壁頂端，主線必經）→ 二段跳；之後的六格深谷需要二段跳
  - 疾風之履（C 區中段，主線必經）→ 衝刺（K）：期間無敵，可穿越敵人，空中每次滯空限一次；之後的八格深谷與八格尖刺坑需要二段跳 + 空中衝刺
  - 居合之卷（D 區入口，主線必經）→ 蓄力斬：蓄力 0.5 秒，劍氣傷害 2、可穿透敵人，突進期間短暫無敵；之後的冰壁只有蓄力斬與劍氣斬得開
  - 殘影之眼（D 區後段，主線必經）→ 殘影視界（L）：
    - 畫面由獨眼向外褪色，過去崩塌的木橋與平台重新顯現並可踩踏，也看得見妖怪幾秒前的移動軌跡
    - 持續 4.5 秒，最後 1.2 秒輪廓閃爍提醒，結束後冷卻 1.2 秒；結束時站在過去平台上會直接落下
    - 之後的斷橋深谷與消失的平台（各十四格寬）只能在過去的世界中通過
    - 平常過去的位置偶爾會閃過微光，暗示那裡曾經有路
  - 蒼風之結（E 區入口，主線必經）→ 風縛（I）：圍巾是劍客身體的一部分，延伸出去抓住遠方的東西
    - 風鈴：被拉過去，到了風鈴旁自動放開並保留速度（按 Space 提早放開會再躍起）；抓住時恢復二段跳與空中衝刺，可以在空中連續抓下一個風鈴、改變方向
    - 鈴緒：拉動後打開相連的石門
    - 妖怪：拉到劍客面前並硬直 0.6 秒，方便接連段
    - 射程 250px，只抓前方與正上方，地形擋住視線時抓不到；目前會抓到的目標有四角準星標示
    - 之後的十三格風鈴深谷、鈴緒石門、七格高斷崖都需要風縛
  - 魂之器 ×3（選拿，生命上限 +1）：各自藏在需要不同能力的地方
    - C 區土丘上方的高台（二段跳）
    - D 區岩棚下被冰壁封住的小洞窟（蓄力斬）
    - E 區神社前只存在於過去的高台（殘影視界）
  - 撿到的能力立即存檔，死亡或重來都不會失去
  - 新增能力：在 `js/entities/Pickup.js` 的 `ABILITIES` 加一筆定義，再到關卡資料的 `pickups` 放置
- **冰壁**：實心的冰塊，一般攻擊會被彈開；蓄力斬或劍氣命中時，相連的冰塊會一起碎裂
- **石門**：實心，拉動對應的鈴緒後整扇升起消失
- **隱藏區域**：關卡資料的 `secrets` 平常畫成一般岩壁，旁邊的冰壁被斬開或玩家走進去時才淡出現形
- **可擊破的物件**：陶罐（一擊碎裂）與雪堆（兩擊打散，第一擊會縮小）
  - 橫斬、上劈、下劈、劍氣都能擊破；下劈命中也會彈起
  - 部分物件裡藏著魂火，碰到可恢復 1 點生命（生命全滿時會留在原地）
  - 死亡或從檢查點重來時會恢復原狀；新增方式見 `data/level01.js` 的 `breakables` 與 `js/entities/Breakable.js`
- **角色**：玩家 FSM（IDLE / RUN / JUMP / FALL / ATTACK / HURT / DEATH / DODGE）與 Sprite Sheet 動畫
- **敵人**：森林妖怪（巡邏、轉身避開斷崖/牆/尖刺、接觸傷害、受擊、死亡）
- **關卡**：A–E 五個區域（全長 363 格）、6 個石燈籠檢查點（LocalStorage 存檔，可從主選單繼續）、廢棄神社終點
- **跑酷挑戰**（`data/parkour01.js`「風之試煉」，通關第一章後從主選單解鎖）
  - 所有能力一開始就全開，計時跑到終點鳥居；最佳紀錄與本篇分開保存
  - 墜落或碰到尖刺不扣生命，改為回到最後點燃的石燈籠並計一次失誤（計時不停）；被妖怪打倒則照常可從檢查點重來
  - 石燈籠不會寫入本篇存檔；暫停選單可從起點重新挑戰
  - 高難度賽道，全程只有兩座石燈籠：
    - A：四格深谷落在三格窄地、在最高點二段跳才搆得到的石柱、八格深谷，以及十六格尖刺長坑（二段跳 + 衝刺 → 下劈尖刺彈起 → 再二段跳 + 衝刺）
    - B：斬開冰壁後，在 4.5 秒的殘影視界內連跳四塊只存在於過去的平台（下方全是尖刺）
    - C：二十格深谷連續抓三個風鈴、鈴緒石門、抓風鈴登上斷崖
    - D：從斷崖躍過十格深谷（落點就在妖怪身邊），再越過尖刺坑抵達鳥居
- **表現**：程序化像素美術、多層視差背景、寒霧、飄雪、粒子、Web Audio 合成音效與風聲
- **pixelfx 特效**（[patch-gg/pixelfx](https://github.com/patch-gg/pixelfx)，MIT）：
  - 三連擊的動作取自 pixelfx 的 `moves/sword-combo`：斜劈、交叉雙斬、雙手重劈。姿勢由 `node tools/sample_combo.mjs <pixelfx 資料夾>` 取樣到 `data/swordcombo.js`，在 `js/art/Sprites.js` 的 `comboPose()` 放大 2 倍轉套到劍客身上（另用 240×160 的畫格）
  - 節奏：`Player.js` 的 `COMBO_TIMING` 只取 pixelfx 時間軸上「刀舉到最高 → 出刀後停住」那一段，壓縮到遊戲的「開始、判定開始、收刀」；第一、二擊 0.24 秒、收尾 0.32 秒，劍客原地揮刀不前後位移
  - 刀光：三連擊用對應的 pixelfx 刀光（斜劈、冰藍色交叉雙斬、冰藍色雙手重劈）；上劈、下劈把斜劈的刀光轉 90 度
  - 命中：一般命中是打擊火花，連段收尾與螺旋斬最後一斬是爆擊火花；一般攻擊砍到冰壁是格擋火花
  - 傷害數字（-1、-2）從敵人頭上彈出；1.2 秒內連續命中兩次以上，畫面右上顯示金色連擊數（最多 x20）
  - 刀光從 act 資料的命中時間開始播，命中停頓時定格在最亮的那一格；圖檔還沒載入時自動退回程式畫的刀光
  - 特效素材由 `python tools/build_fx.py <pixelfx 資料夾>` 匯出到 `assets/fx/` 與 `data/fxsheets.js`；換特效或換色改該腳本的 `SHEETS`
- **UI**：HP、關卡名稱、計時、可點擊的暫停鈕、區域標題、告示牌提示、通關統計與最佳紀錄

## 專案結構

```text
index.html
css/            main.css, game.css
data/level01.js 關卡資料（JSON 格式，以 <script> 載入以支援 file://）
data/parkour01.js 跑酷挑戰的賽道資料（格式相同）
data/fxsheets.js  pixelfx 特效的 sprite sheet 資料（由 tools/build_fx.py 產生）
assets/fx/      pixelfx 特效圖檔，以及 pixelfx 的 LICENSE 與 NOTICE
tools/build_fx.py 從 pixelfx 匯出特效
tools/sample_combo.mjs 取樣 pixelfx 三連擊的姿勢
data/swordcombo.js 三連擊的姿勢資料（由 tools/sample_combo.mjs 產生）
js/
  main.js, Game.js
  core/         GameLoop, InputManager, GameState, Storage
  systems/      Physics, Collision, Animation, Combat, Effects, FxSheets, Audio, Vision
  entities/     Entity, Player, Enemy, Pickup, Projectile
  world/        Tilemap, Camera, Level, Background
  ui/           HUD, Menu
  art/          Sprites（程序化生成 Sprite Sheet、圖塊與道具）
```

所有模組都是一般 `<script>`（非 ES Module），載入順序寫在 `index.html`，所以能直接雙擊開啟。

## 與 GDD 的差異

- **美術**：`assets/` 目前沒有圖檔，所有美術由 `js/art/Sprites.js` 在執行時繪製。
  之後換成 Aseprite 匯出的 PNG 時，只需讓 `SpriteSheet` 改讀圖片，其他系統不用改。
- **關卡資料**：使用 `data/level01.js` 而非 `level01.json`，因為 `file://` 下瀏覽器會阻擋 `fetch()`。
- **陷阱規則**：碰到尖刺或掉入深谷會扣 1 HP，並回到最後的安全落腳點；HP 歸零則 Game Over，可從最後的檢查點重來。

## 調整手感

數值集中在幾個常數物件：

- `PLAYER_CONFIG`（`js/entities/Player.js`）：速度、跳躍力、Coyote / Buffer 時間、攻擊判定、無敵時間
- `ENEMY_CONFIG`（`js/entities/Enemy.js`）
- `PHYSICS`（`js/systems/Physics.js`）：重力、最大落下速度
- `VISION_CONFIG`（`js/systems/Vision.js`）：殘影視界的持續時間、冷卻與閃爍提醒
