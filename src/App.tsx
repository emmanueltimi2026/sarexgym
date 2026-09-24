import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { GymProvider, useGym } from './context/GymContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Seo } from './components/seo/Seo';
import { PublicLayout } from './components/public/PublicLayout';
import { AnimatePresence } from 'motion/react';
import { PageTransition } from './components/public/PublicMotion';
import { PortalLayoutHost } from './components/layout/AppLayout';
import { logAuthDiagnostic } from './lib/authDiagnostics';
import { apiUrl } from './lib/secureFetch';

const lazyPage = (loader: () => Promise<Record<string, unknown>>, exportName: string) =>
  lazy(async () => ({ default: (await loader())[exportName] as React.ComponentType<any> }));

const PublicHome = lazyPage(() => import('./pages/public/PublicHome'), 'PublicHome');
const PublicMembership = lazyPage(() => import('./pages/public/PublicMembership'), 'PublicMembership');
const PublicFacilities = lazyPage(() => import('./pages/public/PublicFacilities'), 'PublicFacilities');
const PublicAbout = lazyPage(() => import('./pages/public/PublicAbout'), 'PublicAbout');
const PublicContact = lazyPage(() => import('./pages/public/PublicContact'), 'PublicContact');
const LoginPage = lazyPage(() => import('./pages/auth/LoginPage'), 'LoginPage');
const RegisterPage = lazyPage(() => import('./pages/auth/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = lazyPage(() => import('./pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyPage(() => import('./pages/auth/ResetPasswordPage'), 'ResetPasswordPage');
const ChangeInitialPasswordPage = lazyPage(() => import('./pages/auth/ChangeInitialPasswordPage'), 'ChangeInitialPasswordPage');
const AdminDashboard = lazyPage(() => import('./pages/admin/AdminDashboard'), 'AdminDashboard');
const AdminMembers = lazyPage(() => import('./pages/admin/AdminMembers'), 'AdminMembers');
const AdminPlans = lazyPage(() => import('./pages/admin/AdminPlans'), 'AdminPlans');
const AdminAttendance = lazyPage(() => import('./pages/admin/AdminAttendance'), 'AdminAttendance');
const AdminPayments = lazyPage(() => import('./pages/admin/AdminPayments'), 'AdminPayments');
const AdminStaff = lazyPage(() => import('./pages/admin/AdminStaff'), 'AdminStaff');
const AdminSettings = lazyPage(() => import('./pages/admin/AdminSettings'), 'AdminSettings');
const AdminAudit = lazyPage(() => import('./pages/admin/AdminAudit'), 'AdminAudit');
const StaffDashboard = lazyPage(() => import('./pages/staff/StaffDashboard'), 'StaffDashboard');
const StaffCheckIn = lazyPage(() => import('./pages/staff/StaffCheckIn'), 'StaffCheckIn');
const StaffMembers = lazyPage(() => import('./pages/staff/StaffMembers'), 'StaffMembers');
const StaffMemberships = lazyPage(() => import('./pages/staff/StaffMemberships'), 'StaffMemberships');
const StaffAttendance = lazyPage(() => import('./pages/staff/StaffAttendance'), 'StaffAttendance');
const StaffPayments = lazyPage(() => import('./pages/staff/StaffPayments'), 'StaffPayments');
const TrainerDashboard = lazyPage(() => import('./pages/trainer/TrainerDashboard'), 'TrainerDashboard');
const TrainerMembers = lazyPage(() => import('./pages/trainer/TrainerMembers'), 'TrainerMembers');
const TrainerPlans = lazyPage(() => import('./pages/trainer/TrainerPlans'), 'TrainerPlans');
const MemberDashboard = lazyPage(() => import('./pages/member/MemberDashboard'), 'MemberDashboard');
const MemberMembership = lazyPage(() => import('./pages/member/MemberMembership'), 'MemberMembership');
const MemberWorkout = lazyPage(() => import('./pages/member/MemberWorkout'), 'MemberWorkout');
const MemberSettings = lazyPage(() => import('./pages/member/MemberSettings'), 'MemberSettings');
const MemberAttendance = lazyPage(() => import('./pages/member/MemberAttendance'), 'MemberAttendance');
const MemberEvents = lazyPage(() => import('./pages/member/MemberEvents'), 'MemberEvents');
const ReceptionCheckIn = lazyPage(() => import('./pages/member/ReceptionCheckIn'), 'ReceptionCheckIn');
const MemberCheckInScanner = lazyPage(() => import('./pages/member/MemberCheckInScanner'), 'MemberCheckInScanner');
const EventManagement = lazyPage(() => import('./pages/shared/EventManagement'), 'EventManagement');
const EventDetails = lazyPage(() => import('./pages/shared/EventDetails'), 'EventDetails');
const MemberDetails = lazyPage(() => import('./pages/shared/MemberDetails'), 'MemberDetails');

const marketingRouteOrder = ['/', '/membership', '/facilities', '/about', '/contact'];

const marketingRouteIndex = (path: string) => {
  if (path === '/home') return 0;
  if (path === '/trainers') return marketingRouteOrder.indexOf('/facilities');
  if (/^\/events\/[0-9a-f-]{36}$/i.test(path)) return marketingRouteOrder.length;
  const index = marketingRouteOrder.indexOf(path);
  return index === -1 ? 0 : index;
};

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

const PublicPageSkeleton: React.FC = () => (
  <div className="min-h-[70vh] animate-pulse bg-gradient-to-r from-black via-[#180304] to-[#111111]" role="status" aria-label="Loading page">
    <span className="sr-only">Loading SAREX Fitness Clinic</span>
  </div>
);

const PortalPageSkeleton: React.FC = () => (
  <div className="space-y-5" role="status" aria-label="Loading page content">
    <div className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-white" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-2xl border border-gray-200 bg-white" />)}
    </div>
    <div className="h-72 animate-pulse rounded-2xl border border-gray-200 bg-white" />
    <span className="sr-only">Loading portal page</span>
  </div>
);

