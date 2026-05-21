# FDA Drug Recall Notification Platform — Client Requirements & Scope of Work (Web)

**Document ID**: FDA-NOTIF-SOW-001-WEB-EN  
**Version**: 3.0  
**Date**: 2026-05-19  
**Purpose**: Client sign-off, contract attachment, and basis for project quotation (**Web only · manual entry**)

> Chinese version: [REQUIREMENTS-CLIENT.md](./REQUIREMENTS-CLIENT.md)

---

## 1. Document Overview

This document defines the **delivery scope**, **acceptance criteria**, **effort estimates**, and **pricing** for the Web delivery of **FDA Notification**, for signature by both parties.

**Scope is based on product requirements confirmed by both parties. It takes effect upon receipt of the project advance payment and written notice to commence work. No formal development deliverables are provided before that point.**

**Client confirmation (v3.0)**: **Web only**; drug information is captured via **manual user entry** (including search-assisted selection); **excludes** barcode scanning, photo/OCR recognition, and native mobile applications.

| Item | Description |
|------|-------------|
| Product name | FDA Drug Recall Notification Platform (FDA Notification) |
| Target users | Individuals and families in the U.S. market |
| Initial category | Prescription and OTC **drugs** (FDA Drugs) |
| UI language | English (en-US) |
| Delivery format | **Web application** (Phase 1 MVP → Phase 2 full release); mobile-browser friendly |
| Contract scope | **Web only**; **manual entry** for drug information; no App, scanning, or photo recognition |

**Pricing terms**:

| Item | Amount / effort |
|------|-----------------|
| Hourly rate | **USD 100 / hour** |
| Total contract hours | **124 hours** |
| Fixed contract price | **USD 12,400** (= 124 × $100) |

**Costs not included in development fees (borne by the client)**:

- Cloud hosting / database monthly fees  
- Email and SMS third-party service registration, compliance approval, and usage fees  
- Domain and SSL certificates (if purchased separately)  
- Legal drafting of Privacy Policy, Terms of Use, and Cookie Policy (we can provide placeholder pages)  

---

## 2. Project Goals (Client-Facing Value)

1. **Proactive protection**: Users **manually register** medications in a personal **medicine cabinet**; when the FDA publishes a related recall, the platform alerts them via email, in-app messages, and SMS (full release).  
2. **On-demand checks**: Users **manually enter** drug name, manufacturer, NDC, lot number, and related fields to check recall status (**no** barcode scanning or photo recognition).  
3. **Risk classification**: Display FDA **Class I / II / III** with links to official information.  
4. **Compliance**: Information aggregation and alerts only; **no** medical or stop-medication advice.  
5. **Delivery cadence**: **MVP** first, then **full Web release** for production use.

---

## 3. Phase 1 — MVP (Mid-Term Delivery)

**Objective**: FDA recall data, accounts, medicine cabinet (manual entry), automatic matching, email/in-app notifications, and manual instant recall lookup.

**Not included in this phase**: Barcode scanning, photo/OCR, SMS, family member cabinets, mobile App, generic-drug NDC expansion.

**Phase effort**: **81 hours** (**USD 8,100**)

### 3.1 Feature modules

