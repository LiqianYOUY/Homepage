import {addTranslations} from './i18n.js?v=14';

// Register with the shared translator so existing cached interaction modules
// keep one language state while the home's new name takes effect immediately.
addTranslations({
  '小尤の家':'You’s Home',
  '小尤の家 首页':'You’s Home · Home',
  '小尤の家 · 日常与好奇心':'You’s Home · Everyday life and curiosity',
  '小尤の家 · 留一点空间给新的想法':'You’s Home · Leave some room for a new idea',
  '原型与日常 · 小尤の家':'Prototypes and everyday life · You’s Home',
  '作品集 · 小尤の家':'prototype studio · You’s Home'
});
