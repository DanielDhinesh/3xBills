import React, { useState, useEffect } from 'react';
import { Search, Bell, ShieldCheck, Store, LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLicenseStatus } from '../services/api';

const Navbar = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const [license, setLicense] = useState(null);

  useEffect(() => {
    getLicenseStatus()
      .then(res => setLicense(res.data))
      .catch(err => console.error(err));
  }, []);

  const getInitials = (name) => {
    if (!name) return 'US';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Menu Toggle & Shop Name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/50 hidden sm:block">
          <Store className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">NextGen Supermarket & Enterprise Retail</h2>
          <p className="text-[10px] sm:text-xs text-slate-400">Terminal #01 • Main Cash Register</p>
        </div>
      </div>

      {/* Right: Actions, License Status & Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* License Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <ShieldCheck className={`w-4 h-4 ${license?.is_licensed ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-slate-300 font-medium">
            {license ? license.active_license_status || `${license.tier} (${license.days_left}d)` : 'Verifying License...'}
          </span>
        </div>

        {/* Notifications Icon */}
        <button className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1.5 right-1.5"></span>
        </button>

        {/* Active Logged-In Profile Badge */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-indigo-500/20 shrink-0">
              {getInitials(user.full_name)}
            </div>
            <div className="text-left hidden md:block">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-slate-200">{user.full_name}</p>
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                  user.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {user.role}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[130px]">{user.email}</p>
            </div>

            <button
              onClick={logout}
              title="Logout session"
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition ml-0.5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
