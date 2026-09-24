import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { useVisibilityPolling } from '../../hooks/useVisibilityPolling';
import { PORTAL_POLL_INTERVALS } from '../../lib/refreshPolicy';
import { preloadPortalRoute } from '../../lib/preloadPortalRoute';
import { apiUrl } from '../../lib/secureFetch';
import { formatAppDateTime } from '../../utils/dateTime';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  QrCode,
  CalendarCheck,
  Dumbbell,
  Shield,
  Settings,
  UserCheck,
  TrendingUp,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  ClipboardList, CalendarDays, ChevronDown, ChevronRight
} from 'lucide-react';

const avatarFallback = (initials: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="100%" height="100%" rx="48" fill="#EF1B23"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Arial" font-size="30" font-weight="700">${initials}</text></svg>`)}`;

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  pageSubtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; path?: string }>;
}

const AppLayoutFrame: React.FC<AppLayoutProps> = ({
  children,
  pageTitle,
  pageSubtitle,
  actions
}) => {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { role, currentPath, navigate, setRole, currentMember, currentStaff, currentTrainer, settings } = useGym();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id:string;type:string;title:string;message:string;metadata?:Record<string,string>;read_at?:string;created_at:string}>>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const refreshNotifications = useCallback(async (signal: AbortSignal) => {
    if (role === 'public' || document.visibilityState === 'hidden') return;
    try {
      const response = await fetch(apiUrl('/api/v1/notifications'), { credentials: 'include', signal });
      if (!response.ok) return;
      const body = await response.json();
      setNotifications(body.data || []);
    } catch {
    }
  }, [role]);

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    setIsMobileNavOpen(false);
    setShowNotifications(false);
    setShowUserDropdown(false);
  }, [currentPath]);

  useEffect(() => { if (role === 'public') setNotifications([]); }, [role]);
  const runNotificationRefresh = useVisibilityPolling(refreshNotifications, PORTAL_POLL_INTERVALS.notifications, role !== 'public', true);

  useEffect(() => {
    if (!showNotifications && !showUserDropdown) return;
    const closeFloatingMenus = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showNotifications && notificationMenuRef.current && !notificationMenuRef.current.contains(target)) setShowNotifications(false);
      if (showUserDropdown && userMenuRef.current && !userMenuRef.current.contains(target)) setShowUserDropdown(false);
    };
    document.addEventListener('mousedown', closeFloatingMenus);
    return () => document.removeEventListener('mousedown', closeFloatingMenus);
  }, [showNotifications, showUserDropdown]);

  const notificationDestination = (notification: typeof notifications[number]) => {
    const metadata = notification.metadata || {};
    if (notification.type === 'event_booking' && metadata.eventId) return '/member/events/' + metadata.eventId;
    if (notification.type === 'payment_receipt' || notification.type === 'subscription_expiry' || notification.type === 'membership_access') return '/member/membership';
    if (notification.type === 'trainer_assignment_required') return metadata.memberId ? `/staff/members/${metadata.memberId}` : '/staff/members';
    if (notification.type === 'password_reset') return role === 'member' ? '/member/profile' : role === 'super_admin' ? '/admin/settings' : null;
    return null;
  };

  const openNotification = async (notification: typeof notifications[number]) => {
    if (!notification.read_at) {
      const response = await fetch(apiUrl('/api/v1/notifications/' + notification.id + '/read'), { method: 'POST', credentials: 'include' });
      if (response.ok) {
        setNotifications(items => items.map(item => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
        void runNotificationRefresh();
      }
    }
    const destination = notificationDestination(notification);
    if (destination) {
      setShowNotifications(false);
      navigate(destination);
    }
  };
  const getNavItems = () => {
    switch (role) {
      case 'super_admin':
        return [
          { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
          { label: 'Members', path: '/admin/members', icon: Users },
          { label: 'Membership Plans', path: '/admin/membership-plans', icon: CreditCard },
          { label: 'Attendance', path: '/admin/attendance', icon: CalendarCheck },
          { label: 'Payments', path: '/admin/payments', icon: CreditCard },
          { label: 'Staff & Trainers', path: '/admin/staff', icon: UserCheck },
          { label: 'Events', path: '/admin/events', icon: CalendarDays },
          { label: 'Audit Trail', path: '/admin/audit', icon: ClipboardList },
          { label: 'Settings', path: '/admin/settings', icon: Settings }
        ];
      case 'staff':
        return [
          { label: 'Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
          { label: 'QR Check-in', path: '/staff/check-in', icon: QrCode, highlight: true },
          { label: 'Members', path: '/staff/members', icon: Users },
          { label: 'Memberships', path: '/staff/memberships', icon: CreditCard },
          { label: 'Attendance', path: '/staff/attendance', icon: CalendarCheck },
          { label: 'Payments', path: '/staff/payments', icon: CreditCard },
          { label: 'Events', path: '/staff/events', icon: CalendarDays }
        ];
      case 'trainer':
        return [
          { label: 'Dashboard', path: '/trainer/dashboard', icon: LayoutDashboard },
          { label: 'My Members', path: '/trainer/members', icon: Users },
          { label: 'Workout Plans', path: '/trainer/workout-plans', icon: Dumbbell },
          { label: 'Member Progress', path: '/trainer/progress', icon: TrendingUp }
        ];
      case 'member':
        return [
          { label: 'Dashboard', path: '/member/dashboard', icon: LayoutDashboard },
          { label: 'Membership', path: '/member/membership', icon: CreditCard },
          { label: 'Scan to Check In', path: '/member/check-in', icon: QrCode, highlight: true },
          { label: 'Attendance', path: '/member/attendance', icon: CalendarCheck },
          { label: 'Events', path: '/member/events', icon: CalendarDays },
          ...(currentMember.workoutPlanEnabled ? [{ label: 'Workout Plan', path: '/member/workout', icon: Dumbbell }] : []),
          { label: 'Profile', path: '/member/profile', icon: User }
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const isNavActive = (path: string) => currentPath === path || currentPath.startsWith(`${path}/`);
  const roleMeta = {
    super_admin: { eyebrow: 'Control centre', nav: '', code: 'ADMIN / 01' },
    staff: { eyebrow: 'Staff portal', nav: '', code: 'STAFF / 02' },
    trainer: { eyebrow: 'Trainer portal', nav: '', code: 'TRAINER / 03' },
    member: { eyebrow: 'Member portal', nav: '', code: 'MEMBER / 04' }
  }[role as 'super_admin' | 'staff' | 'trainer' | 'member'] || { eyebrow: 'Workspace', nav: 'Navigation', code: 'SAREX / 00' };

  const getUserProfile = () => {
    if (role === 'super_admin') {
      return {
        name: settings.adminName || 'SAREX Administrator',
        roleTitle: 'Super Administrator',
        avatar: '',
        email: settings.adminEmail || 'admin@sarex.local'
      };
    }
    if (role === 'staff') {
      return {
        name: `${currentStaff.firstName || ''} ${currentStaff.lastName || ''}`.trim() || 'SAREX Staff',
        roleTitle: 'Staff',
        avatar: currentStaff.photo,
        email: currentStaff.email || 'Staff account'
      };
    }
    if (role === 'trainer') {
      return {
        name: `${currentTrainer.firstName || ''} ${currentTrainer.lastName || ''}`.trim() || 'SAREX Trainer',
        roleTitle: currentTrainer.specialization,
        avatar: currentTrainer.photo,
        email: currentTrainer.email || 'Trainer account'
      };
    }
    return {
      name: `${currentMember.firstName || ''} ${currentMember.lastName || ''}`.trim() || 'SAREX Member',
      roleTitle: `Member (${currentMember.memberId})`,
      avatar: currentMember.photo,
      email: currentMember.email
    };
  };

  const userProfile = getUserProfile();
  const isDashboard = currentPath === '/admin/dashboard' || currentPath === '/staff/dashboard' || currentPath === '/trainer/dashboard' || currentPath === '/member/dashboard';
  const dashboardMessage = role === 'super_admin'
    ? "Here’s what is happening across your gym today."
    : role === 'staff'
      ? 'Your daily member service and entrance activity at a glance.'
      : role === 'trainer'
        ? 'Review your members, programs, and latest progress updates.'
        : 'Your membership, visits, and training activity in one place.';
  const userInitials = (userProfile.name || 'Admin')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    try { await fetch(apiUrl('/api/v1/auth/logout'), { method: 'POST', credentials: 'include' }); } finally {
    setRole('public');
    navigate('/login');
    }
  };
  return (
    <div className="management-app h-screen overflow-hidden bg-[#F7F7F8] text-[#111111] flex flex-col font-sans antialiased" data-role={role} data-path={currentPath}>
      <div className="flex-1 flex overflow-hidden">
        
        <aside className="management-sidebar hidden md:flex h-screen flex-col w-[260px] bg-[#151515] text-white border-r border-gray-800 shrink-0 select-none">
          
          <div className="px-7 py-6 shrink-0">
            <img src="/assets/brand/sarex-logo.png" alt="Sarex Fitness Clinic" className="h-14 w-full object-contain object-left" />
          </div>

          
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto" aria-label={roleMeta.nav}>
            {roleMeta.nav && <p className="nav-caption">{roleMeta.nav}</p>}
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = isNavActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  onMouseEnter={() => preloadPortalRoute(item.path)}
                  onFocus={() => preloadPortalRoute(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'bg-[#1a1a1a] border-l-4 border-[#EF1B23] text-white font-bold uppercase tracking-wider text-sm'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a] border-l-4 border-transparent text-sm font-medium'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-[#EF1B23]' : 'text-gray-400'
                    }`}
                  />
                  <span className="truncate">
                    {item.label}
                  </span>
                  {item.highlight && !isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#EF1B23]" />
                  )}
                </button>
              );
            })}
          </nav>

          
          <div className="p-6 border-t border-gray-800 bg-[#151515] shrink-0">
            <button
              onClick={() => setConfirmLogout(true)}
              className="flex w-full items-center justify-between rounded-lg border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-wider text-gray-300 transition-colors hover:border-[#EF1B23]/50 hover:bg-[#1a1a1a] hover:text-white"
            >
              <span>Sign out</span>
              <LogOut className="h-4 w-4 text-[#EF1B23]" />
            </button>
          </div>
        </aside>

        
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setIsMobileNavOpen(false)}
            />
            <div className="relative flex flex-col w-72 max-w-[80%] bg-[#151515] text-white border-r border-gray-800 z-10 animate-in slide-in-from-left duration-200">
              <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <img src="/assets/brand/sarex-logo.png" alt="Sarex Fitness Clinic" className="h-12 w-auto max-w-[190px] object-contain" />
                <button
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const isActive = isNavActive(item.path);
                  return (
                    <button
                      key={item.path}
                      onMouseEnter={() => preloadPortalRoute(item.path)}
                      onFocus={() => preloadPortalRoute(item.path)}
                      onClick={() => {
                        navigate(item.path);
                        setIsMobileNavOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
                        isActive
                          ? 'bg-[#1a1a1a] border-l-4 border-[#EF1B23] text-white font-bold uppercase tracking-wider text-sm'
                          : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a] border-l-4 border-transparent text-sm font-medium'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 ${
                          isActive ? 'text-[#EF1B23]' : 'text-gray-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.highlight && !isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#EF1B23]" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="p-6 border-t border-gray-800 bg-[#151515]">
                <button
                  onClick={() => setConfirmLogout(true)}
                  className="w-full flex items-center gap-2 text-gray-400 hover:text-[#EF1B23] text-xs font-bold uppercase tracking-wider"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        
        <div ref={scrollContainerRef} className="management-scroll-area h-screen flex-1 flex flex-col min-w-0 overflow-y-auto pb-16 md:pb-6">
          
          <header className="management-topbar min-h-20 bg-white/95 backdrop-blur-xl border-b border-[#E5E7EB] sticky top-0 z-30 px-4 py-3 sm:px-8 flex flex-nowrap items-center justify-between gap-3 shrink-0">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              
              <button
                onClick={() => setIsMobileNavOpen(true)}
                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-sm"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-black leading-tight text-[#111111] sm:text-2xl">
                  {pageTitle}
                </h1>
                {pageSubtitle && (
                  <p className="text-xs text-[#6B7280] font-medium hidden sm:block truncate">
                    {pageSubtitle}
                  </p>
                )}
              </div>
            </div>

            
            <div className="flex items-center justify-end gap-3 shrink-0">
              <div className="workspace-date hidden xl:flex">
                <CalendarCheck className="w-4 h-4" />
                <span>{new Intl.DateTimeFormat('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</span>
              </div>
              {actions && (
                <div className="flex shrink-0 items-center gap-2">
                  {actions}
                </div>
              )}

              
              <div className="relative" ref={notificationMenuRef}>
                <button
                  onClick={() => {
                    const willOpen = !showNotifications;
                    setShowNotifications(willOpen);
                    if (willOpen) void refreshNotifications();
                  }}
                  className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-full transition-colors relative"
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                  aria-controls="portal-notifications"
                >
                  <Bell className="w-4 h-4" />
                  {notifications.some(n=>!n.read_at) && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF1B23] rounded-full ring-2 ring-white" />}
                </button>

                {showNotifications && (
                  <div id="portal-notifications" role="dialog" aria-label="Notifications" className="fixed inset-x-3 top-[4.75rem] z-50 w-auto overflow-hidden rounded-lg border border-[#E5E7EB] bg-white py-2 text-left shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 sm:rounded-sm">
                    <div className="px-4 py-2 border-b border-[#E5E7EB] flex items-center justify-between bg-[#FDFDFD]">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#6B7280]">
                        Gym Activity Alerts
                      </span>
                      <span className="text-[10px] bg-red-50 text-[#EF1B23] font-black uppercase px-1.5 py-0.5 rounded-xs">
                        {notifications.filter(n=>!n.read_at).length} New
                      </span>
                    </div>
                    <div className="max-h-[min(24rem,calc(100svh-7rem))] divide-y divide-[#E5E7EB] overflow-y-auto overscroll-contain text-xs">
                      {notifications.length ? notifications.map(notification=>{const destination=notificationDestination(notification);return <button key={notification.id} onClick={()=>void openNotification(notification)} className={'flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-gray-50 '+(notification.read_at?'opacity-60':'bg-red-50/30')}><span className="min-w-0 flex-1"><span className="block font-bold text-[#111111]">{notification.title}</span><span className="mt-0.5 block text-[11px] text-gray-500">{notification.message}</span><span className="text-[10px] text-gray-400">{formatAppDateTime(notification.created_at)}</span></span>{destination&&<ChevronRight className="h-4 w-4 shrink-0 text-gray-400"/>}</button>}):<p className="p-5 text-center text-gray-500">No notifications yet.</p>}
                    </div>
                  </div>
                )}
              </div>

              
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 pl-2 border-l border-gray-200 hover:opacity-90"
                >
                  <img src={userProfile.avatar || avatarFallback(userInitials)} onError={e => { e.currentTarget.src = avatarFallback(userInitials); }} alt={`${userProfile.name} profile`} className="h-8 w-8 rounded-full object-cover"/>
                  <div className="hidden lg:block text-left text-xs leading-tight">
                    <span className="font-bold text-[#111111] block">{userProfile.name}</span>
                    <span className="text-[10px] text-gray-500 block">{userProfile.roleTitle}</span>
                    <span className="text-[9px] text-gray-400 block max-w-40 truncate">{userProfile.email}</span>
                  </div>
                  <ChevronDown className={`hidden h-3.5 w-3.5 text-gray-400 transition-transform lg:block ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showUserDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white border border-[#E5E7EB] rounded-sm shadow-xl py-1 z-50 text-xs"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <div className="px-4 py-2 border-b border-[#E5E7EB] bg-[#FDFDFD]">
                      <div className="font-bold text-[#111111]">{userProfile.name}</div>
                      <div className="text-gray-500 text-[11px] font-mono">{userProfile.email}</div>
                    </div>
                    {role === 'super_admin' && (
                      <button
                        onClick={() => navigate('/admin/settings')}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Settings
                      </button>
                    )}
                    {role === 'member' && (
                      <button
                        onClick={() => navigate('/member/profile')}
                        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <User className="w-3.5 h-3.5" />
                        Profile
                      </button>
                    )}
                    <button
                      onClick={() => navigate('/')}
                      className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Home
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => setConfirmLogout(true)}
                      className="w-full text-left px-4 py-2 text-[#EF1B23] font-bold uppercase tracking-wider hover:bg-red-50 flex items-center gap-2 text-[11px]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          
          <main className="management-content p-4 sm:p-8 max-w-[1500px] w-full mx-auto flex-1">
            {isDashboard && <section className="portal-welcome mb-6 overflow-hidden rounded-2xl border border-white/70 bg-white px-6 py-7 sm:px-8 sm:py-8">
              <div className="relative z-10 max-w-xl">
                <span className="text-[10px] font-black uppercase tracking-[.28em] text-[#EF1B23]">Welcome back</span>
                <h2 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">{userProfile.name}</h2>
                <p className="mt-2 text-sm text-gray-600">{dashboardMessage}</p>
              </div>
              <div className="portal-welcome-quote relative z-10 hidden md:block"><p>“Stronger members.<br/>Healthier communities.”</p><span/></div>
            </section>}
            {children}
          </main>
        </div>
      </div>

      
      {role === 'member' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#151515] border-t border-neutral-800 px-2 py-2 flex items-center justify-around z-40">
          <button
            onClick={() => navigate('/member/dashboard')}
            className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold ${
              currentPath === '/member/dashboard' ? 'text-[#EF1B23]' : 'text-neutral-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={() => navigate('/member/membership')}
            className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold ${
              currentPath.startsWith('/member/membership') ? 'text-[#EF1B23]' : 'text-neutral-400'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px]">Plan</span>
          </button>
          <button
            onClick={() => navigate('/member/attendance')}
            className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold ${
              currentPath === '/member/attendance' ? 'text-[#EF1B23]' : 'text-neutral-400'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span className="text-[10px]">Log</span>
          </button>
          {currentMember.workoutPlanEnabled && (
            <button
              onClick={() => navigate('/member/workout')}
              className={`flex flex-col items-center gap-1 p-1 text-xs font-semibold ${
                currentPath === '/member/workout' ? 'text-[#EF1B23]' : 'text-neutral-400'
              }`}
            >
              <Dumbbell className="w-4 h-4" />
              <span className="text-[10px]">Workout</span>
            </button>
          )}
        </nav>
      )}
      <ConfirmDialog open={confirmLogout} title="Sign out?" message="You will need to sign in again to access this portal." confirmLabel="Sign out" tone="danger" onClose={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); void handleLogout(); }} />
    </div>
  );
};

type AppLayoutChrome = Omit<AppLayoutProps, 'children'>;
type RegisteredAppLayoutChrome = AppLayoutChrome & { path: string };

const PortalLayoutContext = React.createContext<((chrome: RegisteredAppLayoutChrome) => void) | null>(null);

export const PortalLayoutHost: React.FC<React.PropsWithChildren<{ fallbackTitle: string }>> = ({
  children,
  fallbackTitle
}) => {
  const { currentPath } = useGym();
  const [registeredChrome, setRegisteredChrome] = useState<RegisteredAppLayoutChrome | null>(null);

  const registerChrome = useCallback((nextChrome: RegisteredAppLayoutChrome) => {
    setRegisteredChrome(previous => (
      previous?.path === nextChrome.path
      && previous.pageTitle === nextChrome.pageTitle
      && previous.pageSubtitle === nextChrome.pageSubtitle
      && previous.actions === nextChrome.actions
      && previous.breadcrumbs === nextChrome.breadcrumbs
        ? previous
        : nextChrome
    ));
  }, []);
  const chrome: AppLayoutChrome = registeredChrome?.path === currentPath
    ? registeredChrome
    : { pageTitle: fallbackTitle };

  return (
    <PortalLayoutContext.Provider value={registerChrome}>
      <AppLayoutFrame {...chrome}>{children}</AppLayoutFrame>
    </PortalLayoutContext.Provider>
  );
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children, pageTitle, pageSubtitle, actions, breadcrumbs }) => {
  const registerChrome = React.useContext(PortalLayoutContext);
  const { currentPath } = useGym();

  React.useLayoutEffect(() => {
    if (registerChrome) registerChrome({ path: currentPath, pageTitle, pageSubtitle, actions, breadcrumbs });
  }, [actions, breadcrumbs, currentPath, pageSubtitle, pageTitle, registerChrome]);

  if (registerChrome) return <>{children}</>;

  return (
    <AppLayoutFrame pageTitle={pageTitle} pageSubtitle={pageSubtitle} actions={actions} breadcrumbs={breadcrumbs}>
      {children}
    </AppLayoutFrame>
  );
};
