import React, { useEffect, useState } from 'react';
import { GymProvider, useGym } from './context/GymContext';

// Public Pages
import { PublicHome } from './pages/public/PublicHome';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { ChangeInitialPasswordPage } from './pages/auth/ChangeInitialPasswordPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminMembers } from './pages/admin/AdminMembers';
import { AdminPlans } from './pages/admin/AdminPlans';
import { AdminAttendance } from './pages/admin/AdminAttendance';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminStaff } from './pages/admin/AdminStaff';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminAudit } from './pages/admin/AdminAudit';

// Staff Pages
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffCheckIn } from './pages/staff/StaffCheckIn';
import { StaffMembers } from './pages/staff/StaffMembers';
import { StaffMemberships } from './pages/staff/StaffMemberships';
import { StaffAttendance } from './pages/staff/StaffAttendance';
import { StaffPayments } from './pages/staff/StaffPayments';

// Trainer Pages
import { TrainerDashboard } from './pages/trainer/TrainerDashboard';
import { TrainerMembers } from './pages/trainer/TrainerMembers';
import { TrainerPlans } from './pages/trainer/TrainerPlans';

// Member Pages
import { MemberDashboard } from './pages/member/MemberDashboard';
import { MemberMembership } from './pages/member/MemberMembership';
import { MemberWorkout } from './pages/member/MemberWorkout';
import { MemberSettings } from './pages/member/MemberSettings';
import { MemberAttendance } from './pages/member/MemberAttendance';
import { MemberEvents } from './pages/member/MemberEvents';
import { ReceptionCheckIn } from './pages/member/ReceptionCheckIn';
import { EventManagement } from './pages/shared/EventManagement';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

const DashboardSkeleton: React.FC = () => (
  <div className="flex min-h-screen overflow-hidden bg-[#F5F6F8]" role="status" aria-label="Loading dashboard">
    <aside className="relative hidden w-[254px] shrink-0 bg-[#13181D] px-5 py-7 md:block">
      <div className="mx-auto h-12 w-36 animate-pulse rounded-lg bg-white/10" />
      <div className="mt-12 space-y-3">{Array.from({ length: 7 }, (_, index) => <div key={index} className={`h-11 animate-pulse rounded-xl ${index === 0 ? 'bg-[#EF1B23]/35' : 'bg-white/[0.06]'}`} />)}</div>
      <div className="absolute bottom-7 h-14 w-52 animate-pulse rounded-xl bg-white/[0.06]" />
    </aside>
    <main className="min-w-0 flex-1">
      <header className="flex h-[86px] items-center justify-between border-b border-gray-200 bg-white px-5 md:px-8">
        <div className="space-y-2"><div className="h-6 w-40 animate-pulse rounded bg-gray-200"/><div className="h-3 w-64 max-w-[65vw] animate-pulse rounded bg-gray-100"/></div>
        <div className="h-10 w-36 animate-pulse rounded-xl bg-gray-100"/>
      </header>
      <div className="space-y-5 p-4 md:p-8">
        <section className="h-32 animate-pulse rounded-2xl bg-gradient-to-r from-white via-[#FAFAFB] to-gray-200" />
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-white p-4"><div className="h-3 w-20 rounded bg-gray-100"/><div className="mt-4 h-8 w-16 rounded bg-gray-200"/><div className="mt-3 h-2.5 w-24 rounded bg-gray-100"/></div>)}</section>
        <section className="grid gap-5 lg:grid-cols-3"><div className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white lg:col-span-2"/><div className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white"/></section>
      </div>
    </main>
    <span className="sr-only">Loading your portal</span>
  </div>
);

