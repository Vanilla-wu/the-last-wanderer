/**
 * pixelfx 特效的 sprite sheet 資料（由 tools/build_fx.py 從 pixelfx 匯出，勿手動修改）
 *
 * 來源：https://github.com/patch-gg/pixelfx（MIT），授權見 assets/fx/pixelfx-LICENSE 與 pixelfx-NOTICE.md
 * 圖檔在 assets/fx/<名稱>.png；pivot 是特效錨點（角色腳底或擊中點），特效預設朝右。
 */
window.FX_SHEETS = {
  "slash": {
    "fps": 30,
    "frames": 24,
    "frameSize": [
      136,
      104
    ],
    "columns": 5,
    "pivot": [
      44,
      92
    ],
    "source": "melee/sword-slash",
    "hits": [
      {
        "t": 0.06,
        "freeze": 0.14,
        "shake": 0.18,
        "amp": 2
      }
    ]
  },
  "cross": {
    "fps": 30,
    "frames": 25,
    "frameSize": [
      164,
      108
    ],
    "columns": 5,
    "pivot": [
      44,
      92
    ],
    "source": "melee/double-slash",
    "hits": [
      {
        "t": 0.06,
        "freeze": 0.05,
        "shake": 0.08,
        "amp": 1
      },
      {
        "t": 0.16,
        "freeze": 0.14,
        "shake": 0.2,
        "amp": 2
      }
    ]
  },
  "cleave": {
    "fps": 30,
    "frames": 58,
    "frameSize": [
      208,
      116
    ],
    "columns": 6,
    "pivot": [
      68,
      96
    ],
    "source": "melee/clean-cleave",
    "hits": [
      {
        "t": 0.335,
        "freeze": 0.2,
        "shake": 0.34,
        "amp": 3
      }
    ]
  },
  "hitSpark": {
    "fps": 30,
    "frames": 16,
    "frameSize": [
      136,
      80
    ],
    "columns": 4,
    "pivot": [
      44,
      64
    ],
    "source": "impacts/hit-spark"
  },
  "spin": {
    "fps": 30,
    "frames": 25,
    "frameSize": [
      208,
      104
    ],
    "columns": 4,
    "pivot": [
      104,
      84
    ],
    "source": "melee/spin-slash",
    "hits": [
      {
        "t": 0.17,
        "freeze": 0.12,
        "shake": 0.16,
        "amp": 2
      }
    ]
  },
  "thrust": {
    "fps": 30,
    "frames": 24,
    "frameSize": [
      196,
      76
    ],
    "columns": 4,
    "pivot": [
      34,
      62
    ],
    "source": "melee/thrust",
    "hits": [
      {
        "t": 0.07,
        "freeze": 0.12,
        "shake": 0.14,
        "amp": 2
      }
    ]
  },
  "crit": {
    "fps": 30,
    "frames": 28,
    "frameSize": [
      216,
      136
    ],
    "columns": 5,
    "pivot": [
      84,
      106
    ],
    "source": "impacts/crit-hit"
  },
  "parry": {
    "fps": 30,
    "frames": 31,
    "frameSize": [
      200,
      112
    ],
    "columns": 5,
    "pivot": [
      100,
      96
    ],
    "source": "impacts/parry"
  },
  "skull": {
    "fps": 15,
    "frames": 36,
    "frameSize": [
      96,
      132
    ],
    "columns": 8,
    "pivot": [
      48,
      120
    ],
    "source": "critters/flying-skull"
  },
  "dmg1": {
    "fps": 30,
    "frames": 33,
    "frameSize": [
      76,
      68
    ],
    "columns": 6,
    "pivot": [
      30,
      52
    ],
    "source": "ui/damage-number"
  },
  "dmg2": {
    "fps": 30,
    "frames": 33,
    "frameSize": [
      76,
      68
    ],
    "columns": 6,
    "pivot": [
      30,
      52
    ],
    "source": "ui/damage-number"
  },
  "combo2": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo3": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo4": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo5": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo6": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo7": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo8": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo9": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo10": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo11": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo12": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo13": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo14": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo15": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo16": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo17": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo18": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo19": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  },
  "combo20": {
    "fps": 20,
    "frames": 30,
    "frameSize": [
      208,
      100
    ],
    "columns": 4,
    "pivot": [
      104,
      50
    ],
    "source": "ui/combo-counter"
  }
};
