import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, ShieldCheck, Store, LogOut, User, Menu, ShoppingCart, Palette, Building2, Monitor } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { getLicenseStatus, getAssetUrl } from '../services/api';

const Navbar = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const { 
    company, activeTheme, changeTheme, availableThemes,
    activeBranch, changeActiveBranch, activeTerminal, changeActiveTerminal
  } = useCompany();
  const [license, setLicense] = useState(null);

  // Parse branches and billing counters list
  let branchesList = [];
  try {
    branchesList = company.branches_list_json ? JSON.parse(company.branches_list_json) : [];
  } catch (e) {
    branchesList = [];
  }
  if (!branchesList.length) {
    branchesList = [{ id: 'br-1', name: 'Main Downtown Flagship' }, { id: 'br-2', name: 'Airport Plaza Branch' }];
  }

  let terminalsList = [];
  try {
    terminalsList = company.terminals_list_json ? JSON.parse(company.terminals_list_json) : [];
  } catch (e) {
    terminalsList = [];
  }
  if (!terminalsList.length) {
    terminalsList = [
      { id: 'term-1', name: 'Counter #01 - Main Cash Register' },
      { id: 'term-2', name: 'Counter #02 - Express POS' },
      { id: 'term-3', name: 'Counter #03 - Wholesale Billing Desk' }
    ];
  }

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
    <header className="h-16 app-navbar-bg backdrop-blur-md border-b app-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Menu Toggle & Dynamic Company Logo / Name */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl app-card-inner app-text-muted hover:app-text-primary border app-border"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {company.company_logo ? (
          <img
            src={getAssetUrl(company.company_logo)}
            alt={company.company_name}
            className="h-8 max-w-[120px] object-contain rounded-lg hidden sm:block bg-black/10 p-1 border app-border"
          />
        ) : (
          <div className="p-2 rounded-lg app-card-inner app-text-muted border app-border hidden sm:block">
            <Store className="w-5 h-5 text-blue-500" />
          </div>
        )}

        <div>
          <h2 className="text-xs sm:text-sm font-bold app-text-primary leading-tight truncate max-w-[220px] sm:max-w-xs">
            {company.company_name || 'NextGen Supermarket & Enterprise Retail'}
          </h2>
          <p className="text-[10px] sm:text-xs app-text-muted truncate max-w-[200px]">
            {activeBranch} • {activeTerminal}
          </p>
        </div>
      </div>

      {/* Right: Actions, POS Quick Button, Branch/Counter Selectors, Theme Selector, License Status & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Branch Selector Dropdown Pill */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full app-card-inner border app-border text-xs" title="Switch Store Branch">
          <Building2 className="w-3.5 h-3.5 text-emerald-500" />
          <select
            value={activeBranch}
            onChange={(e) => changeActiveBranch(e.target.value)}
            className="bg-transparent app-text-primary font-semibold text-[11px] focus:outline-none cursor-pointer max-w-[140px] truncate"
          >
            {branchesList.map((b) => (
              <option key={b.id || b.name} value={b.name} className="app-card-inner">
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Billing Counter/Terminal Selector Dropdown Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full app-card-inner border app-border text-xs" title="Switch Active Billing Counter / Register">
          <Monitor className="w-3.5 h-3.5 text-indigo-500" />
          <select
            value={activeTerminal}
            onChange={(e) => changeActiveTerminal(e.target.value)}
            className="bg-transparent app-text-primary font-semibold text-[11px] focus:outline-none cursor-pointer max-w-[150px] truncate"
          >
            {terminalsList.map((t) => (
              <option key={t.id || t.name} value={t.name} className="app-card-inner">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Theme Selector Dropdown Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full app-card-inner border app-border text-xs">
          <Palette className="w-3.5 h-3.5 text-blue-500" />
          <select
            value={activeTheme}
            onChange={(e) => changeTheme(e.target.value)}
            className="bg-transparent app-text-primary font-semibold text-[11px] focus:outline-none cursor-pointer"
            title="Change Professional Theme"
          >
            {availableThemes.map((t) => (
              <option key={t.id} value={t.id} className="app-card-inner">
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick POS Terminal Button */}
        <a
          href="/pos"
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>POS Register</span>
        </a>

        {/* License Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full app-card-inner border app-border text-xs">
          <ShieldCheck className={`w-4 h-4 ${license?.is_licensed ? 'text-emerald-500' : 'text-amber-500'}`} />
          <span className="app-text-secondary font-medium">
            {license ? license.active_license_status || `${license.tier} (${license.days_left}d)` : 'Verifying License...'}
          </span>
        </div>

        {/* Notifications Icon */}
        <button className="p-2 rounded-xl app-card-inner app-text-muted hover:app-text-primary transition relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-blue-500 absolute top-1.5 right-1.5"></span>
        </button>

        {/* Active Logged-In Profile Badge */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l app-border">
            <Link
              to={user.role === 'ADMIN' ? '/settings' : '#'}
              title={user.role === 'ADMIN' ? 'Click to open Admin Profile & Settings' : user.full_name}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-indigo-500/20 shrink-0 group-hover:scale-105 transition">
                {getInitials(user.full_name)}
              </div>
              <div className="text-left hidden md:block">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold app-text-primary group-hover:text-blue-500 transition">{user.full_name}</p>
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                    user.role === 'ADMIN' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-[10px] app-text-muted truncate max-w-[130px]">{user.email}</p>
              </div>
            </Link>

            <button
              onClick={logout}
              title="Logout session"
              className="p-1.5 rounded-xl app-card-inner hover:bg-rose-500/20 hover:text-rose-400 app-text-muted transition ml-0.5"
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

