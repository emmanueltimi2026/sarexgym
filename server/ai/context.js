import { calculateProgramWeek, workoutDate } from '../workout-cycles.js';

const facilities = [
  { name: 'Open gym floor', description: 'Free weights, resistance and cardio equipment for strength, conditioning and independent workouts.' },
  { name: 'Aerobics and guided sessions', description: 'Instructor-led sessions for stamina, coordination, mobility and consistency.' },
  { name: 'Personal training', description: 'Goal-based coaching and progressive workout planning for more structure and accountability.' },
  { name: 'Full-body spa', description: 'Appointment-based wellness and relaxation service.' },
  { name: 'Body massage', description: 'Bookable massage sessions for relaxation and post-training recovery.' },
  { name: 'Pregnancy and after-birth fitness', description: 'Consultation-led, adapted movement support. Members should consult their clinician before starting.' }
];

export async function getPublicMembershipPlans(db) {
  const { rows } = await db.query(`SELECT id,name,description,price_minor,currency,duration_days,
    trainer_access,workout_plan_access,registration_fee_minor,COALESCE(features,'[]'::jsonb) features
    FROM membership_plans WHERE active ORDER BY price_minor`);
  return rows.map(row => ({ id: row.id || null, name: row.name, description: row.description || null, price: Number(row.price_minor) / 100,
    currency: row.currency?.trim() || 'NGN', durationDays: row.duration_days,
    trainerAccess: Boolean(row.trainer_access), workoutPlanAccess: Boolean(row.workout_plan_access),
    registrationFee: Number(row.registration_fee_minor || 0) / 100,
    features: Array.isArray(row.features) ? row.features.filter(feature => typeof feature === 'string' && feature.trim())
      .slice(0, 8).map(feature => feature.trim().slice(0, 120)) : [] }));
}

export async function getPublicEvents(db, { member = false } = {}) {
  const { rows } = await db.query(`SELECT title,description,location,starts_at,ends_at,price_minor,currency
    FROM events WHERE status='published' AND ends_at>now() AND ($1::boolean OR audience='public')
    ORDER BY starts_at LIMIT 10`, [member]);
  return rows.map(row => ({ title: row.title, description: row.description, location: row.location,
    startsAt: row.starts_at, endsAt: row.ends_at, price: Number(row.price_minor) / 100, currency: row.currency?.trim() || 'NGN' }));
}

export async function getPublicTrainerDirectory(db) {
  const { rows } = await db.query(`SELECT first_name,last_name,specialization,experience_years,biography
    FROM trainers WHERE active ORDER BY first_name,last_name LIMIT 20`);
  return rows.map(row => ({ name: `${row.first_name} ${row.last_name}`,
    specialization: row.specialization || null, yearsExperience: row.experience_years,
    biography: row.biography || null }));
}

export async function getGymInformation(db) {
  const { rows } = await db.query('SELECT gym_name,address,phone,email,tagline FROM gym_settings WHERE id=true');
  const row = rows[0] || {};
  return { name: row.gym_name || 'SAREX Fitness Clinic', address: row.address || null,
    phone: row.phone || null, email: row.email || null, tagline: row.tagline || null };
}

export const getFacilities = () => facilities;
export const getRegistrationInformation = () => ({
  steps: ['Create an account on the SAREX registration page.', 'Choose an active membership plan.',
    'Review the membership price and any one-time registration fee shown for that plan.',
    'Complete payment through the secure checkout to activate membership.'],
  note: 'The current plan prices and registration fees come from the active SAREX membership plans. Renewal registration fees depend on the member’s existing registration-fee record.'
});

const DAY_MS = 86_400_000;
const addDateDays = (date, days) => {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const dayId = (day, index) => day?.id || `legacy-day-${index}`;
const percent = (completed, assigned) => assigned > 0 ? Math.round(completed / assigned * 100) : 0;
const boundedText = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
const boundedNumber = (value, min, max) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
};

const compareRecentWeeks = weeks => {
  // Compare two complete two-week windows; a short history is not a trend.
  if (weeks.length < 4) return { direction: 'insufficient_data', recentAveragePercent: null, earlierAveragePercent: null };
  const recent = weeks.slice(0, 2);
  const earlier = weeks.slice(2, 4);
  const average = group => group.reduce((sum, week) => sum + week.completionPercentage, 0) / group.length;
  const recentAveragePercent = Math.round(average(recent));
  const earlierAveragePercent = Math.round(average(earlier));
  const change = recentAveragePercent - earlierAveragePercent;
  return { direction: change >= 10 ? 'improving' : change <= -10 ? 'declining' : 'steady', recentAveragePercent, earlierAveragePercent };
};

