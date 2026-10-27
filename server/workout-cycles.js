const unavailable = () => Object.assign(new Error('Workout plan is unavailable'), { status: 404, code: 'WORKOUT_NOT_FOUND' });
const dateText = value => typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
const addDays = (date, days) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export const workoutDate = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(now);

export function calculateProgramWeek(startDate, currentDate = workoutDate()) {
  const start = Date.parse(`${dateText(startDate)}T00:00:00.000Z`);
  const current = Date.parse(`${dateText(currentDate)}T00:00:00.000Z`);
  const dayOffset = Math.floor((current - start) / 86_400_000);
  if (dayOffset < 0) throw Object.assign(new Error('This workout program has not started'), { status: 409, code: 'WORKOUT_NOT_STARTED' });
  const number = Math.floor(dayOffset / 7) + 1;
  const weekStart = addDays(dateText(startDate), (number - 1) * 7);
  const nextWeekStart = addDays(weekStart, 7);
  return { number, startDate: weekStart, endDate: addDays(weekStart, 6), nextStartDate: nextWeekStart };
}

const dayId = (day, index) => day?.id || `legacy-day-${index}`;
const markWorkoutReadFailure = (error, stage) => {
  if (error && typeof error === 'object' && !error.workoutReadStage) error.workoutReadStage = stage;
  return error;
};

export function buildWorkoutCycleProgress(plan, records, currentDate = workoutDate()) {
  const startDate = dateText(plan.program_started_on || plan.start_date || plan.created_at);
  const currentCycle = calculateProgramWeek(startDate, currentDate);
  const routine = Array.isArray(plan.routine) ? plan.routine : [];
  const count = Number(plan.days_per_week) || routine.length;
  const recordMap = new Map(records.map(record => [`${record.program_week_start}/${record.workout_day_id}`, record]));
  const history = [];

  for (let number = 1; number <= currentCycle.number; number += 1) {
    const start = addDays(startDate, (number - 1) * 7);
    const end = addDays(start, 6);
    const isCurrent = number === currentCycle.number;
    const days = routine.map((day, index) => {
      const completion = recordMap.get(`${start}/${dayId(day, index)}`);
      return {
        dayIndex: index,
        dayId: dayId(day, index),
        dayName: day.dayName || `Day ${index + 1}`,
        focus: day.focus || '',
        status: completion ? 'completed' : isCurrent ? 'available' : 'missed',
        completedAt: completion?.completed_at || null
      };
    });
    const completedWorkouts = days.filter(day => day.status === 'completed').length;
    history.push({
      weekNumber: number,
      startDate: start,
      endDate: end,
      completedWorkouts,
      assignedWorkouts: count,
      percentage: count ? Math.round(completedWorkouts / count * 100) : 0,
      isComplete: count > 0 && completedWorkouts >= count,
      days
    });
  }

  const week = history.at(-1) || {
    weekNumber: currentCycle.number, startDate: currentCycle.startDate, endDate: currentCycle.endDate,
    completedWorkouts: 0, assignedWorkouts: count, percentage: 0, isComplete: false, days: []
  };
  return {
    planId: plan.id,
    programStartedOn: startDate,
    programStatus: plan.status,
    currentWeek: { ...week, nextStartDate: currentCycle.nextStartDate },
    history: history.reverse(),
    recentActivity: records.slice().sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at)).slice(0, 20).map(record => ({
      workoutDayId: record.workout_day_id,
      programWeekStart: dateText(record.program_week_start),
      completedAt: record.completed_at
    }))
  };
}

const getMemberPlan = async (db, userId, planId, lock = false) => {
  const query = `SELECT w.id,w.member_id,w.trainer_id,w.title,w.routine,w.days_per_week,w.status,
    to_char(w.program_started_on,'YYYY-MM-DD') AS program_started_on
    FROM workout_plans w JOIN members m ON m.id=w.member_id
    WHERE w.id=$1 AND m.user_id=$2 AND EXISTS (
      SELECT 1 FROM subscriptions s JOIN membership_plans p ON p.id=s.plan_id
      WHERE s.member_id=m.id AND s.status='active' AND s.starts_at<=now() AND s.ends_at>now()
        AND p.workout_plan_access AND NOT EXISTS (
          SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND f.released_at IS NULL
            AND now()>=f.starts_at AND now()<f.ends_at
        )
    ) ${lock ? 'AND w.status=\'active\' FOR UPDATE OF w' : ''}`;
  const result = await db.query(query, [planId, userId]);
  if (!result.rows[0]) throw unavailable();
  return result.rows[0];
};

const readPlanProgressData = async (db, plan, currentDate) => {
  let records;
  try {
    const result = await db.query(`SELECT workout_day_id,program_week_number,
        to_char(program_week_start,'YYYY-MM-DD') AS program_week_start,completed_at
      FROM workout_day_completions WHERE workout_plan_id=$1 ORDER BY program_week_start DESC`, [plan.id]);
    records = result.rows;
  } catch (error) { throw markWorkoutReadFailure(error, 'workout_completion_query'); }
  try { return { records, progress: buildWorkoutCycleProgress(plan, records, currentDate) }; }
  catch (error) { throw markWorkoutReadFailure(error, 'workout_cycle_transform'); }
};

