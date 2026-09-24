const unavailable = () => Object.assign(new Error('Member training progress is unavailable'), { status: 404, code: 'TRAINING_PROGRESS_NOT_FOUND' });

export async function getTrainerMemberProgress(db, trainerUserId, memberId) {
  const access = await db.query(`SELECT 1 FROM trainer_assignments a JOIN trainers t ON t.id=a.trainer_id
    WHERE t.user_id=$1 AND t.active AND a.member_id=$2 AND a.active`, [trainerUserId, memberId]);
  if (!access.rowCount) throw unavailable();
  const result = await db.query(`SELECT w.id,w.title,w.status,w.routine,
    count(c.exercise_key)::int AS completed_exercises,
    count(DISTINCT c.completed_on)::int AS active_days,
    to_char(max(c.completed_on), 'YYYY-MM-DD') AS last_completed_on,
    max(c.completed_at) AS last_completed_at
    FROM workout_plans w LEFT JOIN workout_exercise_completions c
      ON c.workout_plan_id=w.id AND c.completed_on >= (now() AT TIME ZONE 'Africa/Lagos')::date - 29
    WHERE w.member_id=$1 AND w.trainer_id=(SELECT id FROM trainers WHERE user_id=$2)
    GROUP BY w.id ORDER BY w.updated_at DESC`, [memberId, trainerUserId]);
  const daily = await db.query(`SELECT c.workout_plan_id,to_char(c.completed_on, 'YYYY-MM-DD') AS completed_on,count(*)::int AS completed_exercises
    FROM workout_exercise_completions c JOIN workout_plans w ON w.id=c.workout_plan_id
    WHERE w.member_id=$1 AND w.trainer_id=(SELECT id FROM trainers WHERE user_id=$2)
      AND c.completed_on >= (now() AT TIME ZONE 'Africa/Lagos')::date - 29
    GROUP BY c.workout_plan_id,c.completed_on ORDER BY c.completed_on DESC LIMIT 100`, [memberId, trainerUserId]);
  return { windowDays: 30, plans: result.rows.map(row => ({
    id: row.id, title: row.title, status: row.status,
    completedExercises: Number(row.completed_exercises), activeDays: Number(row.active_days),
    lastCompletedOn: row.last_completed_on, lastCompletedAt: row.last_completed_at, routineDays: Array.isArray(row.routine) ? row.routine.length : 0,
    recentDays: daily.rows.filter(day => day.workout_plan_id === row.id).map(day => ({ date: day.completed_on, completedExercises: Number(day.completed_exercises) }))
  })) };
}
