import { getFacilities, getGymInformation, getMyMemberContext, getMyUpcomingEvents,
  getPublicEvents, getPublicTrainerDirectory, getRegistrationInformation } from './context.js';
import { AssistantIntent, resolveAssistantIdentity, resolveAssistantIntent } from './intent-registry.js';

const isMember = actor => actor?.roles?.includes('member') === true;
const isTrainer = actor => actor?.roles?.includes('trainer') === true;
const count = value => Number(value || 0);

async function myAttendanceSummary(db, userId) {
  const { rows } = await db.query(`SELECT count(*) FILTER (WHERE a.status IN ('open','completed'))::int successful_visits,
      max(a.checked_in_at) latest_visit FROM attendance a JOIN members m ON m.id=a.member_id
    WHERE m.user_id=$1 AND a.checked_in_at>=now()-interval '30 days'`, [userId]);
  return { successfulVisitsLast30Days: count(rows[0]?.successful_visits), latestVisit: rows[0]?.latest_visit || null };
}

async function trainerAssignedSummary(db, userId) {
  const { rows } = await db.query(`SELECT m.first_name,m.last_name,w.title plan_title,w.days_per_week,
      COALESCE(progress.completed,0)::int completed,COALESCE(progress.week_start,week.current_start)::text week_start
    FROM trainers t JOIN trainer_assignments ta ON ta.trainer_id=t.id AND ta.active
      AND ta.starts_at<=now() AND (ta.ends_at IS NULL OR ta.ends_at>now())
    JOIN members m ON m.id=ta.member_id
    CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE 'Africa/Lagos')::date today) clinic
    LEFT JOIN LATERAL (SELECT wp.id,wp.title,wp.days_per_week,wp.program_started_on,
        CASE WHEN clinic.today<wp.program_started_on THEN wp.program_started_on
          ELSE (wp.program_started_on + (((clinic.today-wp.program_started_on)/7)*7))::date END current_start
      FROM workout_plans wp WHERE wp.member_id=m.id AND wp.trainer_id=t.id AND wp.status='active'
      ORDER BY wp.updated_at DESC LIMIT 1) w ON true
    LEFT JOIN LATERAL (SELECT w.current_start) week ON w.id IS NOT NULL
    LEFT JOIN LATERAL (SELECT count(*)::int completed,min(c.program_week_start)::text week_start
      FROM workout_day_completions c WHERE c.member_id=m.id AND c.workout_plan_id=w.id AND c.program_week_start=week.current_start) progress ON true
    WHERE t.user_id=$1 ORDER BY m.first_name,m.last_name LIMIT 50`, [userId]);
  return rows.map(row => {
    const assignedPerWeek = count(row.days_per_week);
    const completedThisWeek = count(row.completed);
    return { memberName: `${row.first_name} ${row.last_name}`.trim(), plan: row.plan_title || null,
      assignedPerWeek, completedThisWeek,
      completionPercentage: assignedPerWeek ? Math.round(completedThisWeek / assignedPerWeek * 100) : 0,
      weekStart: row.week_start || null };
  });
}

async function getMemberWorkout(db, actor) {
  if (actor.must_change_password) return { status: 'unauthorized' };
  const context = await getMyMemberContext(db, actor.id, { includeWorkout: true, includeMembership: false,
    includeGoal: false, includeEntitlements: true, includeAssignmentStatus: true });
  if (context.memberWorkoutIntelligenceUnavailable) return { status: 'unavailable' };
  if (!context.workout) return { status: context.hasTrainerAssignedPlan ? 'unavailable_entitlement' : 'no_record',
    entitlement: context.currentEntitlements };
  const plan = context.workout;
  return { status: 'success', plan: { title: plan.title, description: plan.description || null,
    difficulty: plan.difficulty, daysPerWeek: plan.daysPerWeek, trainerName: plan.trainerName || null,
    currentWeek: { number: plan.currentWeek.weekNumber, startDate: plan.currentWeek.startDate,
      completed: plan.currentWeek.completedCount, required: plan.currentWeek.assignedCount,
      completionPercentage: plan.currentWeek.completionPercentage },
    days: plan.routine.map((day, index) => ({ name: day.day, focus: day.focus,
      status: plan.currentWeek.days[index]?.status || 'available',
      completedAt: plan.currentWeek.days[index]?.completedAt || null,
      exercises: day.exercises.map(exercise => ({ name: exercise.name, sets: exercise.sets, reps: exercise.reps, restSeconds: exercise.restSeconds })) })) } };
}

