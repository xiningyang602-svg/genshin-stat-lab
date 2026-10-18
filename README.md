# 提瓦特词条实验室

原神角色伤害计算与圣遗物词条优化网站。可比较单人与组队的最优分配，并计算当前装备增加一次平均强化的收益；支持常驻面板输入、截图识别与拖放、配置导入导出及离线包。

网站为纯静态页面，计算和截图识别在访问者浏览器内完成，使用者无需登录 ChatGPT 或 GitHub。配置保存在访问者当前设备浏览器中；更换设备或网址可通过导出、导入配置迁移。

## 发布

在公开仓库的 Settings → Pages → Build and deployment 中选择 Deploy from a branch，再选择 main 分支和 /(root) 目录。网站不需要安装依赖或构建；提交更新后由 GitHub Pages 发布，实际网址可在 Pages 设置中查看。

本仓库只包含网站交付文件、发布说明及来源校验清单。原始来源与第三方许可保留于 THIRD_PARTY_NOTICES.txt 和 vendor/ocr 中，公式范围、输入口径及适用限制见网页的使用说明。

部署参考：[GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)。
