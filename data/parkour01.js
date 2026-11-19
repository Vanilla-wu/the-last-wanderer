/**
 * 跑酷挑戰：風之試煉（通關第一章後解鎖）
 *
 * 格式與 level01.js 相同。所有能力一開始就全部開放，目標是用最短時間抵達終點。
 * 跑酷模式的規則（見 Game.js）：
 *   - 墜落或碰到尖刺不扣生命，直接回到最後點燃的石燈籠（計為一次失誤），計時不會停
 *   - 石燈籠不會寫入本篇的存檔
 *
 * 難度設計：每一段都接近能力的極限，而且全程只有兩座石燈籠。
 *   A 疾風起點：四格深谷落在三格寬的窄地、六格深谷落在石柱、八格深谷（二段跳 + 衝刺），
 *              最後是十六格的尖刺長坑：二段跳 + 衝刺後下劈尖刺彈起，再二段跳 + 衝刺才到得了對岸
 *   B 冰霧迴廊：斬開冰壁後，殘影視界中連跳四塊只存在於過去的平台（下方全是尖刺，視界只有 4.5 秒）
 *   C 風鈴峽谷：二十格深谷連續抓三個風鈴、鈴緒石門、抓風鈴登上七格斷崖
 *   D 終點神社：從斷崖躍過十格深谷，再越過尖刺坑抵達鳥居
 */
window.PARKOUR_DATA = {
  id: 'parkour01',
  chapter: '跑酷挑戰',
  name: '風之試煉',
  nameEn: 'Trial of the Wind',
  intro: '所有能力皆已開放 · 以最快的速度抵達終點的鳥居。',
  tileSize: 32,
  cols: 186,
  rows: 15,
  playerStart: [5, 11],

  terrain: [
    // A 疾風起點
    ['stone', 0, 1, 0],
    ['ground', 2, 12, 11],
    // 13–16：四格深谷
    ['ground', 17, 19, 11],                               // 三格寬的窄地
    // 20–25：六格深谷（二段跳）
    ['stone', 26, 27, 9],                                 // 兩格寬的石柱
    // 28–35：八格深谷（二段跳 + 衝刺）
    ['ground', 36, 40, 11],
    ['ground', 41, 56, 13], ['spike', 41, 56, 12],        // 十六格尖刺長坑：中途下劈尖刺彈起
    ['ground', 57, 64, 11],
    // B 冰霧迴廊
    ['stone', 65, 66, 0, 5], ['ice', 65, 66, 6, 10],      // 冰壁：衝刺斬或旋風斬斬開
    ['ground', 65, 70, 11],
    ['ground', 71, 88, 14], ['spike', 71, 88, 13],        // 尖刺上只有過去的平台
    ['past', 73, 74, 10],
    ['past', 77, 78, 9],
    ['past', 81, 82, 10],
    ['past', 85, 86, 9],
    ['ground', 89, 100, 11],
    // C 風鈴峽谷：101–120 二十格深谷，三個風鈴
    ['ground', 121, 136, 11],
    ['stone', 127, 128, 0, 6], ['gate', 127, 127, 7, 10], // 石門：拉動前方高處的鈴緒
    ['stone', 137, 144, 4],                               // 七格高的斷崖
    // D 終點神社：145–154 十格深谷
    ['stone', 155, 160, 6],
    ['ground', 161, 165, 7], ['spike', 161, 165, 6],      // 五格尖刺坑
    ['stone', 166, 185, 6]
  ],

  anchors: [
    { type: 'hook', x: 104, row: 6 },
    { type: 'hook', x: 111, row: 6 },
    { type: 'hook', x: 118, row: 6 },
    { type: 'lever', x: 124, row: 5, opens: [127, 8] },
    { type: 'hook', x: 135, row: 2 }
  ],

  enemies: [
    [38, 11, 1],
    [60, 11, 2],
    [94, 11, 3],
    [132, 11, 2],
    [158, 6, 1],
    [172, 6, 3, 4]
  ],

  checkpoints: [
    [62, 11],
    [124, 11]
  ],

  exit: [179, 6, 4],

  breakables: [
    { type: 'snow', x: 9, row: 11 },
    { type: 'pot', x: 98, row: 11, drop: 'soul' },
    { type: 'pot', x: 168, row: 6, drop: 'soul' }
  ],

  pickups: [],

  zones: [
    { x: 0, id: 'A', name: '疾風起點', en: 'Gale Start', fog: 0.35 },
    { x: 65, id: 'B', name: '冰霧迴廊', en: 'Frozen Corridor', fog: 0.85 },
    { x: 101, id: 'C', name: '風鈴峽谷', en: 'Wind Bell Gorge', fog: 0.5 },
    { x: 145, id: 'D', name: '終點神社', en: 'Finish Shrine', fog: 0.45 }
  ],

  hints: [
    { x: 7, row: 11, text: '計時開始 · 以最快速度抵達終點鳥居' },
    { x: 39, row: 11, text: '太長了？在尖刺上空 ↓ + J 下劈彈起' },
    { x: 69, row: 11, text: '視界只有 4.5 秒 · 不要停下' },
    { x: 99, row: 11, text: '三個風鈴 · 一口氣抓過去' }
  ],

  props: [
    { type: 'pine', x: 3, row: 11 },
    { type: 'jizo', x: 11, row: 11 },
    { type: 'rock', x: 18, row: 11 },
    { type: 'lantern', x: 58, row: 11 },
    { type: 'pine2', x: 63, row: 11 },
    { type: 'pine', x: 90, row: 11 },
    { type: 'rock', x: 96, row: 11 },
    { type: 'pine2', x: 122, row: 11 },
    { type: 'pine', x: 131, row: 11 },
    { type: 'pine', x: 141, row: 4 },
    { type: 'rock', x: 157, row: 6 },
    { type: 'lanternLit', x: 170, row: 6 },
    { type: 'torii', x: 177, row: 6 },
    { type: 'shrine', x: 182, row: 6 },
    { type: 'lanternLit', x: 185, row: 6 }
  ]
};