export function buildMemberWorkoutIntelligence(plan, records, today = workoutDate()) {
  const routine = Array.isArray(plan.routine) ? plan.routine.slice(0, 7) : [];
  const assignedCount = Number(plan.days_per_week) || routine.length;
  const programStartedOn = String(plan.program_started_on || '').slice(0, 10);
  let currentCycle;
  let notStarted = false;
  try { currentCycle = calculateProgramWeek(programStartedOn, today); }
  catch (error) {
    if (error?.code !== 'WORKOUT_NOT_STARTED') throw error;
    notStarted = true;
    currentCycle = { number: 1, startDate: programStartedOn, endDate: addDateDays(programStartedOn, 6), nextStartDate: addDateDays(programStartedOn, 7) };
  }

  const weeks = [];
  for (let offset = 0; offset < 8 && currentCycle.number - offset > 0; offset += 1) {
    const weekNumber = currentCycle.number - offset;
    const startDate = addDateDays(currentCycle.startDate, -7 * offset);
    const byDay = new Map(records.filter(record => String(record.program_week_start).slice(0, 10) === startDate)
      .map(record => [record.workout_day_id, record]));
    const days = routine.map((day, index) => {
      const id = dayId(day, index);
      const completion = byDay.get(id);
      return { day: String(day?.dayName || `Day ${index + 1}`).slice(0, 80), focus: String(day?.focus || '').slice(0, 120),
        status: completion ? 'completed' : offset === 0 ? (notStarted ? 'upcoming' : 'available') : 'missed',
        completedAt: completion?.completed_at || null };
    });
    const completedCount = days.filter(day => day.status === 'completed').length;
    weeks.push({ weekNumber, startDate, endDate: addDateDays(startDate, 6), completedCount, assignedCount,
      completionPercentage: percent(completedCount, assignedCount), isComplete: assignedCount > 0 && completedCount >= assignedCount, days });
  }

  const currentWeek = weeks[0] || { weekNumber: 1, startDate: programStartedOn, endDate: addDateDays(programStartedOn, 6), completedCount: 0,
    assignedCount, completionPercentage: 0, isComplete: false, days: [] };
  const currentWeekCompletedDays = currentWeek.days.filter(day => day.status === 'completed');
  const currentWeekPendingDays = currentWeek.days.filter(day => day.status === 'available');
  const remainingWorkoutCount = Math.max(0, assignedCount - currentWeek.completedCount);
  const daysRemainingInCycle = notStarted ? null : Math.max(0, Math.floor((Date.parse(`${currentWeek.endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS) + 1);
  const historicalWeeks = weeks.slice(1);
  const adherenceWeeks = historicalWeeks.slice(0, 4);
  const adherenceCompleted = adherenceWeeks.reduce((sum, week) => sum + week.completedCount, 0);
  const adherenceAssigned = adherenceWeeks.reduce((sum, week) => sum + week.assignedCount, 0);
  const missedByDay = new Map();
  for (const week of historicalWeeks) for (const day of week.days) if (day.status === 'missed') {
    const current = missedByDay.get(day.day) || { day: day.day, missedCount: 0, weeksObserved: 0 };
    current.missedCount += 1;
    missedByDay.set(day.day, current);
  }
  for (const item of missedByDay.values()) item.weeksObserved = historicalWeeks.length;
  const frequentMissedDay = [...missedByDay.values()].sort((a, b) => b.missedCount - a.missedCount)[0];
  const consecutiveCompleteWeeks = historicalWeeks.reduce((count, week, index) => {
    if (index !== count || !week.isComplete) return count;
    return count + 1;
  }, 0);
  const completedSessions = weeks.flatMap(week => week.days.filter(day => day.status === 'completed')
    .map(day => ({ day: day.day, focus: day.focus || null, completedAt: day.completedAt, weekStart: week.startDate })))
    .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 6);
  const missedSessions = historicalWeeks.flatMap(week => week.days.filter(day => day.status === 'missed')
    .map(day => ({ day: day.day, focus: day.focus || null, weekStart: week.startDate }))).slice(0, 6);
  const trainerName = [plan.trainer_first_name, plan.trainer_last_name].filter(Boolean).join(' ').trim().slice(0, 120) || null;
  const exerciseDays = routine.map((day, index) => ({ day: boundedText(day?.dayName, 80) || `Day ${index + 1}`,
    focus: boundedText(day?.focus, 120), exercises: (Array.isArray(day?.exercises) ? day.exercises : []).slice(0, 8).map(exercise => ({
      name: boundedText(exercise?.name, 120), sets: boundedNumber(exercise?.sets, 1, 20),
      reps: typeof exercise?.reps === 'string' ? exercise.reps.slice(0, 32) : boundedNumber(exercise?.reps, 1, 100),
      restSeconds: boundedNumber(exercise?.restSeconds, 0, 600) ?? 60,
      trainerNotes: boundedText(exercise?.notes, 240) || null
    })) }));

  return {
    assignedPlan: true, title: String(plan.title || 'Trainer workout plan').slice(0, 160), description: String(plan.description || '').slice(0, 320),
    difficulty: boundedText(plan.difficulty, 80) || null, trainerName, programStatus: plan.status, programStartedOn,
    daysPerWeek: assignedCount, routine: exerciseDays,
    currentWeek: { ...currentWeek, completedDays: currentWeekCompletedDays, pendingDays: currentWeekPendingDays,
      remainingWorkoutCount, daysRemainingInCycle, notStarted },
    recentHistory: historicalWeeks,
    insights: {
      adherenceWindowWeeks: adherenceWeeks.length,
      adherenceCompletedWorkouts: adherenceCompleted,
      adherenceAssignedWorkouts: adherenceAssigned,
      adherencePercentage: percent(adherenceCompleted, adherenceAssigned),
      fullyCompletedWeeks: historicalWeeks.filter(week => week.isComplete).length,
      consecutiveFullyCompletedWeeks: consecutiveCompleteWeeks,
      trend: compareRecentWeeks(historicalWeeks),
      frequentlyMissedDay: frequentMissedDay?.missedCount >= 2 ? frequentMissedDay : null,
      recentCompletedSessions: completedSessions,
      recentMissedSessions: missedSessions
    }
  };
}

export async function getMyMemberContext(db, userId, { includeEvents = false, includeWorkout = true,
  includeMembership = true, includeGoal = true, includeEntitlements = false,
  includeAssignmentStatus = false } = {}) {
  const tasks = [];
  const context = {};
  const add = (key, promise) => tasks.push(promise.then(value => { context[key] = value; }));
  if (includeGoal) add('fitnessGoal', db.query('SELECT fitness_goal FROM members WHERE user_id=$1', [userId]).then(result => result.rows[0]?.fitness_goal || null));
  if (includeMembership) add('membership', db.query(`SELECT p.name plan_name,
      CASE WHEN EXISTS(SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND f.released_at IS NULL AND now()>=f.starts_at AND now()<f.ends_at) THEN 'frozen' ELSE s.status END status,
      s.starts_at,s.ends_at,
      CASE WHEN s.status='active' AND s.starts_at<=now() AND s.ends_at>now()
        AND NOT EXISTS(SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND f.released_at IS NULL AND now()>=f.starts_at AND now()<f.ends_at)
        THEN p.trainer_access ELSE false END trainer_access,
      p.workout_plan_access
      FROM subscriptions s JOIN membership_plans p ON p.id=s.plan_id JOIN members m ON m.id=s.member_id
      WHERE m.user_id=$1 AND s.ends_at>now() AND (
        (s.status='active' AND s.starts_at<=now()) OR s.status IN ('pending','scheduled'))
      ORDER BY (s.status='active') DESC,s.starts_at ASC LIMIT 1`, [userId]).then(result => {
      const row = result.rows[0];
      return row ? { plan: row.plan_name, status: row.status, startsAt: row.starts_at, endsAt: row.ends_at,
        trainerAccess: Boolean(row.trainer_access), workoutPlanAccess: Boolean(row.workout_plan_access) } : null;
    }));
  if (includeEntitlements) add('currentEntitlements', getMyCurrentEntitlements(db, userId));
  if (includeAssignmentStatus) add('hasTrainerAssignedPlan', db.query(`SELECT EXISTS (
      SELECT 1 FROM workout_plans w JOIN members m ON m.id=w.member_id
      WHERE m.user_id=$1 AND w.status='active' AND w.trainer_id IS NOT NULL) AS assigned`, [userId])
    .then(result => Boolean(result.rows[0]?.assigned)));
  if (includeWorkout) add('workout', (async () => {
    const plan = (await db.query(`SELECT w.id,w.member_id,w.title,w.description,w.difficulty,w.days_per_week,w.routine,w.program_started_on,w.status,
        t.first_name trainer_first_name,t.last_name trainer_last_name
      FROM workout_plans w JOIN members m ON m.id=w.member_id LEFT JOIN trainers t ON t.id=w.trainer_id
      WHERE m.user_id=$1 AND w.status='active' AND EXISTS (
        SELECT 1 FROM subscriptions s JOIN membership_plans p ON p.id=s.plan_id
        WHERE s.member_id=w.member_id AND s.status='active' AND s.starts_at<=now() AND s.ends_at>now()
          AND p.workout_plan_access AND NOT EXISTS (
            SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND f.released_at IS NULL
              AND now()>=f.starts_at AND now()<f.ends_at)) ORDER BY w.updated_at DESC LIMIT 1`, [userId])).rows[0];
    if (!plan) return null;
    const today = workoutDate();
    let week;
    try { week = calculateProgramWeek(plan.program_started_on, today); }
    catch (error) { if (error?.code !== 'WORKOUT_NOT_STARTED') throw error; week = { number: 1, startDate: String(plan.program_started_on).slice(0, 10) }; }
    const oldest = addDateDays(week.startDate, -49);
    const { rows } = await db.query(`SELECT workout_day_id,to_char(program_week_start,'YYYY-MM-DD') program_week_start,completed_at
      FROM workout_day_completions WHERE member_id=$1 AND workout_plan_id=$2
        AND program_week_start >= $3 AND program_week_start <= $4 ORDER BY completed_at DESC LIMIT 64`,
    [plan.member_id, plan.id, oldest, week.startDate]);
    return buildMemberWorkoutIntelligence(plan, rows, today);
  })());
  if (includeEvents) add('upcomingEvents', getPublicEvents(db, { member: true }));
  await Promise.all(tasks);
  if (context.workout && context.currentEntitlements?.trainerAccess !== true) context.workout.trainerName = null;
  return context;
}

export const getMyWorkoutPlan = async (db, userId) =>
  (await getMyMemberContext(db, userId, { includeWorkout: true, includeMembership: false, includeGoal: false })).workout;

export const getMyWorkoutProgress = async (db, userId) => {
  const workout = await getMyWorkoutPlan(db, userId);
  return workout ? { planTitle: workout.title, currentWeek: workout.currentWeek, recentHistory: workout.recentHistory } : null;
};

export const getMyWorkoutHistory = async (db, userId) => {
  const workout = await getMyWorkoutPlan(db, userId);
  return workout ? { planTitle: workout.title, currentWeek: workout.currentWeek, recentHistory: workout.recentHistory } : null;
};

export async function getMyFitnessGoal(db, userId) {
  const { rows } = await db.query('SELECT fitness_goal FROM members WHERE user_id=$1', [userId]);
  return rows[0]?.fitness_goal || null;
}

export async function getMyMembershipContext(db, userId) {
  return (await getMyMemberContext(db, userId, { includeWorkout: false, includeMembership: true, includeGoal: false })).membership;
}

export const getMyUpcomingEvents = db => getPublicEvents(db, { member: true });

export async function getMyCurrentEntitlements(db, userId) {
  const { rows } = await db.query(`SELECT EXISTS (
    SELECT 1 FROM members m JOIN subscriptions s ON s.member_id=m.id
      JOIN membership_plans p ON p.id=s.plan_id
    WHERE m.user_id=$1 AND s.status='active' AND s.starts_at<=now() AND s.ends_at>now()
      AND p.trainer_access IS TRUE AND NOT EXISTS (
        SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND f.released_at IS NULL
          AND now()>=f.starts_at AND now()<f.ends_at)) AS trainer_access`, [userId]);
  return { trainerAccess: Boolean(rows[0]?.trainer_access) };
}
