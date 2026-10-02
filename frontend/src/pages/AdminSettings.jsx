import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, User, Mail, Lock, Key, Server, Send, Bell, FileText, CheckCircle2, 
  AlertTriangle, Save, RefreshCw, Building2, Upload, Palette, Image as ImageIcon,
  Phone, MapPin, Globe, QrCode, Sparkles, Check, DollarSign, Monitor, Plus, Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { 
  updateUserProfile, getSystemSettings, updateSystemSettings, uploadCompanyLogo,
  testEmailConnection, sendEmailReport, sendLowStockAlertEmail, getAssetUrl
} from '../services/api';

const AdminSettings = () => {
  const { user, setUser } = useAuth();
  const { company, refreshCompany, activeTheme, changeTheme, availableThemes } = useCompany();
  const [activeTab, setActiveTab] = useState('BRANDING'); // 'BRANDING' | 'THEMES' | 'BRANCHES' | 'PROFILE' | 'SMTP' | 'AUTOMATION'

  // Company & Branding Form State
  const [brandingForm, setBrandingForm] = useState({
    company_name: '',
    company_tagline: '',
    company_logo: '',
    company_phone: '',
    company_email: '',
    company_address: '',
    tax_id: '',
    company_website: '',
    google_rating_url: '',
    default_upi_payment_id: '',
    invoice_footer_note: '',
    currency_symbol: '$',
    currency_code: 'USD',
    active_branch_name: 'Main Downtown Flagship',
    active_terminal_name: 'Counter #01 - Main Cash Register',
    active_theme: 'enterprise-slate'
  });
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  // Multi-Branch & Multi-Terminal State
  const [branches, setBranches] = useState([
    { id: 'br-1', name: 'Main Downtown Flagship', code: 'BR-01', phone: '+1 800-555-0199', address: '100 Commercial Plaza, Suite 400' },
    { id: 'br-2', name: 'Airport Plaza Branch', code: 'BR-02', phone: '+1 800-555-0299', address: 'Terminal 2, Airport Retail Zone' }
  ]);
  const [newBranch, setNewBranch] = useState({ name: '', code: '', phone: '', address: '' });

  const [terminals, setTerminals] = useState([
    { id: 'term-1', name: 'Counter #01 - Main Cash Register', code: 'TERM-01', branch_name: 'Main Downtown Flagship' },
    { id: 'term-2', name: 'Counter #02 - Express POS', code: 'TERM-02', branch_name: 'Main Downtown Flagship' },
    { id: 'term-3', name: 'Counter #03 - Wholesale Billing Desk', code: 'TERM-03', branch_name: 'Airport Plaza Branch' }
  ]);
  const [newTerminal, setNewTerminal] = useState({ name: '', code: '', branch_name: 'Main Downtown Flagship' });

  // Admin Profile Form State
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // SMTP Settings Form State
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    admin_notify_email: '',
    enable_low_stock_alerts: true,
    enable_inventory_updates: true,
    enable_periodic_reports: true,
    report_frequency: 'WEEKLY'
  });
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);

  // Test email & report triggers
  const [testEmailAddr, setTestEmailAddr] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [reportType, setReportType] = useState('WEEKLY');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [isSendingAlert, setIsSendingAlert] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm((prev) => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || ''
      }));
      setTestEmailAddr(user.email || '');
    }
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const res = await getSystemSettings();
      setSmtpForm(res.data);
      setBrandingForm(res.data);
      if (res.data.branches_list_json) {
        try { setBranches(JSON.parse(res.data.branches_list_json)); } catch (e) {}
      }
      if (res.data.terminals_list_json) {
        try { setTerminals(JSON.parse(res.data.terminals_list_json)); } catch (e) {}
      }
      if (res.data.admin_notify_email) {
        setTestEmailAddr(res.data.admin_notify_email);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  // Upload Company Logo Image
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingLogo(true);
    try {
      const res = await uploadCompanyLogo(formData);
      if (res.data.logo_url) {
        setBrandingForm((prev) => ({ ...prev, company_logo: res.data.logo_url }));
        alert('Company Logo uploaded successfully!');
        refreshCompany();
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Error uploading logo file');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Save Company Branding Details
  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setIsSavingBranding(true);
    try {
      const payload = {
        ...smtpForm,
        ...brandingForm,
        active_theme: activeTheme
      };
      const res = await updateSystemSettings(payload);
      alert(res.data.message || 'Company Profile & Branding updated!');
      await refreshCompany();
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving company branding');
    } finally {
      setIsSavingBranding(false);
    }
  };

  // Save Admin Profile & Password
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileForm.new_password && profileForm.new_password !== profileForm.confirm_password) {
      alert('New Password and Confirm Password do not match!');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await updateUserProfile({
        full_name: profileForm.full_name,
        email: profileForm.email,
        current_password: profileForm.current_password || undefined,
        new_password: profileForm.new_password || undefined
      });

      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token);
      }
      if (res.data.user) {
        setUser(res.data.user);
      }

      setProfileForm((prev) => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));

      alert('Admin Profile & Password updated successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error updating profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save Gmail SMTP Settings
  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    setIsSavingSmtp(true);
    try {
      const payload = {
        ...brandingForm,
        ...smtpForm,
        active_theme: activeTheme
      };
      const res = await updateSystemSettings(payload);
      alert(res.data.message || 'SMTP settings saved!');
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving SMTP settings');
    } finally {
      setIsSavingSmtp(false);
    }
  };

  // Select and Save Professional Theme
  const handleSelectTheme = async (themeId) => {
    changeTheme(themeId);
    try {
      const payload = {
        ...smtpForm,
        ...brandingForm,
        active_theme: themeId
      };
      await updateSystemSettings(payload);
      setBrandingForm((prev) => ({ ...prev, active_theme: themeId }));
      refreshCompany();
    } catch (err) {
      console.error('Error persisting theme to database:', err);
    }
  };

  // Dispatch Test Email
  const handleTestEmail = async () => {
    if (!testEmailAddr.trim()) {
      alert('Please enter a target recipient email address for testing!');
      return;
    }

    setIsTestingEmail(true);
    try {
      const res = await testEmailConnection(testEmailAddr.trim());
      alert(res.data.message || 'Test email dispatched!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send test email. Check Gmail App Password or SMTP credentials.');
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Dispatch Report Email Now
  const handleSendReportNow = async () => {
    setIsSendingReport(true);
    try {
      const res = await sendEmailReport(reportType, testEmailAddr);
      alert(res.data.message || `Report emailed to ${testEmailAddr}!`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error emailing report.');
    } finally {
      setIsSendingReport(false);
    }
  };

  // Dispatch Low Stock Warning Alert Email Now
  const handleSendLowStockAlertNow = async () => {
    setIsSendingAlert(true);
    try {
      const res = await sendLowStockAlertEmail();
      alert(res.data.message || 'Low stock alert email dispatched!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Error dispatching low stock alert email.');
    } finally {
      setIsSendingAlert(false);
    }
  };

  // Multi-Branch Add & Delete Handlers
  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.name.trim()) return;
    const item = {
      id: `br-${Date.now()}`,
      name: newBranch.name.trim(),
      code: newBranch.code.trim() || `BR-0${branches.length + 1}`,
      phone: newBranch.phone.trim(),
      address: newBranch.address.trim()
    };
    const updatedBranches = [...branches, item];
    setBranches(updatedBranches);
    setNewBranch({ name: '', code: '', phone: '', address: '' });
    try {
      await updateSystemSettings({
        ...smtpForm,
        ...brandingForm,
        branches_list_json: JSON.stringify(updatedBranches)
      });
      refreshCompany();
      alert(`Store Branch "${item.name}" added successfully!`);
    } catch (err) {
      alert('Error saving new branch.');
    }
  };

  const handleDeleteBranch = async (branchId) => {
    if (branches.length <= 1) {
      alert('At least 1 active store branch must exist!');
      return;
    }
    if (window.confirm('Delete this store branch?')) {
      const updatedBranches = branches.filter((b) => b.id !== branchId);
      setBranches(updatedBranches);
      try {
        await updateSystemSettings({
          ...smtpForm,
          ...brandingForm,
          branches_list_json: JSON.stringify(updatedBranches)
        });
        refreshCompany();
      } catch (err) {
        alert('Error removing branch.');
      }
    }
  };

  // Multi-Terminal Counter Add & Delete Handlers
  const handleAddTerminal = async (e) => {
    e.preventDefault();
    if (!newTerminal.name.trim()) return;
    const item = {
      id: `term-${Date.now()}`,
      name: newTerminal.name.trim(),
      code: newTerminal.code.trim() || `TERM-0${terminals.length + 1}`,
      branch_name: newTerminal.branch_name || (branches[0]?.name || 'Main Downtown Flagship')
    };
    const updatedTerminals = [...terminals, item];
    setTerminals(updatedTerminals);
    setNewTerminal({ name: '', code: '', branch_name: branches[0]?.name || 'Main Downtown Flagship' });
    try {
      await updateSystemSettings({
        ...smtpForm,
        ...brandingForm,
        terminals_list_json: JSON.stringify(updatedTerminals)
      });
      refreshCompany();
      alert(`Billing Counter "${item.name}" added successfully!`);
    } catch (err) {
      alert('Error saving billing counter.');
    }
  };

  const handleDeleteTerminal = async (termId) => {
    if (terminals.length <= 1) {
      alert('At least 1 active billing counter register must exist!');
      return;
    }
    if (window.confirm('Delete this billing counter terminal?')) {
      const updatedTerminals = terminals.filter((t) => t.id !== termId);
      setTerminals(updatedTerminals);
      try {
        await updateSystemSettings({
          ...smtpForm,
          ...brandingForm,
          terminals_list_json: JSON.stringify(updatedTerminals)
        });
        refreshCompany();
      } catch (err) {
        alert('Error removing terminal counter.');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black app-text-primary tracking-tight flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-500" /> Admin Control Panel & Store Branding
        </h1>
        <p className="text-xs app-text-muted mt-1">
          Customize Store Profile, Currency, Multi-Branch & Counters, Professional Themes, Gmail Automation, and Admin Account Credentials
        </p>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 border-b app-border pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('BRANDING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'BRANDING'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'app-card-inner app-text-muted hover:app-text-primary border app-border'
          }`}
        >
          <Building2 className="w-4 h-4" /> Company Profile & Currency
        </button>

        <button
          onClick={() => setActiveTab('BRANCHES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'BRANCHES'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'app-card-inner app-text-muted hover:app-text-primary border app-border'
          }`}
        >
          <Monitor className="w-4 h-4 text-emerald-400" /> Multi-Branch & Counters
        </button>

        <button
          onClick={() => setActiveTab('THEMES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'THEMES'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'app-card-inner app-text-muted hover:app-text-primary border app-border'
          }`}
        >
          <Palette className="w-4 h-4 text-amber-400" /> Professional Themes
        </button>

        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'PROFILE'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'app-card-inner app-text-muted hover:app-text-primary border app-border'
          }`}
        >
          <User className="w-4 h-4" /> Admin Credentials
        </button>

        <button
          onClick={() => setActiveTab('SMTP')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'SMTP'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'app-card-inner app-text-muted hover:app-text-primary border app-border'
          }`}
        >
          <Server className="w-4 h-4" /> Gmail SMTP & API
        </button>

        <button
          onClick={() => setActiveTab('AUTOMATION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
            activeTab === 'AUTOMATION'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'app-card-inner app-text-muted hover:app-text-primary border app-border'
          }`}
        >
          <Bell className="w-4 h-4" /> Alerts & Periodic Reports
        </button>
      </div>

      {/* TAB 1: Company Profile & Logo Upload */}
      {activeTab === 'BRANDING' && (
        <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-6">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" /> Company Profile & White-Label Branding
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Set Company Logo, Business Name, Tax ID, Address, and custom PDF Invoice Terms to display the software fully company-branded.
            </p>
          </div>

          <form onSubmit={handleSaveBranding} className="space-y-5 text-xs max-w-3xl">
            {/* Logo Upload Box */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <label className="text-slate-200 font-bold block flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-400" /> Company Logo Image
                </span>
                <span className="text-[10px] text-slate-400">Displays on Navbar, Sidebar, Login Screen & PDF Bills</span>
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {brandingForm.company_logo ? (
                  <div className="relative group shrink-0">
                    <img
                      src={getAssetUrl(brandingForm.company_logo)}
                      alt="Company Logo"
                      className="h-16 w-36 object-contain rounded-xl bg-slate-950 p-2 border border-slate-700/80 shadow-md"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-36 rounded-xl bg-slate-950 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 shrink-0">
                    <ImageIcon className="w-6 h-6 mb-0.5 text-slate-600" />
                    <span className="text-[10px]">No Logo Set</span>
                  </div>
                )}

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center gap-2">
                    <label className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shadow">
                      <Upload className="w-4 h-4" /> {isUploadingLogo ? 'Uploading Logo...' : 'Upload Logo Image'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isUploadingLogo}
                        className="hidden"
                      />
                    </label>
                  </div>

                </div>
              </div>
            </div>

            {/* Basic Store Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Company / Business Name *</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Acme Enterprise Supermarket"
                    value={brandingForm.company_name}
                    onChange={(e) => setBrandingForm({ ...brandingForm, company_name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Company Tagline / Subtitle</label>
                <input
                  type="text"
                  placeholder="Retail & Wholesale POS Solutions"
                  value={brandingForm.company_tagline}
                  onChange={(e) => setBrandingForm({ ...brandingForm, company_tagline: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-white font-medium"
                />
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Business Phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="+1 (800) 555-0199"
                    value={brandingForm.company_phone}
                    onChange={(e) => setBrandingForm({ ...brandingForm, company_phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Business Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="contact@shopbilling.com"
                    value={brandingForm.company_email}
                    onChange={(e) => setBrandingForm({ ...brandingForm, company_email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Tax ID / GSTIN / VAT Number</label>
                <input
                  type="text"
                  placeholder="GSTIN: 27AAAAA0000A1Z5"
                  value={brandingForm.tax_id}
                  onChange={(e) => setBrandingForm({ ...brandingForm, tax_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-white font-semibold font-mono"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="text-slate-300 font-bold block mb-1">Store / HQ Street Address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="100 Commercial Plaza, Suite 400, New York NY 10001"
                  value={brandingForm.company_address}
                  onChange={(e) => setBrandingForm({ ...brandingForm, company_address: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-white font-medium"
                />
              </div>
            </div>

            {/* Currency Symbol & ISO Code Settings */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <label className="text-slate-200 font-bold block flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> System Currency Symbol & Currency Code
                </span>
                <span className="text-[10px] text-slate-400">Configures price display app-wide & on PDF receipts</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Currency Symbol *</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={['$', '₹', '€', '£', 'AED', 'SAR', 'C$', 'A$', '¥'].includes(brandingForm.currency_symbol) ? brandingForm.currency_symbol : 'CUSTOM'}
                      onChange={(e) => {
                        if (e.target.value !== 'CUSTOM') {
                          let code = 'USD';
                          if (e.target.value === '₹') code = 'INR';
                          else if (e.target.value === '€') code = 'EUR';
                          else if (e.target.value === '£') code = 'GBP';
                          else if (e.target.value === 'AED') code = 'AED';
                          else if (e.target.value === 'SAR') code = 'SAR';
                          else if (e.target.value === 'C$') code = 'CAD';
                          else if (e.target.value === 'A$') code = 'AUD';
                          else if (e.target.value === '¥') code = 'JPY';
                          setBrandingForm({ ...brandingForm, currency_symbol: e.target.value, currency_code: code });
                        }
                      }}
                      className="p-2.5 rounded-xl glass-input text-white bg-slate-900 text-xs font-bold shrink-0"
                    >
                      <option value="$">$ (US Dollar - USD)</option>
                      <option value="₹">₹ (Indian Rupee - INR)</option>
                      <option value="€">€ (Euro - EUR)</option>
                      <option value="£">£ (British Pound - GBP)</option>
                      <option value="AED">AED (UAE Dirham)</option>
                      <option value="SAR">SAR (Saudi Riyal)</option>
                      <option value="C$">C$ (Canadian Dollar)</option>
                      <option value="A$">A$ (Australian Dollar)</option>
                      <option value="¥">¥ (Yen / Yuan)</option>
                      <option value="CUSTOM">Custom Symbol</option>
                    </select>

                    <input
                      type="text"
                      required
                      placeholder="e.g. $, ₹, €, £, AED"
                      value={brandingForm.currency_symbol}
                      onChange={(e) => setBrandingForm({ ...brandingForm, currency_symbol: e.target.value })}
                      className="w-full p-2.5 rounded-xl glass-input text-white font-bold font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Currency Code (ISO 4217)</label>
                  <input
                    type="text"
                    placeholder="USD, INR, EUR, GBP, AED, SAR"
                    value={brandingForm.currency_code}
                    onChange={(e) => setBrandingForm({ ...brandingForm, currency_code: e.target.value.toUpperCase() })}
                    className="w-full p-2.5 rounded-xl glass-input text-white font-bold font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* QR Links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-amber-400" /> Google Review QR Code Link
                </label>
                <input
                  type="text"
                  placeholder="https://g.page/r/example_shop_review/review"
                  value={brandingForm.google_rating_url}
                  onChange={(e) => setBrandingForm({ ...brandingForm, google_rating_url: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-400" /> Default UPI / Mobile Payment ID
                </label>
                <input
                  type="text"
                  placeholder="shopname@okaxis"
                  value={brandingForm.default_upi_payment_id}
                  onChange={(e) => setBrandingForm({ ...brandingForm, default_upi_payment_id: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs font-mono"
                />
              </div>
            </div>

            {/* Custom Invoice Footer */}
            <div>
              <label className="text-slate-300 font-bold block mb-1">Custom PDF Invoice Footer Note / Policy</label>
              <textarea
                rows={2}
                placeholder="Thank you for shopping with us! Items can be exchanged within 7 days with valid tax receipt."
                value={brandingForm.invoice_footer_note}
                onChange={(e) => setBrandingForm({ ...brandingForm, invoice_footer_note: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input text-white text-xs font-medium resize-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingBranding}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSavingBranding ? 'Saving Company Profile...' : 'Save Company Branding & Currency'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Multi-Branch Stores & Billing Counter Terminals */}
      {activeTab === 'BRANCHES' && (
        <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-8">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Monitor className="w-5 h-5 text-emerald-400" /> Multi-Branch Stores & Billing Counter Cash Registers
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure <strong>n number of store branches</strong> and <strong>n number of billing counters</strong>. Switch your active billing counter or store branch directly from the top navigation pill dropdowns.
            </p>
          </div>

          {/* Section 1: Store Branches ($n$ Branches) */}
          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-400" /> Store Branches ({branches.length})
                </h3>
                <p className="text-[11px] text-slate-400">Manage all your retail outlets & warehouse locations</p>
              </div>
            </div>

            {/* List of Store Branches */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between space-x-3 shadow-md hover:border-slate-700 transition"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">{b.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold border border-blue-500/20">
                        {b.code}
                      </span>
                    </div>
                    {b.phone && <p className="text-slate-400 text-[11px] flex items-center gap-1">📞 {b.phone}</p>}
                    {b.address && <p className="text-slate-400 text-[11px] flex items-center gap-1">📍 {b.address}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteBranch(b.id)}
                    className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition shrink-0"
                    title="Delete Store Branch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form to Add New Branch */}
            <form onSubmit={handleAddBranch} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 text-xs">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-400" /> Add New Store Branch
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Branch Name (e.g. Westside Mall Outlet)"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="p-2.5 rounded-xl glass-input text-white"
                />
                <input
                  type="text"
                  placeholder="Branch Code (e.g. BR-03)"
                  value={newBranch.code}
                  onChange={(e) => setNewBranch({ ...newBranch, code: e.target.value })}
                  className="p-2.5 rounded-xl glass-input text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={newBranch.phone}
                  onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                  className="p-2.5 rounded-xl glass-input text-white"
                />
                <input
                  type="text"
                  placeholder="Store Address"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  className="p-2.5 rounded-xl glass-input text-white"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
              >
                <Plus className="w-4 h-4" /> Save Store Branch
              </button>
            </form>
          </div>

          {/* Section 2: Billing Counter Terminals ($n$ Billing Counters) */}
          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-amber-400" /> Billing Counter Cash Registers ({terminals.length})
                </h3>
                <p className="text-[11px] text-slate-400">Define n active billing counters & assign each counter to a store branch</p>
              </div>
            </div>

            {/* List of Billing Counters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {terminals.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-start justify-between space-x-3 shadow-md hover:border-slate-700 transition"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white">{t.name}</span>
                    </div>
                    <p className="text-slate-400 text-[11px] font-mono">Code: {t.code}</p>
                    <p className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                      🏢 {t.branch_name || 'Main Flagship'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteTerminal(t.id)}
                    className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition shrink-0"
                    title="Delete Billing Counter"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Form to Add New Billing Counter Terminal */}
            <form onSubmit={handleAddTerminal} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3 text-xs">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-400" /> Add New Billing Counter Terminal
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Counter Name (e.g. Counter #04 - Express Checkout)"
                  value={newTerminal.name}
                  onChange={(e) => setNewTerminal({ ...newTerminal, name: e.target.value })}
                  className="p-2.5 rounded-xl glass-input text-white"
                />
                <input
                  type="text"
                  placeholder="Counter Code (e.g. TERM-04)"
                  value={newTerminal.code}
                  onChange={(e) => setNewTerminal({ ...newTerminal, code: e.target.value })}
                  className="p-2.5 rounded-xl glass-input text-white font-mono"
                />
                <select
                  value={newTerminal.branch_name}
                  onChange={(e) => setNewTerminal({ ...newTerminal, branch_name: e.target.value })}
                  className="p-2.5 rounded-xl glass-input text-white bg-slate-900 font-medium"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.name}>
                      🏢 {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
              >
                <Plus className="w-4 h-4" /> Save Billing Counter
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Professional Themes */}
      {activeTab === 'THEMES' && (
        <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-6">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" /> Professional UI Themes
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select a theme to instantly re-skin the software for a high-end, customized enterprise appearance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableThemes.map((themeItem) => {
              const isSelected = activeTheme === themeItem.id;
              return (
                <div
                  key={themeItem.id}
                  onClick={() => handleSelectTheme(themeItem.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all duration-300 border flex flex-col justify-between space-y-4 ${
                    isSelected
                      ? 'bg-slate-900 border-blue-500 shadow-xl shadow-blue-500/20 ring-2 ring-blue-500/50 scale-[1.02]'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="space-y-2">
                    {/* Visual Color Bar */}
                    <div className={`h-16 rounded-xl bg-gradient-to-r ${themeItem.previewGradient} p-3 flex items-end justify-between shadow-inner`}>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/40 backdrop-blur-sm text-white">
                        {themeItem.isDark ? 'Dark Theme' : 'Light Mode'}
                      </span>
                      {isSelected && (
                        <span className="w-6 h-6 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold shadow">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {themeItem.name}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">{themeItem.subtitle}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {isSelected ? '✓ Active Theme' : 'Apply Theme'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Admin Profile & Password */}
      {activeTab === 'PROFILE' && (
        <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-6">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" /> Admin Account Credentials
            </h2>
            <p className="text-xs text-slate-400 mt-1">Change Admin Name, Email address, or default system login password</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1.5">Admin Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1.5">Admin Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-white font-medium"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" /> Update Password (Optional)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={profileForm.new_password}
                    onChange={(e) => setProfileForm({ ...profileForm, new_password: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Re-type new password"
                    value={profileForm.confirm_password}
                    onChange={(e) => setProfileForm({ ...profileForm, confirm_password: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSavingProfile ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 4: Gmail SMTP & API Credentials */}
      {activeTab === 'SMTP' && (
        <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-6">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" /> Gmail SMTP & API Integration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure Gmail account & App Password so 3xBills can automatically send email invoices, stock alerts, and financial reports.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              💡 How to get a Gmail App Password:
            </p>
            <ol className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
              <li>Go to your Google Account (<strong className="text-white">myaccount.google.com</strong>) &rarr; Security.</li>
              <li>Ensure <strong className="text-white">2-Step Verification</strong> is enabled.</li>
              <li>Search for <strong className="text-white">"App Passwords"</strong>, create a password for "3xBills Supermarket", and paste the 16-character code below.</li>
            </ol>
          </div>

          <form onSubmit={handleSaveSmtp} className="space-y-4 text-xs max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Gmail / Sender Email</label>
                <input
                  type="email"
                  required
                  placeholder="yourstore@gmail.com"
                  value={smtpForm.smtp_user}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-white font-medium"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Gmail App Password / API Key</label>
                <input
                  type="password"
                  required
                  placeholder="xxxx xxxx xxxx xxxx"
                  value={smtpForm.smtp_password}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">SMTP Server Host</label>
                <input
                  type="text"
                  required
                  value={smtpForm.smtp_host}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">SMTP Port</label>
                <input
                  type="number"
                  required
                  value={smtpForm.smtp_port}
                  onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: parseInt(e.target.value) || 587 })}
                  className="w-full p-2.5 rounded-xl glass-input"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Recipient Alert Email (Admin Report Receiver)</label>
              <input
                type="email"
                required
                placeholder="admin@yourcompany.com"
                value={smtpForm.admin_notify_email}
                onChange={(e) => setSmtpForm({ ...smtpForm, admin_notify_email: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input text-white font-medium"
              />
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                type="submit"
                disabled={isSavingSmtp}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg transition"
              >
                <Save className="w-4 h-4" /> {isSavingSmtp ? 'Saving Settings...' : 'Save SMTP Credentials'}
              </button>
            </div>
          </form>

          {/* Test Connection Box */}
          <div className="pt-5 border-t border-slate-800 space-y-3 max-w-2xl">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-400" /> Test Gmail SMTP Dispatch Connection
            </h3>

            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Recipient email for test..."
                value={testEmailAddr}
                onChange={(e) => setTestEmailAddr(e.target.value)}
                className="flex-1 p-2.5 rounded-xl glass-input text-xs"
              />

              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isTestingEmail}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition whitespace-nowrap shadow"
              >
                <Send className="w-3.5 h-3.5" /> {isTestingEmail ? 'Sending Test...' : '🧪 Send Test Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Alerts & Periodic Email Reports */}
      {activeTab === 'AUTOMATION' && (
        <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-6">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" /> Email Notifications & Automated Periodic Reports
            </h2>
            <p className="text-xs text-slate-400 mt-1">Configure automated stock warnings and scheduled PDF financial reports</p>
          </div>

          <div className="space-y-4 text-xs max-w-2xl">
            {/* Low Stock Alert Email Toggle */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Low Stock Warning Email Alerts
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Send instant email warning when any product drops below minimum stock level</p>
              </div>

              <input
                type="checkbox"
                checked={smtpForm.enable_low_stock_alerts}
                onChange={(e) => setSmtpForm({ ...smtpForm, enable_low_stock_alerts: e.target.checked })}
                className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950 cursor-pointer"
              />
            </div>

            {/* Periodic Financial Reports Toggle */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" /> Automated Periodic Sales & Stock Reports
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Email summary PDF reports containing sales revenue and stock counts</p>
              </div>

              <input
                type="checkbox"
                checked={smtpForm.enable_periodic_reports}
                onChange={(e) => setSmtpForm({ ...smtpForm, enable_periodic_reports: e.target.checked })}
                className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-950 cursor-pointer"
              />
            </div>

            {/* Report Frequency Selection */}
            <div>
              <label className="text-slate-300 font-bold block mb-1">Report Schedule Frequency</label>
              <select
                value={smtpForm.report_frequency}
                onChange={(e) => setSmtpForm({ ...smtpForm, report_frequency: e.target.value })}
                className="w-full p-2.5 rounded-xl glass-input text-white bg-slate-900 font-medium"
              >
                <option value="DAILY">📅 Daily Reports (Every Night at Midnight)</option>
                <option value="WEEKLY">🗓️ Weekly Reports (Every Sunday Evening)</option>
                <option value="MONTHLY">📊 Monthly Reports (1st of Every Month)</option>
              </select>
            </div>

            <button
              onClick={handleSaveSmtp}
              disabled={isSavingSmtp}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
            >
              Save Automation Preferences
            </button>

            {/* Instant Trigger Section */}
            <div className="pt-5 border-t border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" /> Instant Manual Report Email Dispatch
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="p-2.5 rounded-xl glass-input text-xs text-white bg-slate-900 font-medium"
                >
                  <option value="WEEKLY">Weekly Performance Report</option>
                  <option value="MONTHLY">Monthly Performance Report</option>
                  <option value="ALL_TIME">All-Time Cumulative Report</option>
                </select>

                <button
                  type="button"
                  onClick={handleSendReportNow}
                  disabled={isSendingReport}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <Send className="w-3.5 h-3.5" /> {isSendingReport ? 'Generating & Sending...' : '📧 Send Email Report Now'}
                </button>

                <button
                  type="button"
                  onClick={handleSendLowStockAlertNow}
                  disabled={isSendingAlert}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> {isSendingAlert ? 'Dispatching...' : '⚠️ Email Low Stock Alert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;
