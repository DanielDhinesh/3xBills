import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Mail, MessageSquare, CheckCircle, Sparkles } from 'lucide-react';
import { createCampaign, getCampaigns } from '../services/api';

const Marketing = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState('EMAIL');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await getCampaigns();
      setCampaigns(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    try {
      await createCampaign({
        title,
        message_content: content,
        channel
      });
      setTitle('');
      setContent('');
      fetchCampaigns();
      alert('Marketing Campaign Broadcast Launched Successfully!');
    } catch (err) {
      alert('Error launching campaign');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="page-container space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-blue-400" /> Customer Marketing & Bulk Automation
        </h1>
        <p className="text-xs text-slate-400 mt-1">Send latest offers, discount vouchers, and stock arrival alerts to customers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Campaign Launcher Form */}
        <div className="lg:col-span-5 p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Launch Bulk Announcement
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Campaign Title / Subject</label>
              <input
                type="text"
                required
                placeholder="e.g. Special Weekend Sale 20% Off!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 rounded-xl glass-input"
              />
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Channel Dispatcher</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full p-2.5 rounded-xl glass-input bg-slate-900 text-white"
              >
                <option value="EMAIL">Email Dispatcher (SMTP)</option>
                <option value="WHATSAPP">WhatsApp Direct Link Broadcast</option>
                <option value="BOTH">Omnichannel (Email + WhatsApp)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold mb-1 block">Message Body Content</label>
              <textarea
                required
                rows={4}
                placeholder="Write your promotional offer details here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2.5 rounded-xl glass-input"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-white shadow-lg shadow-blue-600/25 transition flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> {isSending ? 'Broadcasting...' : 'Broadcast to All Customers'}
            </button>
          </form>
        </div>

        {/* Campaign History */}
        <div className="lg:col-span-7 p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white">Broadcast History</h2>

          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{c.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {c.channel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">{c.message_content}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>Dispatched to {c.target_count} customers</span>
                  <span>{new Date(c.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketing;
