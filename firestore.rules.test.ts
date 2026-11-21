/**
 * HILL MOBILE — Security Rules Verification Matrix (Dirty Dozen Adversarial Suite)
 *
 * Documents and verifies expected Firestore security rule outcomes for every collection.
 * Run with Firebase Emulator when @firebase/rules-unit-testing is configured locally,
 * or verify static invariants via ESLint (@firebase/eslint-plugin-security-rules).
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expected: 'ALLOW' | 'PERMISSION_DENIED';
  rationale: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Anonymous category create',
    collection: 'categories',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Unauthenticated viewers cannot mutate categories.',
  },
  {
    id: 2,
    name: 'Non-admin authenticated programme write',
    collection: 'programmes',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Standard signed-in users are not in administrators and fail isAdmin().',
  },
  {
    id: 3,
    name: 'Unverified email admin spoof',
    collection: 'app_settings',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'isVerifiedUser() requires request.auth.token.email_verified == true.',
  },
  {
    id: 4,
    name: 'Self-assigned administrator privilege escalation',
    collection: 'administrators',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Only bootstrapped owner email can create records in /administrators.',
  },
  {
    id: 5,
    name: 'Shadow / Ghost field injection on category',
    collection: 'categories',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidCategory() enforces data.keys().hasOnly([...]).',
  },
  {
    id: 6,
    name: 'ID poisoning (>128 chars)',
    collection: 'categories',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidId() enforces id.size() <= 128.',
  },
  {
    id: 7,
    name: 'Invalid path variable characters',
    collection: 'programmes',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidId() enforces ^[a-zA-Z0-9_\\-]+$.',
  },
  {
    id: 8,
    name: 'Type and boundary poisoning on category sortOrder/name',
    collection: 'categories',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidCategory() checks name length <= 60 and sortOrder is int.',
  },
  {
    id: 9,
    name: 'Client timestamp forgery on notification',
    collection: 'notifications',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'Requires incoming().createdAt == request.time.',
  },
  {
    id: 10,
    name: 'Actor UID spoofing in audit_logs',
    collection: 'audit_logs',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    rationale: 'isValidAuditLog() enforces data.actorUid == request.auth.uid.',
  },
  {
    id: 11,
    name: 'Audit log tampering or deletion',
    collection: 'audit_logs',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    rationale: 'audit_logs explicitly sets allow update, delete: if false.',
  },
  {
    id: 12,
    name: 'PII blanket read on administrators',
    collection: 'administrators',
    operation: 'list',
    expected: 'PERMISSION_DENIED',
    rationale: 'List requires verified owner email or matching resource.data.uid.',
  },
];
