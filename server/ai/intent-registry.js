export const AssistantIntent = Object.freeze({
  PUBLIC_MEMBERSHIP_PLANS: 'PUBLIC_MEMBERSHIP_PLANS',
  SAREX_LOCATION: 'SAREX_LOCATION',
  SAREX_CONTACT: 'SAREX_CONTACT',
  SAREX_OPENING_HOURS: 'SAREX_OPENING_HOURS',
  SAREX_FACILITIES: 'SAREX_FACILITIES',
  PUBLIC_EVENTS: 'PUBLIC_EVENTS',
  PUBLIC_TRAINERS: 'PUBLIC_TRAINERS',
  REGISTRATION_HELP: 'REGISTRATION_HELP',
  MEMBERSHIP_PLAN_GUIDANCE: 'MEMBERSHIP_PLAN_GUIDANCE',
  MY_MEMBERSHIP: 'MY_MEMBERSHIP',
  MY_WORKOUT: 'MY_WORKOUT',
  MY_WORKOUT_PROGRESS: 'MY_WORKOUT_PROGRESS',
  MY_WORKOUT_HISTORY: 'MY_WORKOUT_HISTORY',
  MY_ATTENDANCE: 'MY_ATTENDANCE',
  MY_EVENTS: 'MY_EVENTS',
  MY_FITNESS_GOAL: 'MY_FITNESS_GOAL',
  MY_ENTITLEMENTS: 'MY_ENTITLEMENTS',
  SAREX_ACCOUNT_HELP: 'SAREX_ACCOUNT_HELP',
  TRAINER_ASSIGNED_MEMBERS: 'TRAINER_ASSIGNED_MEMBERS',
  FITNESS_GUIDANCE: 'FITNESS_GUIDANCE',
  OUT_OF_SCOPE: 'OUT_OF_SCOPE'
});

export function resolveAssistantIdentity(actor) {
  if (!actor?.id || !Array.isArray(actor.roles) || actor.roles.length === 0) {
    return Object.freeze({ authenticated: false, userId: null, roles: Object.freeze([]), role: 'guest', mustChangePassword: false });
  }
  const roles = Object.freeze([...new Set(actor.roles.filter(role => typeof role === 'string'))]);
  const role = roles.includes('admin') || roles.includes('super_admin') ? 'admin'
    : roles.includes('staff') ? 'staff' : roles.includes('trainer') ? 'trainer'
      : roles.includes('member') ? 'member' : 'guest';
  return Object.freeze({ authenticated: true, userId: actor.id, roles, role,
    mustChangePassword: actor.must_change_password === true });
}