function roleCanUse(actor, tool, surface = null) {
  if (['gymInformation', 'facilities', 'publicEvents', 'publicTrainers', 'registrationHelp'].includes(tool)) return true;
  if (tool === 'myWorkout' || tool === 'myMembership' || tool === 'myGoal' || tool === 'myAttendance' || tool === 'myEvents' || tool === 'myEntitlements') return isMember(actor) && surface !== 'trainer';
  if (tool === 'trainerAssigned') return isTrainer(actor) && (surface === null || surface === 'trainer');
  return false;
}

const toolsByIntent = Object.freeze({
  [AssistantIntent.SAREX_LOCATION]: 'gymInformation', [AssistantIntent.SAREX_CONTACT]: 'gymInformation',
  [AssistantIntent.SAREX_OPENING_HOURS]: 'gymInformation', [AssistantIntent.SAREX_FACILITIES]: 'facilities',
  [AssistantIntent.PUBLIC_EVENTS]: 'publicEvents', [AssistantIntent.PUBLIC_TRAINERS]: 'publicTrainers',
  [AssistantIntent.REGISTRATION_HELP]: 'registrationHelp',
  [AssistantIntent.MY_MEMBERSHIP]: 'myMembership', [AssistantIntent.MY_WORKOUT]: 'myWorkout',
  [AssistantIntent.MY_FITNESS_GOAL]: 'myGoal', [AssistantIntent.MY_ATTENDANCE]: 'myAttendance',
  [AssistantIntent.MY_EVENTS]: 'myEvents', [AssistantIntent.MY_ENTITLEMENTS]: 'myEntitlements',
  [AssistantIntent.TRAINER_ASSIGNED_MEMBERS]: 'trainerAssigned'
});

export async function getGroundedPortalData({ db, actor, message, history = [], intent: suppliedIntent, surface = null }) {
  const identity = resolveAssistantIdentity(actor);
  const intent = suppliedIntent || resolveAssistantIntent({ message, history, identity });
  const tool = toolsByIntent[intent];
  if (!tool) return { status: 'not_applicable', intent: intent || null };
  const publicTool = ['gymInformation', 'facilities', 'publicEvents', 'publicTrainers', 'registrationHelp'].includes(tool);
  if ((!publicTool && !identity.authenticated) || !roleCanUse(actor, tool, surface)) return { status: 'unauthorized', tool, intent, outcome: 'UNAUTHORIZED' };
  try {
    let data;
    switch (tool) {
      case 'gymInformation': data = await getGymInformation(db); break;
      case 'facilities': data = getFacilities(); break;
      case 'publicEvents': data = await getPublicEvents(db); break;
      case 'publicTrainers': data = await getPublicTrainerDirectory(db); break;
      case 'registrationHelp': data = getRegistrationInformation(); break;
      case 'myWorkout': data = await getMemberWorkout(db, actor); break;
      case 'myMembership': data = await getMyMemberContext(db, actor.id, { includeWorkout: false, includeGoal: false, includeMembership: true }).then(value => value.membership); break;
      case 'myGoal': data = await db.query('SELECT fitness_goal FROM members WHERE user_id=$1', [actor.id]).then(result => result.rows[0]?.fitness_goal || null); break;
      case 'myAttendance': data = await myAttendanceSummary(db, actor.id); break;
      case 'myEvents': data = await getMyUpcomingEvents(db); break;
      case 'myEntitlements': data = await db.query(`SELECT p.name plan,
          (s.status='active' AND s.starts_at<=now() AND s.ends_at>now() AND p.trainer_access AND NOT EXISTS (
            SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND f.released_at IS NULL AND now()>=f.starts_at AND now()<f.ends_at)) trainer_access,
          (s.status='active' AND s.starts_at<=now() AND s.ends_at>now() AND p.workout_plan_access AND NOT EXISTS (
            SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id AND f.released_at IS NULL AND now()>=f.starts_at AND now()<f.ends_at)) workout_plan_access
        FROM subscriptions s JOIN membership_plans p ON p.id=s.plan_id JOIN members m ON m.id=s.member_id
        WHERE m.user_id=$1 ORDER BY s.starts_at DESC LIMIT 1`, [actor.id]).then(result => result.rows[0] || null); break;
      case 'trainerAssigned': data = await trainerAssignedSummary(db, actor.id); break;
      default: return { status: 'not_applicable' };
    }
    const noData = data === null || data === undefined || (['myWorkout'].includes(tool) && data.status === 'no_record') ||
      (tool === 'gymInformation' && (intent === AssistantIntent.SAREX_LOCATION && !data.address ||
        intent === AssistantIntent.SAREX_CONTACT && !data.phone && !data.email ||
        intent === AssistantIntent.SAREX_OPENING_HOURS && !data.openingHours)) ||
      (['facilities', 'publicEvents', 'publicTrainers'].includes(tool) && data.length === 0);
    return { status: 'success', outcome: noData ? 'SUCCESS_NO_DATA' : 'SUCCESS_WITH_DATA', tool, intent, data, actor,
      source: ({ myMembership: 'subscription service', myWorkout: 'trainer assignment and workout service',
        myAttendance: 'attendance service', attendanceToday: 'attendance service', expired: 'subscription service',
        expiring: 'subscription service', membershipStatus: 'subscription service', myEvents: 'event service' })[tool] || 'SAREX portal service' };
  } catch {
    return { status: 'unavailable', outcome: 'FAILURE', tool, intent, source: tool };
  }
}

