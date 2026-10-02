import React, { useState, useEffect } from 'react';
import { Database, Download, Mail, RefreshCw, CheckCircle2, Clock, Trash2, FileCode } from 'lucide-react';
import { triggerBackup, getBackupLogs } from '../services/api';

const BackupsPage = () => {
  const [logs, setLogs] = useState([]);
  const [isBackingUp, setIsBackingUp] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await getBackupLogs();
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await triggerBackup();
      fetchLogs();
      alert(`Database dump exported successfully! Filename: ${res.data.details.filename}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'Error triggering backup');
    } fontFinally: {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="page-container space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-400" /> Automated Database Backups & 10-Day Retention
          </h1>
          <p className="text-xs text-slate-400 mt-1">Export full database SQL dumps, auto-send to Admin Email, and purge files older than 10 days</p>
        </div>

        <button
          onClick={handleManualBackup}
          disabled={isBackingUp}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
          {isBackingUp ? 'Exporting & Emailing Dump...' : 'Trigger Immediate DB Backup'}
        </button>
      </div>

      {/* Backup Logs Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Recent Database Backup History Logs</h2>
          <span className="text-xs text-slate-400 font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20">
            10-Day Auto Retention Active
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
            <tr>
              <th className="p-4">Backup Filename</th>
              <th className="p-4">File Size</th>
              <th className="p-4">Execution Time</th>
              <th className="p-4">Admin Email Dispatch</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-4 font-mono font-bold text-blue-400 flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-slate-400" />
                    {log.filename}
                  </td>
                  <td className="p-4 text-slate-300">{(log.filesize_bytes / 1024).toFixed(2)} KB</td>
                  <td className="p-4 text-slate-400">{new Date(log.backup_time).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      log.emailed_to_admin ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {log.emailed_to_admin ? 'EMAILED TO ADMIN' : 'LOCAL SAVED'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <a
                      href={`http://localhost:8001/api/v1/backups/download/${log.filename}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition font-bold text-xs inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download SQL
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No backup logs yet. Click "Trigger Immediate DB Backup" above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BackupsPage;
