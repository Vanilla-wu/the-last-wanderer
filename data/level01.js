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
 * dummies：訓練用木樁 [欄, 地面列]，打不壞、不造成傷害，沿路讓玩家練習剛學到的招式
 * skulls：火焰骷髏 [欄, 列]，飄浮的位置（骷髏中心所在的格子）；玩家靠近會蓄勢後弱追蹤俯衝
 * secrets：隱藏區域 { x0, x1, top, bottom }（Tile）：平常畫成實心岩壁蓋住裡面的東西，
 *   旁邊的冰壁被斬開、或玩家走進去時才會現形
 * skullKing：骷髏王 { x 出生欄, row 地面列, arena: [左欄, 右欄] }，只在這塊空地裡活動，劍客走進空地才開戰
 * knifeSkulls：持刀骷髏 [欄, 地面列]
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
  cols: 395,
  rows: 15,
  playerStart: [5, 12],

  terrain: [
    // A 甦醒之地：移動與跳躍
    ['stone', 0, 1, 0],
    ['ground', 2, 34, 12],
    ['ground', 20, 24, 11],
    // B 斷裂山道：骷髏王的空地，之後攀爬、取得天狗之羽
    ['ground', 38, 69, 12],                                // 38–69：骷髏王的大空地（暫放）；左邊是斷崖，右邊接一階石坡
    ['ground', 70, 74, 11],
    ['stone', 78, 82, 10],
    ['ground', 86, 91, 12],
    ['stone', 87, 88, 10],
    ['platform', 90, 91, 8],
    ['stone', 92, 93, 7],
    ['ground', 94, 98, 12],
    // 99–104：六格寬的深谷，需要二段跳
    // C 妖怪森林：戰鬥教學，取得疾風之履
    ['ground', 105, 125, 12],
    ['ground', 126, 132, 10],
    ['platform', 129, 131, 6],      // 高台（二段跳才搆得到）：魂之器 1
    ['ground', 133, 150, 12],
    // 151–158：八格寬的深谷，需要二段跳 + 空中衝刺
    ['ground', 159, 172, 12],
    // 173–175：三格小斷崖
    ['ground', 176, 181, 12],
    ['ground', 182, 189, 13], ['spike', 182, 189, 12],   // 八格尖刺坑：衝刺越過，或下劈尖刺彈過去
    // D 寒霧深谷：取得居合之卷，冰壁與尖刺
    ['ground', 190, 218, 12],
    ['stone', 208, 209, 0, 6], ['ice', 208, 209, 7, 11],  // 第一道冰壁：要用衝刺斬斬開
    ['ground', 219, 221, 13], ['spike', 219, 221, 12],
    ['stone', 222, 223, 11],
    ['ground', 224, 226, 13], ['spike', 224, 226, 12],
    ['ground', 227, 241, 12],
    ['platform', 233, 234, 10],
    ['stone', 236, 241, 8, 8],                             // 岩棚：上方是前進的路
    ['ice', 236, 236, 9, 11],                              // 岩棚下的冰封洞窟：魂之器 2
    ['stone', 242, 244, 8],
    ['ground', 245, 254, 11],
    ['spike', 249, 249, 10],
    ['ground', 255, 266, 14], ['spike', 255, 266, 13],
    ['platform', 256, 257, 10],
    ['platform', 260, 261, 9],
    ['platform', 264, 265, 10],
    ['ground', 267, 276, 11],
    // 277–290：十四格寬的斷橋深谷，只有殘影視界中的過去木橋能通過
    ['past', 277, 290, 11],
    ['ground', 291, 298, 11],
    // 299–312：十四格寬的深谷，只有過去的平台能踩
    ['past', 301, 302, 9],
    ['past', 305, 306, 8],
    ['past', 309, 310, 9],
    // E 廢棄神社
    ['ground', 313, 332, 11],
    ['past', 321, 322, 8],        // 過去的高台（隱藏路線）：魂之器 3
    ['past', 325, 326, 5],
    // 333–345：十三格寬的風鈴深谷，用圍巾連續抓住兩個風鈴飛過去
    ['ground', 346, 368, 11],
    ['stone', 359, 360, 0, 6], ['gate', 359, 359, 7, 10],   // 石門：拉動前方高處的鈴緒打開
    ['stone', 369, 376, 4],                                  // 七格高的斷崖：抓住上方的風鈴登頂
    ['stone', 377, 394, 8]
  ],

  anchors: [
    { type: 'hook', x: 336, row: 6 },
    { type: 'hook', x: 343, row: 6 },
    { type: 'lever', x: 356, row: 5, opens: [359, 8] },
    { type: 'hook', x: 367, row: 2 }
  ],

  enemies: [
    [118, 12, 4],
    [129, 10, 2],
    [144, 12, 2],
    [148, 12, 1],
    [166, 12, 3],
    [178, 12, 1],
    [194, 12, 2],
    [213, 12, 3],
    [230, 12, 1],
    [252, 11, 1],
    [273, 11, 2],
    [294, 11, 2],
    [321, 11, 2],
    [330, 11, 2, 4],
    [351, 11, 2],
    [356, 11, 1],
    [363, 11, 2, 4]
  ],

  dummies: [
    [28, 12],    // A：第一次揮刀
    [116, 12],    // C：三段連擊教學旁
    [124, 12],    // C：上劈、下劈教學旁
    [206, 12],   // D：取得居合之卷後，練衝刺斬與旋風斬
    [330, 11]    // E：取得蒼風之結後，練圍巾拉近
  ],

  skulls: [
    [229, 8],    // D 冰壁後的空地上空：第一次遇到，地形開闊好閃
    [353, 7],    // E 石門前，和地面的妖怪一起出現
    [384, 4]     // 神社前的平台上空
  ],

  // 骷髏王：x 出生欄、row 地面列、arena 活動的空地 [左欄, 右欄]（暫時放在 B 區入口）
  skullKing: { x: 60, row: 12, arena: [38, 69] },

  knifeSkulls: [
    [140, 12],   // C 深谷前：追到崖邊就停下，跳過深谷就甩得掉
    [169, 12],   // C 三格小斷崖前
    [317, 11]    // E 神社前的空地
  ],

  checkpoints: [
    [110, 12],
    [161, 12],
    [200, 12],
    [246, 11],
    [315, 11],
    [348, 11]
  ],

  exit: [386, 8, 4],

  secrets: [
    { x0: 237, x1: 241, top: 9, bottom: 11 }   // 岩棚下的冰封洞窟（魂之器 2）
  ],

  breakables: [
    // A
    { type: 'pot', x: 12, row: 12 },
    { type: 'pot', x: 13, row: 12 },
    { type: 'snow', x: 22, row: 11 },
    { type: 'snow', x: 29, row: 12 },
    // B：骷髏王空地兩側各一個裝著魂火的陶罐
    { type: 'pot', x: 40, row: 12, drop: 'soul' },
    { type: 'pot', x: 68, row: 12, drop: 'soul' },
    { type: 'pot', x: 73, row: 11, drop: 'soul' },
    { type: 'snow', x: 81, row: 10 },
    { type: 'snow', x: 95, row: 12 },
    // C
    { type: 'pot', x: 112, row: 12 },
    { type: 'pot', x: 113, row: 12 },
    { type: 'snow', x: 121, row: 12 },
    { type: 'snow', x: 127, row: 10 },
    { type: 'pot', x: 135, row: 12 },
    { type: 'snow', x: 141, row: 12 },
    { type: 'pot', x: 170, row: 12, drop: 'soul' },
    { type: 'snow', x: 177, row: 12 },
    { type: 'pot', x: 192, row: 12 },
    { type: 'pot', x: 196, row: 12, drop: 'soul' },
    // D
    { type: 'snow', x: 211, row: 12 },
    { type: 'pot', x: 215, row: 12, drop: 'soul' },
    { type: 'snow', x: 229, row: 12 },
    { type: 'pot', x: 247, row: 11, drop: 'soul' },
    { type: 'snow', x: 268, row: 11 },
    { type: 'pot', x: 275, row: 11 },
    { type: 'pot', x: 292, row: 11, drop: 'soul' },
    { type: 'snow', x: 296, row: 11 },
    // E
    { type: 'pot', x: 318, row: 11, drop: 'soul' },
    { type: 'pot', x: 319, row: 11 },
    { type: 'snow', x: 323, row: 11 },
    { type: 'pot', x: 353, row: 11 },
    { type: 'snow', x: 365, row: 11 },
    { type: 'pot', x: 373, row: 4, drop: 'soul' },
    { type: 'pot', x: 381, row: 8 },
    { type: 'pot', x: 392, row: 8, drop: 'soul' }
  ],

  // 能力道具：id 不可重複、type 對應 js/entities/Pickup.js 的 ABILITIES
  // required：主線必拿的道具，使用整欄判定，玩家從上方跳過也會撿到，避免卡關
  pickups: [
    { id: 'tengu-feather', type: 'doubleJump', x: 93, row: 7, required: true },
    { id: 'soul-vessel-1', type: 'heartUp', x: 130, row: 6 },
    { id: 'wind-sandals', type: 'dash', x: 138, row: 12, required: true },
    { id: 'iai-scroll', type: 'chargeSlash', x: 202, row: 12, required: true },
    { id: 'soul-vessel-2', type: 'heartUp', x: 239, row: 12 },
    { id: 'afterimage-eye', type: 'vision', x: 270, row: 11, required: true },
    { id: 'soul-vessel-3', type: 'heartUp', x: 325.5, row: 5 },
    { id: 'wind-knot', type: 'scarf', x: 328, row: 11, required: true }
  ],

  zones: [
    { x: 0, id: 'A', name: '甦醒之地', en: 'Awakening Ground', fog: 0.35 },
    { x: 30, id: 'B', name: '斷裂山道', en: 'Broken Mountain Path', fog: 0.4 },
    { x: 109, id: 'C', name: '妖怪森林', en: 'Spirit Forest', fog: 0.5 },
    { x: 199, id: 'D', name: '寒霧深谷', en: 'Frozen Mist Valley', fog: 0.95 },
    { x: 317, id: 'E', name: '廢棄神社', en: 'Abandoned Shrine', fog: 0.55 }
  ],

  hints: [
    { x: 8, row: 12, text: 'A / D 或 ← → 移動' },
    { x: 17, row: 12, text: 'Space 跳躍 · 長按跳得更高' },
    { x: 26, row: 12, text: '訓練用木樁 · 打不壞，按 J 盡情練習' },
    { x: 31, row: 12, text: '小心斷崖 · 墜落會損失生命' },
    { x: 41, row: 12, text: '骷髏王的領地 · 跳過震波，等它撞牆暈眩再反擊' },
    { x: 85, row: 12, text: '踏上石階與木板攀越岩壁 · ↓ + Space 可穿越木板' },
    { x: 97, row: 12, text: '深谷太寬？跳起後在空中再按一次 Space' },
    { x: 113, row: 12, text: 'J 揮刀 · 連按三段連擊 · 石燈籠可記錄進度' },
    { x: 123, row: 12, text: '↑ + J 上劈 · 空中 ↓ + J 下劈（命中可彈起）' },
    { x: 140, row: 12, text: 'K 衝刺 · 短暫無敵，可穿越敵人' },
    { x: 149, row: 12, text: '更寬的深谷 · 二段跳後在空中按 K 衝刺' },
    { x: 180, row: 12, text: '尖刺坑 · 衝刺越過，或下劈尖刺彈過去' },
    { x: 204, row: 12, text: '冰壁 · 揮刀後按住 J 蓄力，放開衝刺斬能斬開冰壁' },
    { x: 217, row: 12, text: '空中 ↓ + J 下劈尖刺可彈起' },
    { x: 232, row: 12, text: '踏上木板登上岩棚 · 這道冰壁後面隱約透著光' },
    { x: 274, row: 11, text: 'L 殘影視界 · 斷橋曾經橫跨這座深谷' },
    { x: 297, row: 11, text: '這裡也曾有路 · 再次開啟殘影視界' },
    { x: 331, row: 11, text: '深谷上方懸著風鈴 · 按 I 用圍巾抓住它，放開後再抓下一個' },
    { x: 349, row: 11, text: 'I 也能把妖怪拉到身邊' },
    { x: 354, row: 11, text: '石門緊閉 · 用圍巾拉動上方的鈴緒' },
    { x: 364, row: 11, text: '抓住高處的風鈴 · 被拉到半空時按住 → 落到斷崖上' },
    { x: 378, row: 8, text: '廢棄神社就在前方' }
  ],

  props: [
    { type: 'pine', x: 3, row: 12 },
    { type: 'jizo', x: 10, row: 12 },
    { type: 'pine2', x: 13, row: 12 },
    { type: 'rock', x: 15, row: 12 },
    { type: 'pine', x: 27, row: 12 },
    { type: 'pine2', x: 33, row: 12 },
    { type: 'rock', x: 39, row: 12 },
    { type: 'pine', x: 44, row: 12 },
    { type: 'rock', x: 52, row: 12 },
    { type: 'pine2', x: 63, row: 12 },
    { type: 'rock', x: 72, row: 11 },
    { type: 'pine', x: 80, row: 10 },
    { type: 'pine2', x: 96, row: 12 },
    { type: 'pine', x: 106, row: 12 },
    { type: 'lantern', x: 107, row: 12 },
    { type: 'pine2', x: 115, row: 12 },
    { type: 'pine', x: 121, row: 12 },
    { type: 'pine2', x: 128, row: 10 },
    { type: 'pine', x: 133, row: 12 },
    { type: 'lantern', x: 134, row: 12 },
    { type: 'pine2', x: 143, row: 12 },
    { type: 'pine', x: 163, row: 12 },
    { type: 'pine2', x: 169, row: 12 },
    { type: 'pine', x: 191, row: 12 },
    { type: 'pine2', x: 203, row: 12 },
    { type: 'rock', x: 216, row: 12 },
    { type: 'pine2', x: 228, row: 12 },
    { type: 'pine', x: 246, row: 11 },
    { type: 'rock', x: 253, row: 11 },
    { type: 'pine2', x: 272, row: 11 },
    { type: 'pine', x: 294, row: 11 },
    { type: 'pine', x: 320, row: 11 },
    { type: 'pine2', x: 324, row: 11 },
    { type: 'lantern', x: 332, row: 11 },
    { type: 'pine', x: 350, row: 11 },
    { type: 'rock', x: 357, row: 11 },
    { type: 'pine2', x: 362, row: 11 },
    { type: 'pine', x: 372, row: 4 },
    { type: 'torii', x: 380, row: 8 },
    { type: 'lanternLit', x: 384, row: 8 },
    { type: 'shrine', x: 388, row: 8 },
    { type: 'lanternLit', x: 393, row: 8 }
  ]
};
