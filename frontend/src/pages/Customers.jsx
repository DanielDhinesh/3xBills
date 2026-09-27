import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  FileText, 
  Send, 
  Download, 
  Share2, 
  Printer, 
  CheckCircle2,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { 
  getCustomers, 
  createCustomer, 
  updateCustomer, 
  deleteCustomer, 
  getCustomerInvoices, 
  getPdfDownloadUrl,
  createCampaign
} from '../services/api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  // Direct Promo State
  const [promoCustomer, setPromoCustomer] = useState(null);
  const [promoMsg, setPromoMsg] = useState('');

  useEffect(() => {
    fetchCustomerList();
  }, [search]);

  const fetchCustomerList = async () => {
    try {
      const res = await getCustomers(search);
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, formData);
      } else {
        await createCustomer(formData);
      }
      setShowAddModal(false);
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', email: '', address: '' });
      fetchCustomerList();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error saving customer');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer record?')) {
      try {
        await deleteCustomer(id);
        fetchCustomerList();
      } catch (err) {
        alert('Error deleting customer');
      }
    }
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || ''
    });
    setShowAddModal(true);
  };

  const handleViewPurchaseHistory = async (customer) => {
    setSelectedHistoryCustomer(customer);
    setLoadingInvoices(true);
    try {
      const res = await getCustomerInvoices(customer.id);
      setCustomerInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const handleSendDirectPromo = async (e) => {
    e.preventDefault();
    if (!promoMsg) return;
    try {
      await createCampaign({
        title: `Special Offer for ${promoCustomer.name}`,
        message_content: promoMsg,
        channel: 'EMAIL'
      });
      alert(`Direct message sent to ${promoCustomer.name} successfully!`);
      setPromoCustomer(null);
      setPromoMsg('');
    } catch (err) {
      alert('Error sending message');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" /> Executable Customer Relationship Management (CRM)
          </h1>
          <p className="text-xs text-slate-400 mt-1">Customer directory, purchase history, profile editing & direct messaging</p>
        </div>

        <button
          onClick={() => {
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', email: '', address: '' });
            setShowAddModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
        >
          <Plus className="w-4 h-4" /> Add New Customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search customer by name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs"
          />
        </div>
      </div>

      {/* Customers Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="p-5 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
                    {c.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-snug">{c.name}</h3>
                    <p className="text-[10px] text-slate-400">Customer since {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-extrabold">
                  ${parseFloat(c.total_spent).toFixed(2)}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 pt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{c.phone}</span>
                </div>
                {c.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{c.email}</span>
                  </div>
                )}
                {c.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{c.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleViewPurchaseHistory(c)}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center justify-center gap-1"
              >
                <ShoppingBag className="w-3 h-3 text-blue-400" /> Orders
              </button>

              <button
                onClick={() => { setPromoCustomer(c); setPromoMsg(`Hello ${c.name}, special 15% off discount voucher for your next visit!`); }}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center justify-center gap-1"
              >
                <Send className="w-3 h-3 text-emerald-400" /> Promo
              </button>

              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Edit Customer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteCustomer(c.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-400 transition"
                  title="Delete Customer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">
              {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer to CRM'}
            </h3>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">WhatsApp Phone Number</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Email Address (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Address (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input"
                  placeholder="Street address..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {selectedHistoryCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">{selectedHistoryCustomer.name}'s Purchase History</h3>
                <p className="text-xs text-slate-400">Total Spent: ${parseFloat(selectedHistoryCustomer.total_spent).toFixed(2)}</p>
              </div>
              <button
                onClick={() => setSelectedHistoryCustomer(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
              {loadingInvoices ? (
                <p className="text-xs text-slate-400 py-6 text-center">Loading invoices...</p>
              ) : customerInvoices.length > 0 ? (
                customerInvoices.map((inv) => (
                  <div key={inv.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono font-bold text-blue-400">{inv.invoice_number}</p>
                      <p className="text-[10px] text-slate-400">{new Date(inv.created_at).toLocaleString()} • {inv.payment_method}</p>
                      <p className="text-xs font-bold text-white mt-1">${parseFloat(inv.grand_total).toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={getPdfDownloadUrl(inv.pdf_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white text-xs font-bold transition flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>

                      {inv.whatsapp_share_url && (
                        <a
                          href={inv.whatsapp_share_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white text-xs font-bold transition flex items-center gap-1"
                        >
                          <Share2 className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-6 text-center">No invoice transactions recorded for this customer yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Direct Promo Modal */}
      {promoCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">Send Message to {promoCustomer.name}</h3>
            <form onSubmit={handleSendDirectPromo} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Message Content</label>
                <textarea
                  rows={4}
                  required
                  value={promoMsg}
                  onChange={(e) => setPromoMsg(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setPromoCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Send Promo Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
