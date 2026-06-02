# 客户需求 vs 实现对比（FDA Notification Web）

**文档版本**：1.2  
**更新日期**：2026-06-02  
**对照基准**：[REQUIREMENTS-CLIENT.md](./REQUIREMENTS-CLIENT.md)（v4.2；**ADM-02 管理后台已按客户书面决定从交付范围剔除**，见 [§1.1](#11-范围说明)）  
**实现范围**：仓库根目录 Next.js 应用（`app/`、`lib/`、`components/`、`supabase/migrations/`）  
**内部需求**（可选参考）：[REQUIREMENTS.md](./REQUIREMENTS.md)（全产品规划，非签约附件）

---

## 目录

1. [执行摘要](#1-执行摘要)
2. [产品范围与架构](#2-产品范围与架构)
3. [阶段一对照（M1–M15、SUB-01）](#3-阶段一对照m1m15sub-01)
4. [阶段二对照（V2、ADM、SUB）](#4-阶段二对照v2admsub)
5. [MVP / 最终验收清单打勾](#5-mvp--最终验收清单打勾)
6. [订阅与计费（§五）对照](#6-订阅与计费五对照)
7. [偏差与风险](#7-偏差与风险)
8. [建议收尾工作（按优先级）](#8-建议收尾工作按优先级)
9. [关键代码索引](#9-关键代码索引)
10. [修订记录](#10-修订记录)

**状态图例**

| 符号 | 含义 |
|------|------|
| ✅ | 已实现且与签约需求一致（或合同允许范围内） |
| ⚠️ | 部分实现或与需求存在偏差 |
| ❌ | 未实现或无法验收 |
| ➖ | 合同明确不含 / 待客户确认项 |
| 🔧 | 代码已有，需配置或接线后方可验收 |

---

## 1. 执行摘要

### 1.1 范围说明

**客户为控制成本，书面确认不交付 ADM-02（客户只读管理后台）。**

- **对用户侧功能无影响**：注册、药箱、匹配、站内/邮件通知、订阅等不依赖 Admin UI。  
- **本文档有效验收范围** = REQUIREMENTS-CLIENT v4.2 **减去 ADM-02（原 13 人时）**；签约 PDF 若仍含管理后台，建议同步修订为 v4.3。  
- **运营替代**：见 [§2.3 无管理后台时的运营方式](#23-无管理后台时的运营方式)。

当前代码库已从早期「仅按需查询」演进为 **FDA Notification Web 全产品主线**：Supabase Auth、药箱、主动匹配、站内通知、家庭药箱、定价页、召回浏览、数据导出等均已落地。

| 维度 | 结论 |
|------|------|
| **对照有效范围（v4.2 − ADM-02）整体** | 约 **82–86%** |
| **阶段一 MVP（§三，102h）** | 约 **88%**（不变） |
| **阶段二完整 Web（§四，原 73h → 有效 60h）** | 约 **80–85%** |
| **可对客户最终验收** | **接近** — **SUB-03 Stripe** 已接入；**邮件**需 SMTP 生产配置；**SMS 本期不交付**（已从产品移除） |
| **团队感知「只剩邮件 + Stripe」** | **基本准确**（SMTP 配置 + UAT） |

**主要缺口（P0）**

1. **M7 邮件生产**：`dispatchPendingEmails` 与 `sendDailyDigests` 均已接入 `/api/sync`；需 **SMTP 环境变量** 端到端验证。  
2. **M4 / M3 等**：见下文未变项（注册资料、未知厂商提示等）。  

**已明确不在交付范围**

- **ADM-02** 客户只读管理后台 — 客户确认不做；**不阻塞**产品对用户上线运行。

**已对齐合同的关键点**

- 仅 Web、**手动输入**（`/check` 无扫码/OCR 入口）  
- 访客 **2 次**查询（`lib/quick-check-quota.ts`）  
- 免费 **2 药**限额（`lib/plan.ts`、`SUB-01`）  
- 药箱 CRUD、软删除停监控、站内通知中心  
- 家庭药箱、召回浏览、通知偏好 UI、JSON 导出  
- UI **en-US**、Class I/II/III 样式  

---

## 2. 产品范围与架构

### 2.1 与签约文档对齐情况

| 项目 | REQUIREMENTS-CLIENT v4.2 | 当前实现 |
|------|--------------------------|----------|
| 核心旅程 | 注册 → 药箱 → 后台匹配 → 邮件/站内通知 | ✅ 主链路已通；邮件待 SMTP 配置 |
| 即时查询 | 未登录 2 次 → 注册；手动 / NDC | ✅ `RecallChecker` + `/api/check-recall` |
| 扫码 / OCR | **明确不含** | ✅ 前端无 Photo/Barcode Tab（旧 SPEC 能力已移除出 UI） |
| 订阅 | Stripe Checkout / Webhook / 门户 | ✅ `app/api/stripe/*`；计划权益见 `lib/plan.ts` |
| 管理后台 ADM-02 | v4.2 原文含；**客户已确认不做** | ➖ **不在交付范围**；无 Admin UI（符合决策） |
| Web Push | **不含** | ✅ 未实现 |

### 2.3 无管理后台时的运营方式

客户不做 ADM-02 后，下列能力由 **第三方控制台 + 现有 API** 覆盖，**足以支撑早期运营**，但无统一仪表盘：

| 运营需求 | 替代方式 |
|----------|----------|
| 查看注册用户 | Supabase Dashboard → Authentication / `profiles` |
| 订阅与收款 | Stripe（或所选支付商）Dashboard |
| 邮件发送记录 | SMTP2go 等发信日志；库表 `notifications.email_sent_at` |
| 短信记录 | Twilio 控制台 |
| 召回同步是否成功 | `sync_runs` 表；失败邮件 `OPS_ALERT_EMAIL` |
| 手动触发同步 | `POST /api/sync` + `CRON_SECRET`（Vercel Cron 已每日调度） |
| 单用户支持排查 | Supabase SQL；或引导用户使用 **数据导出**（V2-10） |

**建议交付物（低工时）**：一页 **《运营手册》**（Supabase/Stripe/SMTP 入口 + 2–3 条常用 SQL），替代 ADM-02 的 13 人时开发。

### 2.2 运行时架构（当前）

```mermaid
flowchart TB
  subgraph user [用户侧]
    A[注册 / 登录 / Google OAuth]
    B[药箱 manual + typeahead]
    C[即时查询 /check]
    D[站内通知 /notifications]
  end

  subgraph cron [Vercel Cron 每日]
    S[/api/sync]
    S --> U[OpenFDA upsert recalls]
    U --> M[scanAllActiveItems]
    M --> N[(notifications)]
    S --> DD[sendDailyDigests]
  end

  subgraph pending [已实现未接入主流程]
    DP[dispatchPendingEmails + SMS]
    EM[emails/recall-alert.html]
  end

  B --> M
  A --> B
  M --> N
  N --> D
  DD -.->|SMTP| Mail[用户邮箱]
  DP -.->|未调用| Mail
  DP -.-> EM

  subgraph gap [缺口]
    ST[Stripe Checkout / Webhook]
  end

  subgraph ops [运营替代 无 ADM-02]
    SB[Supabase Dashboard]
    STP[Stripe Dashboard]
    SMTP[SMTP / Twilio 控制台]
  end
```

---

## 3. 阶段一对照（M1–M15、SUB-01）

| 模块 | 状态 | 实现位置 / 说明 |
|------|------|-----------------|
| **M1** FDA 召回数据 | ✅ | `lib/sync.ts`、`app/api/sync/route.ts`、`scripts/seed-recalls.ts`；`sync_runs`；Cron 每日 |
| **M2** 药品目录 | ✅ | `ndc_products`、`ProductTypeahead` / `ManufacturerTypeahead`、`/api/suggest` |
| **M3** 召回匹配引擎 | ⚠️ | `lib/check-recall.ts`、`lib/matching.ts`：加药与 sync 后全量扫描、去重 ✅；**缺「厂商不在库 → 无法追踪」明确 UI/文案** |
| **M4** 用户账户与资料 | ⚠️ | 邮箱注册/登录/重置 ✅；`GoogleButton` ✅；**缺必填：年龄、性别、种族**（仅 username → `profiles.full_name`） |
| **M5** 个人药箱 | ✅ | `medication_items`、药名中心列表、`/api/cabinet`；软删除 `status=deleted` |
| **M6** 监控启停 | ⚠️ | 删除即停 ✅；库表仍有 `expected_stop_date`，dispatcher 仍读取（合同要求不设停药日期） |
| **M7** 邮件通知 | 🔧 | `dispatchPendingEmails` + `sendDailyDigests` 均在 `lib/sync.ts`；Free 仅 digest，付费可 instant；需 **SMTP** |
| **M8** 站内通知中心 | ✅ | `notifications` 表、`app/(app)/notifications`、`NotificationsList`、已读/忽略 |
| **M9** 分级通知文案 | ✅ | UI `chip-i/ii/iii`；邮件模板按 Class 分色（dispatcher 内） |
| **M10** 用户界面 | ✅ | Dashboard、药箱、召回详情、Disclaimer；Logo 组件待客户素材 |
| **M11** 即时召回查询 | ✅ | `QUICK_CHECK_LIMIT=2`、三态 `recalled/possible/not_found`、仅 manual |
| **M12** 隐私与法律 | ✅ | `/privacy`、`/terms`、`/cookies` 静态页；注册勾选 ToS |
| **M13** 运维监控 | 🔧 | `sync_runs` + 失败时 `OPS_ALERT_EMAIL`（`lib/sync.ts`）— 依赖 SMTP |
| **SUB-01** 2 药免费 | ✅ | `enforceMedQuota`、`UpgradeModal`、402 `QUOTA_EXCEEDED` |
| **M14** 测试与上线 | ⚠️ | 可部署；**正式 UAT 记录 / 生产验收**待做 |
| **M15** PM 与文档 | ⚠️ | 客户签约文档已有；**英文操作说明**未单独交付 |

**阶段一模块完成度（加权估算）：约 88%**

---

## 4. 阶段二对照（V2、SUB；ADM-02 已剔除）

> **有效阶段二工时**：原 **73h** − ADM-02 **13h** = **60h**（客户确认不做管理后台）。

| 模块 | 状态 | 实现位置 / 说明 |
|------|------|-----------------|
| **V2-4** 家庭成员药箱 | ✅ | `family_members`、`member_id`、`app/(app)/family`、`FamilyMembersList` |
| **V2-6** 批号解析增强 | ✅ | `lib/lot-match.ts` + `lot-match.test.ts`，用于 `check-recall` |
| **V2-7** 召回公告浏览 | ✅ | `/recalls`、`RecallBrowser`、`/api/recalls`、详情页含 fda.gov 链接 |
| **V2-8** 通知偏好 | ⚠️ | `PreferencesForm`、`/api/preferences` ✅；过滤逻辑在 **dispatcher** 中，**未接入发送链路** |
| **V2-9** 短信 | ➖ | **本期不交付**；UI/代码已移除（2026-06-02） |
| **V2-10** 数据导出 | ✅ | `GET /api/me/export`、`app/(app)/settings/data` |
| **ADM-02** 管理后台 | ➖ | **客户确认不交付**；运营见 [§2.3](#23-无管理后台时的运营方式) |
| **SUB-03** 订阅与计费 | ✅ | Stripe Checkout、Webhook、`stripe_subscriptions`；降权时 `syncMonitoringQuota` |
| **V2-INT** 集成联调 | ⚠️ | 部分模块可联调；**支付 Webhook、短信/邮件生产验证**未完成 |
| **V2-12** 最终验收 | ➖ | 依赖 SUB-03、邮件/SMS 闭环及 UAT |

**阶段二模块完成度（有效范围 60h，加权估算）：约 80–85%**

---

## 5. MVP / 最终验收清单打勾

### 5.1 阶段一 MVP（§3.2）

| # | 验收项 | 状态 | 备注 |
|---|--------|------|------|
| 1 | 召回数据可同步并显示更新时间 | ✅ | `/api/meta`、结果页与 Dashboard |
| 2 | 注册含必填资料；Google 登录 | ⚠️ | 缺年龄/性别/种族 |
| 3 | 未登录仅 2 次查询 | ✅ | |
| 4 | 药箱手动；最多 2 免费；删除后不追踪 | ✅ | 软删除后 `scanAllActiveItems` 仅 `active` |
| 5 | 未知厂商「无法追踪」 | ❌ | 可手填任意厂商，无提示 |
| 6 | 匹配召回可收邮件与站内 | ⚠️ | 站内 ✅；邮件需 SMTP + 接线 |
| 7 | 即时查询（无扫码/拍照/SMS/Push） | ✅ | |
| 8 | 法律静态页与 Cookie | ✅ | `CookieBanner` |
| 9 | MVP 稳定、同步按日执行 | ✅ | `vercel.json` Cron `0 17 * * *` |

**MVP 清单：约 7/9 项可演示，2 项部分/未过**

### 5.2 阶段二最终验收（§4.2，已剔除 ADM-02 相关项）

| # | 验收项 | 状态 | 备注 |
|---|--------|------|------|
| 1 | 订阅支付可用；支付失败停权 | ✅ | Webhook `invoice.payment_failed` → `revokePaidAccess` + 监控配额 |
| 2 | 取消用到账期结束；升级立即生效 | ✅ | `cancel_at_period_end`；已有订阅 `subscriptions.update` |
| 3 | 付费时地址必填 | ✅ | Checkout `billing_address_collection: required` |
| 4 | 通知偏好 + Class 过滤 | ✅ | dispatcher + 计划门禁（Free 无 instant 邮件） |
| 5 | 家庭药箱 + Class 分样式 | ✅ | |
| 6 | 批号增强、召回浏览、导出 | ✅ | |
| 7 | ~~管理后台可查看业务数据~~ | ➖ | **ADM-02 已取消**；改用 §2.3 运营替代 |
| 8 | 全站无扫码/拍照入口 | ✅ | |
| 9 | 完整 Web 生产上线 | ⚠️ | 待 SUB-03、邮件/SMS + UAT |

**有效验收项：8 项（原 9 项去掉管理后台）**

---

## 6. 订阅与计费（§五）对照

| 规则 / 项 | 合同要求 | 实现 |
|-----------|----------|------|
| 免费 2 药 | ✅ | `QUOTAS.free.meds = 2` |
| 个人 $4.99/mo · $49.99/yr | UI 展示 | `PlanCards.tsx` |
| 家庭 $9.99/mo · $99.99/yr | UI 展示 | 同上 |
| 阶梯定价 | 待定 | ➖ |
| 支付服务商 | Stripe | ✅ |
| 取消用到账期结束 | §五 | ✅ `/api/stripe/cancel` |
| 升级立即生效 | §五 | ✅ 已有订阅 proration update |
| 支付失败立即停止 | §五 | ✅ `revokePaidAccess` + 仅配额内 active 监控 |
| 付费时地址必填 | §五 | ✅ Checkout |

---

## 7. 偏差与风险

### 7.1 邮件：每日 Digest vs 即时分级邮件（M7）

**合同**：召回命中发邮件（药名、厂商、等级、原因、FDA 链接）。

**实现**：

- **路径 A（已接入）**：`sendDailyDigests` — 每用户每天最多一封，汇总未发邮件的 notifications。  
- **路径 B（未接入）**：`dispatchPendingEmails` — 使用 `emails/recall-alert.html`，按 Class 模板即时发送，并处理 SMS。

**风险**：若客户按 M7「测试邮箱可收到**单条召回邮件**」验收，仅 Digest 可能被认为不符合；且 SLA「24 小时内」依赖 Cron 频率（当前**每日**一次，通常满足，但非即时）。

**建议**：在 `runSync` 末尾（及/或 cabinet POST 后）调用 `dispatchPendingEmails`；配置 `SMTP_*` 与 `NEXT_PUBLIC_APP_URL`。

### 7.2 合规文案（§二-5）

**合同**：不提供用药/停药建议。

**实现**：`components/ResultPanel.tsx` 在 `recalled` 时仍含 *「Stop using it and contact your pharmacist or physician」*，与 `Disclaimer.tsx` 及合同 **不一致**。

**建议**：改为展示召回事实 + FDA 链接 +「请咨询专业人士，勿自行停药」；按 Class 区分语气。

### 7.3 注册资料（M4）

缺少年龄、性别、种族字段及 DB 列；Google OAuth 用户亦未强制补全。

### 7.4 未知厂商（M3）

Typeahead 来自 NDC 目录，但允许自由文本提交；加药后无「厂商未在目录 → 监控可靠性降低/无法追踪」提示。

### 7.5 订阅占位与合同规则

`PlanCards` 底部标注 *Placeholder mode*；取消/降级行为与 §五「账期结束仍可用」冲突，上线 Stripe 前需重写业务逻辑。

### 7.6 签约文档与有效范围不一致

[REQUIREMENTS-CLIENT.md](./REQUIREMENTS-CLIENT.md) v4.2 正文仍含 **ADM-02**、§4.2 管理后台验收项及 **175h / $17,500** 总价。客户已决定不做管理后台时，建议：

- 修订签约文档（如 **v4.3**）：删除 ADM-02、更新 §4.2 与阶段二工时/金额；或  
- 保留总价，将节省的 **13h** 记入缓冲/其他模块（需书面确认）。

本文档按 **「ADM-02 不交付」** 评估完成度；与未修订的 v4.2 PDF 并列使用时以**最新书面范围**为准。

### 7.7 内部 README 过时

根目录 [README.md](../README.md) 仍描述「Recall Checker M7 + OCR/扫码」，与 **v4.2 签约范围**及当前代码不一致，易误导评审；建议单独更新（本文档不自动改 README）。

---

## 8. 建议收尾工作（按优先级）

### P0 — 阻塞有效范围验收

| 项 | 关联模块 | 动作 |
|----|----------|------|
| Stripe（或确认后的支付商）Checkout + Webhook + 订阅表 | SUB-03 | 替换 `/api/upgrade`；实现 §五 取消/失败/地址规则 |
| 邮件生产闭环 | M7、M13 | 配置 SMTP；`runSync` 调用 `dispatchPendingEmails`；端到端测试 |
| MVP 验收补项 | M4、M3 | 年龄/性别/种族；未知厂商提示 |

### P1 — 阶段二完整验收（有效范围）

| 项 | 模块 | 动作 |
|----|------|------|
| SMS | V2-9 | Twilio 配置 + dispatcher 接入 |
| 通知偏好生效 | V2-8 | 与 dispatcher 联调验证 |
| 合规文案 | M10 | 修订 `ResultPanel` |
| UAT / 部署记录 | M14、V2-12 | 按 §3.2、§4.2（剔除 ADM）签字清单 |
| 运营手册（替代 ADM-02） | — | Supabase/Stripe/SMTP 入口 + 常用 SQL；低工时交付物 |

### P2 — 文档与清理

| 项 | 动作 |
|----|------|
| README | 改为 FDA Notification 全产品描述 |
| 移除 `expected_stop_date` 产品行为 | 与 M6 对齐（可选迁移） |
| 英文操作说明 | M15 交付物 |

---

## 9. 关键代码索引

| 能力 | 路径 |
|------|------|
| 召回同步 + 匹配 + Digest | `lib/sync.ts` |
| 单次/药箱匹配 | `lib/check-recall.ts`、`lib/matching.ts` |
| 即时邮件派发 | `lib/notification-dispatcher.ts` |
| 每日邮件汇总 | `lib/daily-digest.ts` |
| SMTP | `lib/mailer.ts`、`.env.example` |
| 计划限额与权益 | `lib/plan.ts`、`lib/plan-monitoring.ts` |
| Stripe 计费 | `lib/stripe-billing.ts`、`app/api/stripe/*` |
| 访客配额 | `lib/quick-check-quota.ts` |
| 批号增强 | `lib/lot-match.ts` |
| Auth UI | `components/auth/*`、`app/(auth)/*` |
| 药箱 | `app/(app)/cabinet/*`、`app/api/cabinet/*` |
| 站内通知 | `app/(app)/notifications/*` |
| 家庭 | `app/(app)/family/*` |
| 召回浏览 | `app/(public)/recalls/*` |
| 定价 | `app/(public)/pricing/page.tsx`、`components/billing/*` |
| 数据导出 | `app/api/me/export/route.ts` |
| DB 迁移（应用表） | `supabase/migrations/0013_app_schema.sql` 起 |

---

## 10. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 0.1 | 2026-05-19 | 初版：对照旧 Recall Checker 子系统与 REQUIREMENTS.md v0.1 |
| 1.0 | 2026-05-19 | **重写**：对照 [REQUIREMENTS-CLIENT.md](./REQUIREMENTS-CLIENT.md) v4.2 与当前全栈实现；更新完成度与 P0 缺口 |
| 1.1 | 2026-05-19 | 客户确认 **不交付 ADM-02**；更新有效范围、完成度、验收清单与运营替代方案 |
| 1.2 | 2026-06-02 | SUB-03 Stripe 已实现；SMS 移除；订阅权益与 `paused` 监控配额对齐 |

---

## 相关文档

- [REQUIREMENTS-CLIENT.md](./REQUIREMENTS-CLIENT.md) — **客户签约范围（主对照）**  
- [REQUIREMENTS-CLIENT-EN.md](./REQUIREMENTS-CLIENT-EN.md) — 英文签约版  
- [REQUIREMENTS.md](./REQUIREMENTS.md) — 内部全产品需求（非签约附件）  
- [SPEC.md](../SPEC.md) — 历史查询子系统任务书（部分能力已合并入现仓库）
