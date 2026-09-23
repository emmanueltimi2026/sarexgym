import test from 'node:test';
import assert from 'node:assert/strict';
import { auditActivity, auditArea, presentAuditRows } from '../src/lib/auditPresentation.js';

test('staff activity hides a request log when a detailed action exists for the same request', () => {
  const rows = [
    { id: 1, action: 'post./api/v1/attendance/manual', entity_type: 'request', request_id: 'scan-1' },
    { id: 2, action: 'attendance.manual_check_in', entity_type: 'attendance', request_id: 'scan-1', new_values: { memberName: 'Ada Member' } }
  ];
  assert.deepEqual(presentAuditRows(rows).map(row => row.id), [2]);
  assert.equal(auditActivity(rows[1]), 'Manually checked in Ada Member');
});

test('legacy request-only audit entries display human language without paths or IDs', () => {
  const rows = [
    { action: 'post./api/v1/auth/logout', entity_type: 'request' },
    { action: 'patch./api/v1/events/63c4d36c-f60a-4604-9690-04cd03410b06', entity_type: 'request' },
    { action: 'post./api/v1/attendance/manual', entity_type: 'request' },
    { action: 'post./api/v1/unknown/123', entity_type: 'request' }
  ];
  assert.deepEqual(rows.map(auditActivity), [
    'Signed out of the portal', 'Updated an event',
    'Recorded an entrance check-in', 'Completed a staff action'
  ]);
  assert.deepEqual(rows.map(auditArea), [
    'Account access', 'Event', 'Entrance attendance', 'Administration'
  ]);
  for (const row of rows) assert.doesNotMatch(auditActivity(row), /\/api\/|[0-9a-f]{8}-[0-9a-f]{4}/i);
});

test('unknown semantic action never exposes an internal action name or entity ID', () => {
  const row = { action: 'internal.rebuild_index', entity_type: 'unknown', entity_id: '123-technical-id' };
  assert.equal(auditActivity(row), 'Completed a staff action');
  assert.equal(auditArea(row), 'Administration');
});