| ID | Module | Description | Acceptance criteria | Hours |
|----|--------|-------------|---------------------|-------|
| **M1** | FDA recall data | Full and incremental sync from public sources; store class, reason, firm, dates, lot info, etc. | Data queryable; last sync time shown | 12 |
| **M2** | Drug directory | U.S. NDC directory; name search to assist manual entry | Search when adding to cabinet | 6 |
| **M3** | Recall matching engine | Match by drug name / manufacturer / NDC; lot comparison; checks on new recalls and newly added drugs; deduplicated alerts | Test cases trigger without duplicate alerts | 15 |
| **M4** | User accounts | Email sign-up/login; password reset; **Google OAuth** | End-to-end flows work | 9 |
| **M5** | Personal medicine cabinet | **Manual entry**; **required**: drug name, manufacturer; **optional**: NDC, lot; edit / deactivate / delete | Cabinet CRUD works | 11 |
| **M6** | Monitoring policy | Monitor until **expected stop-date** (see Section 6) | Per agreed policy | 2 |
| **M7** | Email notifications | Drug name, manufacturer, registration time, class, reason summary, FDA link | Test inbox receives correct emails | 6 |
| **M8** | In-app notification center | History and read/unread state | Consistent with email triggers | 4 |
| **M9** | Class-based copy | Class I / II / III templates (see Section 6) | Templates live after client approval | 2 |
| **M10** | User interface | Cabinet, affected recalls, details, disclaimer | User sees open items | 7 |
| **M11** | Instant recall lookup | **Manual** drug info / NDC; three outcomes (match / possible / none) | Sample cases pass | 6 |
| **M12** | Legal pages | Privacy Policy, Terms of Use, disclaimer, **Cookie notice** | Accessible before sign-up; consent captured | 2 |
| **M13** | Operations monitoring (basic) | Sync logs; email alert on failure | Alerts reach designated inbox | 2 |
| **M14** | Test & launch | Testing, deployment, one UAT round | MVP checklist passed | 5 |
| **M15** | Project management & docs | Demos, acceptance materials, brief English user guide | MVP milestone acknowledged | 4 |
| | **Phase 1 total** | | | **81** |

### 3.2 Phase 1 — MVP acceptance checklist

- [ ] Recall data syncs; last update time is displayed  
- [ ] Email / Google login; cabinet maintained via **manual entry** (drug name + manufacturer required)  
- [ ] During monitoring period, matching recalls trigger email and in-app alerts  
- [ ] Alerts include class, reason, and FDA link  
- [ ] **Manual** instant lookup only (no scan, photo, or SMS)  
- [ ] Legal pages and Cookie notice are live  
- [ ] MVP environment is stable; sync runs daily  

---

## 4. Phase 2 — Full Web Delivery (Final Release)

**Objective**: Build on MVP with SMS, family cabinets, enhanced lot parsing, recall browsing, notification preferences, and data export; **still manual entry only** for drug information.

**Not included in this phase**: Barcode scanning, photo/OCR, scan/photo add-to-cabinet flows.

**Phase effort**: **43 hours** (**USD 4,300**)

### 4.1 Feature modules

| ID | Module | Description | Acceptance criteria | Hours |
|----|--------|-------------|---------------------|-------|
| **V2-4** | Family member cabinets | Separate cabinets and alerts per member; all drugs **added manually** | Member switching works | 7 |
| **V2-6** | Lot parsing enhancement | Better lot extraction from recall text (with manually entered lots) | Agreed samples pass | 7 |
| **V2-7** | Recall notice browser | Browse by class and date | Filter and view details | 8 |
| **V2-8** | Notification preferences | Email/SMS toggles, class levels, etc. | Settings match delivery behavior | 5 |
| **V2-9** | SMS notifications (Web) | Opt-in phone binding; recall SMS | Test number receives messages | 8 |
| **V2-10** | Account data export | Export personal data | Download in agreed format | 2 |
| **V2-11** | Test & final acceptance | Full-release UAT and production launch | Final checklist passed | 7 |
| | **Phase 2 total** | | | **43** |

*Cancelled and out of scope: V2-1 barcode scan, V2-2 photo recognition, V2-3 scan/photo add-to-cabinet, generic NDC expansion.*

### 4.2 Phase 2 — Final acceptance checklist

- [ ] SMS works with preferences and opt-in  
- [ ] Family cabinets (manual maintenance) and alerts are correct  
- [ ] Lot enhancement, recall browser, preferences, and export work  
- [ ] **No** barcode or photo recognition entry points site-wide  
- [ ] **Full Web release** is live in production  

---

## 5. Explicitly Out of Scope

