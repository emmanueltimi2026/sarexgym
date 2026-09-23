const details = row => {
  const value = row.new_values ?? row.metadata ?? {};
  if (typeof value !== 'string') return value || {};
  try { return JSON.parse(value); } catch { return {}; }
};

const requestAction = action => {
  const match = /^(post|put|patch|delete)\.(\/api\/v1\/.*)$/i.exec(action);
  if (!match) return null;
  const [, method, path] = match;
  if (path === '/api/v1/auth/logout') return { label: 'Signed out of the portal', area: 'Account access' };
  if (path === '/api/v1/auth/change-password' || path === '/api/v1/auth/change-initial-password') return { label: 'Changed account password', area: 'Account access' };
  if (path.includes('/attendance/')) return { label: 'Recorded an entrance check-in', area: 'Entrance attendance' };
  if (path.startsWith('/api/v1/events/')) return { label: method === 'delete' ? 'Deleted an event' : 'Updated an event', area: 'Event' };
  if (path.startsWith('/api/v1/subscriptions/')) return { label: 'Recorded a membership payment', area: 'Membership subscription' };
  if (path.includes('/freeze')) return { label: 'Changed a member’s gym access', area: 'Membership subscription' };
  if (path.startsWith('/api/v1/members/')) return { label: 'Updated a member account', area: 'Member account' };
  if (path.startsWith('/api/v1/staff/')) return { label: 'Updated a staff account', area: 'Staff account' };
  if (path.startsWith('/api/v1/trainers/')) return { label: 'Updated a trainer account', area: 'Trainer account' };
  if (path.startsWith('/api/v1/settings')) return { label: 'Updated gym settings', area: 'Gym settings' };
  return { label: 'Completed a staff action', area: 'Administration' };
};

export const auditArea = row => {
  if (row.entity_type === 'request') return requestAction(String(row.action || ''))?.area || 'Administration';
  return {
    member: 'Member account', payment: 'Payment record', trainer: 'Trainer account',
    staff: 'Staff account', event: 'Event', event_registration: 'Event booking',
    attendance: 'Entrance attendance', setting: 'Gym settings',
    subscription: 'Membership subscription', user: 'Account access'
  }[String(row.entity_type || row.resource_type || '').toLowerCase()] || 'Administration';
};

export const auditActivity = row => {
  const action = String(row.action || '').toLowerCase();
  const d = details(row);
  if (row.entity_type === 'request') return requestAction(action)?.label || 'Completed a staff action';
  const labels = {
    'auth.login': 'Signed in to the portal',
    'auth.logout': 'Signed out of the portal',
    'auth.password_changed': 'Changed account password',
    'user.bootstrap_admin': 'Created an administrator account',
    'member.created': 'Added a new member',
    'member.trainer_assigned': 'Changed the trainer assigned to a member',
    'subscription.cash_payment_recorded': `${d.method || 'In-person'} payment recorded for ${d.memberName || 'a member'}${d.planName ? ` — ${d.planName}` : ''}`,
    'subscription.frozen': `Froze gym access for ${d.memberNumber || 'a member'}`,
    'subscription.unfrozen': `Restored gym access for ${d.memberNumber || 'a member'}`,
    'trainer.created': 'Added a trainer',
    'trainer.suspended': 'Suspended a trainer account',
    'trainer.reactivated': 'Restored a trainer account',
    'trainer.deleted': 'Removed a trainer account',
    'staff.created': 'Added a receptionist account',
    'staff.suspended': 'Suspended the staff account',
    'staff.reactivated': 'Restored the staff account',
    'staff.deleted': 'Removed the staff account',
    'staff.password_reset_created': 'Created a password reset link for the staff account',
    'event.created': d.title ? `Created the event “${d.title}”` : 'Created an event',
    'event.updated': d.title ? `Updated the event “${d.title}”` : 'Updated an event',
    'event.completed': d.title ? `Completed the event “${d.title}”` : 'Completed an event',
    'event.deleted': d.title ? `Deleted the event “${d.title}”` : 'Deleted an event',
    'event.payment_verified': 'Confirmed a member’s event payment',
    'payment.verified': 'Confirmed a membership payment',
    'attendance.manual_check_in': `Manually checked in ${d.memberName || 'a member'}`,
    'attendance.manual_check_in_denied': `Denied a manual check-in for ${d.memberName || 'a member'}`,
    'attendance.reception_qr_check_in': 'Recorded a reception QR check-in',
    'attendance.reception_qr_denied': 'Denied a reception QR check-in',
    'settings.updated': 'Updated gym settings'
  };
  return labels[action] || 'Completed a staff action';
};

export const presentAuditRows = rows => {
  const detailedRequests = new Set(rows.filter(row => row.entity_type !== 'request' && row.request_id).map(row => row.request_id));
  return rows.filter(row => row.entity_type !== 'request' || !row.request_id || !detailedRequests.has(row.request_id));
};
