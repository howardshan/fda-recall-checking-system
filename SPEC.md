# 开发任务书:药品召回查询系统

> 本文件由项目方提供。当前实现进度见 [`README.md`](./README.md) 顶部的里程碑标记。

---

## 1. 目标

构建一个 Web 应用:用户提供一个药品的**产品名称**和**厂商**(可手动输入、拍照识别、或扫描条码),系统在召回数据库中查询,告知该药品**是否被 FDA 召回**,并展示召回原因和危险等级。召回数据来自 **OpenFDA**。

核心交付物是一个能跑通「输入 → 识别 → 确认 → 查询召回 → 出结果」完整闭环的 Web 应用。

## 2. 技术栈(固定,不要替换)

- **框架**:Next.js(App Router,TypeScript)。前端页面 + serverless API Routes 在同一工程。
- **数据库**:Supabase(Postgres)。用 `@supabase/supabase-js` 访问。
- **部署**:Vercel(API Routes 作为 serverless functions;定时任务用 Vercel Cron)。
- **运行时**:Node.js。
- **浏览器内 OCR**:`tesseract.js`(完全客户端运行,图片不上传服务器)。
- **浏览器内扫码**:`@zxing/browser`(支持一维码与 GS1 DataMatrix)。
- **模糊匹配**:Postgres `pg_trgm` 扩展(服务端做三元组相似度匹配)。

不要引入额外的后端框架、ORM 或状态管理库;保持精简。

## 3. 范围

### 包含
- 三种输入方式:手动输入、拍照 OCR、扫码。
- 一个**可编辑的确认表单**,三种输入最终都汇入这里由用户确认/修正。
- 在本地 Supabase 数据库中做召回查询与匹配。
- 分级展示查询结果。
- 定时从 OpenFDA 同步召回数据到 Supabase。

### 不包含
- 用户账户 / 登录。
- 医疗诊断、用药建议。
- 美国以外的药品(见下方「待确认」)。
- 移动 App。

### 待确认(实现中默认值见 README)
1. **市场范围**:仅美国 FDA。
2. **「厂商」定义**:OpenFDA `labeler` / `recalling_firm`。

## 12. 构建顺序

- **M1 — 脚手架**:Next.js + TypeScript 工程;Supabase migration;`.env.example`;`/api/meta`;README。
- **M2 — 召回数据**:`npm run seed:recalls` 全量;`/api/sync` 增量 + Cron;`sync_runs` 记录。
- **M3 — 字典与识别匹配**:`npm run seed:ndc` 填充 `ndc_products`;`/api/extract` NDC 精确 + OCR 文本 `pg_trgm` 模糊匹配 + 多信号打分。
- **M4 — 手动查询闭环**:手动输入 Tab + 可编辑确认表单 + `/api/check-recall` + 结果展示 + 免责声明。
- **M5 — 拍照**:`tesseract.js` 客户端 OCR → `/api/extract` → 预填表单。
- **M6 — 扫码**:`@zxing/browser` + GTIN→NDC 解析(含单元测试)→ 预填表单。
- **M7 — 收尾**:错误状态、`possible`/`not_found` 文案、最后同步时间、`query_logs` 落库、打磨。