- Native **iOS / Android** apps and **push notifications**  
- **Barcode scanning**, **photo / OCR recognition**, and intake flows based on recognition  
- Medical diagnosis or medication / stop-medication advice  
- Non-U.S. markets; prescribing; pharmacy ERP integration  
- Generic-drug NDC expansion  
- App store developer annual fees; SMS/email usage charges  
- Client legal fees; SaMD filings; 24/7 on-site operations  

### Future extensions (separate quotation)

| Area | Notes |
|------|-------|
| Barcode scan / photo recognition | Scan or OCR pre-fill |
| Drug–drug interactions | In-cabinet conflict detection |
| Cosmetics / food recalls | Separate data pipelines |
| Pharmacy B2B scanning | Dispensing verification |
| Native mobile apps | iOS / Android + Push |

---

## 6. Items for Client Confirmation (check before signing)

| # | Topic | Client choice |
|---|-------|---------------|
| 1 | Cabinet monitoring end | ☐ Expected stop-date ☐ Fixed 2/3 months ☐ Other: ______ |
| 2 | Alerts after stop-date | ☐ No alerts ☐ Still by NDC ☐ Class I only |
| 3 | Instant lookup without login | ☐ Allowed ☐ Login required |
| 4 | Class II / III templates | ☐ Same as Class I ☐ Different templates ☐ No alert |
| 5 | Default notifications & user overrides | Default: ______; user can change channel/class: ☐ Yes ☐ No |
| 6 | SMS / email service accounts | ☐ Client provides ☐ We configure (client pays service fees) |
| 7 | Legal document text | ☐ Client provides ☐ Our placeholder + client revision |
| 8 | Operations alert email | ______________________________ |
| 9 | Sync SLA | Notify users within ______ hours after FDA data updates |
| 10 | Start condition | Start within ______ business days after advance payment |
| 11 | Contract scope | ☐ Confirm **Web only, manual entry, USD 12,400 / 124 hours** |
| 12 | Input method | ☐ Confirm **no** scanning or photo recognition (per v3.0 scope) |

---

## 7. Effort & pricing summary

| Phase | Scope | Hours | Amount (USD) | Confirm ☐ |
|-------|-------|-------|--------------|-----------|
| Phase 1 | MVP (manual entry + core alerts) | 81 | 8,100 | |
| Phase 2 | Full Web (SMS, family cabinet, etc.; still manual entry) | 43 | 4,300 | |
| **Total** | **Web product** | **124** | **12,400** | |

- Rate: **USD 100 / hour**  
- Fixed price: **USD 12,400** (scope per this document; changes subject to separate agreement)  

---

## 8. Payment & milestones (optional)

| Milestone | Deliverable | Suggested % | Reference (USD) |
|-----------|-------------|-------------|-----------------|
| Contract signed + advance paid | Signed scope + project plan | 30% | 3,720 |
| **Phase 1 MVP acceptance** | Section 3 checklist passed | 40% | 4,960 |
| **Phase 2 final acceptance** | Section 4 checklist passed; full Web live | 30% | 3,720 |

---

## 9. Changes & disclaimers

1. Work starts upon advance payment and written notice to commence.  
2. This contract is **124 hours** of Web work at **USD 12,400**; drug intake is **manual entry** only—no scanning or photo recognition unless agreed in writing with adjusted pricing.  
3. Post-signature changes require written agreement on additional effort and fees.  
4. FDA data depends on third-party public APIs.  
5. Payment, IP, confidentiality, and liability are governed by the **master agreement**.  

---

## 10. Signatures

| | Client (Party A) | Developer (Party B) |
|---|------------------|---------------------|
| Company | | |
| Authorized representative | | |
| Signature | | |
| Date | | |

---

## Appendix A — Open topics (alignment meeting)

| # | Topic |
|---|-------|
| 1 | Handling manufacturer changes or missing manufacturers in the NDC directory |
| 2 | Whether to alert when a drug marked “finished” is later recalled |
| 3 | Collecting expected stop-date and policy after stop-date |
| 4 | Cabinet UI: organized by drug vs. by treatment course |


