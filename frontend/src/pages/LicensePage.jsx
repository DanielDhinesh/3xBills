import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, Cpu, Copy, Check, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { getLicenseStatus, activateLicense, generateDemoKey } from '../services/api';

const LicensePage = () => {
  const [status, setStatus] = useState(null);
  const [inputKey, setInputKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLicense();
  }, []);

  const loadLicense = () => {
    getLicenseStatus()
      .then((res) => setStatus(res.data))
      .catch((err) => console.error(err));
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await activateLicense(inputKey);
      setStatus(res.data);
      setInputKey('');
      alert('License activated successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || 'License activation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDemoKey = async () => {
    try {
      const res = await generateDemoKey();
      setGeneratedKey(res.data.generated_license_key);
    } catch (err) {
      alert('Error generating demo key');
    }
  };

  const copyHWID = () => {
    if (status?.machine_id) {
      navigator.clipboard.writeText(status.machine_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Key className="w-6 h-6 text-blue-400" /> SaaS Subscription & Local Licensing Engine
        </h1>
        <p className="text-xs text-slate-400 mt-1">Hardware fingerprinting & cryptographically signed license manager</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Card */}
        <div className="lg:col-span-6 p-6 rounded-3xl glass-card border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">{status?.shop_name || 'Retail Store'}</h2>
                <p className="text-xs text-slate-400">{status?.message}</p>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-black">
              {status?.tier || 'TRIAL'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-slate-400 mb-1">Days Remaining</p>
              <p className="text-xl font-extrabold text-white">{status?.days_left ?? 30} Days</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-slate-400 mb-1">Expiration Date</p>
              <p className="text-base font-bold text-slate-200">{status?.expires || 'Valid'}</p>
            </div>
          </div>

          {/* Machine Hardware ID */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-blue-400" /> Machine Hardware ID Fingerprint
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={status?.machine_id || 'Computing...'}
                className="w-full font-mono text-xs text-blue-300 bg-transparent outline-none"
              />
              <button
                onClick={copyHWID}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* License Activation Form */}
        <div className="lg:col-span-6 p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Activate Subscription Key
          </h2>

          <form onSubmit={handleActivate} className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Paste RSA License Key Token</label>
              <textarea
                rows={4}
                required
                placeholder="Paste your base64 encrypted license key token here..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full p-3 rounded-xl glass-input font-mono text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-extrabold text-white text-xs shadow-lg shadow-blue-600/25 transition"
            >
              {loading ? 'Verifying Key...' : 'Activate Subscription'}
            </button>
          </form>

          {/* Outsourcing Utility Generator */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-300">Outsourcing & Software Vendor Tool</p>
                <p className="text-[10px] text-slate-500">Generate a signed demo key for local installation client</p>
              </div>
              <button
                onClick={handleGenerateDemoKey}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Generate Demo Key
              </button>
            </div>

            {generatedKey && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono break-all text-emerald-400 select-all">
                {generatedKey}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicensePage;
