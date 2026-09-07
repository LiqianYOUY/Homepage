import test from 'node:test';
import assert from 'node:assert/strict';
import {translate,addTranslations} from '../i18n.js?v=14';
import {PLANT_TRANSLATIONS} from '../plant-lifecycle.js?v=14';
addTranslations(PLANT_TRANSLATIONS);

test('interface copy and dynamic care, wardrobe and clock labels translate without changing Chinese source',()=>{
 const cases=[
  ['你来啦，快请进。',"You're here. Come on in."],
  ['作品集','prototype studio'],
  ['相伴第 31 天','Day 31 together'],
  ['主卧联排衣柜 2','Main bedroom fitted wardrobe 2'],
  ['早上好，可爱的朋友','Good morning, lovely friend'],
  ['生活记录 · 已保存在本机','Home journal · Saved on this device'],
  ['晒太阳的小雪兔','Sunbathing Snow Bunny'],
  ['花箱 3 · 薰衣草','Planter 3 · Lavender'],
  ['悉尼 · 日出 06:12 · 日落 17:41','Sydney · Sunrise 06:12 · Sunset 17:41'],
 ];
 for(const [source,english] of cases){assert.equal(translate(source,'en'),english);assert.equal(translate(source,'zh'),source);}
});

test('existing bilingual phrases, English text and unknown personal content remain intact',()=>{
 for(const text of ['HCI · 人机交互','作品集 · Prototype Studio','观察 / OBSERVE','Flower Dance','自己的新想法。'])assert.equal(translate(text,'en'),text);
 assert.equal(translate('未知句子。下一句话。','en'),'未知句子。 下一句话。');
 assert.equal(translate('  设置  ','en'),'  Settings  ');
});

test('plant action messages are registered in the same language dictionary',()=>{
 for(const [source,english] of Object.entries(PLANT_TRANSLATIONS))assert.equal(translate(source,'en'),english);
});
