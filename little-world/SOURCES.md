# 来源与素材

## 户型、模型与界面

户型来自用户提供的 One Circular Quay Apartment Type C 平面图。`apartment.glb` 为此前建模工作恢复的原静态模型：1459 节点、59472 三角面、831400 字节，保留厨房柜体与顶面空调概念修正。v7 的猫、靠墙柜体、门窗帘、露天露台与花箱、家居细节和电视界面在浏览器运行时叠加，不是新渲染的导览视频，也未写回原 GLB。

[Three.js r170](https://github.com/mrdoob/three.js/tree/r170) 及所用插件已随项目本地打包，许可见 `vendor/LICENSE.txt`。小尤、访客头像、界面插画和电视待机图使用本地程序绘制；猫咪声音由 Web Audio 合成，不使用外部录音。

## 书籍

《平面国》《时间机器》《物种起源》《天文学简史》使用 Project Gutenberg 提供的历史英文原文。四本完整文本、制作信息与许可保存在 `books/`；逐本来源、原文哈希及排版说明见 `books/SOURCES.md`、`books/source-manifest.json`。未收录《时间简史》的受版权保护全文或现代中文译本。

## 真实公开项目

[完整作品集原站](https://liqianyouy.github.io/Homepage/portfolio/) 是用户已有的公开网站。匿名本地预览 `portfolio-room.html` 使用对应项目的已有素材，随用户授权发布原公开项目素材的副本：

| 项目 | 本地素材 | 来源说明 |
|---|---|---|
| MoodBall | `assets/moodball.jpg` | 原作品中的交互项目图片 |
| Compact washer | `assets/washer.svg` | 原作品中的紧凑洗衣机概念示意 |
| 智能药盒 / Smart Medication Support | `assets/smart-medication.jpg` | [公开项目页](https://liqianyouy.github.io/Homepage/portfolio/projects/smart-medication/)的 `concept-cover.jpg`，研究用药支持的透明反馈、确认与修正 |
| FoodCare + SeniorCare | `assets/foodcare.jpg`、`assets/foodcare-mobile.png` | [公开项目页](https://liqianyouy.github.io/Homepage/portfolio/projects/foodcare/)的 `hero-banner.jpg` 与 `mobile-prototype.png`，食物识别、移动交互和长者关怀研究原型 |

药盒与 FoodCare 的三张新增图片和原公开项目素材逐字节一致。住宅界面与本地作品预览使用「小尤」等匿名名称；外部原作品网站及 URL 可能显示真实姓名或账号。

## 音乐与电视

Flower Dance — DJ Okawari 使用原平台提供的播放器或入口：

- [Spotify 曲目](https://open.spotify.com/track/6RaJbbhKDOuBGQhbZCubCW) 与 [官方嵌入](https://open.spotify.com/embed/track/6RaJbbhKDOuBGQhbZCubCW)。
- [艺术家官方 YouTube 音频入口](https://www.youtube.com/watch?v=3ZIFNKYQj7g)，音乐窗不内嵌 YouTube 视频。

电视默认播放用户明确指定并授权公开的 Uluru 日出日落旅行视频。`media/uluru-sunrise-sunset.mp4` 是该原片的网页播放副本，`assets/uluru-poster.jpg` 截取自同一视频。转码保留完整画幅与音轨，移除设备、时间和位置等源文件元数据；原片未修改。

另外两条在线节目来源与 `television.js` 保持一致：

- [达令港的烟花](https://www.youtube.com/watch?v=d-NUlz3FXpw)。
- [海港大桥 · 跨年烟花](https://www.youtube.com/watch?v=8Ff5rpgoWWM)：City of Sydney 2024 年跨年烟花官方完整版。

外部音视频由原平台控制，可能受网络、地区、账号及嵌入规则限制。项目没有下载或打包这些外部歌曲与烟花视频。Uluru 旅行视频使用同站原生播放器，不依赖上述平台；访客自选的视频只临时播放、不上传，本地音频由用户自行导入并保存在浏览器。

## 数据与验证范围

GitHub Pages 的共享到访与明信片通过 Sites / Cloudflare Worker + D1 保存。昵称与头像按服务器可信 IP 的 HMAC 标识分配，原始 IP 不落库；同一 IP 每个悉尼日计一次到访。便签与生活状态按浏览器隔离。桌面 Python 服务仍以 Cookie / SQLite 记录本机服务的到访，桌面数据库不会上传到公开包。

访客 IP 来源遵循 [Cloudflare 请求头说明](https://developers.cloudflare.com/fundamentals/reference/http-headers/)。跨源 API 不依赖第三方 Cookie，限制允许的来源、消息长度和发送频率；留言按纯文本显示。

桌面完整项目保留几何、柜门扫掠、露台通行、猫与机器人、社区状态和发布边界的自动检查。它们不替代实际页面或外部音视频播放检查。

露台、橱柜内物品、衣服、粉色马尾头像及猫咪表面由本项目程序生成，不使用未授权外部模型。


v8 增加可收起卡片和地面方向箭头，修复电视待机纹理水平镜像；方向移动使用原模型碰撞并逐小步检测。

v9 更新厨房平底锅与行走脚印 SVG，接入 Uluru 旅行视频，并审校主页面、阅读器和保存提示。
