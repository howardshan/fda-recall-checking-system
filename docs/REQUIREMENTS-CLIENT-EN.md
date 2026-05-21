# FDA Drug Recall Notification Platform — Client Requirements & Scope of Work (Web)

**Document ID**: FDA-NOTIF-SOW-001-WEB-EN  
**Version**: 4.2  
**Date**: 2026-05-19  
**Purpose**: Client sign-off, contract attachment, and quotation basis (**Web only · manual entry · paid subscription**)

> Chinese version: [REQUIREMENTS-CLIENT.md](./REQUIREMENTS-CLIENT.md) (v4.2)

---

## 1. Document Overview

This document defines delivery scope, acceptance criteria, effort, and pricing for the **Web** delivery of **FDA Notification**, for mutual sign-off.

**Scope is based on product requirements confirmed by both parties. It takes effect upon receipt of the project advance payment and written notice to commence; no formal development deliverables before that point.**

**Client confirmation (v4.0, second meeting)**:

- **Web only** (responsive, mobile-browser friendly); **no** native iOS/Android apps  
- **Manual entry** for drug information (including search-and-select); **no** barcode scan or photo/OCR  
- **Membership subscription**: **2 drugs free** after registration; beyond that requires a **paid subscription** (**subscription payment provider to be confirmed by client**; see Section 1)  
- Fixed development price **USD 17,500**, including **3 months post-delivery maintenance** (see **Section 8.2**)  
- Target delivery calendar: **2–3 weeks** for full development (per written plan agreed by both parties)

| Item | Description |
|------|-------------|
| Product | FDA Drug Recall Notification Platform (FDA Notification) |
| Users | U.S. individuals and families |
| Category | Prescription and OTC **drugs** (FDA Drugs) |
| Language | English (en-US) |
| Format | Web application (Phase 1 MVP → Phase 2 full release) |
| Contract scope | Web, manual entry, recall notifications, medicine cabinet, **subscription billing**, **read-only admin dashboard** |

**Pricing**:

| Item | Value |
|------|-------|
| Rate | **USD 100 / hour** |
| Total hours | **175 hours** |
| Fixed contract price | **USD 17,500** (= 175 × $100) |
| Maintenance included | **3 months** after delivery (see Section 8.2) |

**Technical integrations (client provides accounts; usage fees excluded from development fee)**:

| Service | Use |
|---------|-----|
| **Supabase** | Database (client creates project and grants developer access) |
| **SMTP2go or other email delivery provider** | Email (domain-branded sender recommended) |
| **Twilio or other SMS provider** | SMS |
| **Stripe or subscription payment provider** | Subscriptions and payments; must support recurring billing and Webhooks |

**Subscription payment provider (pending written client confirmation)**:

- Client must **confirm in writing** the provider to use **before Phase 2 development starts** (e.g. **Stripe**, or another platform with equivalent subscription APIs).  
- This engagement implements standard capabilities of the chosen provider: **checkout/subscription portal, customer accounts, subscription plans, Webhook status sync**, and admin-side display.  
- If the chosen provider **lacks** equivalent APIs, both parties will confirm scope, schedule, and fees separately.  
- Development fee **excludes** payment provider fees, tax filing, and chargeback/dispute handling.

**Costs borne by client (not included in development fee)**:

- Supabase / frontend hosting and other cloud monthly fees  
- Email and SMS usage charges  
- Subscription payment provider transaction fees  
- Domain and SSL certificate  
- Legal copy attorney fees (vendor may supply static placeholder pages)

---

## 2. Project Goals (Client-Visible Value)

1. **Proactive protection**: Users manually register medicines in the cabinet; on FDA recall match, alerts via **email**, **in-app notifications** (Phase 1, see M8), and **SMS** (full release).  
2. **On-demand checks**: Manual entry to query recalls; **2 queries** for guests without login, then registration required.  
3. **Monetization**: **2 drugs** monitored free; additional drugs or family use via **paid subscription** (provider TBD; pricing in Section 5).  
4. **Risk classification**: Class I / II / III **distinct notification templates and UI styling** (aligned with FDA presentation).  
5. **Compliance**: Information aggregation and alerts only; no medical or discontinuation advice.  
6. **Timeliness**: FDA data updated about **weekly**; after a match, users receive notifications on enabled channels within **24 hours** (SLA below).

