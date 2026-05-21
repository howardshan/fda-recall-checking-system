# FDA Drug Recall Notification Platform — Client Requirements & Scope of Work (Web)

**Document ID**: FDA-NOTIF-SOW-001-WEB-EN  
**Version**: 4.0  
**Date**: 2026-05-19  
**Purpose**: Client sign-off, contract attachment, and quotation basis (**Web only · manual entry · paid subscription**)

> Chinese version: [REQUIREMENTS-CLIENT.md](./REQUIREMENTS-CLIENT.md)

---

## 1. Document Overview

This document defines delivery scope, acceptance criteria, effort, and pricing for the **Web** delivery of **FDA Notification**.

**Scope takes effect upon advance payment and written notice to commence. No deliverables before that point.**

**Client confirmation (v4.0, meeting 2)**:

- **Web only** (responsive, mobile-browser friendly); **no** native iOS/Android apps  
- **Manual entry** for drug information; **no** barcode scan or photo/OCR  
- **Subscription**: **2 drugs free** after registration; more require **Stripe** paid plans  
- Fixed price **USD 17,500**, including **3 months post-delivery maintenance** (Section 9.2)  
- Target calendar: **2–3 weeks** for full delivery (per written plan)

| Item | Description |
|------|-------------|
| Product | FDA Drug Recall Notification Platform |
| Users | U.S. individuals and families |
| Category | Prescription and OTC **drugs** (FDA) |
| Language | English (en-US) |
| Format | Web (Phase 1 MVP → Phase 2 full release) |
| Scope | Web, manual entry, recall alerts, cabinet, **billing**, **read-only admin** |

**Pricing**:

| Item | Value |
|------|-------|
| Rate | **USD 100 / hour** |
| Total hours | **175** |
| Fixed price | **USD 17,500** |
| Maintenance | **3 months** after acceptance (Section 9.2) |

**Integrations (client accounts; fees excluded)**:

| Service | Use |
|---------|-----|
| Supabase | Database |
| SMTP2go | Email (domain-branded sender recommended) |
| Twilio | SMS |
| Stripe | Subscriptions |

**Client-paid (not in dev fee)**: hosting, email/SMS usage over free tiers, Stripe fees, domain/SSL, legal drafting.

---

## 2. Project Goals

1. **Proactive alerts**: Manual cabinet; email, in-app, SMS (full), and **Web Push** (full) on recall match.  
2. **Lookup**: Manual entry; **2 guest queries** without login, then registration required.  
3. **Monetization**: **2 free drugs**; Stripe plans for more (Section 5; some limits TBD).  
4. **Risk classes**: Class I/II/III **distinct templates and UI styles** (FDA-aligned).  
5. **Compliance**: Information only; no medical advice.  
6. **Timeliness**: FDA data ~**weekly**; user notified within **24 hours** (Section 7).

---

## 3. Phase 1 — MVP

**Hours**: **102** (**USD 10,200**)

| ID | Module | Hours |
|----|--------|-------|
| M1 | FDA recall data | 12 |
| M2 | Drug directory | 6 |
| M3 | Matching + unknown manufacturer message (option 1) | 16 |
| M4 | Accounts + profile (username, age, gender, race) + Google OAuth | 12 |
| M5 | Cabinet: manual, drug-name-centric, delete = stop, no history | 11 |
| M6 | Manual stop (no expected stop-date) | 2 |
| M7 | Email | 6 |
| M8 | In-app notifications | 4 |
| M9 | Class templates (styles enhanced in Phase 2) | 3 |
| M10 | UI + client branding assets | 8 |
| M11 | Instant lookup: **2 guest tries**, then register | 7 |
| M12 | Static legal pages (client text) | 2 |
| M13 | Ops monitoring | 2 |
| SUB-01 | Free tier: 2 drugs; gate 3rd | 6 |
| M14 | Test & launch | 5 |
| M15 | PM & docs | 4 |
| | **Total** | **102** |

### 3.2 MVP acceptance

- [ ] Sync + last update time  
- [ ] Registration with required profile; Google login  
- [ ] **2** guest queries, then sign-up required  
- [ ] Cabinet manual; max **2** free drugs; delete stops tracking  
- [ ] Unknown manufacturer: cannot track (option 1)  
- [ ] Email + in-app on match  
- [ ] No scan/photo/SMS/Push in MVP  
- [ ] Static legal + Cookie notice  
- [ ] Stable MVP; daily sync  

---

## 4. Phase 2 — Full Web Release

**Hours**: **73** (**USD 7,300**)

| ID | Module | Hours |
|----|--------|-------|
| V2-4 | Family cabinets | 7 |
| V2-6 | Lot parsing enhancement | 6 |
| V2-7 | Recall browser | 6 |
| V2-8 | Notification preferences (channels + classes) | 5 |
| V2-9 | SMS (Twilio) | 7 |
| V2-10 | **Web Push** | 9 |
| V2-11 | Data export | 2 |
| ADM-02 | Read-only admin dashboard | 13 |
| SUB-03 | Stripe subscriptions + webhooks | 24 |
| V2-12 | UAT & production | 5 |
| | **Total** | **73** |

### 4.2 Final acceptance

- [ ] Stripe live; payment failure stops paid access  
- [ ] Cancel: access until period end; upgrade immediate  
- [ ] Address required at payment  
- [ ] SMS + Web Push per preferences  
- [ ] Family cabinet + class styling  
- [ ] Admin dashboard for client  
- [ ] Full Web live  

---

## 5. Subscription (SUB)

| Plan | Price |
|------|-------|
| Free | 0 — up to **2** drugs |
| Personal | **$4.99/mo**, **$49.99/yr** |
| Family | **$9.99/mo**, yearly TBD |
| Tiered by drug count | Under consideration |

**Rules**: optional saved card; cancel through period end; upgrade immediate; **payment failure = immediate stop**; address required at payment.

---

## 6. Out of Scope

Native apps; barcode/photo OCR; medical advice; non-U.S.; generic NDC expansion; legal CMS; on-site 24/7 ops outside maintenance.

**Includes Web Push** (not native push).

---

## 7. Client confirmation checklist

Includes: drug limits per plan, family yearly price, tiered pricing yes/no, address timing, 2 guest queries, SLA 24h, **USD 17,500 / 175h + 3mo maintenance**, 2–3 week target.

---

## 8. Summary

| Phase | Hours | USD |
|-------|-------|-----|
| 1 MVP | 102 | 10,200 |
| 2 Full | 73 | 7,300 |
| **Total** | **175** | **17,500** |

---

## 9. Payment & maintenance

**Payment (optional)**: 30% / 40% / 30% → USD 5,250 / 7,000 / 5,250  

**3-month maintenance included**: bug fixes in scope; reasonable FDA API changes; excludes new features.

---

## 10. Signatures

| | Client | Developer |
|---|--------|-------------|
| Company | | |
| Representative | | |
| Signature | | |
| Date | | |

---

## Appendix A — Client action items

Logo/assets, legal text, Supabase, SMTP2go, Stripe, final plan limits and pricing.

---

## Revision history

| Version | Date | Notes |
|---------|------|-------|
| 4.0 EN | 2026-05-19 | Aligned with Chinese v4.0: subscription, Web Push, admin, USD 17,500 |
