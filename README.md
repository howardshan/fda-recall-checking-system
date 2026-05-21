# 药品召回查询系统 (FDA Recall Checker)

基于 [OpenFDA](https://open.fda.gov/) 的药品召回查询 Web 应用。用户输入药品产品名 + 厂商
(支持手动输入 / 拍照 OCR / 条码扫描),系统返回该药品是否被 FDA 召回、召回原因、危险等级。

> **当前进度:M7 — 全部里程碑完成**。

## 功能

- **三种输入方式**:手动、拍照(本地 OCR,图片不上传)、扫码(支持 UPC-A / EAN-13 / GS1 DataMatrix)。
- **可编辑确认表单**:三种输入都汇入这里,用户可校验/修改。
- **分级展示结果**:Class I(红)/ II(琥珀)/ III(中性);明确区分 `recalled` / `possible` / `not_found`。
- **NDC + 批号联动**:NDC 精确命中 → 高置信;批号能比对 `code_info`,不在召回范围的批次会降级为 `possible`。
- **定时增量同步**:Vercel Cron 每日触发 `/api/sync` 拉最近 30 天的更新。
- **本地全量 seed**:`npm run seed:recalls` 从 OpenFDA bulk download 拉所有 enforcement 数据,绕开 search API 的 skip 25,000 上限。

## 技术栈

- Next.js 15 (App Router, TypeScript)
- Supabase (Postgres) — 通过 `@supabase/supabase-js`
- Tailwind CSS
- 客户端 OCR:`tesseract.js`(`eng` 语言,WASM,完全在浏览器跑)
- 客户端扫码:`@zxing/browser`(UPC-A / EAN-13 / GS1 DataMatrix / GS1-128)
- 模糊匹配:Postgres `pg_trgm`(`word_similarity` + GIN 索引)
- 测试:Vitest

## 项目结构

```
app/
  api/
    meta/route.ts         # GET 数据库统计与最后同步时间
    sync/route.ts         # 增量同步召回数据(Cron 触发,Bearer 认证)
    extract/route.ts      # OCR/扫码识别 → NDC/产品名/厂商/批号
    check-recall/route.ts # 召回查询(NDC 精确 + 模糊匹配)
  layout.tsx
  page.tsx                # 首页,挂载 <RecallChecker />
  globals.css
components/
  RecallChecker.tsx       # 顶层状态机(input → confirm → result)
  ManualInputTab.tsx
  PhotoTab.tsx            # tesseract.js,懒加载
  BarcodeTab.tsx          # @zxing/browser,懒加载
  ConfirmationForm.tsx
  ResultPanel.tsx
  Disclaimer.tsx
lib/
  supabase.ts             # 服务端 Supabase 客户端
  openfda.ts              # OpenFDA fetch + bulk download index
  recalls.ts              # 召回记录规范化与 upsert
  ndc.ts                  # NDC 字典规范化与 insert
  extract.ts              # 识别管线(NDC / OCR / barcode)+ 多信号打分
  check-recall.ts         # 召回查询逻辑
  gtin.ts                 # GTIN → NDC + GS1 DataMatrix AI 解析
  gtin.test.ts            # GTIN 解析器单元测试(24 用例)
  image.ts                # 浏览器侧图片预处理(缩放 + 灰度 + 对比度)
  types.ts                # 共享类型
scripts/
  load-env.ts             # tsx 脚本的 .env.local 加载器
  seed-recalls.ts         # `npm run seed:recalls`
  seed-ndc.ts             # `npm run seed:ndc`
supabase/
  migrations/
    0001_init.sql         # 表结构 + pg_trgm 索引
    0002_fuzzy_search.sql # ndc_fuzzy_search / recalls_fuzzy_search RPC
vitest.config.ts
vercel.json               # Vercel Cron 每日触发 /api/sync
.env.example
```

## 本地启动

### 1. 装依赖

```bash
npm install
```

### 2. 建 Supabase 项目并跑 migration

在 [Supabase](https://supabase.com/) 控制台新建项目,进入 **SQL Editor**,
**依次**执行下面两个文件的全部内容:

1. [supabase/migrations/0001_init.sql](./supabase/migrations/0001_init.sql) — 建表 + GIN 索引
2. [supabase/migrations/0002_fuzzy_search.sql](./supabase/migrations/0002_fuzzy_search.sql) — 模糊搜索 RPC

### 3. 配环境变量

```bash
cp .env.example .env.local
```

按注释填:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Settings > API。
- `SUPABASE_SERVICE_ROLE_KEY` — 同上。**仅服务端使用,绝不暴露给前端。**
- `OPENFDA_API_KEY` — https://open.fda.gov/apis/authentication/(可选,但限流更友好)。
- `CRON_SECRET` — 随便生成,`openssl rand -hex 32` 即可。

### 4. 种子数据

```bash
# 召回数据全量 seed(必跑一次。会下载 ~30 MB,首次 1–2 分钟)
npm run seed:recalls

# NDC 字典 seed(可选,但拍照/扫码识别要靠它)
npm run seed:ndc
```

两个脚本都把 OpenFDA bulk 下载缓存到 `.cache/openfda/`(已 gitignore),
重复运行会复用缓存。每次同步都会在 `sync_runs` 表写日志。

### 5. 启动

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 验收清单 (Definition of Done)

- [x] `npm run dev` 可启动,首页加载正常。
- [x] 三种输入方式(手动 / 拍照 / 扫码)都能把数据送进可编辑确认表单。
- [x] 输入一个已知被召回的药品(NDC 精确命中)→ 返回 `recalled` + 等级 + 原因。
- [x] 输入一个未被召回的药品 → 返回 `not_found` + 免责说明。
- [x] 提供 NDC 但批号不在召回范围 → 降级为 `possible`,显示「批号未在召回范围」徽章。
- [x] `/api/sync` 带正确 `CRON_SECRET` 时跑通增量同步;无认证 → 401。
- [x] `npm test` GTIN 解析器单元测试全过(24/24)。
- [x] `npm run typecheck` / `npm run build` 无报错。
- [x] 每次查询写一条 `query_logs` 记录(`input_method` ∈ manual/photo/barcode)。
- [x] 首页与结果页底部都展示最后同步时间。
- [x] 全局免责声明常驻可见。

## 各 API 一览

| 路由 | 方法 | 用途 |
| --- | --- | --- |
| `/api/meta` | GET | 数据库统计 + 最后同步时间(无认证,返回兜底值) |
| `/api/sync` | GET/POST | 增量同步(`Authorization: Bearer $CRON_SECRET`),支持 `?lookbackDays=N` |
| `/api/extract` | POST | 输入 `{ ocrText?, barcodeRaw?, ndc? }` → 输出识别结果 + candidates |
| `/api/check-recall` | POST | 输入 `{ productName, manufacturer?, ndc?, lotNumber? }` → `{ status, matches, lastSyncedAt }` |

## 测试

```bash
npm test            # GTIN / NDC 解析单元测试
npm run typecheck   # 全工程类型检查
npm run build       # 生产构建
```

## 部署 (Vercel)

1. 在 Vercel 导入仓库。
2. 把 `.env.local` 的全部变量配到 Vercel **Settings > Environment Variables**。
3. `vercel.json` 已配置每日 09:00 UTC 触发 `/api/sync`。Vercel Cron 会自动发送 Bearer。

## 默认决策(实现时选定,供项目方复核)

- **市场范围**:仅美国 FDA(NDC 字典与召回数据均为美国体系)。
- **「厂商」定义**:取 OpenFDA `labeler_name`(NDC)/ `recalling_firm`(recall)— 可能是分销商而非生产厂。
- **增量同步默认 lookback = 30 天**(可在请求里改 `?lookbackDays=N`)。
- **Cron 时间 = 每日 09:00 UTC**(北京时间 17:00)。
- **`possible` vs `recalled` 阈值**:NDC 精确命中 → recalled;模糊匹配 product_score ≥ 0.7 且(有厂商时)firm_score ≥ 0.5 → recalled;否则 possible。
- **NDC dashed 候选顺序**:5-4-1 / 5-3-2 / 4-4-2(由 GTIN 推断时无法确定原始格式,因此三种都试)。

## 免责声明

查询结果仅供参考,不构成医疗建议。请以 FDA 官方信息及药师/医生意见为准。
未发现召回 ≠ 绝对安全,仅代表当前数据库无匹配记录。
