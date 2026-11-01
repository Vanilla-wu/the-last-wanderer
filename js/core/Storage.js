/**
 * SaveStore —— LocalStorage 包裝
 * 所有讀寫都包在 try/catch：私密瀏覽或網站資料被封鎖時，遊戲仍可正常運作（只是不會記錄進度）。
 */
const SaveStore = {
  prefix: 'tlw_',

  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) { /* 無法寫入時忽略 */ }
  },

  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (e) { /* 無法寫入時忽略 */ }
  }
};
