import React, { createContext, useContext, useState, useEffect } from 'react';
import { getPublicBranding } from '../services/api';

const CompanyContext = createContext();

export const THEMES = [
  {
    id: 'enterprise-slate',
    name: 'Enterprise Slate',
    subtitle: 'Classic sleek dark glass with electric blue highlights',
    previewGradient: 'from-slate-900 via-slate-800 to-blue-600',
    primaryColor: '#3b82f6',
    isDark: true
  },
  {
    id: 'royal-navy',
    name: 'Royal Navy & Gold',
    subtitle: 'Executive deep luxury navy with glowing amber gold',
    previewGradient: 'from-blue-950 via-indigo-900 to-amber-500',
    primaryColor: '#f59e0b',
    isDark: true
  },
  {
    id: 'emerald-exec',
    name: 'Emerald Executive',
    subtitle: 'Sophisticated dark forest emerald with fresh mint accents',
    previewGradient: 'from-emerald-950 via-teal-900 to-emerald-500',
    primaryColor: '#10b981',
    isDark: true
  },
  {
    id: 'cyber-violet',
    name: 'Cyber Violet & Pink',
    subtitle: 'Futuristic midnight purple with neon magenta highlights',
    previewGradient: 'from-indigo-950 via-purple-900 to-fuchsia-500',
    primaryColor: '#8b5cf6',
    isDark: true
  },
  {
    id: 'corporate-light',
    name: 'Corporate Light Mode',
    subtitle: 'Crisp high-contrast executive light design with indigo borders',
    previewGradient: 'from-slate-100 via-white to-blue-500',
    primaryColor: '#2563eb',
    isDark: false
  },
  {
    id: 'monochrome-stealth',
    name: 'Monochrome Stealth',
    subtitle: 'Ultra-clean charcoal minimalist design with chrome silver',
    previewGradient: 'from-neutral-950 via-zinc-900 to-slate-400',
    primaryColor: '#64748b',
    isDark: true
  }
];

export const CompanyProvider = ({ children }) => {
  const [company, setCompany] = useState({
    company_name: 'NextGen Enterprise Supermarket',
    company_tagline: 'Retail & Wholesale SaaS Billing Engine',
    company_logo: '',
    company_phone: '+1 (800) 555-0199',
    company_email: 'contact@shopbilling.com',
    company_address: '100 Commercial Plaza, Suite 400',
    tax_id: 'GSTIN: 27AAAAA0000A1Z5',
    company_website: 'https://3xbills-retail.com',
    google_rating_url: 'https://g.page/r/example_shop_review/review',
    default_upi_payment_id: 'shopname@okaxis',
    invoice_footer_note: 'Thank you for shopping with us! Returns valid within 7 days with valid tax receipt.',
    currency_symbol: '$',
    currency_code: 'USD',
    active_branch_name: 'Main Downtown Flagship',
    active_terminal_name: 'Counter #01 - Main Cash Register',
    branches_list_json: '',
    terminals_list_json: '',
    active_theme: 'enterprise-slate'
  });

  const [activeBranch, setActiveBranch] = useState(
    localStorage.getItem('app_branch') || 'Main Downtown Flagship'
  );

  const [activeTerminal, setActiveTerminal] = useState(
    localStorage.getItem('app_terminal') || 'Counter #01 - Main Cash Register'
  );

  const [activeTheme, setActiveThemeState] = useState(
    localStorage.getItem('app_theme') || 'enterprise-slate'
  );

  const applyThemeToDOM = (themeId) => {
    if (themeId) {
      document.documentElement.setAttribute('data-theme', themeId);
      localStorage.setItem('app_theme', themeId);
    }
  };

  const changeTheme = (themeId) => {
    setActiveThemeState(themeId);
    applyThemeToDOM(themeId);
  };

  const changeActiveBranch = (branchName) => {
    setActiveBranch(branchName);
    localStorage.setItem('app_branch', branchName);
  };

  const changeActiveTerminal = (terminalName) => {
    setActiveTerminal(terminalName);
    localStorage.setItem('app_terminal', terminalName);
  };

  const formatCurrency = (val) => {
    const sym = company.currency_symbol || '$';
    const num = parseFloat(val) || 0;
    return `${sym}${num.toFixed(2)}`;
  };

  const fetchBranding = async () => {
    try {
      const res = await getPublicBranding();
      if (res.data) {
        setCompany(res.data);
        if (res.data.active_theme) {
          setActiveThemeState(res.data.active_theme);
          applyThemeToDOM(res.data.active_theme);
        }
        if (res.data.active_branch_name && !localStorage.getItem('app_branch')) {
          setActiveBranch(res.data.active_branch_name);
        }
        if (res.data.active_terminal_name && !localStorage.getItem('app_terminal')) {
          setActiveTerminal(res.data.active_terminal_name);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch public company branding from server:', err);
    }
  };

  useEffect(() => {
    applyThemeToDOM(activeTheme);
    fetchBranding();
  }, []);

  return (
    <CompanyContext.Provider
      value={{
        company,
        setCompany,
        activeTheme,
        changeTheme,
        activeBranch,
        changeActiveBranch,
        activeTerminal,
        changeActiveTerminal,
        formatCurrency,
        currencySymbol: company.currency_symbol || '$',
        currencyCode: company.currency_code || 'USD',
        refreshCompany: fetchBranding,
        availableThemes: THEMES
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => useContext(CompanyContext);
