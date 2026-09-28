import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Share2, 
  Search, 
  Clock, 
  RefreshCw, 
  Printer, 
  CheckCircle2,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  CreditCard,
  QrCode,
  UserCheck,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { getInvoices, getPdfDownloadUrl, regenerateInvoiceBill } from '../services/api';
import { useCompany } from '../context/CompanyContext';

const InvoicesList = () => {
  const { formatCurrency } = useCompany();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  
  // Filter & Sort States
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [cashierFilter, setCashierFilter] = useState('ALL');
  const [timeframe, setTimeframe] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Column Sorting State: default to Newest Date First
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const [regeneratedModal, setRegeneratedModal] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await getInvoices();
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRegenerateBill = async (invoiceId) => {
    setIsRegenerating(true);
    try {
      const res = await regenerateInvoiceBill(invoiceId);
      setRegeneratedModal(res.data);
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error regenerating invoice bill');
    } finally {
      setIsRegenerating(false);
    }
  };

  // Quick Timeframe Filter Handler
  const handleTimeframeChange = (tf) => {
    setTimeframe(tf);
    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    if (tf === 'TODAY') {
      setStartDate(formatDate(today));
      setEndDate(formatDate(today));
    } else if (tf === 'LAST_7') {
      const d7 = new Date();
      d7.setDate(today.getDate() - 7);
      setStartDate(formatDate(d7));
      setEndDate(formatDate(today));
    } else if (tf === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (tf === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setPaymentFilter('ALL');
    setCashierFilter('ALL');
    setTimeframe('ALL');
    setStartDate('');
    setEndDate('');
    setSortField('created_at');
    setSortOrder('desc');
  };

  // Handle Header Click Sorting
  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'created_at' || field === 'grand_total' || field === 'profit_margin' ? 'desc' : 'asc');
    }
  };

  // Extract unique cashier names for dropdown
  const uniqueCashiers = Array.from(
    new Set(invoices.map((inv) => inv.cashier_name || 'System Store'))
  ).filter(Boolean);

  // Apply Search, Filters, and Sorting
  const filteredInvoices = invoices
    .filter((inv) => {
      const matchesSearch =
        inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (inv.customer_name && inv.customer_name.toLowerCase().includes(search.toLowerCase())) ||
        (inv.customer_phone && inv.customer_phone.includes(search));

      const matchesPayment = paymentFilter === 'ALL' || inv.payment_method === paymentFilter;
      const cashierName = inv.cashier_name || 'System Store';
      const matchesCashier = cashierFilter === 'ALL' || cashierName === cashierFilter;

      const invDateStr = inv.created_at.split('T')[0];
      let matchesStartDate = true;
      let matchesEndDate = true;

      if (startDate) matchesStartDate = invDateStr >= startDate;
      if (endDate) matchesEndDate = invDateStr <= endDate;

      return matchesSearch && matchesPayment && matchesCashier && matchesStartDate && matchesEndDate;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'created_at') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (sortField === 'grand_total' || sortField === 'profit_margin') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Calculate Summary Metrics for Filtered Results
  const totalFilteredRevenue = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.grand_total), 0);
  const totalFilteredProfit = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.profit_margin), 0);
  const totalFilteredTax = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.tax_total), 0);

  // Helper component for sortable column header
  const SortableTh = ({ field, label, align = 'left' }) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSortClick(field)} 
        className={`p-4 cursor-pointer select-none transition hover:text-white ${align === 'right' ? 'text-right' : ''}`}
        title={`Click to sort by ${label}`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''} ${isSorted ? 'text-blue-400 font-black' : ''}`}>
          <span>{label}</span>
          {isSorted ? (
            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60 hover:opacity-100" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" /> Bill History & Lost Bill Regeneration
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Click any table header name to sort invoices, or filter by payment method, cashier, and date
          </p>
        </div>
      </div>

      {/* Summary Metrics Bar for Filtered Selection */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Bills Found</p>
            <p className="text-base sm:text-lg font-black text-white">{filteredInvoices.length}</p>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Total Sales</p>
            <p className="text-base sm:text-lg font-black text-emerald-400">{formatCurrency(totalFilteredRevenue)}</p>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Net Profit</p>
            <p className="text-base sm:text-lg font-black text-indigo-400">{formatCurrency(totalFilteredProfit)}</p>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tax Collected</p>
            <p className="text-base sm:text-lg font-black text-amber-400">{formatCurrency(totalFilteredTax)}</p>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Invoice Table with Integrated Seamless Toolbar Header */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden">
        {/* Seamless Integrated Header Bar */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search invoice #, customer name, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl glass-input text-xs text-white bg-slate-900 font-medium border border-slate-800"
              >
                <option value="ALL">All Payments</option>
                <option value="UPI_QR">Payment QR (UPI)</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="CREDIT">Credit</option>
              </select>

              <select
                value={cashierFilter}
                onChange={(e) => setCashierFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl glass-input text-xs text-white bg-slate-900 font-medium border border-slate-800"
              >
                <option value="ALL">All Cashiers</option>
                {uniqueCashiers.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              {(search || paymentFilter !== 'ALL' || cashierFilter !== 'ALL' || timeframe !== 'ALL' || startDate || endDate) && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition"
                >
                  <RotateCcw className="w-3 h-3 text-blue-400" /> Reset
                </button>
              )}
            </div>
          </div>

          {/* Timeframe Quick Pills & Custom Date Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { key: 'ALL', label: 'All Time' },
                { key: 'TODAY', label: 'Today' },
                { key: 'LAST_7', label: 'Last 7 Days' },
                { key: 'THIS_MONTH', label: 'This Month' },
              ].map((tf) => (
                <button
                  key={tf.key}
                  onClick={() => handleTimeframeChange(tf.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    timeframe === tf.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setTimeframe('CUSTOM'); }}
                  className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setTimeframe('CUSTOM'); }}
                  className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Table with Header Column Click Sorting */}
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <SortableTh field="invoice_number" label="Invoice #" />
                <SortableTh field="created_at" label="Date & Time" />
                <th className="p-4">Customer Details</th>
                <th className="p-4">Cashier</th>
                <th className="p-4">Payment</th>
                <SortableTh field="grand_total" label="Grand Total" />
                <SortableTh field="profit_margin" label="Profit Margin" />
                <th className="p-4 text-right">Actions / Lost Bill Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-4 font-mono font-bold text-blue-400">{inv.invoice_number}</td>
                    <td className="p-4 text-slate-300">{new Date(inv.created_at).toLocaleString()}</td>
                    <td className="p-4">
                      <p className="font-bold text-white">{inv.customer_name || 'Walk-in Customer'}</p>
                      {inv.customer_phone && <p className="text-[10px] text-slate-400">{inv.customer_phone}</p>}
                    </td>
                    <td className="p-4 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                        {inv.cashier_name || 'System Store'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-bold text-slate-300">
                        {inv.payment_method}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-emerald-400">{formatCurrency(inv.grand_total)}</td>
                    <td className="p-4 text-slate-400">{formatCurrency(inv.profit_margin)}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {/* Regenerate Lost Bill Button */}
                      <button
                        onClick={() => handleRegenerateBill(inv.id)}
                        className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition flex items-center gap-1 font-bold text-xs border border-amber-500/20"
                        title="Regenerate missing or lost PDF receipt"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate Bill
                      </button>

                      <a
                        href={getPdfDownloadUrl(inv.pdf_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white transition flex items-center gap-1 font-bold"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>

                      {inv.whatsapp_share_url && (
                        <a
                          href={inv.whatsapp_share_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition flex items-center gap-1 font-bold"
                        >
                          <Share2 className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No bills match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regenerated Bill Success Preview Modal */}
      {regeneratedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Bill Regenerated Successfully!</h3>
              <p className="text-xs text-slate-400 mt-1">Invoice #{regeneratedModal.invoice_number} • {formatCurrency(regeneratedModal.grand_total)}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs text-left">
              <p className="text-slate-300">👤 <b>Customer:</b> {regeneratedModal.customer_name || 'Walk-in'}</p>
              <p className="text-slate-300">⭐ <b>Google Rating & UPI Payment QR Codes Embedded</b></p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={getPdfDownloadUrl(regeneratedModal.pdf_url)}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Re-Print PDF
              </a>

              {regeneratedModal.whatsapp_share_url ? (
                <a
                  href={regeneratedModal.whatsapp_share_url}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Resend WhatsApp
                </a>
              ) : (
                <button
                  disabled
                  className="py-3 px-4 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs"
                >
                  No Phone Number
                </button>
              )}
            </div>

            <button
              onClick={() => setRegeneratedModal(null)}
              className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesList;