export function formatGroundedResponse(result) {
  if (!result || result.status === 'not_applicable') return null;
  if (result.status === 'unauthorized') return { message: "I can't access that information for your account role.", actions: [] };
  if (result.status === 'unavailable' || result.data?.status === 'unavailable') return {
    message: result.tool === 'myWorkout' ? "I couldn't retrieve your workout information right now. Please try again shortly."
      : "I couldn't retrieve that information right now. Please try again shortly.", actions: []
  };
  const { tool, data } = result;
  if (tool === 'myWorkout') {
    if (data.status === 'no_record') return { message: "I couldn't find an active workout plan assigned to your account.", actions: [{ label: 'Open My Workout', type: 'navigate', path: '/member/workout' }] };
    if (data.status === 'unavailable_entitlement') return { message: "I can see that a trainer-assigned plan exists, but your current subscription doesn't include workout-plan access. Please contact SAREX staff to review your access.", actions: [{ label: 'Open My Membership', type: 'navigate', path: '/member/membership' }] };
    if (data.status !== 'success') return { message: "I couldn't retrieve your workout information right now. Please try again shortly.", actions: [] };
    const p = data.plan;
    return { message: `Yes. I can see your trainer-assigned plan, **${p.title}**${p.trainerName ? ` from ${p.trainerName}` : ''}. It's set for ${p.daysPerWeek} ${p.daysPerWeek === 1 ? 'day' : 'days'} per week${p.difficulty ? ` at ${p.difficulty.toLowerCase()} level` : ''}. This week you've completed ${p.currentWeek.completed} of ${p.currentWeek.required} workouts (${p.currentWeek.completionPercentage}%). I can explain its exercises and your progress, but I can't change the plan.`, actions: [{ label: 'Open My Workout', type: 'navigate', path: '/member/workout' }] };
  }
  if (tool === 'gymInformation') {
    const actions = [{ label: 'Contact SAREX', type: 'navigate', path: '/contact' }];
    if (result.intent === AssistantIntent.SAREX_LOCATION) return data.address
      ? { message: `${data.name} is located at ${data.address}.`, actions,
        content: { type: 'business_info', data: { name: data.name, address: data.address, contactPath: '/contact' } } }
      : { message: "I don't have the SAREX address configured yet. You can contact the team for directions.", actions,
        content: { type: 'business_info', data: { name: data.name, address: null, contactPath: '/contact' } } };
    if (result.intent === AssistantIntent.SAREX_OPENING_HOURS) return data.openingHours
      ? { message: `SAREX opening hours: ${data.openingHours}.`, actions,
        content: { type: 'business_info', data: { name: data.name, openingHours: data.openingHours, contactPath: '/contact' } } }
      : { message: "SAREX opening hours aren't currently configured in the portal. Please contact the team to confirm today's hours.", actions,
        content: { type: 'business_info', data: { name: data.name, openingHours: null, contactPath: '/contact' } } };
    const contact = [data.phone && `Phone: ${data.phone}`, data.email && `Email: ${data.email}`, data.address && `Address: ${data.address}`].filter(Boolean);
    return contact.length
      ? { message: `You can contact ${data.name}${contact.length ? `:\n${contact.join('\n')}` : '.'}`, actions,
        content: { type: 'business_info', data: { name: data.name, phone: data.phone, email: data.email, address: data.address, contactPath: '/contact' } } }
      : { message: "SAREX contact details aren't currently configured in the portal. Please use the Contact SAREX page to reach the team.", actions,
        content: { type: 'business_info', data: { name: data.name, phone: null, email: null, address: null, contactPath: '/contact' } } };
  }
  if (tool === 'facilities') return { message: data.length
    ? `SAREX facilities and services include:\n${data.map(item => `- ${item.name}: ${item.description}`).join('\n')}`
    : "SAREX facility information isn't currently available.", actions: [{ label: 'Explore Facilities', type: 'navigate', path: '/facilities' }],
    content: { type: 'business_info', data: { facilities: data } } };
  if (tool === 'publicEvents') return { message: data.length
    ? `Upcoming public SAREX events:\n${data.slice(0, 5).map(event => `- ${event.title} — ${new Date(event.startsAt).toLocaleString('en-NG')}${event.location ? ` at ${event.location}` : ''}`).join('\n')}`
    : 'There are no upcoming public SAREX events listed right now.', actions: [{ label: 'View Upcoming Events', type: 'navigate', path: '/' }] };
  if (tool === 'publicTrainers') return { message: data.length
    ? `SAREX trainers:\n${data.slice(0, 10).map(trainer => `- ${trainer.name}${trainer.specialization ? ` — ${trainer.specialization}` : ''}`).join('\n')}`
    : 'There are no public trainer profiles listed right now.', actions: [{ label: 'Contact SAREX', type: 'navigate', path: '/contact' }] };
  if (tool === 'registrationHelp') return { message: `${data.steps.join('\n')}\n\n${data.note}`,
    actions: [{ label: 'Create an Account', type: 'navigate', path: '/register' }],
    content: { type: 'business_info', data: { registrationSteps: data.steps } } };
  if (tool === 'myMembership') return { message: data?.status === 'active'
    ? `Your current membership is **${data.plan}**, active until ${new Date(data.endsAt).toLocaleDateString('en-NG')}.`
    : data?.status === 'frozen' ? `Your **${data.plan}** membership is currently frozen. Its recorded end date is ${new Date(data.endsAt).toLocaleDateString('en-NG')}.`
      : data ? `Your upcoming membership is **${data.plan}** (${data.status}), starting ${new Date(data.startsAt).toLocaleDateString('en-NG')}.`
        : "You don't currently have an active membership.", actions: data ? [{ label: 'Open My Membership', type: 'navigate', path: '/member/membership' }] : [] };
  if (tool === 'myGoal') return { message: data ? `Your saved fitness goal is **${data}**.` : 'You have not saved a fitness goal in your profile yet.', actions: [{ label: 'Open My Profile', type: 'navigate', path: '/member/profile' }] };
  if (tool === 'myAttendance') return { message: `You have ${data.successfulVisitsLast30Days} successful visits recorded in the last 30 days${data.latestVisit ? `; your most recent check-in was ${new Date(data.latestVisit).toLocaleDateString('en-NG')}` : ''}.`, actions: [{ label: 'View My Attendance', type: 'navigate', path: '/member/attendance' }] };
  if (tool === 'myEvents') return { message: data.length ? `Your upcoming SAREX events are:\n${data.slice(0, 5).map(event => `- ${event.title} — ${new Date(event.startsAt).toLocaleString('en-NG')}`).join('\n')}` : 'There are no upcoming SAREX events available to your account right now.', actions: [{ label: 'View Events', type: 'navigate', path: '/member/events' }] };
  if (tool === 'myEntitlements') return { message: data ? `Your ${data.plan} membership currently includes ${data.trainer_access ? 'trainer access' : 'no trainer access'} and ${data.workout_plan_access ? 'workout-plan access' : 'no workout-plan access'}.` : "I couldn't find a current membership on your account to check its access features.", actions: [{ label: 'Open My Membership', type: 'navigate', path: '/member/membership' }] };
  if (tool === 'trainerAssigned') return { message: data.length
    ? `You currently have ${data.length} assigned ${data.length === 1 ? 'member' : 'members'}:\n${data.map(member => `- ${member.memberName}: ${member.plan ? `${member.completedThisWeek}/${member.assignedPerWeek} workouts this week (${member.completionPercentage}%)` : 'no active plan'}${member.assignedPerWeek > member.completedThisWeek ? `; ${member.assignedPerWeek - member.completedThisWeek} remaining` : ''}`).join('\n')}`
    : 'You have no active member assignments right now.', actions: [{ label: 'View Assigned Members', type: 'navigate', path: '/trainer/members' }] };
  return null;
}

export const groundedToolIntents = Object.freeze(Object.keys(toolsByIntent));
