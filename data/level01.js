/**
 * 第一章：霧隱山道（Misty Mountain Trail）關卡資料
 *
 * 內容就是 JSON 格式，只是以 <script> 載入而不是 fetch()：
 * 直接雙擊 index.html（file:// 協定）時，瀏覽器會阻擋 fetch 讀取本機 JSON，
 * 用這種方式不需要架設本機伺服器也能遊玩。
 *
 * 座標單位皆為 Tile（32 × 32 px）。地圖共 15 列，row = 「地面頂端」所在列，角色站在該列上方。
 *
 * terrain：[類型, 起始欄, 結束欄, 頂端列, 底端列(可省略=到底)]
 *   ground 地面、stone 岩壁/石階、platform 單向木板（只佔一列）、spike 尖刺（只佔一列）
 *   ice 冰壁（實心，只有蓄力後的衝刺斬與旋風斬能斬開）、gate 石門（實心，拉動對應的鈴緒後打開）
 *   past 過去的木橋 / 平台（只佔一列）：只在殘影視界開啟時可踩踏
 * enemies：[欄, 地面列, 巡邏半徑(Tile), HP(可省略)]
 * secrets：隱藏區域 { x0, x1, top, bottom }（Tile）：平常畫成實心岩壁蓋住裡面的東西，
 *   旁邊的冰壁被斬開、或玩家走進去時才會現形
 * breakables：可擊破的物件，type 為 pot（陶罐）或 snow（雪堆）；drop: 'soul' 擊破後掉出魂火（恢復 1 HP）
 *
 * 能力的取得順序與對應的關卡設計：
 *   天狗之羽（二段跳）→ 六格深谷；魂之器 1 放在只有二段跳搆得到的高台
 *   疾風之履（衝刺）  → 八格深谷與八格尖刺坑（二段跳 + 空中衝刺）
 *   居合之卷（衝刺斬、旋風斬）→ 冰壁；魂之器 2 封在另一道冰壁後的小洞窟
 *   殘影之眼（殘影視界）→ 斷橋深谷與消失的平台；魂之器 3 在神社前只存在於過去的高台上
 *   蒼風之結（風縛）  → 風鈴深谷（連續抓風鈴）、鈴緒石門、抓住高處風鈴登上斷崖
 *
 * anchors：圍巾能抓的固定物 { type: 'hook' 風鈴 | 'lever' 鈴緒, x, row, opens: [欄, 列] }
 *   lever 的 opens 指向石門（gate）中的任一格，拉動後整扇石門打開
 */
