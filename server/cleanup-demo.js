import 'dotenv/config';
import { createDatabase } from './db.js';

const argv = new Set(process.argv.slice(2));
const dryRun = argv.has('--dry-run') || (!argv.has('--execute') && !argv.has('--verify-only'));
const execute = argv.has('--execute') || (!argv.has('--dry-run') && !argv.has('--verify-only'));
const verifyOnly = argv.has('--verify-only');
const confirmed = process.env.CONFIRM_DEMO_CLEANUP === 'true';

const connectionString = process.env.DATABASE_URL;
const sslMode = process.env.DATABASE_SSL_MODE || (process.env.NODE_ENV === 'production' ? 'require' : 'disable');
const ca = process.env.DATABASE_CA_CERT;

const expectedMemberReferences = new Set([
  'appointments.member_id',
  'attendance.member_id',
  'class_bookings.member_id',
  'event_registrations.member_id',
  'member_progress.member_id',
  'payment_orders.member_id',
  'payments.member_id',
  'qr_credentials.member_id',
  'subscriptions.member_id',
  'trainer_assignments.member_id',
  'workout_plans.member_id'
]);

const expectedUserReferences = new Set([
  'audit_logs.actor_user_id',
  'attendance.scanner_user_id',
  'events.created_by',
  'gym_settings.updated_by',
  'members.user_id',
  'notifications.recipient_user_id',
  'oauth_identities.user_id',
  'password_reset_tokens.user_id',
  'payments.recorded_by',
  'sessions.user_id',
  'staff.user_id',
  'subscription_freezes.approved_by',
  'trainers.user_id',
  'user_roles.user_id'
]);

const memberOwnedEntityTypes = [
  'member',
  'members',
  'subscription',
  'subscriptions',
  'payment',
  'payments',
  'payment_order',
  'payment_orders',
  'attendance',
  'check_in',
  'checkin',
  'event_registration',
  'event_registrations',
  'trainer_assignment',
  'trainer_assignments',
  'workout_plan',
  'workout_plans',
  'member_progress'
];

if (!connectionString) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

if (execute && !dryRun && !verifyOnly && !confirmed) {
  console.error('Refusing destructive cleanup. Re-run with CONFIRM_DEMO_CLEANUP=true pnpm db:cleanup-demo --execute');
  process.exit(2);
}

const db = createDatabase(connectionString, { sslMode, ca, max: 2 });

const normalizeTableName = value => value.replace(/^public\./, '');
const hasTable = (tables, name) => tables.has(name);

async function queryCount(client, sql, params = []) {
  const result = await client.query(sql, params);
  return Number(result.rows[0]?.count || 0);
}

