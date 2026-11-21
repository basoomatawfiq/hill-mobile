# HILL MOBILE — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Viewer Freedom**: Public viewers require zero authentication to read `categories`, `programmes`, `featured_programmes`, `notifications`, and `app_settings/public`.
2. **Admin-Only Mutations**: No anonymous or non-admin user may create, update, or delete any document in any collection.
3. **Verified Identity & Anti-Spoofing**: All admin checks enforce `request.auth != null && request.auth.token.email_verified == true`.
4. **Immutable Audit Trail**: Documents in `audit_logs` are append-only (`create` by verified admin only; `update` and `delete` are permanently denied).
5. **PII Isolation**: `administrators` and `audit_logs` contain email addresses and operational logs and are never publicly readable or listable.
6. **Strict Schema Enforcement & Temporal Integrity**: All writes require exact keys (`hasAll` + `hasOnly`), validated field types and max lengths, valid IDs (`^[a-zA-Z0-9_\-]+$`), and server timestamps (`request.time`).

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated Category Create**: Anonymous client attempts `create` on `/categories/cat1`. Expected: `PERMISSION_DENIED`.
2. **Non-Admin Authenticated Write**: Signed-in non-admin Google user attempts `create` on `/programmes/vid123456`. Expected: `PERMISSION_DENIED`.
3. **Unverified Email Spoof**: Token with `email: "basoomatawfiq1427@gmail.com"` and `email_verified: false` attempts admin write. Expected: `PERMISSION_DENIED`.
4. **Self-Assigned Admin Escalation**: Non-admin user attempts `create` on `/administrators/{ownUid}` with `role: "owner"`. Expected: `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: Verified admin attempts `create` on `/categories/news` with extra unexpected field `isSystemOverride: true`. Expected: `PERMISSION_DENIED`.
6. **ID Poisoning (1.5KB Document ID)**: Verified admin attempts write on `/categories/{1500-char-id}`. Expected: `PERMISSION_DENIED`.
7. **Invalid ID Characters**: Admin attempts write on `/programmes/vid$bad!id`. Expected: `PERMISSION_DENIED`.
8. **Type / Boundary Poisoning**: Admin writes `/categories/lectures` with `name` > 60 chars or `sortOrder: "first"` (string instead of int). Expected: `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Admin writes `/notifications/n1` with a past client-chosen timestamp instead of `request.time`. Expected: `PERMISSION_DENIED`.
10. **Actor UID Spoofing**: Admin writes `/audit_logs/log1` setting `actorUid` to a different user's UID. Expected: `PERMISSION_DENIED`.
11. **Audit Log Tampering / Deletion**: Admin attempts `update` or `delete` on `/audit_logs/log1`. Expected: `PERMISSION_DENIED`.
12. **PII Blanket Read / Scrape**: Unauthenticated or non-admin user attempts `get` or `list` on `/administrators` or `/audit_logs`. Expected: `PERMISSION_DENIED`.
