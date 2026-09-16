const portalRouteLoaders: Record<string, () => Promise<unknown>> = {
  '/admin/dashboard': () => import('../pages/admin/AdminDashboard'),
  '/admin/members': () => import('../pages/admin/AdminMembers'),
  '/admin/membership-plans': () => import('../pages/admin/AdminPlans'),
  '/admin/attendance': () => import('../pages/admin/AdminAttendance'),
  '/admin/payments': () => import('../pages/admin/AdminPayments'),
  '/admin/staff': () => import('../pages/admin/AdminStaff'),
  '/admin/events': () => import('../pages/shared/EventManagement'),
  '/admin/audit': () => import('../pages/admin/AdminAudit'),
  '/admin/settings': () => import('../pages/admin/AdminSettings'),
  '/staff/dashboard': () => import('../pages/staff/StaffDashboard'),
  '/staff/check-in': () => import('../pages/staff/StaffCheckIn'),
  '/staff/members': () => import('../pages/staff/StaffMembers'),
  '/staff/memberships': () => import('../pages/staff/StaffMemberships'),
  '/staff/attendance': () => import('../pages/staff/StaffAttendance'),
  '/staff/payments': () => import('../pages/staff/StaffPayments'),
  '/staff/events': () => import('../pages/shared/EventManagement'),
  '/trainer/dashboard': () => import('../pages/trainer/TrainerDashboard'),
  '/trainer/members': () => import('../pages/trainer/TrainerMembers'),
  '/trainer/workout-plans': () => import('../pages/trainer/TrainerPlans'),
  '/trainer/progress': () => import('../pages/trainer/TrainerMembers'),
  '/member/dashboard': () => import('../pages/member/MemberDashboard'),
  '/member/membership': () => import('../pages/member/MemberMembership'),
  '/member/check-in': () => import('../pages/member/MemberCheckInScanner'),
  '/member/attendance': () => import('../pages/member/MemberAttendance'),
  '/member/events': () => import('../pages/member/MemberEvents'),
  '/member/workout': () => import('../pages/member/MemberWorkout'),
  '/member/profile': () => import('../pages/member/MemberSettings')
};

const requestedRoutes = new Set<string>();

export const preloadPortalRoute = (path: string) => {
  const loader = portalRouteLoaders[path];
  if (!loader || requestedRoutes.has(path)) return;
  requestedRoutes.add(path);
  void loader().catch(() => requestedRoutes.delete(path));
};