const patterns = Object.freeze({
  location: /\b(where (?:is|are) (?:sarex|the gym)|where(?:'s| is) sarex|what(?:'s| is) your address|what is the address|address of sarex|how do i get to sarex|directions to sarex|gym location)\b/i,
  contact: /\bhow (?:can|do) i contact sarex|contact (?:sarex|the gym)|sarex contact details|phone number for sarex|email (?:address )?for sarex\b/i,
  openingHours: /\b(?:what time (?:do you|does sarex|does the gym) open|when does sarex open|what are (?:your|sarex(?:'s)?|the gym's) opening hours|opening times|when do you close|what time do you close)\b/i,
  facilities: /\bwhat facilities (?:do you have|does sarex have)|what (?:facilities|services) does sarex offer|sarex facilities|gym facilities\b/i,
  publicEvents: /\b(?:upcoming|public) events\b|\bwhat events (?:are|is) (?:coming up|upcoming)|\bwhat's on at sarex\b/i,
  publicTrainers: /\b(?:who are|show me|list) (?:your|the sarex)? ?(?:trainers|coaches)\b|\btrainer directory\b/i,
  registrationHelp: /\bhow (?:do|can) i (?:register|sign up|join sarex)|\bregistration (?:help|steps|process)|\bhow does registration work\b/i,
  accountHelp: /\b(forgot|forget|reset|resetting|recover|change|changing|update)\b.{0,40}\b(password|account|login|credentials?)\b|\b(password|account|login|credentials?)\b.{0,40}\b(forgot|forget|reset|recover|change|update)\b/i,
  myMembership: /\b(my|mine)\b.{0,45}\b(membership|subscription|plan)\b|\bwhat (?:membership|plan|subscription) am i on\b|\bwhat membership do i have\b|\bwhen does (?:it|my membership|my subscription) expire\b|\bwhen is my membership up\b/i,
  myMembershipFollowUp: /\b(when does it expire|when is it up|how long do i have left|what's the expiry|what is the expiry|when does my plan end)\b/i,
  publicPlanFollowUp: /\b(which one|which is best|best for me|what do you recommend|which should i (?:get|choose|pick)|which one has|which gives me)\b/i,
  planGuidance: /\bhelp me (?:choose|pick|select) (?:a |the )?(?:membership )?plan\b|\bwhich (?:membership )?(?:plan )?(?:should i (?:get|choose|pick|subscribe to)|is right for me)\b|\bwhat plan should i subscribe to\b|\bcompare (?:your |the |available )?(?:membership )?plans?\b|\bwhich plan includes? (?:trainer|workout plan|classes?)\b/i,
  publicPlans: /\b(?:membership|subscription) plans?\b|\b(?:which|what) plans?\b|\bshow(?: me)?(?: your)? plans?\b|\byour plans\b|\bplans? (?:available|do you have|do you offer)\b|\bhow much (?:is|does) (?:a |the )?membership(?: cost)?\b|\b(?:price|cost) of (?:a |the )?membership\b|\bmembership (?:prices?|costs?|options?|benefits?)\b/i,
  workoutHistory: /\b(my|mine)\b.{0,40}\b(workout|training)\s*(history|record|records)\b|\bwhat did i (?:complete|miss) last week\b|\bmy missed workouts?\b/i,
  workoutProgress: /\b(my|mine)\b.{0,40}\b(workout|training)\s*(progress|adherence|consistency)\b|\bhow am i doing (?:this week|with my workouts?)\b|\bmy workouts? this week\b/i,
  myWorkout: /\b(my|mine|assigned to me)\b.{0,50}\b(workout|training)\s*(plan|program)?\b|\b(workout|training)\s*(plan|program)\b.{0,50}\b(my|mine|assigned to me)\b|\bdo you have access to my workout\b|\bwhat (?:workout|training) (?:plan|program) do i have\b|\bwhat (?:plan|program) did my trainer assign\b|\bwhat plan has my trainer assigned\b|\bwhat did my trainer assign\b/i,
  myAttendance: /\b(my|mine)\b.{0,40}\b(attendance|check[\s-]?ins?|visits?)\b/i,
  myEvents: /\b(my|mine)\b.{0,40}\b(upcoming )?events?\b|\bwhat events? have i (?:registered|signed up) for\b/i,
  myGoal: /\b(my|mine)\b.{0,35}\b(fitness goal|goal)\b/i,
  myEntitlements: /\b(my|mine)\b.{0,40}\b(access|entitlements?|features?)\b|\bwhat (?:features|access) (?:does|do) my membership include\b/i,
  trainerAssigned: /\b(assigned members?|members? assigned to me|my clients?|member workout progress|workout adherence|adherence summary|how are my assigned members doing|which members are missing workouts?|members? behind on workouts?)\b/i,
  fitness: /\b(fitness|wellness|gym|workouts?|exercises?|training|muscle|strength|protein|nutrition|recovery|sets?|reps?|stretch(?:ing)?|warm[\s-]?up|cool[\s-]?down|cardio|sleep|hydration|injur(?:y|ies)|beginner|intermediate|advanced)\b/i
});

export function resolveAssistantIntent({ message, history = [], identity }) {
  const text = String(message || '').trim();
  const previousUserText = [...history].reverse().find(item => item.role === 'user')?.content || '';
  const previousAssistantText = [...history].reverse().find(item => item.role === 'assistant')?.content || '';
  if (patterns.accountHelp.test(text)) return AssistantIntent.SAREX_ACCOUNT_HELP;

  if (patterns.location.test(text)) return AssistantIntent.SAREX_LOCATION;
  if (patterns.contact.test(text)) return AssistantIntent.SAREX_CONTACT;
  if (patterns.openingHours.test(text)) return AssistantIntent.SAREX_OPENING_HOURS;
  if (patterns.facilities.test(text)) return AssistantIntent.SAREX_FACILITIES;
  if (patterns.publicEvents.test(text)) return AssistantIntent.PUBLIC_EVENTS;
  if (patterns.publicTrainers.test(text)) return AssistantIntent.PUBLIC_TRAINERS;
  if (patterns.registrationHelp.test(text)) return AssistantIntent.REGISTRATION_HELP;

  // Workout data has its own entitlement and history rules. Resolve it before
  // the broad personal-plan matcher so "my workout plan" is never treated as
  // a membership question.
  if (identity?.role === 'member') {
    if (patterns.workoutHistory.test(text)) return AssistantIntent.MY_WORKOUT_HISTORY;
    if (patterns.workoutProgress.test(text)) return AssistantIntent.MY_WORKOUT_PROGRESS;
    if (patterns.myWorkout.test(text)) return AssistantIntent.MY_WORKOUT;
    if (patterns.myAttendance.test(text)) return AssistantIntent.MY_ATTENDANCE;
    if (patterns.myEvents.test(text)) return AssistantIntent.MY_EVENTS;
    if (patterns.myGoal.test(text)) return AssistantIntent.MY_FITNESS_GOAL;
    if (patterns.myEntitlements.test(text)) return AssistantIntent.MY_ENTITLEMENTS;
  }
  // Personal intent outranks public/catalog language (e.g. "my membership plan").
  if (patterns.myMembership.test(text) || (patterns.myMembershipFollowUp.test(text) && patterns.myMembership.test(previousUserText))) return AssistantIntent.MY_MEMBERSHIP;
  if (patterns.planGuidance.test(text) || (patterns.publicPlanFollowUp.test(text) &&
    (patterns.publicPlans.test(previousUserText) || patterns.planGuidance.test(previousUserText)))) return AssistantIntent.MEMBERSHIP_PLAN_GUIDANCE;
  if (patterns.publicPlans.test(text)) return AssistantIntent.PUBLIC_MEMBERSHIP_PLANS;

  if (patterns.trainerAssigned.test(text)) return AssistantIntent.TRAINER_ASSIGNED_MEMBERS;

  // Short follow-ups inherit the recent domain when the assistant just asked
  // for missing fitness context or the conversation is about plan discovery.
  if (text.split(/\s+/).length <= 10 && /experience level|how much time|what(?:'s| is) your goal|any limitations|trainer-assigned/i.test(previousAssistantText)) return AssistantIntent.FITNESS_GUIDANCE;
  if (patterns.fitness.test(text)) return AssistantIntent.FITNESS_GUIDANCE;
  return null;
}

export const assistantIntentPatterns = patterns;
