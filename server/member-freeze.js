export async function setMemberFreeze(db, { memberId, frozen, actorId, audit }) {
  return db.transaction(async client => {
    const member = (await client.query('SELECT id,user_id,member_number FROM members WHERE id=$1 FOR UPDATE', [memberId])).rows[0];
    if (!member) throw Object.assign(new Error('Member was not found'), { status: 404 });

    const subscription = (await client.query("SELECT id,ends_at FROM subscriptions WHERE member_id=$1 AND status='active' AND starts_at<=now() AND ends_at>now() ORDER BY ends_at DESC LIMIT 1 FOR UPDATE", [memberId])).rows[0];
    if (!subscription) throw Object.assign(new Error('This member has no current active subscription to freeze'), { status: 409, code: 'NO_ACTIVE_SUBSCRIPTION' });

    const currentFreeze = (await client.query('SELECT id FROM subscription_freezes WHERE subscription_id=$1 AND released_at IS NULL AND starts_at<=now() AND ends_at>now() ORDER BY starts_at DESC LIMIT 1 FOR UPDATE', [subscription.id])).rows[0];
    if (Boolean(currentFreeze) === frozen) return { frozen, changed: false };

    if (frozen) {
      await client.query('INSERT INTO subscription_freezes(subscription_id,starts_at,ends_at,approved_by) VALUES($1,now(),$2,$3)', [subscription.id, subscription.ends_at, actorId]);
    } else {
      await client.query('UPDATE subscription_freezes SET released_at=now() WHERE id=$1', [currentFreeze.id]);
    }

    await client.query("INSERT INTO notifications(recipient_user_id,type,title,message,metadata) VALUES($1,'membership_access',$2,$3,$4)", [member.user_id, frozen ? 'Membership access frozen' : 'Membership access restored', frozen ? 'Your gym access has been temporarily frozen. Please contact reception for help.' : 'Your gym access has been restored for the remainder of your current plan.', JSON.stringify({ subscriptionId: subscription.id })]);
    await audit(client, frozen ? 'subscription.frozen' : 'subscription.unfrozen', subscription.id, { memberId, memberNumber: member.member_number });
    return { frozen, changed: true };
  });
}
