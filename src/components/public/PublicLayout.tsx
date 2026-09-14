import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';

import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
  Twitter,
  Search,
} from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { currentPath, navigate, settings } = useGym();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navLinks = [
    { label: 'HOME', path: '/' },
    { label: 'ABOUT', path: '/' },
    { label: 'SERVICES', path: '/' },
    { label: 'SCHEDULE', path: '/' },
    { label: 'PRICING', path: '/' },
    { label: 'CONTACT', path: '/' }
  ];

  return (
    <div className="public-site min-h-screen bg-[#111111] text-white flex flex-col font-sans antialiased selection:bg-[#EF1B23] selection:text-white">
      <header className="fixed inset-x-0 top-0 z-50 bg-[#121212]/95 backdrop-blur-md border-b border-neutral-800/80 shadow-lg shadow-black/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[76px] flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center group text-left shrink-0"
            aria-label="Sarex Fitness Clinic home"
          >
            <img src="/assets/brand/sarex-logo.png" alt="Sarex Fitness Clinic" className="h-12 sm:h-14 w-auto max-w-[190px] sm:max-w-[230px] object-contain transition-transform group-hover:scale-[1.02]" />
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-5">
            {navLinks.map(link => {
              const isActive = currentPath === link.path && link.label === 'HOME';
              return (
                <button
                  key={link.label}
                  onClick={() => {
                    if (link.label === 'SCHEDULE') {
                      navigate('/');
                      setTimeout(() => {
                        const el = document.getElementById('schedule-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    } else if (['ABOUT','SERVICES','PRICING','CONTACT'].includes(link.label)) {
                    navigate('/');
                    const targets: Record<string,string> = { ABOUT:'about-section', SERVICES:'classes-section', PRICING:'pricing-section', CONTACT:'contact-section' };
                    setTimeout(() => document.getElementById(targets[link.label])?.scrollIntoView({ behavior: 'smooth' }), 100);
                  } else {
                      navigate(link.path);
                    }
                  }}
                  className={`transition-colors uppercase tracking-wider text-xs font-black py-1 relative ${
                    isActive ? 'text-[#EF1B23]' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#EF1B23]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & CTA */}
          <div className="hidden sm:flex items-center gap-4">
            {/* Search Toggle */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Search classes or trainers"
              >
                <Search className="w-4 h-4" />
              </button>
              {searchOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-neutral-700 p-2 shadow-2xl z-50">
                  <input
                    type="text"
                    placeholder="Search services and memberships..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#111111] border border-neutral-700 px-3 py-1.5 text-xs text-white rounded-xs focus:outline-none focus:border-[#EF1B23]"
                    autoFocus
                  />
                  {searchQuery && (
                    <div className="mt-2 text-left text-xs space-y-1">
                      <button
                        onClick={() => {
                          navigate('/');
                          setTimeout(() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                          setSearchOpen(false);
                        }}
                        className="block w-full text-left p-1 text-gray-300 hover:bg-neutral-800 rounded-xs"
                      >
                        Search memberships for "{searchQuery}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Auth / Register Buttons */}
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white px-2 py-2 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-[#EF1B23] hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 transition-all shadow-md shadow-red-600/20"
            >
              Join Now
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-300 hover:text-white"
            aria-label="Toggle navigation menu" aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#151515] border-b border-neutral-800 px-4 pt-3 pb-6 space-y-3">
            {navLinks.map(link => (
              <button
                key={link.label}
                onClick={() => {
                  if (link.label === 'SCHEDULE') {
                    navigate('/');
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      const el = document.getElementById('schedule-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  } else if (['ABOUT','SERVICES','PRICING','CONTACT'].includes(link.label)) {
                    navigate('/');
                    setMobileMenuOpen(false);
                    const targets: Record<string,string> = { ABOUT:'about-section', SERVICES:'classes-section', PRICING:'pricing-section', CONTACT:'contact-section' };
                    setTimeout(() => document.getElementById(targets[link.label])?.scrollIntoView({ behavior: 'smooth' }), 100);
                  } else {
                    navigate(link.path);
                    setMobileMenuOpen(false);
                  }
                }}
                className="block w-full text-left py-2.5 text-sm font-black uppercase tracking-wider text-gray-200 hover:text-[#EF1B23] border-b border-neutral-800"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-4 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 border border-neutral-700 text-white text-xs font-black uppercase tracking-wider"
              >
                Member / Staff Login
              </button>
              <button
                onClick={() => {
                  navigate('/register');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center py-2.5 bg-[#EF1B23] text-white text-xs font-black uppercase tracking-widest"
              >
                Join Now
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pt-[76px]">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#0D0D0D] border-t border-neutral-900 text-neutral-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand column */}
            <div className="space-y-4">
              <img src="/assets/brand/sarex-logo.png" alt="Sarex Fitness Clinic" className="h-16 w-auto max-w-[230px] object-contain" />
              <p className="text-xs text-neutral-400 leading-relaxed">
                SAREX Fitness Clinic is a high-performance training ground built for members, clinical conditioning, and lifelong strength.
              </p>
              <div className="flex items-center gap-3 text-neutral-400 pt-2">
                <span className="w-8 h-8 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:text-[#EF1B23] cursor-pointer transition-colors">
                  <Instagram className="w-4 h-4" />
                </span>
                <span className="w-8 h-8 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:text-[#EF1B23] cursor-pointer transition-colors">
                  <Facebook className="w-4 h-4" />
                </span>
                <span className="w-8 h-8 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-center hover:text-[#EF1B23] cursor-pointer transition-colors">
                  <Twitter className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-athletic font-bold uppercase tracking-wider text-white text-sm mb-4">
                Quick Links
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => navigate('/')} className="hover:text-white transition-colors">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={() => { navigate('/'); setTimeout(() => document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="hover:text-white transition-colors">
                    About the Clinic
                  </button>
                </li>
                <li>
                  <button onClick={() => { navigate('/'); setTimeout(() => document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="hover:text-white transition-colors">
                    Membership Plans
                  </button>
                </li>
                <li>
                  <button onClick={() => { navigate('/'); setTimeout(() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }} className="hover:text-white transition-colors">
                    Contact & Directions
                  </button>
                </li>
              </ul>
            </div>

            {/* Portals Access */}
            <div>
              <h4 className="font-athletic font-bold uppercase tracking-wider text-white text-sm mb-4">
                Gym Portals
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button onClick={() => navigate('/member/dashboard')} className="hover:text-[#EF1B23] transition-colors">
                    Reception QR Check-in & Dashboard
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/staff/dashboard')} className="hover:text-[#EF1B23] transition-colors">
                    Staff Portal
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/trainer/dashboard')} className="hover:text-[#EF1B23] transition-colors">
                    Trainer Portal
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/admin/dashboard')} className="hover:text-[#EF1B23] transition-colors">
                    Super Admin Management
                  </button>
                </li>
              </ul>
            </div>

            {/* Contact Details */}
            <div>
              <h4 className="font-athletic font-bold uppercase tracking-wider text-white text-sm mb-4">
                Contact & Location
              </h4>
              <ul className="space-y-3 text-xs">
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#EF1B23] shrink-0 mt-0.5" />
                  <span>{settings.address}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-[#EF1B23] shrink-0" />
                  <span>{settings.phone}</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#EF1B23] shrink-0" />
                  <span>{settings.email}</span>
                </li>
                <li className="text-[11px] text-neutral-400 pt-1">
                  Fast reception check-in with an active membership
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-neutral-900 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
            <p>© {new Date().getFullYear()} SAREX Fitness Clinic. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>Zero-compromise Fitness Clinic</span>
              <span className="text-[#EF1B23] font-bold font-athletic uppercase">BUILD YOUR STRONGEST SELF</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};



