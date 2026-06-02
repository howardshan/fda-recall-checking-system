# 订阅权益对齐 & SMS 移除 — 手工测试清单

**文档版本**：1.0  
**日期**：2026-06-02  
**关联实现**：[PLAN-ENTITLEMENTS-AND-SMS-CLEANUP.md](./PLAN-ENTITLEMENTS-AND-SMS-CLEANUP.md)（v1.1 已落地）  
**适用范围**：Free / Personal Pro / Family Protection 权益、SMS 移除、Stripe 订阅、`paused` 监控配额

---

## 目录

1. [测试前准备](#1-测试前准备)
2. [A. SMS 已移除](#a-sms-已移除)
3. [B. 定价页与文案](#b-定价页与文案)
4. [C. Free 计划](#c-free-计划)
5. [D. Personal Pro](#d-personal-pro)
6. [E. Family Protection](#e-family-protection)
7. [F. 监控配额与 paused](#f-监控配额与-paused)
8. [G. Stripe 订阅生命周期](#g-stripe-订阅生命周期)
9. [H. 通知渠道组合](#h-通知渠道组合)
10. [I. 回归与工程检查](#i-回归与工程检查)
11. [J. 最少覆盖路径](#j-最少覆盖路径)
12. [记录模板](#记录模板)

**状态图例**：测试时在 `[ ]` 中打 `x` 表示通过。

---

## 1. 测试前准备

| 项 | 说明 |
|----|------|
| 环境 | `NEXT_PUBLIC_APP_URL`、Supabase、Stripe 测试密钥、Webhook 已指向本环境 |
| 邮件 | `SMTP_*` 已配置；准备一个可收信的测试邮箱 |
| 账号 | 至少 3 个：全新 Free、Personal Pro、Family Protection（Stripe 测试卡 `4242 4242 4242 4242`） |
| 数据 | 可选：Supabase 查看 `profiles.plan`、`stripe_subscriptions`、`medication_items.status` |
| 自动化 | `npm test`、`npm run build` 已通过（回归用） |

**Stripe 测试卡（参考 [Stripe 测试文档](https://docs.stripe.com/testing)）**

- 成功：`4242 4242 4242 4242`
- 支付失败：如 `4000 0000 0000 0002`（以当前 Stripe 文档为准）

**可选 DB 抽查**

```sql
select id, product_name, status, added_at
from medication_items
where user_id = '<user-uuid>'
order by added_at;
```

---

## A. SMS 已移除

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| A1 | 打开 `/settings/notifications` | 仅有 Email（Instant / Daily digest）与 Class 开关；**无 SMS、无手机号** | [ ] |
| A2 | 打开 `/pricing`，查看 Personal Pro 卖点 | **无** “SMS opt-in” 等文案 | [ ] |
| A3 | 打开 `/privacy` | 收集项无电话；用途为 email + in-app，无 SMS | [ ] |
| A4 | 全站抽查用户可见页（设置、定价、隐私、首页） | 无误导性 SMS / Twilio 入口 | [ ] |
| A5 | 检查部署环境 `.env` | **无** `TWILIO_*` | [ ] |

---

## B. 定价页与文案

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| B1 | `/pricing` FAQ | **无**「化妆品/食品 Coming next」条目 | [ ] |
| B2 | Free 卡片卖点 | 约：2 meds、Daily digest、In-app alerts | [ ] |
| B3 | Personal 卡片 | 约：20 meds、Instant recall emails、Lot-level matching、In-app | [ ] |
| B4 | Family 卡片 | 约：5 members、50 products、Per-member cabinets、All Personal Pro features；**无** Shared monitoring dashboard | [ ] |

---

## C0. 注册与邮箱确认（Supabase Auth）

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| C0.1 | 新邮箱注册（Confirm email 开启） | 显示 **Check your inbox**，非 “Sign up did not complete” | [ ] |
| C0.2 | 收件箱 | 收到 SafeTrack 品牌确认邮件（若已按 `docs/SUPABASE-EMAIL-TEMPLATES.md` 配置模板） | [ ] |
| C0.3 | 点击确认链接 | 跳转 `/auth/callback` 并登录成功 | [ ] |
| C0.4 | 验证页 **Resend** | 60s 倒计时后可重发；成功有提示 | [ ] |

---

## C. Free 计划

（2 药上限 · 仅 Daily digest · 无 Instant 邮件 · 站内通知可用）

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| C1 | Free 账号添加第 1、2 个药 | 成功，`status=active` | [ ] |
| C2 | 尝试添加第 3 个药 | **402**，UpgradeModal 引导 Personal Pro | [ ] |
| C3 | `/settings/notifications` | **无** Instant 开关；有说明 +「View plans →」；Daily digest 可开关 | [ ] |
| C4 | PATCH `/api/preferences` 设 `email_instant_enabled: true` | **400**，提示需付费计划 | [ ] |
| C5 | 触发召回匹配（加药命中或 sync 后） | **站内通知**有；**不应**收到单条 Class 样式即时邮件 | [ ] |
| C6 | 触发 `/api/sync`（`Authorization: Bearer <CRON_SECRET>`）或等 Cron | 若开启 digest，可收到**每日汇总**邮件 | [ ] |
| C7 | `/pricing` | 显示当前计划为 Free | [ ] |

---

## D. Personal Pro

（20 药 · Instant + Digest · 无 Family 导航）

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| D1 | 从 Free 订阅 Personal（月付或年付） | Checkout 成功；`/pricing?checkout=success`；计划为 Personal Pro | [ ] |
| D2 | Stripe Checkout | 要求填写**账单地址** | [ ] |
| D3 | `/settings/notifications` | Instant 与 Daily digest 均可开关 | [ ] |
| D4 | 开启 Instant，触发新召回通知 | 收到单条分级样式**即时邮件**（需 SMTP） | [ ] |
| D5 | 添加药直至 20 个 active | 第 20 个成功 | [ ] |
| D6 | 尝试第 21 个 | 402，UpgradeModal 引导 Family | [ ] |
| D7 | 药箱表单填写并保存 `lot_number` | 成功；不因 plan 被拦 | [ ] |
| D8 | 顶栏导航 | **无** Family 链接 | [ ] |

---

## E. Family Protection

（50 药 · 5 成员 · 家庭 UX）

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| E1 | 订阅或升级到 Family | 计划为 Family Protection | [ ] |
| E2 | 顶栏 **Family** → `/family` | 可进入成员管理 | [ ] |
| E3 | Personal 账号访问 `/family` | **升级 CTA**，不显示添加成员表单 | [ ] |
| E4 | 添加最多 5 个家庭成员 | 成功 | [ ] |
| E5 | 添加第 6 个成员 | 402，UpgradeModal | [ ] |
| E6 | 加药选择「For: 某成员」 | 保存成功；`/cabinet` 显示 **For: 成员名** | [ ] |
| E7 | 总 active 药至 50 | 成功；第 51 个 402 | [ ] |
| E8 | Instant 邮件 | 与 Personal 相同，可收即时邮件 | [ ] |

---

## F. 监控配额与 paused

（降权：按 `added_at` 保留最早 N 条 `active`，其余 `paused`）

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| F1 | 账号有多条 active 药后降为 Free（订阅结束 / 支付失败 / Stripe 测试） | 仅**最早 2 条** `active`，其余 `paused` | [ ] |
| F2 | `/cabinet` | Active 列表 + **Monitoring paused** 区块与升级说明 | [ ] |
| F3 | 对 `paused` 药触发新 FDA 匹配 | **不应**产生新召回通知 | [ ] |
| F4 | 对 2 条 `active` 药触发匹配 | 仍可产生站内通知（及 digest/instant 按 plan） | [ ] |
| F5 | 从 Free 再升级 Personal | `paused` 按 `added_at` 恢复为 `active`，直至 20 上限 | [ ] |
| F6 | Free 下删除部分 paused 后再加药 | `paused` 不计入名额；仍可加到 2 个 active | [ ] |

---

## G. Stripe 订阅生命周期

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| G1 | 已有订阅时切换 plan 或月/年 | 预览费用 → 确认后**立即**变更；`profiles.plan` 更新 | [ ] |
| G2 | Plan 页 Cancel subscription | `cancel_at_period_end=true`；**账期内**仍为付费 plan | [ ] |
| G3 | 账期结束或测试时钟推进 | 变 Free；监控配额同步为 2 药 | [ ] |
| G4 | `invoice.payment_failed` | plan=free；仅 2 药继续监控 | [ ] |
| G5 | `customer.subscription.deleted` | 同上；可选收到订阅结束邮件 / 退款（Plan B） | [ ] |
| G6 | Stripe Billing Portal（若有入口） | 可打开并返回 `/pricing` | [ ] |

---

## H. 通知渠道组合

（建议用 Personal 或 Family 账号）

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| H1 | 关闭 Email 总开关 | 无 instant / digest 邮件 | [ ] |
| H2 | 仅开 Digest、关 Instant | 无单条即时邮件；可有 digest | [ ] |
| H3 | 仅开 Instant、关 Digest | 有即时邮件；无每日 digest | [ ] |
| H4 | 关闭 Class III | Class III 召回不产生通知 | [ ] |

---

## I. 回归与工程检查

| # | 步骤 | 预期结果 | 通过 |
|---|------|----------|------|
| I1 | `npm test` | 全部通过（含 `lib/plan.test.ts`、`lib/plan-monitoring.test.ts`） | [ ] |
| I2 | `npm run build` | 成功；无 `twilio` / `lib/sms` 引用 | [ ] |
| I3 | 访客 `/check` 2 次限额 | 第 3 次引导注册（回归） | [ ] |
| I4 | 加药后匹配 + dispatch | 邮件链路正常；**不发短信** | [ ] |

---

## J. 最少覆盖路径

时间紧时至少完成以下 8 组：

| 组 | 用例 |
|----|------|
| 1 | A1 + A2 + A3 |
| 2 | C2 |
| 3 | C3 + C4 |
| 4 | D1 + D4 |
| 5 | E2 + E3 + E6 |
| 6 | F1 + F2 |
| 7 | G2 + G3 |
| 8 | G4 或 G5 |

---

## 记录模板

复制下表用于 UAT 签字或 Issue 跟踪。

| 用例编号 | 测试人 | 日期 | 环境 | 账号 plan | 结果 (pass/fail) | 备注 |
|----------|--------|------|------|-----------|------------------|------|
| | | | local / staging | free / personal / family | | |

---

## 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-06-02 | 初版：对应权益对齐与 SMS 移除实施 |
