import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileText, 
  Users, 
  Megaphone, 
  Key, 
  Database,
  Sparkles,
  LogOut,
  UserCheck,
  ShieldCheck,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { getAssetUrl } from '../services/api';

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth();
  const { company } = useCompany();

  const allNavItems = [
    { label: 'Executive Dashboard', icon: LayoutDashboard, path: '/', roles: ['ADMIN', 'INVENTORY_MANAGER'] },
    { label: 'POS Terminal', icon: ShoppingCart, path: '/pos', badge: 'HIGH SPEED', roles: ['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'] },
    { label: 'Inventory & Stock', icon: Package, path: '/inventory', roles: ['ADMIN', 'INVENTORY_MANAGER'] },
    { label: 'Invoices & History', icon: FileText, path: '/invoices', roles: ['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'] },
    { label: 'Customer CRM', icon: Users, path: '/customers', roles: ['ADMIN', 'CASHIER'] },
    { label: 'Staff & User Roles', icon: UserCheck, path: '/users', roles: ['ADMIN'] },
    { label: 'Admin Settings & Gmail', icon: ShieldCheck, path: '/settings', roles: ['ADMIN'] },
    { label: 'Marketing Automation', icon: Megaphone, path: '/marketing', roles: ['ADMIN'] },
    { label: 'SaaS Licensing', icon: Key, path: '/license', roles: ['ADMIN'] },
    { label: 'Auto DB Backups', icon: Database, path: '/backups', roles: ['ADMIN'] },
  ];

  const userRole = user?.role || 'CASHIER';
  const navItems = allNavItems.filter((item) => item.roles.includes(userRole));

  const sidebarContent = (
    <aside className="w-64 app-sidebar-bg border-r app-border flex flex-col justify-between h-full z-30 select-none">
      <div>
        {/* Dynamic Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b app-border">
          <div className="flex items-center gap-3 min-w-0">
            {company.company_logo ? (
              <img
                src={getAssetUrl(company.company_logo)}
                alt={company.company_name}
                className="h-8 max-w-[40px] object-contain rounded-lg bg-black/10 p-0.5 border app-border shrink-0"
              />

            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold app-text-primary text-sm leading-tight tracking-tight truncate">
                {company.company_name || 'NextGen Billing'}
              </h1>
              <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider truncate">
                {company.company_tagline || 'Enterprise SaaS'}
              </p>
            </div>
          </div>

          {/* Close button for mobile screen drawer */}
          <button
            onClick={() => setMobileOpen && setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg app-card-inner app-text-muted hover:app-text-primary shrink-0 ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>


        {/* Navigation Menu */}
        <nav className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-10rem)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 font-bold'
                      : 'app-text-muted hover:app-text-primary hover:bg-black/10'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Profile Card & Footer Info */}
      <div className="p-4 border-t app-border bg-black/10 space-y-3">
        {user && (
          <div className="p-3 rounded-2xl app-card-inner border app-border flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/30 shrink-0">
                {user.full_name?.substring(0, 2).toUpperCase() || 'US'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold app-text-primary truncate">{user.full_name}</p>
                <p className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> {user.role}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout session"
              className="p-1.5 rounded-lg app-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 px-1">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <p className="text-[11px] font-semibold app-text-secondary">FastAPI & SQLite Engine</p>
            <p className="text-[9px] app-text-muted">Port 8000 • Multi-Tab POS Active</p>
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen && setMobileOpen(false)}
          ></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 h-full shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
