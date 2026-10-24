export const guestAssistantSuggestions = [
  'Membership Plans', 'Help Me Choose a Plan', 'How Do I Join?', 'Workout Advice', 'SAREX Facilities', 'Upcoming Events'
];
export const memberAssistantSuggestions = [
  'Help With My Workout', 'Explain My Progress', 'Suggest a Workout', 'I Missed a Workout', 'Explain an Exercise', 'Membership Help'
];
export const assistantActionPaths = new Set([
  '/', '/membership', '/register', '/login', '/facilities', '/contact',
  '/member/workout', '/member/membership', '/member/events', '/forgot-password', '/admin/settings'
]);
export const isAssistantActionPathAllowed = path => assistantActionPaths.has(path);
export const isAssistantHiddenPath = path => /^\/(?:check-in\/reception|(?:member|staff)\/check-in|checkout|payment)(?:\/|$)/i.test(path);
