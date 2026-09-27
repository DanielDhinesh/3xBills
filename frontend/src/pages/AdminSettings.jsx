import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, User, Mail, Lock, Key, Server, Send, Bell, FileText, CheckCircle2, AlertTriangle, Save, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  updateUserProfile, getSystemSettings, updateSystemSettings, testEmailConnection, sendEmailReport, sendLowStockAlertEmail 
} from '../services/api';

const AdminSettings = () => {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('PROFILE'); // 'PROFILE' | 'SMTP' | 'AUTOMATION'

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
      if (res.data.admin_notify_email) {
        setTestEmailAddr(res.data.admin_notify_email);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
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
      const res = await updateSystemSettings(smtpForm);
      alert(res.data.message || 'SMTP settings saved!');
      fetchSettings();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving SMTP settings');
    } finally {
      setIsSavingSmtp(false);
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

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-400" /> Admin Control Panel & Email Automation
        </h1>
        <p className="text-xs text-slate-400 mt-1">Manage Admin Credentials, Gmail SMTP Setup, Low Stock Alerts & Scheduled Reports</p>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'PROFILE'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <User className="w-4 h-4" /> Admin Profile & Password
        </button>

        <button
          onClick={() => setActiveTab('SMTP')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'SMTP'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Server className="w-4 h-4" /> Gmail SMTP & API Settings
        </button>

        <button
          onClick={() => setActiveTab('AUTOMATION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'AUTOMATION'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Bell className="w-4 h-4" /> Alerts & Periodic Reports
        </button>
      </div>

      {/* TAB 1: Admin Profile & Password */}
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

      {/* TAB 2: Gmail SMTP & API Credentials */}
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

      {/* TAB 3: Alerts & Periodic Email Reports */}
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
