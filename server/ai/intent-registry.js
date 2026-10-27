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

// Capabilities describe supported work; request examples are illustrative, not
// a phrase list. Model-selected capabilities are still validated and executed
// through the corresponding server service and its normal authorization checks.
export const assistantCapabilities = Object.freeze({
  [AssistantIntent.MY_WORKOUT]: Object.freeze({ purpose: 'Explain the authenticated member’s current assigned workout.',
    examples: ['What am I training today?', 'What did my coach put me on?'], parameters: [], service: 'getGroundedPortalData:myWorkout',
    personalData: true, roles: ['member'], authorization: 'Authenticated session member ID; verify assignment and entitlement.', behavior: 'read_only', result: 'Current assigned plan and prescribed exercises.', failure: 'Distinguish no assignment, entitlement denial, and retrieval failure.' }),
  [AssistantIntent.MY_WORKOUT_PROGRESS]: Object.freeze({ purpose: 'Summarize current weekly workout completion.',
    examples: ['How is training going this week?', 'How many sessions remain?'], parameters: [], service: 'getGroundedPortalData:myWorkout',
    personalData: true, roles: ['member'], authorization: 'Authenticated session member ID.', behavior: 'read_only', result: 'Server-calculated current program-week progress.', failure: 'Report retrieval failure separately from zero progress.' }),
  [AssistantIntent.MY_WORKOUT_HISTORY]: Object.freeze({ purpose: 'Explain recorded workout completion and missed sessions.',
    examples: ['What have I completed lately?', 'Did I miss any sessions?'], parameters: [], service: 'getGroundedPortalData:myWorkout',
    personalData: true, roles: ['member'], authorization: 'Authenticated session member ID.', behavior: 'read_only', result: 'Persistent workout history.', failure: 'Never infer history when retrieval fails.' }),
  [AssistantIntent.MY_MEMBERSHIP]: Object.freeze({ purpose: 'Retrieve the signed-in member’s membership status.',
    examples: ['When does my plan end?', 'What membership do I have?'], parameters: [], service: 'getGroundedPortalData:myMembership',
    personalData: true, roles: ['member'], authorization: 'Authenticated session member ID.', behavior: 'read_only', result: 'Current membership status.', failure: 'Distinguish no membership from service failure.' }),
  [AssistantIntent.MY_ATTENDANCE]: Object.freeze({ purpose: 'Summarize the member’s own attendance.',
    examples: ['How often have I visited?', 'When was my last check-in?'], parameters: [], service: 'getGroundedPortalData:myAttendance',
    personalData: true, roles: ['member'], authorization: 'Authenticated session member ID.', behavior: 'read_only', result: 'Recent attendance summary.', failure: 'Do not infer visits.' }),
  [AssistantIntent.MY_EVENTS]: Object.freeze({ purpose: 'List events available to the member.', examples: ['What events did I sign up for?'], parameters: [], service: 'getGroundedPortalData:myEvents',
    personalData: true, roles: ['member'], authorization: 'Authenticated member session.', behavior: 'read_only', result: 'Member event registrations.', failure: 'Distinguish no registrations from service failure.' }),
  [AssistantIntent.MY_FITNESS_GOAL]: Object.freeze({ purpose: 'Read the member’s saved fitness goal.', examples: ['What goal did I save?'], parameters: [], service: 'getGroundedPortalData:myGoal',
    personalData: true, roles: ['member'], authorization: 'Authenticated session member ID.', behavior: 'read_only', result: 'Saved fitness goal.', failure: 'No saved goal is a valid empty result.' }),
  [AssistantIntent.MY_ENTITLEMENTS]: Object.freeze({ purpose: 'Explain features included in the member’s current subscription.', examples: ['What access does my membership include?'], parameters: [], service: 'getGroundedPortalData:myEntitlements',
    personalData: true, roles: ['member'], authorization: 'Authenticated session member ID.', behavior: 'read_only', result: 'Current subscription entitlements.', failure: 'Do not infer entitlements.' }),
  [AssistantIntent.TRAINER_ASSIGNED_MEMBERS]: Object.freeze({ purpose: 'Summarize progress for members assigned to the signed-in trainer.', examples: ['How are my clients progressing?'], parameters: [], service: 'getGroundedPortalData:trainerAssigned',
    personalData: true, roles: ['trainer'], authorization: 'Trainer session and active assignment ownership.', behavior: 'read_only', result: 'Assigned-member weekly adherence.', failure: 'Return only authorized assigned members.' }),
  [AssistantIntent.PUBLIC_MEMBERSHIP_PLANS]: Object.freeze({ purpose: 'Show current public membership plans and their configured facts.', examples: ['What does membership cost?'], parameters: [], service: 'membership_plans service',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Public active plans only.', behavior: 'read_only', result: 'Configured plan records.', failure: 'Never invent plan facts.' }),
  [AssistantIntent.MEMBERSHIP_PLAN_GUIDANCE]: Object.freeze({ purpose: 'Help compare configured public membership plans.', examples: ['Which option suits training with a coach?'], parameters: [], service: 'membership_plans service',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Public active plans only.', behavior: 'read_only', result: 'Configured plan records.', failure: 'Recommendations must use recorded plan features.' }),
  [AssistantIntent.SAREX_LOCATION]: Object.freeze({ purpose: 'Retrieve configured SAREX location details.', examples: ['Where is the clinic?'], parameters: [], service: 'getGroundedPortalData:gymInformation',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Public business data only.', behavior: 'read_only', result: 'Configured address.', failure: 'Say when the address is not configured.' }),
  [AssistantIntent.SAREX_CONTACT]: Object.freeze({ purpose: 'Retrieve configured SAREX contact details.', examples: ['How can I reach the clinic?'], parameters: [], service: 'getGroundedPortalData:gymInformation',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Public business data only.', behavior: 'read_only', result: 'Configured phone, email, and address.', failure: 'Say when contact details are not configured.' }),
  [AssistantIntent.SAREX_OPENING_HOURS]: Object.freeze({ purpose: 'Retrieve configured opening hours.', examples: ['When can I visit?'], parameters: [], service: 'getGroundedPortalData:gymInformation',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Public business data only.', behavior: 'read_only', result: 'Configured opening hours.', failure: 'Say when hours are not configured.' }),
  [AssistantIntent.SAREX_FACILITIES]: Object.freeze({ purpose: 'Describe documented SAREX facilities.', examples: ['What can I train with at SAREX?'], parameters: [], service: 'getFacilities',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Public documented facts only.', behavior: 'read_only', result: 'Documented facilities.', failure: 'Do not invent equipment.' }),
  [AssistantIntent.PUBLIC_EVENTS]: Object.freeze({ purpose: 'List published public SAREX events.', examples: ['Is anything happening soon?'], parameters: [], service: 'getPublicEvents',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Published public events only.', behavior: 'read_only', result: 'Public event records.', failure: 'Report no events or retrieval failure accurately.' }),
  [AssistantIntent.PUBLIC_TRAINERS]: Object.freeze({ purpose: 'List public active trainer profiles.', examples: ['Who coaches at SAREX?'], parameters: [], service: 'getPublicTrainerDirectory',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Active public profiles only.', behavior: 'read_only', result: 'Trainer directory entries.', failure: 'Do not invent trainer details.' }),
  [AssistantIntent.REGISTRATION_HELP]: Object.freeze({ purpose: 'Explain the configured registration process.', examples: ['How do I get started?'], parameters: [], service: 'getRegistrationInformation',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Public registration guidance.', behavior: 'read_only', result: 'Registration steps and allowlisted route.', failure: 'Do not claim payment or registration succeeded.' }),
  [AssistantIntent.SAREX_ACCOUNT_HELP]: Object.freeze({ purpose: 'Guide password recovery using the existing secure flow.', examples: ['I cannot get into my account.'], parameters: [], service: 'passwordHelpResponse',
    personalData: false, roles: ['guest', 'member', 'trainer', 'staff', 'admin'], authorization: 'Existing password-recovery policy.', behavior: 'read_only', result: 'Recovery instructions.', failure: 'Never request or expose passwords.' }),
  [AssistantIntent.FITNESS_GUIDANCE]: Object.freeze({ purpose: 'Give general SAREX-relevant fitness and wellness guidance.', examples: ['How can I train more consistently?'], parameters: [], service: 'configured AI provider',
    personalData: false, roles: ['guest', 'member', 'trainer'], authorization: 'Fitness safety rules and supplied context.', behavior: 'read_only', result: 'General guidance.', failure: 'Ask a concise clarification when critical context is missing.' })
});

export function isPrivateAssistantIntent(intent) {
  return assistantCapabilities[intent]?.personalData === true;
}

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
  workoutHistory: /\b(my|mine)\b.{0,40}\b(workout|training)\s*(history|record|records)\b|\b(?:summari[sz]e|show|review)\b.{0,35}\bmy\b.{0,20}\b(workout|training)\s*(history|records?)\b|\bwhat did i (?:complete|miss) last week\b|\bmy missed workouts?\b|\bwhich workouts? have i completed\b|\bwhat workouts? have i completed\b|\bwhich workouts? have i been missing\b|\bdid i miss any workout sessions?\b/i,
  workoutProgress: /\b(my|mine)\b.{0,40}\b(workout|training)\s*(progress|adherence|consistency)\b|\bhow am i doing (?:this week|with my workouts?)\b|\bmy workouts? this week\b|\bsummarize my workout progress\b/i,
    myWorkout: /\b(my|mine|assigned to me)\b.{0,50}\b(workout|training)\s*(plan|program)?\b|\b(workout|training)\s*(plan|program)\b.{0,50}\b(my|mine|assigned to me)\b|\bdo you have access to my workout\b|\bwhat (?:workout|training) (?:plan|program) do i have\b|\bwhat (?:workout|training|routine) (?:was|has been) assigned to me\b|\bwhat (?:routine|workout|training plan) has my trainer (?:given|assigned) me\b|\bwhat (?:plan|program) did my trainer assign\b|\bwhat plan has my trainer assigned\b|\bwhat did my trainer assign\b|\bwhat(?:'s| is) (?:my|the) (?:assigned )?(?:workout|training plan|routine)(?: for today| today| assigned to me)?\b|\bwhat is the workout assigned to me\b|\bwhat exercises should i do\b|\b(?:explain|describe|show|summari[sz]e|tell me about)\b.{0,45}\b(?:this|the|my|today'?s|assigned|trainer[’']s)\b.{0,30}\b(?:workout|training|routine|exercises?|instructions?)\b|\bexplain (?:my workout|today'?s (?:exercises?|workout))\b|\bmy trainer[’']s instructions?\b|\bwhat exercises am i supposed to do\b|\bhow many sets(?: and| &) reps should i do\b|\bwhat is my next workout\b|\bexplain my exercises\b|\bwhat(?:'s| is) in my (?:workout )?(?:plan|program|routine)\b/i,
  myAttendance: /\b(my|mine)\b.{0,40}\b(attendance|check[\s-]?ins?|visits?)\b/i,
  myEvents: /\b(my|mine)\b.{0,40}\b(upcoming )?events?\b|\bwhat events? have i (?:registered|signed up) for\b/i,
  myGoal: /\b(my|mine)\b.{0,35}\b(fitness goal|goal)\b/i,
  myEntitlements: /\b(my|mine)\b.{0,40}\b(access|entitlements?|features?)\b|\bwhat (?:features|access) (?:does|do) my membership include\b/i,
  trainerAssigned: /\b(assigned members?|members? assigned to me|my clients?|member workout progress|workout adherence|adherence summary|how are my assigned members doing|which members are missing workouts?|members? behind on workouts?)\b/i,
  fitness: /\b(fitness|wellness|gym|workouts?|exercises?|training|muscle|strength|protein|nutrition|recovery|reps?|\bsets?(?!\s+up\b)\b|stretch(?:ing)?|warm[\s-]?up|cool[\s-]?down|cardio|sleep|hydration|injur(?:y|ies)|beginner|intermediate|advanced)\b/i
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
    // This asks for general guidance, not the identity of the next prescribed day.
    if (/\bwhat should i do next (?:for|with) my workout\b/i.test(text)) return AssistantIntent.FITNESS_GUIDANCE;
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
