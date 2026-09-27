import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, Lock, ShieldCheck, UserCheck, ArrowRight, Store, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'CASHIER') {
        navigate('/pos');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white mx-auto shadow-xl shadow-blue-500/25">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">NextGen SaaS Billing & POS</h1>
          <p className="text-xs text-slate-400">Select Role Account or Enter Credentials to Access Terminal</p>
        </div>

        {/* Login Card */}
        <div className="p-6 rounded-3xl glass-card border border-slate-800 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@shopbilling.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-medium text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-medium text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : (
                <>
                  Sign In to Terminal <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="border-t border-slate-800/80 pt-4 space-y-2.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
              ⚡ Quick Demo Role Accounts
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@shopbilling.com', 'admin123')}
                className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    ADMIN
                  </span>
                  <UserCheck className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition" />
                </div>
                <p className="text-xs font-bold text-white">Store Manager</p>
                <p className="text-[10px] text-slate-400 truncate">admin@shopbilling.com</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('cashier@shopbilling.com', 'cashier123')}
                className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 text-left transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    CASHIER
                  </span>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
                </div>
                <p className="text-xs font-bold text-white">Sarah Connor</p>
                <p className="text-[10px] text-slate-400 truncate">cashier@shopbilling.com</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-center text-slate-500">
          🔒 Secure Role-Based Authentication (JWT Token Encrypted)
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
