# Supabase Auth 邮件模板（SafeTrack 品牌）

注册确认、重置密码等邮件由 **Supabase Auth** 发送，样式在 Supabase 控制台配置，**不会**读取项目 `.env` 中的 `SMTP_*`。

应用内召回邮件模板见 [`emails/recall-alert.html`](../emails/recall-alert.html)。

---

## 注册确认邮件（Confirm signup）

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目  
2. **Authentication** → **Email Templates** → **Confirm signup**  
3. **Subject**（建议）：

   ```text
   Confirm your SafeTrack account
   ```

4. **Body**：复制 [`emails/supabase-confirm-signup.html`](../emails/supabase-confirm-signup.html) 的全部内容粘贴到 HTML 编辑器。

5. 保存后，用新邮箱注册测试；在 **Authentication → Users** 可查看 `confirmation_sent_at`。

### 模板变量说明

Supabase 使用 Go 模板语法，本模板使用：

| 变量 | 用途 |
|------|------|
| `{{ .ConfirmationURL }}` | 确认按钮与备用链接（必填） |
| `{{ .Email }}` | 用户邮箱 |
| `{{ .SiteURL }}` | 项目 Site URL |

勿删除 `{{ .ConfirmationURL }}`，否则用户无法完成验证。

---

## 重置密码邮件（Reset password）

1. **Authentication** → **Email Templates** → **Reset password**（部分项目显示为 **Recovery**）  
2. **Subject**（建议）：

   ```text
   Reset your SafeTrack password
   ```

3. **Body**：复制 [`emails/supabase-reset-password.html`](../emails/supabase-reset-password.html) 的全部内容粘贴到 HTML 编辑器。

4. 保存后，在 `/forgot` 输入邮箱测试；邮件应显示 SafeTrack 品牌样式与橙色 **Reset password** 按钮。

### 模板变量说明

| 变量 | 用途 |
|------|------|
| `{{ .ConfirmationURL }}` | 重置按钮与备用链接（必填） |
| `{{ .Email }}` | 用户邮箱 |
| `{{ .SiteURL }}` | 项目 Site URL |

应用内 `redirectTo` 已指向 `/auth/callback?next=/reset`，确认 **Redirect URLs** 包含 `{APP_URL}/auth/callback`。

---

## SMTP 与跳转 URL

- **Custom SMTP**：**Project Settings** → **Authentication** → **SMTP Settings**（如 SMTP2GO：`mail.smtp2go.com`，端口 `587` 或 `2525`）。  
- **Redirect URLs**：**Authentication** → **URL Configuration**  
  - Site URL 与 `NEXT_PUBLIC_APP_URL` 一致（如 `http://localhost:3000`）  
  - Redirect URLs 包含：`{APP_URL}/auth/callback`  

---

## 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-06-02 | 注册确认 HTML 与配置说明 |
| 1.1 | 2026-06-04 | 重置密码 HTML 与配置说明 |
