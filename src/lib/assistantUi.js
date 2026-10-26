const suggestionsByRole = Object.freeze({
  guest: Object.freeze([
    'Membership Plans', 'Help Me Choose a Plan', 'How Do I Join?', 'Workout Advice',
    'SAREX Facilities', 'Upcoming Events', 'Forgot password'
  ]),
  member: Object.freeze([
    'How am I doing this week?', 'Explain my workout', 'I missed a workout, what should I do?',
    'Help with my membership', 'Explain an exercise', 'Show my workout progress'
  ]),
  trainer: Object.freeze([
    'Where can I find my assigned members?', 'How do I review workout progress?',
    'Help me understand the trainer workflow', 'Draft a workout idea for review',
    'Explain exercise programming', 'How can I discuss missed sessions with a member?'
  ])
});

const greetingsByRole = Object.freeze({
  guest: 'Hi, I’m the SAREX Fitness Assistant. I can help with memberships, getting started, fitness questions and SAREX services.',
  member: 'I can help you understand your workouts, progress, membership and SAREX services.',
  trainer: 'I can help you navigate assigned members and progress tools, plus general training guidance. I can’t assign or change member workouts.'
});

const roleForPortalPath = path => {
  if (/^\/(?:admin|staff)(?:\/|$)/.test(path)) return 'unsupported';
  if (/^\/trainer(?:\/|$)/.test(path)) return 'trainer';
  if (/^\/member(?:\/|$)/.test(path)) return 'member';
  return null;
};

export const getAssistantExperience = (authenticatedRole, currentPath = '/') => {
  const portalRole = roleForPortalPath(currentPath);
  const sessionRole = authenticatedRole === 'super_admin' || authenticatedRole === 'admin' ? 'admin'
    : authenticatedRole === 'staff' ? 'staff'
      : ['member', 'trainer'].includes(authenticatedRole) ? authenticatedRole : null;
  const surface = portalRole === 'member' || portalRole === 'trainer' ? portalRole : 'public';
  const role = portalRole === 'unsupported' || portalRole && portalRole !== sessionRole ||
    (portalRole && !sessionRole) ? null : sessionRole || 'guest';

  if (!role) return { available: false, role: null, surface, greeting: '', suggestions: [] };

  // Public pages share one public capability set. Staff/Admin must never see
  // management prompts here, and Trainers use trainer prompts only in their portal.
  const experienceRole = surface === 'public' && ['staff', 'admin', 'trainer'].includes(role) ? 'guest' : role;

  let suggestions = suggestionsByRole[experienceRole];
  if (experienceRole === 'member' && /^\/member\/workout(?:\/|$)/.test(currentPath)) {
    suggestions = Object.freeze([
      'Explain this workout', 'How am I doing this week?',
      'I missed a workout, what should I do?', 'Show my workout progress'
    ]);
  } else if (experienceRole === 'member' && /^\/membership(?:\/|$)/.test(currentPath)) {
    suggestions = Object.freeze([
      'Membership Plans', 'Help Me Choose a Plan', 'Help with my membership',
      'Workout Advice', 'SAREX Facilities'
    ]);
  }

  return { available: true, role: experienceRole, surface, greeting: greetingsByRole[experienceRole], suggestions: [...suggestions] };
};

export const guestAssistantSuggestions = [...suggestionsByRole.guest];
export const memberAssistantSuggestions = [...suggestionsByRole.member];
export const assistantSuggestionsByRole = suggestionsByRole;
export const assistantGreetingsByRole = greetingsByRole;
export const assistantActionPaths = new Set([
  '/', '/membership', '/register', '/login', '/facilities', '/contact',
  '/member/workout', '/member/membership', '/member/events', '/member/attendance', '/member/profile', '/forgot-password',
  '/trainer/members'
]);
export const isAssistantActionPathAllowed = path => assistantActionPaths.has(path);
export const isAssistantHiddenPath = path => /^\/(?:check-in\/reception|(?:member|staff)\/check-in|checkout|payment)(?:\/|$)/i.test(path);
export const shouldAutoFocusAssistantInput = (isOpen, isMobileViewport) => Boolean(isOpen && !isMobileViewport);
export const getAssistantWidgetBottom = (isMemberPortal, keyboardInset = 0) => {
  const inset = Number.isFinite(keyboardInset) ? Math.max(0, keyboardInset) : 0;
  const memberNav = isMemberPortal && inset < 80 ? 'var(--member-mobile-nav-clearance, 3.5rem) + ' : '';
  const safeArea = isMemberPortal ? '' : ' + env(safe-area-inset-bottom, 0px)';
  return `calc(${inset}px + ${memberNav}0.75rem${safeArea})`;
};
