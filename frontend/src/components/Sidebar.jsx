import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, FileText, Users,
  Megaphone, Key, Database, Sparkles, LogOut, UserCheck,
  ShieldCheck, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { getAssetUrl } from '../services/api';

/* ─── nav items defined outside component to avoid recreation ─── */
const ALL_NAV_ITEMS = [
  { label: 'Executive Dashboard',  icon: LayoutDashboard, path: '/',         roles: ['ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'POS Terminal',         icon: ShoppingCart,    path: '/pos',       badge: 'FAST', roles: ['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'] },
  { label: 'Inventory & Stock',    icon: Package,         path: '/inventory', roles: ['ADMIN', 'INVENTORY_MANAGER'] },
  { label: 'Invoices & History',   icon: FileText,        path: '/invoices',  roles: ['ADMIN', 'CASHIER', 'INVENTORY_MANAGER'] },
  { label: 'Customer CRM',         icon: Users,           path: '/customers', roles: ['ADMIN', 'CASHIER'] },
  { label: 'Staff & User Roles',   icon: UserCheck,       path: '/users',     roles: ['ADMIN'] },
  { label: 'Admin Settings',       icon: ShieldCheck,     path: '/settings',  roles: ['ADMIN'] },
  { label: 'Marketing Automation', icon: Megaphone,       path: '/marketing', roles: ['ADMIN'] },
  { label: 'SaaS Licensing',       icon: Key,             path: '/license',   roles: ['ADMIN'] },
  { label: 'Auto DB Backups',      icon: Database,        path: '/backups',   roles: ['ADMIN'] },
];

const Sidebar = ({ mobileOpen, setMobileOpen, collapsed, setCollapsed }) => {
  const { user, logout } = useAuth();
  const { company } = useCompany();

  const userRole = user?.role || 'CASHIER';
  const navItems = ALL_NAV_ITEMS.filter((i) => i.roles.includes(userRole));

  /* The sidebar renders in two contexts:
       1. Desktop – always visible, collapsible
       2. Mobile  – hidden behind a slide-in drawer overlay
     `mini`     = icon-only mode (collapsed on desktop)
     `isDrawer` = inside mobile overlay (always full width)
  */
  const renderSidebar = (mini, isDrawer) => (
    <aside
      className="app-sidebar-bg border-r app-border flex flex-col overflow-hidden"
      style={{
        width: mini ? '60px' : '240px',
        height: '100%',
        flexShrink: 0,
        transition: 'width 0.25s ease',
      }}
    >
      {/* ── HEADER  (flexShrink:0 keeps it always visible) ── */}
      <div
        className={`flex items-center border-b app-border ${mini ? 'justify-center px-2' : 'justify-between px-3'}`}
        style={{ flexShrink: 0, height: '56px' }}
      >
        {mini ? (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md hover:scale-105 transition-transform"
          >
            {company.company_logo
              ? <img src={getAssetUrl(company.company_logo)} alt="" className="h-5 w-5 object-contain rounded" />
              : <Sparkles className="w-4 h-4" />}
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0">
              {company.company_logo ? (
                <img src={getAssetUrl(company.company_logo)} alt=""
                  className="h-7 max-w-[32px] object-contain rounded-lg bg-black/10 p-0.5 border app-border shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-bold app-text-primary text-[11px] leading-tight truncate">
                  {company.company_name || 'NextGen Billing'}
                </h1>
                <p className="text-[9px] text-blue-500 font-semibold uppercase tracking-wide truncate">
                  {company.company_tagline || 'Enterprise SaaS'}
                </p>
              </div>
            </div>

            {isDrawer ? (
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg app-card-inner app-text-muted hover:app-text-primary shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                title="Minimise sidebar"
                className="shrink-0 p-1.5 rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600/25 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* ── NAV  (flex:1 + minHeight:0 → scrolls internally, never pushes footer out) ── */}
      <nav
        style={{ flex: '1 1 0px', minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}
        className={`py-2 ${mini ? 'px-1.5' : 'px-2'}`}
      >
        <div className="space-y-0.5">
          {navItems.map(({ label, icon: Icon, path, badge }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => isDrawer && setMobileOpen(false)}
              title={mini ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-xl font-medium transition-all duration-150
                ${mini ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'}
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'app-text-muted hover:app-text-primary hover:bg-white/5'}`
              }
            >
              <div className={`flex items-center ${mini ? '' : 'gap-3'}`}>
                <Icon className="w-[17px] h-[17px] shrink-0" />
                {!mini && <span className="text-sm">{label}</span>}
              </div>
              {!mini && badge && (
                <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ── FOOTER  (flexShrink:0 keeps it always pinned, NEVER hidden) ── */}
      <div
        className={`border-t app-border bg-black/15 ${mini ? 'p-2' : 'p-3'}`}
        style={{ flexShrink: 0 }}
      >
        {user && (
          mini ? (
            <div className="flex flex-col items-center gap-2">
              <div
                title={`${user.full_name} · ${user.role}`}
                className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/30"
              >
                {user.full_name?.substring(0, 2).toUpperCase() || 'US'}
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg app-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition w-full flex justify-center"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-2.5 rounded-2xl app-card-inner border app-border flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/30 shrink-0">
                  {user.full_name?.substring(0, 2).toUpperCase() || 'US'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold app-text-primary truncate leading-tight">{user.full_name}</p>
                  <p className="text-[10px] font-semibold text-emerald-500 flex items-center gap-1 mt-0.5">
                    <UserCheck className="w-3 h-3 shrink-0" /> {user.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-1.5 rounded-lg app-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 px-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <p className="text-[9px] app-text-muted truncate">FastAPI • Port 8000 • POS Active</p>
              </div>
            </div>
          )
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop sticky sidebar ── */}
      <div className="hidden lg:block" style={{ height: '100%', flexShrink: 0, position: 'relative' }}>
        {renderSidebar(collapsed, false)}

        {/* Floating expand tab when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            style={{
              position: 'fixed',
              left: '60px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 40,
            }}
            className="w-5 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-r-lg flex items-center justify-center shadow-lg transition"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div style={{ height: '100%', position: 'relative', zIndex: 50 }}>
            {renderSidebar(false, true)}
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
