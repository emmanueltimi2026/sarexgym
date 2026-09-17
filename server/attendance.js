export async function recordDeniedAttendance(client, {
  memberId,
  branchId,
  scannerUserId,
  method,
  reason,
}) {
  if (!memberId || !branchId || !scannerUserId) {
    throw new TypeError('A denied check-in must belong to a registered member, reception, and authenticated scanner');
  }
  if (!['reception_qr', 'manual'].includes(method)) {
    throw new TypeError('Unsupported denied check-in method');
  }

  const result = await client.query(
    `INSERT INTO attendance(
      member_id,
      branch_id,
      checked_in_at,
      scanner_user_id,
      method,
      status,
      denial_reason
    ) VALUES($1,$2,now(),$3,$4,'denied',$5)
    RETURNING id,checked_in_at,denial_reason`,
    [memberId, branchId, scannerUserId, method, reason],
  );

  return result.rows[0];
}