window.LEVEL_DATA = {
  id: 'level01',
  chapter: '第一章',
  name: '霧隱山道',
  nameEn: 'Misty Mountain Trail',
  intro: '在寒霧中甦醒的獨眼劍客，踏上了尋找歸途的旅程。',
  tileSize: 32,
  cols: 363,
  rows: 15,
  playerStart: [5, 12],

  terrain: [
    // A 甦醒之地：移動與跳躍
    ['stone', 0, 1, 0],
    ['ground', 2, 34, 12],
    ['ground', 20, 24, 11],
    // B 斷裂山道：攀爬，取得天狗之羽
    ['ground', 38, 42, 11],
    ['stone', 46, 50, 10],
    ['ground', 54, 59, 12],
    ['stone', 55, 56, 10],
    ['platform', 58, 59, 8],
    ['stone', 60, 61, 7],
    ['ground', 62, 66, 12],
    // 67–72：六格寬的深谷，需要二段跳
    // C 妖怪森林：戰鬥教學，取得疾風之履
    ['ground', 73, 93, 12],
    ['ground', 94, 100, 10],
    ['platform', 97, 99, 6],      // 高台（二段跳才搆得到）：魂之器 1
    ['ground', 101, 118, 12],
    // 119–126：八格寬的深谷，需要二段跳 + 空中衝刺
    ['ground', 127, 140, 12],
    // 141–143：三格小斷崖
    ['ground', 144, 149, 12],
    ['ground', 150, 157, 13], ['spike', 150, 157, 12],   // 八格尖刺坑：衝刺越過，或下劈尖刺彈過去
    // D 寒霧深谷：取得居合之卷，冰壁與尖刺
    ['ground', 158, 186, 12],
    ['stone', 176, 177, 0, 6], ['ice', 176, 177, 7, 11],  // 第一道冰壁：要用衝刺斬斬開
    ['ground', 187, 189, 13], ['spike', 187, 189, 12],
    ['stone', 190, 191, 11],
    ['ground', 192, 194, 13], ['spike', 192, 194, 12],
    ['ground', 195, 209, 12],
    ['platform', 201, 202, 10],
    ['stone', 204, 209, 8, 8],                             // 岩棚：上方是前進的路
    ['ice', 204, 204, 9, 11],                              // 岩棚下的冰封洞窟：魂之器 2
    ['stone', 210, 212, 8],
    ['ground', 213, 222, 11],
    ['spike', 217, 217, 10],
    ['ground', 223, 234, 14], ['spike', 223, 234, 13],
    ['platform', 224, 225, 10],
    ['platform', 228, 229, 9],
    ['platform', 232, 233, 10],
    ['ground', 235, 244, 11],
    // 245–258：十四格寬的斷橋深谷，只有殘影視界中的過去木橋能通過
    ['past', 245, 258, 11],
    ['ground', 259, 266, 11],
    // 267–280：十四格寬的深谷，只有過去的平台能踩
    ['past', 269, 270, 9],
    ['past', 273, 274, 8],
    ['past', 277, 278, 9],
    // E 廢棄神社
    ['ground', 281, 300, 11],
    ['past', 289, 290, 8],        // 過去的高台（隱藏路線）：魂之器 3
    ['past', 293, 294, 5],
    // 301–313：十三格寬的風鈴深谷，用圍巾連續抓住兩個風鈴飛過去
    ['ground', 314, 336, 11],
    ['stone', 327, 328, 0, 6], ['gate', 327, 327, 7, 10],   // 石門：拉動前方高處的鈴緒打開
    ['stone', 337, 344, 4],                                  // 七格高的斷崖：抓住上方的風鈴登頂
    ['stone', 345, 362, 8]
  ],

  anchors: [
    { type: 'hook', x: 304, row: 6 },
    { type: 'hook', x: 311, row: 6 },
    { type: 'lever', x: 324, row: 5, opens: [327, 8] },
    { type: 'hook', x: 335, row: 2 }
  ],

  enemies: [
    [86, 12, 4],
    [97, 10, 2],
    [112, 12, 2],
    [116, 12, 1],
    [134, 12, 3],
    [146, 12, 1],
    [162, 12, 2],
    [181, 12, 3],
    [198, 12, 1],
    [220, 11, 1],
    [241, 11, 2],
    [262, 11, 2],
    [289, 11, 2],
    [298, 11, 2, 4],
    [319, 11, 2],
    [324, 11, 1],
    [331, 11, 2, 4]
  ],

  checkpoints: [
    [78, 12],
    [129, 12],
    [168, 12],
    [214, 11],
    [283, 11],
    [316, 11]
  ],

  exit: [354, 8, 4],

  secrets: [
    { x0: 205, x1: 209, top: 9, bottom: 11 }   // 岩棚下的冰封洞窟（魂之器 2）
  ],

  breakables: [
    // A
    { type: 'pot', x: 12, row: 12 },
    { type: 'pot', x: 13, row: 12 },
    { type: 'snow', x: 22, row: 11 },
    { type: 'snow', x: 29, row: 12 },
    // B
    { type: 'pot', x: 41, row: 11, drop: 'soul' },
    { type: 'snow', x: 49, row: 10 },
    { type: 'snow', x: 63, row: 12 },
    // C
    { type: 'pot', x: 80, row: 12 },
    { type: 'pot', x: 81, row: 12 },
    { type: 'snow', x: 89, row: 12 },
    { type: 'snow', x: 95, row: 10 },
    { type: 'pot', x: 103, row: 12 },
    { type: 'snow', x: 109, row: 12 },
    { type: 'pot', x: 138, row: 12, drop: 'soul' },
    { type: 'snow', x: 145, row: 12 },
    { type: 'pot', x: 160, row: 12 },
    { type: 'pot', x: 164, row: 12, drop: 'soul' },
    // D
    { type: 'snow', x: 179, row: 12 },
    { type: 'pot', x: 183, row: 12, drop: 'soul' },
    { type: 'snow', x: 197, row: 12 },
    { type: 'pot', x: 215, row: 11, drop: 'soul' },
    { type: 'snow', x: 236, row: 11 },
    { type: 'pot', x: 243, row: 11 },
    { type: 'pot', x: 260, row: 11, drop: 'soul' },
    { type: 'snow', x: 264, row: 11 },
    // E
    { type: 'pot', x: 286, row: 11, drop: 'soul' },
    { type: 'pot', x: 287, row: 11 },
    { type: 'snow', x: 291, row: 11 },
    { type: 'pot', x: 321, row: 11 },
    { type: 'snow', x: 333, row: 11 },
    { type: 'pot', x: 341, row: 4, drop: 'soul' },
    { type: 'pot', x: 349, row: 8 },
    { type: 'pot', x: 360, row: 8, drop: 'soul' }
  ],

  // 能力道具：id 不可重複、type 對應 js/entities/Pickup.js 的 ABILITIES
  // required：主線必拿的道具，使用整欄判定，玩家從上方跳過也會撿到，避免卡關
  pickups: [
    { id: 'tengu-feather', type: 'doubleJump', x: 61, row: 7, required: true },
    { id: 'soul-vessel-1', type: 'heartUp', x: 98, row: 6 },
    { id: 'wind-sandals', type: 'dash', x: 106, row: 12, required: true },
    { id: 'iai-scroll', type: 'chargeSlash', x: 170, row: 12, required: true },
    { id: 'soul-vessel-2', type: 'heartUp', x: 207, row: 12 },
    { id: 'afterimage-eye', type: 'vision', x: 238, row: 11, required: true },
    { id: 'soul-vessel-3', type: 'heartUp', x: 293.5, row: 5 },
    { id: 'wind-knot', type: 'scarf', x: 296, row: 11, required: true }
  ],

  zones: [
    { x: 0, id: 'A', name: '甦醒之地', en: 'Awakening Ground', fog: 0.35 },
    { x: 30, id: 'B', name: '斷裂山道', en: 'Broken Mountain Path', fog: 0.4 },
    { x: 77, id: 'C', name: '妖怪森林', en: 'Spirit Forest', fog: 0.5 },
    { x: 167, id: 'D', name: '寒霧深谷', en: 'Frozen Mist Valley', fog: 0.95 },
    { x: 285, id: 'E', name: '廢棄神社', en: 'Abandoned Shrine', fog: 0.55 }
  ],

  hints: [
    { x: 8, row: 12, text: 'A / D 或 ← → 移動' },
    { x: 17, row: 12, text: 'Space 跳躍 · 長按跳得更高' },
    { x: 31, row: 12, text: '小心斷崖 · 墜落會損失生命' },
    { x: 53, row: 12, text: '踏上石階與木板攀越岩壁 · ↓ + Space 可穿越木板' },
    { x: 65, row: 12, text: '深谷太寬？跳起後在空中再按一次 Space' },
    { x: 81, row: 12, text: 'J 揮刀 · 連按三段連擊 · 石燈籠可記錄進度' },
    { x: 91, row: 12, text: '↑ + J 上劈 · 空中 ↓ + J 下劈（命中可彈起）' },
    { x: 108, row: 12, text: 'K 衝刺 · 短暫無敵，可穿越敵人' },
    { x: 117, row: 12, text: '更寬的深谷 · 二段跳後在空中按 K 衝刺' },
    { x: 148, row: 12, text: '尖刺坑 · 衝刺越過，或下劈尖刺彈過去' },
    { x: 172, row: 12, text: '冰壁 · 揮刀後按住 J 蓄力，放開衝刺斬能斬開冰壁' },
    { x: 185, row: 12, text: '空中 ↓ + J 下劈尖刺可彈起' },
    { x: 200, row: 12, text: '踏上木板登上岩棚 · 這道冰壁後面隱約透著光' },
    { x: 242, row: 11, text: 'L 殘影視界 · 斷橋曾經橫跨這座深谷' },
    { x: 265, row: 11, text: '這裡也曾有路 · 再次開啟殘影視界' },
    { x: 299, row: 11, text: '深谷上方懸著風鈴 · 按 I 用圍巾抓住它，放開後再抓下一個' },
    { x: 317, row: 11, text: 'I 也能把妖怪拉到身邊' },
    { x: 322, row: 11, text: '石門緊閉 · 用圍巾拉動上方的鈴緒' },
    { x: 332, row: 11, text: '抓住高處的風鈴 · 被拉到半空時按住 → 落到斷崖上' },
    { x: 346, row: 8, text: '廢棄神社就在前方' }
  ],

  props: [
    { type: 'pine', x: 3, row: 12 },
    { type: 'jizo', x: 10, row: 12 },
    { type: 'pine2', x: 13, row: 12 },
    { type: 'rock', x: 15, row: 12 },
    { type: 'pine', x: 27, row: 12 },
    { type: 'pine2', x: 33, row: 12 },
    { type: 'rock', x: 40, row: 11 },
    { type: 'pine', x: 48, row: 10 },
    { type: 'pine2', x: 64, row: 12 },
    { type: 'pine', x: 74, row: 12 },
    { type: 'lantern', x: 75, row: 12 },
    { type: 'pine2', x: 83, row: 12 },
    { type: 'pine', x: 89, row: 12 },
    { type: 'pine2', x: 96, row: 10 },
    { type: 'pine', x: 101, row: 12 },
    { type: 'lantern', x: 102, row: 12 },
    { type: 'pine2', x: 111, row: 12 },
    { type: 'pine', x: 131, row: 12 },
    { type: 'pine2', x: 137, row: 12 },
    { type: 'pine', x: 159, row: 12 },
    { type: 'pine2', x: 171, row: 12 },
    { type: 'rock', x: 184, row: 12 },
    { type: 'pine2', x: 196, row: 12 },
    { type: 'pine', x: 214, row: 11 },
    { type: 'rock', x: 221, row: 11 },
    { type: 'pine2', x: 240, row: 11 },
    { type: 'pine', x: 262, row: 11 },
    { type: 'pine', x: 288, row: 11 },
    { type: 'pine2', x: 292, row: 11 },
    { type: 'lantern', x: 300, row: 11 },
    { type: 'pine', x: 318, row: 11 },
    { type: 'rock', x: 325, row: 11 },
    { type: 'pine2', x: 330, row: 11 },
    { type: 'pine', x: 340, row: 4 },
    { type: 'torii', x: 348, row: 8 },
    { type: 'lanternLit', x: 352, row: 8 },
    { type: 'shrine', x: 356, row: 8 },
    { type: 'lanternLit', x: 361, row: 8 }
  ]
};
