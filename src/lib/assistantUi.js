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
  ]),
  staff: Object.freeze([
    'How does QR check-in work?', 'How do I handle a denied check-in?',
    'How do I renew a membership?', 'How do I record a manual payment?',
    'How do I find a member?', 'Where can I review today’s attendance?'
  ]),
  admin: Object.freeze([
    'How do I find a member account?', 'Where can I review attendance?',
    'How do I review payment activity?', 'How do I manage membership plans?',
    'How do I manage upcoming events?', 'How do I change my password?'
  ])
});

const greetingsByRole = Object.freeze({
  guest: 'Hi, I’m the SAREX Fitness Assistant. I can help with memberships, getting started, fitness questions and SAREX services.',
  member: 'I can help you understand your workouts, progress, membership and SAREX services.',
  trainer: 'I can help you navigate assigned members and progress tools, plus general training guidance. I can’t assign or change member workouts.',
  staff: 'I can help with member service, check-ins, memberships, payments and SAREX operations.',
  admin: 'I can help you navigate member, plan, attendance, payment and event tools.'
});

const roleForPortalPath = path => {
  if (/^\/admin(?:\/|$)/.test(path)) return 'admin';
  if (/^\/staff(?:\/|$)/.test(path)) return 'staff';
  if (/^\/trainer(?:\/|$)/.test(path)) return 'trainer';
  if (/^\/member(?:\/|$)/.test(path)) return 'member';
  return null;
};

export const getAssistantExperience = (authenticatedRole, currentPath = '/') => {
  const portalRole = roleForPortalPath(currentPath);
  // Public pages intentionally use the public discovery experience. Portal
  // suggestions require a role confirmed by the server-backed session context.
  const role = portalRole
    ? (authenticatedRole === 'super_admin' ? 'admin' : authenticatedRole) === portalRole
      ? portalRole
      : null
    : 'guest';

  if (!role) return { role: null, greeting: 'Welcome to Ask SAREX. Your portal is being verified.', suggestions: [] };

  let suggestions = suggestionsByRole[role];
  if (role === 'staff' && /^\/staff\/(?:check-in|attendance)(?:\/|$)/.test(currentPath)) {
    suggestions = Object.freeze([
      'How do I handle a denied check-in?', 'How does QR check-in work?',
      'How do I find a member?', 'How do I renew a membership?'
    ]);
  } else if (role === 'member' && /^\/member\/workout(?:\/|$)/.test(currentPath)) {
    suggestions = Object.freeze([
      'Explain this workout', 'How am I doing this week?',
      'I missed a workout, what should I do?', 'Show my workout progress'
    ]);
  }

  return { role, greeting: greetingsByRole[role], suggestions: [...suggestions] };
};

export const guestAssistantSuggestions = [...suggestionsByRole.guest];
export const memberAssistantSuggestions = [...suggestionsByRole.member];
export const assistantSuggestionsByRole = suggestionsByRole;
export const assistantGreetingsByRole = greetingsByRole;
export const assistantActionPaths = new Set([
  '/', '/membership', '/register', '/login', '/facilities', '/contact',
  '/member/workout', '/member/membership', '/member/events', '/forgot-password', '/admin/settings'
]);
export const isAssistantActionPathAllowed = path => assistantActionPaths.has(path);
export const isAssistantHiddenPath = path => /^\/(?:check-in\/reception|(?:member|staff)\/check-in|checkout|payment)(?:\/|$)/i.test(path);