**Service level (SLA)**:

| Item | Commitment |
|------|------------|
| FDA recall data sync | About **weekly** incremental/full sync |
| User notification delivery | Within **24 hours** of match via email / in-app / SMS (per user preferences and SMS opt-in) |

---

## 3. Phase 1 — MVP (Mid-Term Delivery)

**Goal**: Recall data, accounts and profile, cabinet (manual entry, 2-drug free limit), matching with email/in-app notifications, limited guest lookup, unknown-manufacturer messaging.

**Not in this phase**: SMS, browser/Web Push, family cabinets, subscription payment end-to-end (may block 3rd drug with upgrade prompt), admin dashboard.

**Phase hours**: **102 hours** (**USD 10,200**)

### 3.1 Module Detail

| ID | Module | Description | Acceptance | Hours |
|----|--------|-------------|------------|-------|
| **M1** | FDA recall data | Public data full/incremental sync; Class, reason, firm, dates, lots, etc. | Queryable; last sync time shown | 12 |
| **M2** | Drug directory | NDC directory; name search to assist manual entry | Search when adding to cabinet | 6 |
| **M3** | Recall matching | Name/firm/NDC match; lot comparison; triggers on new recall or new drug; dedup; **clear message when firm not in directory** | Test cases pass; unknown firm copy clear | 16 |
| **M4** | Account & profile | Email sign-up/login, forgot password, **Google OAuth**; **required**: display name (may be pseudonym), age, gender, race (options) | Full registration/login flow | 12 |
| **M5** | Personal cabinet | **Manual entry**; required drug name and manufacturer; optional NDC, lot; **drug-name-centric UI**; **delete stops monitoring, no history, no recycle bin** | CRUD rules met | 11 |
| **M6** | Monitoring on/off | **No expected stop date**; user **deletes or stops** drug to end monitoring | No further alerts for that drug | 2 |
| **M7** | Email alerts | On match: drug, firm, registration time, class, reason summary, FDA link | Test inbox receives | 6 |
| **M8** | In-app notification center | History and read state | Same triggers as email | 4 |
| **M9** | Class-based copy | Class I/II/III **different templates** (full styling in Phase 2) | Client-approved templates live | 3 |
| **M10** | User interface | Cabinet, affected recalls, detail, disclaimer; **client Logo and visual assets** | Unhandled recalls viewable | 8 |
| **M11** | Instant recall lookup | **2 tries without login**; then register; manual entry / NDC; three-state results | 3rd try prompts sign-up; samples pass | 7 |
| **M12** | Privacy & legal pages | Client-supplied privacy policy, terms, cookie policy; **static pages**, no CMS | Accessible and agreed before sign-up | 2 |
| **M13** | Ops monitoring (basic) | Sync logs; failure alerts to ops email | Configured mailbox receives alerts | 2 |
| **SUB-01** | Free tier & gate | **2 drugs** free after registration; 3rd requires subscription (upgrade prompt before Phase 2 payment) | Cannot add over limit or clear upgrade prompt | 6 |
| **M14** | Test & launch | Testing, deploy, 1 UAT round | MVP checklist passed | 5 |
| **M15** | PM & documentation | Demo, acceptance materials, English user guide | MVP milestone signed | 4 |
| | **Phase 1 total** | | | **102** |

### 3.2 Phase 1 — MVP Acceptance Checklist

- [ ] Recall data syncs; last update time displayed  
- [ ] Registration with required profile fields; Google login works  
- [ ] Guests may query **2 times** only, then must register  
- [ ] Manual cabinet; max **2** free monitored drugs; no tracking after delete  
- [ ] Unknown manufacturer shows “cannot track” messaging  
- [ ] Email and in-app notifications on match while monitoring  
- [ ] Instant lookup works (no scan, photo, SMS, browser/Web Push)  
- [ ] Static legal pages and cookie notice live  
- [ ] MVP environment stable; daily sync runs  

