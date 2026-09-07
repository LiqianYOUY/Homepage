# 植物时间与照顾 / Plant time and care

本地种植使用真实时间戳：关闭网页后继续计算实际经过的天数，浇水或施肥不会跳过生长阶段。种子、幼芽、生长、开花与凋谢是可见状态；开花后可剪一次花枝，分别放入客厅、餐厅或室内阳台的花瓶。清理凋谢植物后可以重新种植。旧版已经长大的植物迁移为已经建立的植株，从迁移时重新开始记录水肥，不追溯惩罚旧版缺失的照顾记录。

The garden advances in real elapsed days, including time spent away. Care does not fast-forward growth. Cut stems form finite inventory, retain their original freshness deadline when arranged, and cannot be duplicated between vases.

## 生长假设

这是有阳光、排水良好、使用盆栽营养土的避雨容器种植模拟。以下天数是为明确的游戏规则选取的代表值，**不是园艺机构承诺的精确开花日或缺水死亡日**。品种、播种季节、温度与实际土壤会改变真实植物的时间。没有降雨或天气接口，浇水由访客照顾完成。幼苗期约每 2 天查看土壤；较成熟植物采用下列不同水肥频率。水和肥的按钮会在需要时开放。

| 植物 | 发芽/扎根 | 开花 | 展示花期 | 成株浇水间隔 | 施肥间隔 |
|---|---:|---:|---:|---:|---:|
| 薄荷 Mint | 14 天 | 120 天 | 45 天 | 3 天 | 180 天 |
| 迷迭香 Rosemary | 28 天 | 730 天 | 45 天 | 7 天 | 365 天 |
| 雏菊 Daisy | 14 天 | 270 天 | 60 天 | 3 天 | 60 天 |
| 薰衣草 Lavender | 45 天 | 365 天 | 45 天 | 7 天 | 365 天 |
| 向日葵 Sunflower | 10 天 | 85 天 | 21 天 | 3 天 | 21 天 |
| 郁金香 Tulip **球茎 / bulb** | 28 天 | 120 天 | 21 天 | 7 天 | 30 天 |

雏菊按需要越季生长的播种苗处理；迷迭香保持种子培育需要多年的尺度。郁金香从经过低温处理的球茎开始，而非把种子几年的育成期缩短成几天。薄荷、迷迭香和薰衣草为多年生植物；游戏里的「这一季的花期结束」代表本次盆栽展示结束、允许换种，**不声称多年生植物开花后自然死亡**。花期不额外模拟悉尼每个品种的季节窗口。

缺水枯萎阈值为幼苗 7 天，成株依品种 12–35 天；长期不补充盆土养分的枯萎阈值为 90–1095 天。它们是本模拟的容器储水/养分耗尽假设，并非实测生物学阈值。耐贫瘠的薰衣草和迷迭香使用很长的补肥与耗尽时间；不会要求每天施肥。枯萎状态一旦达到就保存，迟来的浇水不能复活它。切花/香草枝的室内展示鲜度设为 7–14 天。

## 资料依据

- [University of Georgia Extension — Growing Sunflowers in the Home Garden](https://extension.uga.edu/publications/detail.html?number=C1121&title=growing-sunflowers-in-the-home-garden)：向日葵播种后的最初 7–10 天需保持适当水分。
- [University of Missouri Extension — Growing Sunflowers](https://extension.missouri.edu/publications/ym102)：按品种约 70–120 天开花，照顾示例为每 2–3 周施肥。
- [Utah State University Extension — Mint in the Garden](https://extension.usu.edu/yardandgarden/research/Mint-in-the-garden)：薄荷需要稳定水分，通常早春一次缓释肥即可，过度施肥浇水并不好。
- [RHS — How to Grow Rosemary](https://www.rhs.org.uk/herbs/rosemary/grow-your-own)：种子培育需要多年，成株耐旱；容器长时间种植后才需要补肥。
- [RHS — How to Grow Lavender](https://www.rhs.org.uk/plants/lavender/growing-guide) 与 [RHS Seed Germination Guide](https://www.rhs.org.uk/membership/pdfs/seed-scheme/rhs-members-seed-germination-guide-2020.pdf)：薰衣草需阳光、良好排水；种子萌发可缓慢而不整齐，属级指导可达 90 天。
- [RHS — Sowing Hardy Flowering Seeds](https://www.rhs.org.uk/education-learning/school-gardening/resources/gardening-skills/sowing-hardy-flowering-seeds)：雏菊常作为跨季播种、次春开花的花坛植物。
- [RHS — How to Grow Tulips](https://www.rhs.org.uk/plants/tulip/growing-guide)：郁金香通常用球茎栽培，开花后叶片仍需保留一段时间。

## 清扫规则

自动打扫开启时，露台和室内阳台凋谢植物先留 24 小时供访客手动清理。之后机器人会按目的地打开实际客餐厅露台门及窗帘，或室内阳台的真实推拉门，在受地面支撑、经过低位家具包围盒与机器人半径检查的路径上逐步行驶，到花箱或花盆前清理后才更新植物记录，再沿路返回充电座。滑动门和窗帘保留动态碰撞；路被猫或门挡住会等待/退让。无法安全到达的花箱不会被记成已清理。室内阳台原固定隔断的南端玻璃已改成可滑动的门叶，开口底轨齐平，其余玻璃保持实体碰撞。互动花盆移至桌子西侧，避开新沙袋沙发。

记录保存在浏览器的 `gardenWorld` 中，可随原有生活记录导出备份；不上传新服务。

验证：`node --test tests/plant-lifecycle.test.mjs tests/plant-scene.test.mjs`，包含真实 GLB 的 8 花箱与室内花盆到达/回充、门关闭阻挡、行走无幽灵玻璃碰撞及桌面花瓶支撑测试。