const AppRouter: React.FC = () => {
  const { currentPath } = useGym();
  const [accessState, setAccessState] = useState<'public' | 'checking' | 'allowed' | 'denied'>('public');
  const [sessionRevision, setSessionRevision] = useState(0);
  const requiredRole = currentPath.startsWith('/admin') ? 'admin' : currentPath.startsWith('/staff') ? 'staff' : currentPath.startsWith('/trainer') ? 'trainer' : currentPath.startsWith('/member') || currentPath === '/check-in/reception' ? 'member' : null;

  useEffect(() => {
    if (!requiredRole) { setAccessState('public'); return; }
    const controller = new AbortController(); setAccessState('checking');
    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/session`, { credentials: 'include', signal: controller.signal })
      .then(async response => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .then(({ ok, body }) => setAccessState(ok && body.user?.roles?.includes(requiredRole) ? 'allowed' : 'denied'))
      .catch(error => { if (error.name !== 'AbortError') setAccessState('denied'); });
    return () => controller.abort();
  }, [requiredRole, sessionRevision]);

  useEffect(() => {
    const recheckSession = (event: Event) => {
      const roles = (event as CustomEvent<{ roles?: string[] }>).detail?.roles || [];
      const path = window.location.pathname;
      const roleForPath = path.startsWith('/admin') ? 'admin' : path.startsWith('/staff') ? 'staff' : path.startsWith('/trainer') ? 'trainer' : path.startsWith('/member') ? 'member' : null;
      if (roleForPath && roles.includes(roleForPath)) setAccessState('allowed');
      setSessionRevision(value => value + 1);
    };
    window.addEventListener('sarex:session-changed', recheckSession);
    return () => window.removeEventListener('sarex:session-changed', recheckSession);
  }, []);

  if (accessState === 'checking') return <DashboardSkeleton />;
  if (accessState === 'denied') return <LoginPage />;

  // Route matcher
  const renderRoute = () => {
    switch (currentPath) {
      // 1. Public Marketing
      case '/':
      case '/home':
        return <PublicHome />;
      case '/about':
      case '/trainers':
      case '/contact':
        return <PublicHome />;

      // 2. Authentication
      case '/login':
        return <LoginPage />;
      case '/register':
        return <RegisterPage />;
      case '/forgot-password':
        return <ForgotPasswordPage />;
      case '/reset-password':
        return <ResetPasswordPage />;
      case '/change-password':
        return <ChangeInitialPasswordPage />;
      case '/check-in/reception':
        return <ReceptionCheckIn />;

      // 3. Super Admin Portal
      case '/admin':
      case '/admin/dashboard':
        return <AdminDashboard />;
      case '/admin/members':
        return <AdminMembers />;
      case '/admin/membership-plans':
      case '/admin/plans':
        return <AdminPlans />;
      case '/admin/attendance':
        return <AdminAttendance />;
      case '/admin/payments':
        return <AdminPayments />;
      case '/admin/trainers':
      case '/admin/staff':
        return <AdminStaff />;
      case '/admin/settings':
        return <AdminSettings />;
      case '/admin/audit':
        return <AdminAudit />;
      case '/admin/events':
        return <EventManagement />;

      // 4. Staff Portal
      case '/staff':
      case '/staff/dashboard':
        return <StaffDashboard />;
      case '/staff/check-in':
        return <StaffCheckIn />;
      case '/staff/members':
        return <StaffMembers />;
      case '/staff/memberships':
        return <StaffMemberships />;
      case '/staff/attendance':
        return <StaffAttendance />;
      case '/staff/payments':
        return <StaffPayments />;
      case '/staff/events':
        return <EventManagement />;

      // 5. Trainer Portal
      case '/trainer':
      case '/trainer/dashboard':
        return <TrainerDashboard />;
      case '/trainer/members':
        return <TrainerMembers />;
      case '/trainer/workout-plans':
      case '/trainer/plans':
        return <TrainerPlans />;
      case '/trainer/progress':
        return <TrainerMembers />;
      // 6. Member Portal
      case '/member':
      case '/member/dashboard':
        return <MemberDashboard />;
      case '/member/membership':
      case '/member/payments':
        return <MemberMembership />;
      case '/member/attendance':
        return <MemberAttendance />;
      case '/member/events':
        return <MemberEvents />;
      case '/member/workout':
        return <MemberWorkout />;
      case '/member/profile':
      case '/member/settings':
        return <MemberSettings />;

      // Fallbacks by prefix
      default:
        if (currentPath.startsWith('/admin')) return <AdminDashboard />;
        if (currentPath.startsWith('/staff')) return <StaffDashboard />;
        if (currentPath.startsWith('/trainer')) return <TrainerDashboard />;
        if (currentPath.startsWith('/member')) return <MemberDashboard />;
        return <PublicHome />;
    }
  };

  return (
    <main className="min-h-screen">
      <ErrorBoundary>
        {renderRoute()}
      </ErrorBoundary>
    </main>
  );
};

export default function App() {
  return (
    <GymProvider>
      <AppRouter />
    </GymProvider>
  );
}