---

## 4. Phase 2 — Full Web Delivery (Final Release)

**Goal**: Subscription payment (provider TBD), family cabinets, SMS, notification preferences, lot parsing enhancement, recall browser, admin dashboard, data export.

**Not in this phase**: Barcode scan, photo/OCR, browser/Web Push, native app push, generic NDC expansion.

**Phase hours**: **73 hours** (**USD 7,300**)

### 4.1 Module Detail

| ID | Module | Description | Acceptance | Hours |
|----|--------|-------------|------------|-------|
| **V2-4** | Family member cabinets | Separate cabinets and notifications per member; all drugs added manually | Member switch correct | 7 |
| **V2-6** | Lot parsing enhancement | Better lot extraction from recall text (with manual lot entry) | Agreed samples pass | 6 |
| **V2-7** | Recall notice browser | Browse recalls by class, date | Filter and detail view | 6 |
| **V2-8** | Notification preferences | User selects **email / SMS / in-app** channels and **Class** levels to receive | Settings match delivery behavior | 5 |
| **V2-9** | SMS (Web) | Opt-in phone binding; recall SMS (Twilio or client-confirmed equivalent) | Test number receives | 7 |
| **V2-10** | Account data export | User exports personal data | Download works | 2 |
| **ADM-02** | Admin dashboard | Client **read-only** view: users, subscription status, cabinets, notifications summary | Client account can log in and view | 13 |
| **SUB-03** | Subscription & billing | Personal/family plans on **confirmed subscription payment provider**; monthly/yearly; Webhook sync | Subscription completable in test env | 24 |
| **V2-INT** | Integration & QA buffer | Payment Webhooks, SMS gateway, environment cutover, cross-module integration | Phase 2 checklist passed | 8 |
| **V2-12** | Test & final acceptance | Full regression, 1 UAT, production launch | Sections 4 & 5 checklist passed | 5 |
| | **Phase 2 total** | | | **73** |

*Cancelled: V2-1 barcode, V2-2 photo, V2-3 scan-to-add, generic NDC linking.*

### 4.2 Phase 2 — Final Acceptance Checklist

- [ ] **Subscription payment** (confirmed provider) works; payment failure **immediately** stops paid entitlements per rules  
- [ ] Cancel: access until **end of current billing period**; upgrade **immediate** at new price  
- [ ] **Address required** at payment if not collected at registration  
- [ ] Notification preferences (email/SMS/in-app) and **Class** filtering work; SMS respects opt-in  
- [ ] Family cabinet and class-specific notification styling correct  
- [ ] Lot enhancement, recall browser, data export available  
- [ ] Admin dashboard shows user and business data  
- [ ] No scan/photo entry points site-wide  
- [ ] **Full Web** live in production  

---

## 5. Subscription & Billing (SUB)

**End-user pricing (charged by client to users; second-meeting consensus; drug count limits per plan TBD)**:

| Plan | Price | Notes |
|------|-------|-------|
| Free | $0 | Up to **2** monitored drugs after registration |
| Personal | **$4.99/mo**, **$49.99/yr** | Subscription required beyond free tier |
| Family | **$9.99/mo**, **$99.99/yr** | Works with family cabinet |
| Tiered by drug count | **TBD** | Whether to tier by number of drugs — client to confirm |

**Subscription business rules (implementation; independent of payment provider)**:

| Rule | Description |
|------|-------------|
| Payment method | Client may allow **saved payment methods** (per provider capability, e.g. saved card) |
| Cancel | Access continues until **end of current billing period** |
| Upgrade | **Immediate** effect at new plan price |
| Payment failure | **Immediate** stop of subscription entitlements (add drugs, monitoring, paid notifications, etc.) |
| Address at payment | **Required** |

**In-scope development**: Integration with confirmed provider for **checkout/subscription, customer, plans, Webhooks**, and admin display; **excludes** transaction fees, tax, chargeback/dispute handling.

