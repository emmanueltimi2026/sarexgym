import { hashPassword } from './security.js';

const businessError = (code, message) => Object.assign(new Error(message), { status: 409, code });

export const savePersonnelAccount = async ({ db, kind, input, branchId, reactivate = false, audit, resolveBranch }) => {
  if (kind !== 'staff' && kind !== 'trainer') throw new Error('Unsupported personnel account type');
  const entityType = kind;
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.transaction(async c => {
      if (kind === 'staff' && !branchId) branchId = (await resolveBranch(c)).rows[0]?.id;
      if (kind === 'staff' && !branchId) throw Object.assign(new Error('Create an active branch before adding reception staff'), { status: 422, code: 'BRANCH_REQUIRED' });
      const user = (await c.query('SELECT id,status FROM users WHERE lower(email)=$1 FOR UPDATE', [email])).rows[0];
      let userId = user?.id;
      let profileId;
      let status;

      if (user) {
        const [staff, trainer, member, roles] = await Promise.all([
          c.query('SELECT id,active FROM staff WHERE user_id=$1 FOR UPDATE', [userId]),
          c.query('SELECT id,active FROM trainers WHERE user_id=$1 FOR UPDATE', [userId]),
          c.query('SELECT id FROM members WHERE user_id=$1', [userId]),
          c.query('SELECT r.code FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=$1', [userId]),
        ]);
        const own = kind === 'staff' ? staff.rows[0] : trainer.rows[0];
        const other = kind === 'staff' ? trainer.rows[0] : staff.rows[0];
        const roleCodes = roles.rows.map(row => row.code);
        if (member.rows.length || other || roleCodes.some(code => code !== kind && code !== (kind === 'staff' ? 'trainer' : 'staff'))) {
          throw businessError('ACCOUNT_ROLE_CONFLICT', 'This email belongs to another account type. Review the account before changing its role.');
        }
        if (user.status !== 'disabled') {
          throw businessError(`${kind.toUpperCase()}_EMAIL_ALREADY_ACTIVE`, `An account with this email already exists. Edit or reactivate it from the directory.`);
        }
        if ((own && own.active) || (!own && !roleCodes.includes(kind))) {
          throw businessError('ACCOUNT_STATE_CONFLICT', 'This account has inconsistent profile data. Please review it before reactivation.');
        }
        if (!reactivate) {
          throw businessError(`${kind.toUpperCase()}_REACTIVATION_REQUIRED`, `This ${kind} account was previously deactivated. Confirm reactivation to reuse it.`);
        }
        profileId = own?.id;
        await c.query("UPDATE users SET status='active',password_hash=$2,must_change_password=true,credential_version=credential_version+1,updated_at=now() WHERE id=$1", [userId, passwordHash]);
        await c.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [userId]);
        await c.query('UPDATE password_reset_tokens SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL', [userId]);
        const staleRoles = roleCodes.filter(code => code !== kind);
        if (staleRoles.length) await c.query("DELETE FROM user_roles WHERE user_id=$1 AND role_id IN (SELECT id FROM roles WHERE code <> $2)", [userId, kind]);
        await c.query('INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE code=$2 ON CONFLICT DO NOTHING', [userId, kind]);
        if (staleRoles.length || !roleCodes.includes(kind)) await audit(c, `${kind}.roles_corrected`, entityType, profileId || userId, { addedRole: roleCodes.includes(kind) ? null : kind, removedRoles: staleRoles });
        if (own) {
          if (kind === 'staff') await c.query('UPDATE staff SET branch_id=$2,first_name=$3,last_name=$4,phone=$5,active=true,updated_at=now() WHERE id=$1', [profileId, branchId, input.firstName, input.lastName, input.phone]);
          else await c.query('UPDATE trainers SET first_name=$2,last_name=$3,phone=$4,specialization=$5,biography=$6,profile_image_url=COALESCE($7,profile_image_url),profile_image_public_id=COALESCE($8,profile_image_public_id),active=true,updated_at=now() WHERE id=$1', [profileId, input.firstName, input.lastName, input.phone, input.specialization, input.bio, input.photoUrl || null, input.photoPublicId || null]);
        }
        status = 'reactivated';
      } else {
        userId = (await c.query("INSERT INTO users(email,password_hash,status,email_verified_at,must_change_password) VALUES($1,$2,'active',now(),true) RETURNING id", [email, passwordHash])).rows[0].id;
        await c.query('INSERT INTO user_roles(user_id,role_id) SELECT $1,id FROM roles WHERE code=$2', [userId, kind]);
        status = 'created';
      }

      if (!profileId) {
        profileId = kind === 'staff'
          ? (await c.query('INSERT INTO staff(user_id,branch_id,first_name,last_name,phone,active) VALUES($1,$2,$3,$4,$5,true) RETURNING id', [userId, branchId, input.firstName, input.lastName, input.phone])).rows[0].id
          : (await c.query('INSERT INTO trainers(user_id,first_name,last_name,phone,specialization,biography,profile_image_url,profile_image_public_id,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING id', [userId, input.firstName, input.lastName, input.phone, input.specialization, input.bio, input.photoUrl || null, input.photoPublicId || null])).rows[0].id;
      }
      await audit(c, `${kind}.${status}`, entityType, profileId, { email, firstName: input.firstName, lastName: input.lastName });
      return { status, staffId: kind === 'staff' ? profileId : undefined, trainerId: kind === 'trainer' ? profileId : undefined, userId };
    });
  } catch (error) {
    if (error.code === '23505' && (error.constraint === 'users_email_unique' || error.constraint === 'users_email_key')) {
      throw businessError(`${kind.toUpperCase()}_EMAIL_ALREADY_ACTIVE`, 'An account with this email already exists. Refresh the directory and try again.');
    }
    throw error;
  }
};