async function getTables(client) {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  `);
  return new Set(result.rows.map(row => row.table_name));
}

async function inspectForeignKeys(client) {
  const result = await client.query(`
    SELECT
      c.conname AS constraint_name,
      c.conrelid::regclass::text AS table_name,
      a.attname AS column_name,
      c.confrelid::regclass::text AS referenced_table,
      c.confdeltype AS delete_rule
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
    WHERE c.contype='f'
      AND c.confrelid IN ('members'::regclass, 'users'::regclass)
    ORDER BY c.conrelid::regclass::text, a.attname
  `);
  return result.rows.map(row => ({
    ...row,
    table_name: normalizeTableName(row.table_name),
    referenced_table: normalizeTableName(row.referenced_table),
    key: `${normalizeTableName(row.table_name)}.${row.column_name}`
  }));
}

function assertKnownForeignKeys(foreignKeys) {
  const unknownMemberReferences = foreignKeys
    .filter(row => row.referenced_table === 'members' && !expectedMemberReferences.has(row.key))
    .map(row => row.key);
  const unknownUserReferences = foreignKeys
    .filter(row => row.referenced_table === 'users' && !expectedUserReferences.has(row.key))
    .map(row => row.key);
  if (unknownMemberReferences.length || unknownUserReferences.length) {
    throw new Error(`Cleanup plan does not cover these foreign keys: ${[...unknownMemberReferences, ...unknownUserReferences].join(', ')}`);
  }
}

async function createCleanupScope(client, tables) {
  await client.query(`
    CREATE TEMP TABLE cleanup_member_ids ON COMMIT DROP AS
    SELECT id AS member_id, user_id, profile_image_public_id
    FROM members
  `);
  await client.query(`
    CREATE TEMP TABLE cleanup_member_user_ids ON COMMIT DROP AS
    SELECT DISTINCT user_id
    FROM cleanup_member_ids
    WHERE user_id IS NOT NULL
  `);
  await client.query(`
    CREATE TEMP TABLE cleanup_privileged_user_ids ON COMMIT DROP AS
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    JOIN roles r ON r.id=ur.role_id
    WHERE r.code IN ('admin','staff','trainer')
  `);
  await client.query(`
    CREATE TEMP TABLE cleanup_member_only_user_ids ON COMMIT DROP AS
    SELECT user_id
    FROM cleanup_member_user_ids
    EXCEPT
    SELECT user_id
    FROM cleanup_privileged_user_ids
  `);
  await client.query(`
    CREATE TEMP TABLE cleanup_subscription_ids ON COMMIT DROP AS
    SELECT id AS subscription_id
    FROM subscriptions
    WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)
  `);
  await client.query(`
    CREATE TEMP TABLE cleanup_payment_order_ids ON COMMIT DROP AS
    SELECT id AS payment_order_id
    FROM payment_orders
    WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)
  `);
  await client.query(`
    CREATE TEMP TABLE cleanup_payment_ids ON COMMIT DROP AS
    SELECT id AS payment_id
    FROM payments
    WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)
  `);

  await createOptionalIdTable(client, tables, 'attendance', 'cleanup_attendance_ids', 'attendance_id');
  await createOptionalIdTable(client, tables, 'event_registrations', 'cleanup_event_registration_ids', 'event_registration_id');
  await createOptionalIdTable(client, tables, 'trainer_assignments', 'cleanup_trainer_assignment_ids', 'trainer_assignment_id');
  await createOptionalIdTable(client, tables, 'workout_plans', 'cleanup_workout_plan_ids', 'workout_plan_id');
  await createOptionalIdTable(client, tables, 'member_progress', 'cleanup_member_progress_ids', 'member_progress_id');
}

async function createOptionalIdTable(client, tables, sourceTable, tempTable, columnName) {
  if (hasTable(tables, sourceTable)) {
    await client.query(`
      CREATE TEMP TABLE ${tempTable} ON COMMIT DROP AS
      SELECT id AS ${columnName}
      FROM ${sourceTable}
      WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)
    `);
    return;
  }
  await client.query(`CREATE TEMP TABLE ${tempTable} (${columnName} uuid) ON COMMIT DROP`);
}

function countSpecs(tables) {
  const specs = [
    { table: 'members', sql: 'SELECT count(*) FROM cleanup_member_ids' },
    { table: 'member user accounts', sql: 'SELECT count(*) FROM cleanup_member_only_user_ids' },
    { table: 'member-linked privileged users preserved', sql: 'SELECT count(*) FROM cleanup_member_user_ids mu JOIN cleanup_privileged_user_ids pu ON pu.user_id=mu.user_id' },
    { table: 'member role grants', sql: "SELECT count(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code='member' AND ur.user_id IN (SELECT user_id FROM cleanup_member_user_ids)" },
    { table: 'sessions', sql: 'SELECT count(*) FROM sessions WHERE user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)' },
    { table: 'password reset tokens', sql: 'SELECT count(*) FROM password_reset_tokens WHERE user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)' },
    { table: 'notifications', sql: 'SELECT count(*) FROM notifications WHERE recipient_user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)' },
    { table: 'subscriptions', sql: 'SELECT count(*) FROM cleanup_subscription_ids' },
    { table: 'subscription freezes', sql: 'SELECT count(*) FROM subscription_freezes WHERE subscription_id IN (SELECT subscription_id FROM cleanup_subscription_ids)' },
    { table: 'payment orders', sql: 'SELECT count(*) FROM cleanup_payment_order_ids' },
    { table: 'payments', sql: 'SELECT count(*) FROM cleanup_payment_ids' },
    { table: 'attendance', sql: 'SELECT count(*) FROM cleanup_attendance_ids' },
    { table: 'class bookings', sql: 'SELECT count(*) FROM class_bookings WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'appointments', sql: 'SELECT count(*) FROM appointments WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'event registrations', sql: 'SELECT count(*) FROM cleanup_event_registration_ids' },
    { table: 'trainer assignments', sql: 'SELECT count(*) FROM cleanup_trainer_assignment_ids' },
    { table: 'workout plans', sql: 'SELECT count(*) FROM cleanup_workout_plan_ids' },
    { table: 'member progress', sql: 'SELECT count(*) FROM cleanup_member_progress_ids' },
    { table: 'member profile asset references', sql: "SELECT count(*) FROM cleanup_member_ids WHERE profile_image_public_id IS NOT NULL AND profile_image_public_id<>''" }
  ];
  if (hasTable(tables, 'oauth_identities')) {
    specs.push({ table: 'oauth identities', sql: 'SELECT count(*) FROM oauth_identities WHERE user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)' });
  }
  if (hasTable(tables, 'qr_credentials')) {
    specs.push({ table: 'qr credentials', sql: 'SELECT count(*) FROM qr_credentials WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' });
  }
  specs.push({
    table: 'member audit logs',
    sql: `
      SELECT count(*)
      FROM audit_logs a
      WHERE a.actor_user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)
         OR (a.entity_type=ANY($1::text[]) AND (
           a.entity_id IN (SELECT member_id::text FROM cleanup_member_ids)
           OR a.entity_id IN (SELECT subscription_id::text FROM cleanup_subscription_ids)
           OR a.entity_id IN (SELECT payment_order_id::text FROM cleanup_payment_order_ids)
           OR a.entity_id IN (SELECT payment_id::text FROM cleanup_payment_ids)
           OR a.entity_id IN (SELECT attendance_id::text FROM cleanup_attendance_ids)
           OR a.entity_id IN (SELECT event_registration_id::text FROM cleanup_event_registration_ids)
           OR a.entity_id IN (SELECT trainer_assignment_id::text FROM cleanup_trainer_assignment_ids)
           OR a.entity_id IN (SELECT workout_plan_id::text FROM cleanup_workout_plan_ids)
           OR a.entity_id IN (SELECT member_progress_id::text FROM cleanup_member_progress_ids)
         ))
    `,
    params: [memberOwnedEntityTypes]
  });
  return specs;
}

function deleteSpecs(tables) {
  const specs = [
    {
      table: 'member audit logs',
      sql: `
        DELETE FROM audit_logs a
        WHERE a.actor_user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)
           OR (a.entity_type=ANY($1::text[]) AND (
             a.entity_id IN (SELECT member_id::text FROM cleanup_member_ids)
             OR a.entity_id IN (SELECT subscription_id::text FROM cleanup_subscription_ids)
             OR a.entity_id IN (SELECT payment_order_id::text FROM cleanup_payment_order_ids)
             OR a.entity_id IN (SELECT payment_id::text FROM cleanup_payment_ids)
             OR a.entity_id IN (SELECT attendance_id::text FROM cleanup_attendance_ids)
             OR a.entity_id IN (SELECT event_registration_id::text FROM cleanup_event_registration_ids)
             OR a.entity_id IN (SELECT trainer_assignment_id::text FROM cleanup_trainer_assignment_ids)
             OR a.entity_id IN (SELECT workout_plan_id::text FROM cleanup_workout_plan_ids)
             OR a.entity_id IN (SELECT member_progress_id::text FROM cleanup_member_progress_ids)
           ))
      `,
      params: [memberOwnedEntityTypes]
    },
    { table: 'notifications', sql: 'DELETE FROM notifications WHERE recipient_user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)' },
    { table: 'sessions', sql: 'DELETE FROM sessions WHERE user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)' },
    { table: 'password reset tokens', sql: 'DELETE FROM password_reset_tokens WHERE user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)' },
    { table: 'member-only role grants', sql: 'DELETE FROM user_roles WHERE user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)' },
    { table: 'member role grants on privileged users', sql: "DELETE FROM user_roles ur USING roles r WHERE ur.role_id=r.id AND r.code='member' AND ur.user_id IN (SELECT user_id FROM cleanup_member_user_ids)" },
    { table: 'class bookings', sql: 'DELETE FROM class_bookings WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'appointments', sql: 'DELETE FROM appointments WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'event registrations', sql: 'DELETE FROM event_registrations WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'attendance', sql: 'DELETE FROM attendance WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'trainer assignments', sql: 'DELETE FROM trainer_assignments WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'workout plans', sql: 'DELETE FROM workout_plans WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'member progress', sql: 'DELETE FROM member_progress WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'subscription freezes', sql: 'DELETE FROM subscription_freezes WHERE subscription_id IN (SELECT subscription_id FROM cleanup_subscription_ids)' },
    { table: 'payments', sql: 'DELETE FROM payments WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'payment orders', sql: 'DELETE FROM payment_orders WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'subscriptions', sql: 'DELETE FROM subscriptions WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'events member creator references', sql: 'UPDATE events SET created_by=NULL WHERE created_by IN (SELECT user_id FROM cleanup_member_only_user_ids)' },
    { table: 'settings member updater references', sql: 'UPDATE gym_settings SET updated_by=NULL WHERE updated_by IN (SELECT user_id FROM cleanup_member_only_user_ids)' },
    { table: 'members', sql: 'DELETE FROM members WHERE id IN (SELECT member_id FROM cleanup_member_ids)' },
    { table: 'member user accounts', sql: 'DELETE FROM users WHERE id IN (SELECT user_id FROM cleanup_member_only_user_ids)' }
  ];
  if (hasTable(tables, 'oauth_identities')) {
    specs.splice(3, 0, { table: 'oauth identities', sql: 'DELETE FROM oauth_identities WHERE user_id IN (SELECT user_id FROM cleanup_member_only_user_ids)' });
  }
  if (hasTable(tables, 'qr_credentials')) {
    specs.splice(10, 0, { table: 'qr credentials', sql: 'DELETE FROM qr_credentials WHERE member_id IN (SELECT member_id FROM cleanup_member_ids)' });
  }
  return specs.filter(spec => {
    const firstWord = spec.sql.trim().split(/\s+/)[2] || spec.sql.trim().split(/\s+/)[1];
    return !['event_registrations', 'workout_plans', 'member_progress', 'qr_credentials', 'oauth_identities'].includes(firstWord) || hasTable(tables, firstWord);
  });
}

async function collectCounts(client, tables) {
  const rows = [];
  for (const spec of countSpecs(tables)) {
    rows.push({ table: spec.table, rows: await queryCount(client, spec.sql, spec.params || []) });
  }
  return rows;
}

async function collectPreservedCounts(client, tables) {
  const specs = [
    { table: 'admin users', sql: "SELECT count(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code='admin'" },
    { table: 'staff users', sql: "SELECT count(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code='staff'" },
    { table: 'trainer users', sql: "SELECT count(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code='trainer'" },
    { table: 'staff profiles', sql: 'SELECT count(*) FROM staff' },
    { table: 'trainer profiles', sql: 'SELECT count(*) FROM trainers' },
    { table: 'membership plans', sql: 'SELECT count(*) FROM membership_plans' },
    { table: 'branches', sql: 'SELECT count(*) FROM branches' },
    { table: 'roles', sql: 'SELECT count(*) FROM roles' },
    { table: 'permissions', sql: 'SELECT count(*) FROM permissions' },
    { table: 'events', sql: hasTable(tables, 'events') ? 'SELECT count(*) FROM events' : 'SELECT 0::bigint AS count' },
    { table: 'gym settings', sql: hasTable(tables, 'gym_settings') ? 'SELECT count(*) FROM gym_settings' : 'SELECT 0::bigint AS count' }
  ];
  const rows = [];
  for (const spec of specs) rows.push({ table: spec.table, rows: await queryCount(client, spec.sql) });
  return rows;
}

async function runCleanup() {
  return db.transaction(async client => {
    const tables = await getTables(client);
    const foreignKeys = await inspectForeignKeys(client);
    assertKnownForeignKeys(foreignKeys);
    await createCleanupScope(client, tables);

    const found = await collectCounts(client, tables);
    const preservedBefore = await collectPreservedCounts(client, tables);
    const deleted = [];

    if (!dryRun && !verifyOnly) {
      for (const spec of deleteSpecs(tables)) {
        const result = await client.query(spec.sql, spec.params || []);
        deleted.push({ table: spec.table, rows: result.rowCount });
      }
    }

    return {
      mode: dryRun ? 'dry-run' : 'execute',
      foreignKeys,
      found,
      deleted,
      preservedBefore,
      preservedAfter: await collectPreservedCounts(client, tables),
      verification: await verifyDatabase(client, tables)
    };
  }, 'SERIALIZABLE');
}

async function verifyDatabase(client, tables) {
  const checks = [
    { check: 'zero member profiles remain', okWhen: 0, sql: 'SELECT count(*) FROM members' },
    { check: 'zero member role grants remain', okWhen: 0, sql: "SELECT count(*) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code='member'" },
    { check: 'zero subscriptions remain', okWhen: 0, sql: 'SELECT count(*) FROM subscriptions' },
    { check: 'zero payment orders remain', okWhen: 0, sql: 'SELECT count(*) FROM payment_orders' },
    { check: 'zero member payments remain', okWhen: 0, sql: 'SELECT count(*) FROM payments' },
    { check: 'zero attendance rows remain', okWhen: 0, sql: 'SELECT count(*) FROM attendance' },
    { check: 'zero class bookings remain', okWhen: 0, sql: 'SELECT count(*) FROM class_bookings' },
    { check: 'zero appointments remain', okWhen: 0, sql: 'SELECT count(*) FROM appointments' },
    { check: 'admin users preserved', minimum: 1, sql: "SELECT count(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code='admin'" },
    { check: 'staff users preserved', minimum: 1, sql: "SELECT count(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code='staff'" },
    { check: 'trainer users preserved', minimum: 1, sql: "SELECT count(DISTINCT ur.user_id) FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code='trainer'" },
    { check: 'membership plans preserved', minimum: 1, sql: 'SELECT count(*) FROM membership_plans' },
    { check: 'roles preserved', minimum: 1, sql: 'SELECT count(*) FROM roles' },
    { check: 'permissions preserved', minimum: 1, sql: 'SELECT count(*) FROM permissions' }
  ];
  if (hasTable(tables, 'event_registrations')) checks.splice(6, 0, { check: 'zero event registrations remain', okWhen: 0, sql: 'SELECT count(*) FROM event_registrations' });
  if (hasTable(tables, 'workout_plans')) checks.splice(6, 0, { check: 'zero workout assignments remain', okWhen: 0, sql: 'SELECT count(*) FROM workout_plans' });
  if (hasTable(tables, 'member_progress')) checks.splice(6, 0, { check: 'zero member progress rows remain', okWhen: 0, sql: 'SELECT count(*) FROM member_progress' });
  if (hasTable(tables, 'trainer_assignments')) checks.splice(6, 0, { check: 'zero trainer assignments remain', okWhen: 0, sql: 'SELECT count(*) FROM trainer_assignments' });

  const results = [];
  for (const spec of checks) {
    const rows = await queryCount(client, spec.sql);
    const ok = spec.okWhen === undefined ? rows >= spec.minimum : rows === spec.okWhen;
    results.push({ check: spec.check, rows, ok });
  }
  return results;
}

async function runVerificationOnly() {
  return db.transaction(async client => {
    const tables = await getTables(client);
    return {
      mode: 'verify-only',
      preserved: await collectPreservedCounts(client, tables),
      verification: await verifyDatabase(client, tables)
    };
  });
}

function printSection(title, rows) {
  console.log(`\n${title}`);
  console.table(rows);
}

try {
  const result = verifyOnly ? await runVerificationOnly() : await runCleanup();
  console.log(`SAREX demo cleanup mode: ${result.mode}`);
  if (result.foreignKeys) printSection('Foreign keys inspected', result.foreignKeys.map(row => ({ table: row.table_name, column: row.column_name, references: row.referenced_table })));
  if (result.found) printSection(dryRun ? 'Rows that would be deleted or changed' : 'Rows found before cleanup', result.found);
  if (result.deleted?.length) printSection('Rows deleted or updated', result.deleted);
  if (result.preservedBefore) printSection('Rows preserved before cleanup', result.preservedBefore);
  if (result.preservedAfter) printSection('Rows preserved after cleanup', result.preservedAfter);
  if (result.preserved) printSection('Rows preserved', result.preserved);
  printSection('Verification', result.verification);

  const failedChecks = result.verification.filter(row => !row.ok);
  if (failedChecks.length) {
    console.error('Verification failed. Review the failed checks above.');
    process.exitCode = 1;
  } else if (dryRun) {
    console.log('\nDry run complete. No data was modified.');
    console.log('To execute: CONFIRM_DEMO_CLEANUP=true pnpm db:cleanup-demo --execute');
  } else if (!verifyOnly) {
    console.log('\nCleanup complete.');
  }
  console.log('\nNote: external Cloudinary/profile assets are not deleted by this database transaction. Member profile asset references are reported above and removed with the member rows.');
} catch (error) {
  console.error(`Demo cleanup failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await db.close();
}