---

## 6. Explicitly Out of Scope

- Native **iOS / Android** apps; **browser/Web Push** and **native app push**  
- Barcode scan, photo / OCR  
- Medical diagnosis, dosing/discontinuation advice, non-recall medication reminders  
- Markets outside the U.S.; prescribing; pharmacy ERP  
- Generic drug NDC expansion  
- Legal page **CMS** for online copy edits  
- App store fees; 24/7 on-site operations (outside maintenance period unless separately agreed)

### Future Extensions

| Area | Notes |
|------|-------|
| Barcode scan / photo OCR | Scan box or OCR |
| Tiered pricing by drug count (if not in this release) | Adjust provider-side plans/prices |
| Drug–drug interaction | Cabinet conflict detection |
| Cosmetics / food recalls | Separate data sources |
| Native mobile apps | iOS / Android |

---

## 7. Effort & Pricing Summary

| Phase | Content | Hours | USD | Confirm ☐ |
|-------|---------|-------|-----|-----------|
| Phase 1 | MVP | 102 | 10,200 | |
| Phase 2 | Full Web (subscription payment, admin) | 73 | 7,300 | |
| **Total** | **Development & delivery** | **175** | **17,500** | |

- Rate: **USD 100 / hour**  
- Fixed price: **USD 17,500**  
- **Includes**: **3 months maintenance** after delivery (not new features; see Section 8.2)

---

## 8. Payment, Maintenance & Milestones

### 8.1 Payment Milestones (Optional)

| Milestone | Deliverable | Suggested % | Reference USD |
|-----------|-------------|-------------|---------------|
| Contract signed + advance | Signed SOW + project plan | 30% | 5,250 |
| **Phase 1 MVP accepted** | Section 3 checklist passed | 40% | 7,000 |
| **Phase 2 final acceptance** | Sections 4 & 5 live | 30% | 5,250 |

### 8.2 Maintenance (Included in USD 17,500)

**Term**: **3 months** from full-release acceptance.

**Includes**:

- **Bug fixes** within accepted scope  
- Reasonable adaptation to **non-breaking** changes in FDA public APIs  
- Consultation on **security patch**-level dependency updates (no large refactors)

**Excludes**:

- New features (including rule changes after Section 5 pricing is finalized)  
- Issues caused by client changes to third-party configuration  
- 24/7 staffing, performance projects, new markets/categories

---

## 9. Changes & Disclaimers

1. Commencement per advance payment and written notice.  
2. This contract = **175 hours**, **USD 17,500**, including **3 months maintenance**; scope per this document.  
3. After client confirms the **subscription payment provider**, if the provider is changed or Section 5 “TBD” pricing changes plan/price structure, both parties confirm whether that is a change order and fee adjustment.  
4. New features after signature require written agreement on additional hours and fees.  
5. FDA data and third-party services depend on external platforms.  
6. Legal effect subject to master agreement.

---

## 10. Signatures

| | Client | Developer |
|---|--------|-----------|
| Company | | |
| Authorized representative | | |
| Signature | | |
| Date | | |

---

## Appendix A — Client Action Items

| # | Item | Status |
|---|------|--------|
| 1 | Logo, photos, and visual assets | ☐ |
| 2 | Privacy policy, terms of service, cookie policy text | ☐ |
| 3 | Supabase project created; developer access granted | ☐ |
| 4 | SMTP2go registration (domain email recommended) | ☐ |
| 5 | **Confirm subscription payment provider** (e.g. Stripe) and complete account setup & verification | ☐ |
| 6 | Final membership pricing (drug limits per plan, tiered pricing yes/no) | ☐ |

---

## Revision History

| Version | Date | Notes |
|---------|------|-------|
| 4.0 EN | 2026-05-19 | Subscription, admin; USD 17,500 / 175h |
| 4.1 EN | 2026-05-19 | Removed Web Push; V2-INT buffer; SLA; in-app notification wording |
| 4.2 EN | 2026-05-19 | Aligned with Chinese v4.2: payment provider TBD; no Web Push |

---