const readPlanProgress = async (db, plan, currentDate) =>
  (await readPlanProgressData(db, plan, currentDate)).progress;

export async function getCurrentMemberWorkoutData(db, userId, currentDate = workoutDate()) {
  let result;
  try {
    result = await db.query(`SELECT w.id,w.member_id,w.trainer_id,w.title,w.description,w.difficulty,w.routine,w.days_per_week,w.status,
      to_char(w.program_started_on,'YYYY-MM-DD') AS program_started_on,
      t.first_name AS trainer_first_name,t.last_name AS trainer_last_name
    FROM workout_plans w JOIN members m ON m.id=w.member_id LEFT JOIN trainers t ON t.id=w.trainer_id
    WHERE m.user_id=$1 AND w.status IN ('active','completed') AND EXISTS (
      SELECT 1 FROM subscriptions s JOIN membership_plans p ON p.id=s.plan_id
      WHERE s.member_id=m.id AND s.status='active' AND s.starts_at<=now() AND s.ends_at>now()
        AND p.workout_plan_access AND NOT EXISTS (
          SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND f.released_at IS NULL
            AND now()>=f.starts_at AND now()<f.ends_at))
      ORDER BY CASE WHEN w.status='active' THEN 0 ELSE 1 END,w.updated_at DESC LIMIT 1`, [userId]);
  } catch (error) { throw markWorkoutReadFailure(error, 'workout_plan_query'); }
  const plan = result.rows[0];
  if (!plan) return null;
  const { records, progress } = await readPlanProgressData(db, plan, currentDate);
  return { plan, records, progress };
};

export async function getMemberWorkoutCycle(db, userId, planId, currentDate = workoutDate()) {
  const plan = await getMemberPlan(db, userId, planId);
  return readPlanProgress(db, plan, currentDate);
}

export async function completeMemberWorkoutDay(db, userId, planId, dayIndex, now = new Date()) {
  return db.transaction(async client => {
    const plan = await getMemberPlan(client, userId, planId, true);
    const routine = Array.isArray(plan.routine) ? plan.routine : [];
    const day = routine[dayIndex];
    const workoutDayId = dayId(day, dayIndex);
    if (!day || !Array.isArray(day.exercises) || day.exercises.length === 0) {
      throw Object.assign(new Error('Workout day is no longer in this program'), { status: 409, code: 'WORKOUT_DAY_CHANGED' });
    }
    const week = calculateProgramWeek(plan.program_started_on, workoutDate(now));
    const result = await client.query(`INSERT INTO workout_day_completions
      (member_id,workout_plan_id,workout_day_id,program_week_number,program_week_start)
      VALUES($1,$2,$3,$4,$5)
      ON CONFLICT (member_id,workout_plan_id,workout_day_id,program_week_start) DO NOTHING
      RETURNING id`, [plan.member_id, plan.id, workoutDayId, week.number, week.startDate]);
    const progress = await readPlanProgress(client, plan, workoutDate(now));
    return { ...progress, alreadyCompleted: result.rowCount === 0 };
  });
}

export async function getTrainerWorkoutHistory(db, trainerUserId, memberId, currentDate = workoutDate()) {
  const access = await db.query(`SELECT 1 FROM trainer_assignments a JOIN trainers t ON t.id=a.trainer_id
    WHERE t.user_id=$1 AND t.active AND a.member_id=$2 AND a.active`, [trainerUserId, memberId]);
  if (!access.rowCount) throw unavailable();
  const plans = await db.query(`SELECT w.id,w.member_id,w.trainer_id,w.title,w.routine,w.days_per_week,w.status,
      to_char(w.program_started_on,'YYYY-MM-DD') AS program_started_on
    FROM workout_plans w WHERE w.member_id=$1
      AND w.trainer_id=(SELECT id FROM trainers WHERE user_id=$2) ORDER BY w.updated_at DESC`, [memberId, trainerUserId]);
  if (!plans.rows.length) return { plans: [] };
  const completions = await db.query(`SELECT workout_plan_id,workout_day_id,program_week_number,
      to_char(program_week_start,'YYYY-MM-DD') AS program_week_start,completed_at
    FROM workout_day_completions WHERE member_id=$1 AND workout_plan_id=ANY($2::uuid[])
    ORDER BY completed_at DESC`, [memberId, plans.rows.map(plan => plan.id)]);
  return { plans: plans.rows.map(plan => {
    const records = completions.rows.filter(record => record.workout_plan_id === plan.id);
    const progress = buildWorkoutCycleProgress(plan, records, currentDate);
    return { id: plan.id, title: plan.title, status: plan.status, programStartedOn: progress.programStartedOn,
      currentWeek: progress.currentWeek, history: progress.history, recentActivity: progress.recentActivity };
  }) };
}