const portalFallbackTitle = (path: string) => {
  const segment = path.split('/').filter(Boolean).at(-1) || 'dashboard';
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
};

const AppRouter: React.FC = () => {
  const { currentPath, settings, loading, error, refresh, navigate } = useGym();
  const [accessState, setAccessState] = useState<'public' | 'checking' | 'allowed' | 'denied'>('public');
  const [sessionRevision, setSessionRevision] = useState(0);
  const previousMarketingPath = useRef(currentPath);
  const requiredRole = /^\/admin(?:\/|$)/.test(currentPath) ? 'admin'
    : /^\/staff(?:\/|$)/.test(currentPath) ? 'staff'
    : /^\/trainer(?:\/|$)/.test(currentPath) ? 'trainer'
    : /^\/member(?:\/|$)/.test(currentPath) || currentPath === '/check-in/reception' ? 'member'
    : null;

  useEffect(() => {
    if (!requiredRole) { setAccessState('public'); return; }
    const controller = new AbortController(); setAccessState('checking');
    fetch(apiUrl('/api/v1/session'), { credentials: 'include', signal: controller.signal })
      .then(async response => ({ ok: response.ok, status: response.status, requestId: response.headers.get('x-request-id'), body: await response.json().catch(() => ({})) }))
      .then(({ ok, status, requestId, body }) => {
        const allowed = ok && body.user?.roles?.includes(requiredRole);
        logAuthDiagnostic('session', { requestId, route: '/api/v1/session', authenticationSucceeded: allowed, statusCode: status, redirectTarget: currentPath });
        if (allowed && body.user?.mustChangePassword) {
          sessionStorage.setItem('sarex.pendingRole', requiredRole);
          navigate('/change-password');
          setAccessState('public');
          return;
        }
        setAccessState(allowed ? 'allowed' : 'denied');
      })
      .catch(error => { if (error.name !== 'AbortError') setAccessState('denied'); });
    return () => controller.abort();
  }, [requiredRole, sessionRevision]);

  useEffect(() => {
    const recheckSession = (event: Event) => {
      const roles = (event as CustomEvent<{ roles?: string[] }>).detail?.roles || [];
      const path = window.location.pathname;
      const roleForPath = /^\/admin(?:\/|$)/.test(path) ? 'admin'
        : /^\/staff(?:\/|$)/.test(path) ? 'staff'
        : /^\/trainer(?:\/|$)/.test(path) ? 'trainer'
        : /^\/member(?:\/|$)/.test(path) ? 'member'
        : null;
      if (roleForPath && roles.includes(roleForPath)) setAccessState('allowed');
      setSessionRevision(value => value + 1);
    };
    window.addEventListener('sarex:session-changed', recheckSession);
    return () => window.removeEventListener('sarex:session-changed', recheckSession);
  }, []);

  const publicDescription = 'SAREX Fitness Clinic in Magboro offers gym access, memberships, fitness classes, personal support, body massage, full body spa services, wellness programs, and secure online member tools.';
  const routeSeo = (() => {
    if (currentPath === '/' || currentPath === '/home') {
      return {
        title: 'SAREX Fitness Clinic',
        description: publicDescription,
        path: '/',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'HealthClub',
          name: 'SAREX Fitness Clinic',
          description: publicDescription,
          url: import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_FRONTEND_URL || window.location.origin,
          logo: `${window.location.origin}/assets/brand/sarex-logo.png`,
          image: `${window.location.origin}/assets/fitkit/hero_1_2.png`,
          telephone: settings.phone,
          email: settings.email,
          address: {
            '@type': 'PostalAddress',
            streetAddress: settings.address,
            addressCountry: 'NG'
          }
        }
      };
    }
    if (currentPath === '/membership') return { title: 'Gym Membership Plans', description: 'Compare current SAREX Fitness Clinic membership plans, pricing, benefits, trainer access, and workout plan options.', path: '/membership' };
    if (currentPath === '/facilities') return { title: 'Gym, Fitness and Spa Facilities', description: 'Explore SAREX gym equipment, training areas, aerobics, personal support, body massage, full-body spa care, and wellness services in Magboro.', path: '/facilities' };
    if (currentPath === '/about') return { title: 'About SAREX Fitness Clinic', description: 'Learn about SAREX Fitness Clinic, a Magboro fitness and wellness space for strength training, classes, recovery, and sustainable progress.', path: '/about' };
    if (currentPath === '/trainers') return { title: 'Gym, Fitness and Spa Facilities', description: 'Explore guided fitness training, strength work, wellness support, body conditioning, and goal-based services at SAREX.', path: '/trainers' };
    if (currentPath === '/contact') return { title: 'Contact SAREX Fitness Clinic', description: 'Find SAREX Fitness Clinic contact details, location, phone numbers, and directions for membership and training enquiries.', path: '/contact' };
    if (currentPath === '/register') return { title: 'Create Your SAREX Account', description: 'Create a SAREX Fitness Clinic member account to choose a plan, manage membership access, and follow your fitness journey.', path: '/register', noindex: true };
    if (currentPath === '/login') return { title: 'Member Login', description: 'Sign in to your SAREX Fitness Clinic member, staff, trainer, or admin portal.', path: '/login', noindex: true };
    if (/^\/events\/[0-9a-f-]{36}$/i.test(currentPath)) return { title: 'SAREX Event Details', description: 'View full SAREX Fitness Clinic event details, including date, location, booking information, and fitness community activities.', path: currentPath };
    if (currentPath.includes('password')) return { title: 'Account Access', description: 'Manage secure access to your SAREX Fitness Clinic account.', path: currentPath, noindex: true };
    return { title: 'SAREX Portal', description: 'Secure SAREX Fitness Clinic portal for members, staff, trainers, and administrators.', path: currentPath, noindex: true };
  })();

  const isMarketingRoute = ['/','/home','/membership','/facilities','/about','/trainers','/contact'].includes(currentPath)
    || /^\/events\/[0-9a-f-]{36}$/i.test(currentPath);
  const routeDirection: -1 | 1 = marketingRouteIndex(currentPath) < marketingRouteIndex(previousMarketingPath.current) ? -1 : 1;

  useEffect(() => {
    if (isMarketingRoute) previousMarketingPath.current = currentPath;
  }, [currentPath, isMarketingRoute]);

  if (accessState === 'checking') return <><Seo {...routeSeo} /><DashboardSkeleton /></>;
  if (requiredRole && accessState === 'allowed' && error) return <><Seo {...routeSeo} /><main role="alert" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f7f8fb] px-6 text-center"><h1 className="text-xl font-bold text-[#151515]">Portal data is unavailable</h1><p className="max-w-md text-sm text-gray-600">We could not load your portal right now. Please try again.</p><button type="button" onClick={() => void refresh()} className="rounded bg-[#EF1B23] px-5 py-2.5 text-sm font-bold text-white">Retry</button></main></>;
  if (requiredRole && accessState === 'allowed' && loading) return <><Seo {...routeSeo} /><DashboardSkeleton /></>;
  if (accessState === 'denied') return <><Seo {...routeSeo} /><LoginPage /></>;

  const renderRoute = () => {
    if (/^\/events\/[0-9a-f-]{36}$/i.test(currentPath)) return <EventDetails mode="public" />;
    if (/^\/(?:admin|staff|member)\/events\/[0-9a-f-]{36}$/i.test(currentPath)) return <EventDetails mode="portal" />;
    if (/^\/(?:admin|staff)\/members\/[0-9a-f-]{36}$/i.test(currentPath)) return <MemberDetails />;
    switch (currentPath) {
      case '/':
      case '/home':
        return <PublicHome />;
      case '/membership':
        return <PublicMembership />;
      case '/facilities':
        return <PublicFacilities />;
      case '/about':
        return <PublicAbout />;
      case '/trainers':
        return <PublicFacilities />;
      case '/contact':
        return <PublicContact />;

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
      case '/member':
      case '/member/dashboard':
        return <MemberDashboard />;
      case '/member/membership':
      case '/member/payments':
        return <MemberMembership />;
      case '/member/attendance':
        return <MemberAttendance />;
      case '/member/check-in':
        return <MemberCheckInScanner />;
      case '/member/events':
        return <MemberEvents />;
      case '/member/workout':
        return <MemberWorkout />;
      case '/member/profile':
      case '/member/settings':
        return <MemberSettings />;

      default:
        if (currentPath.startsWith('/admin')) return <AdminDashboard />;
        if (currentPath.startsWith('/staff')) return <StaffDashboard />;
        if (currentPath.startsWith('/trainer')) return <TrainerDashboard />;
        if (currentPath.startsWith('/member')) return <MemberDashboard />;
        return <PublicHome />;
    }
  };

  return (
    <div className="min-h-screen">
      <Seo {...routeSeo} />
      <ErrorBoundary resetKey={currentPath}>
        {isMarketingRoute ? (
          <PublicLayout>
            <Suspense fallback={<PublicPageSkeleton />}>
              <AnimatePresence mode="wait" initial={false} custom={routeDirection}>
                <PageTransition key={currentPath} direction={routeDirection}>{renderRoute()}</PageTransition>
              </AnimatePresence>
            </Suspense>
          </PublicLayout>
        ) : requiredRole ? (
          <PortalLayoutHost fallbackTitle={portalFallbackTitle(currentPath)}>
            <Suspense fallback={<PortalPageSkeleton />}>
              {renderRoute()}
            </Suspense>
          </PortalLayoutHost>
        ) : (
          <Suspense fallback={<PublicPageSkeleton />}>{renderRoute()}</Suspense>
        )}
      </ErrorBoundary>
    </div>
  );
};

export default function App() {
  return (
    <GymProvider>
      <AppRouter />
    </GymProvider>
  );
}
