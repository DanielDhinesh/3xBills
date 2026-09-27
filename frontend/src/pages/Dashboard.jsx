import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle, 
  Receipt, 
  ShieldCheck,
  PackageCheck,
  Sparkles,
  Layers,
  Calendar,
  Download,
  Filter,
  PieChart,
  Percent,
  CreditCard,
  QrCode,
  FileSpreadsheet,
  UserCheck,
  BadgeDollarSign
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart as RePieChart, Pie, Cell } from 'recharts';
import MetricCard from '../components/MetricCard';
import { 
  getDashboardKPIs, 
  getSalesChartData, 
  getTopProducts, 
  getMonthlyReports, 
  getPaymentBreakdown,
  getCashierPerformance,
  getFinancialReportExportUrl 
} from '../services/api';

const Dashboard = () => {
  const [timeframe, setTimeframe] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [kpi, setKpi] = useState({
    total_revenue: '0.00',
    net_profit: '0.00',
    cogs: '0.00',
    total_inventory_cost: '0.00',
    avg_order_value: '0.00',
    profit_margin_percentage: '0.00',
    total_invoices: 0,
    low_stock_count: 0,
    tax_collected: '0.00',
    active_license_status: 'Checking...',
    days_left_license: 30
  });

  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [monthlyReports, setMonthlyReports] = useState([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState([]);
  const [cashierLogs, setCashierLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timeframe quick filter logic
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
    } else if (tf === 'LAST_30') {
      const d30 = new Date();
      d30.setDate(today.getDate() - 30);
      setStartDate(formatDate(d30));
      setEndDate(formatDate(today));
    } else if (tf === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      getDashboardKPIs(startDate, endDate),
      getSalesChartData(startDate, endDate),
      getTopProducts(startDate, endDate),
      getMonthlyReports(),
      getPaymentBreakdown(startDate, endDate),
      getCashierPerformance(startDate, endDate)
    ])
      .then(([kpiRes, chartRes, topRes, monthRes, payRes, cashierRes]) => {
        setKpi(kpiRes.data);
        setChartData(chartRes.data);
        setTopProducts(topRes.data);
        setMonthlyReports(monthRes.data);
        setPaymentBreakdown(payRes.data);
        setCashierLogs(cashierRes.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="p-6 space-y-6">
      {/* Header & Timeframe Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Executive Financial Dashboard <Sparkles className="w-5 h-5 text-blue-400" />
          </h1>
          <p className="text-xs text-slate-400 mt-1">Real-time Retail Analytics, Cashier Audit Logs, Profit & Loss (P&L) & Financial Statements</p>
        </div>

        {/* Action Controls & Report Export */}
        <div className="flex items-center gap-2">
          <a
            href={getFinancialReportExportUrl(startDate, endDate)}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
          >
            <Download className="w-4 h-4" /> Export Financial PDF Statement
          </a>
        </div>
      </div>

      {/* Timeframe Filter Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { key: 'ALL', label: 'All Time' },
            { key: 'TODAY', label: 'Today' },
            { key: 'LAST_7', label: 'Last 7 Days' },
            { key: 'THIS_MONTH', label: 'This Month' },
            { key: 'LAST_30', label: 'Last 30 Days' },
            { key: 'CUSTOM', label: 'Custom Range' },
          ].map((tf) => (
            <button
              key={tf.key}
              onClick={() => handleTimeframeChange(tf.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                timeframe === tf.key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setTimeframe('CUSTOM'); }}
              className="bg-transparent text-white font-bold outline-none cursor-pointer text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
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

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3 sm:gap-4">
        <MetricCard
          title="Gross Revenue"
          value={`$${parseFloat(kpi.total_revenue).toFixed(2)}`}
          icon={DollarSign}
          color="blue"
          subtitle="Total Sales Income"
        />
        <MetricCard
          title="Net Profit"
          value={`$${parseFloat(kpi.net_profit).toFixed(2)}`}
          icon={TrendingUp}
          color="emerald"
          subtitle={`Margin: ${parseFloat(kpi.profit_margin_percentage).toFixed(1)}%`}
        />
        <MetricCard
          title="Total Inventory Cost"
          value={`$${parseFloat(kpi.total_inventory_cost || 0).toFixed(2)}`}
          icon={PackageCheck}
          color="indigo"
          subtitle="Stock Valuation (Cost)"
        />
        <MetricCard
          title="Cost of Goods (COGS)"
          value={`$${parseFloat(kpi.cogs).toFixed(2)}`}
          icon={Receipt}
          color="amber"
          subtitle="Sold Products Cost"
        />
        <MetricCard
          title="Avg Order Value (AOV)"
          value={`$${parseFloat(kpi.avg_order_value).toFixed(2)}`}
          icon={Percent}
          color="purple"
          subtitle="Revenue per transaction"
        />
        <MetricCard
          title="Total Orders"
          value={kpi.total_invoices}
          icon={ShoppingCart}
          color="blue"
          subtitle="Completed sales"
        />
        <MetricCard
          title="Low Stock Alerts"
          value={kpi.low_stock_count}
          icon={AlertTriangle}
          color={kpi.low_stock_count > 0 ? "rose" : "emerald"}
          subtitle="Reorder limit warning"
        />
      </div>

      {/* Cashier Audit Logs Section */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Cashier Sales Audit Logs & Register Performance
            </h2>
            <p className="text-xs text-slate-400">Track individual cashier sales performance, total orders processed, and average ticket size</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cashierLogs.map((c) => (
            <div key={c.cashier_id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/20">
                  {c.full_name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{c.full_name}</h4>
                  <p className="text-[10px] text-slate-400">{c.role} • {c.total_invoices} orders</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-black text-emerald-400">${parseFloat(c.total_sales).toFixed(2)}</p>
                <p className="text-[10px] text-slate-400">Avg: ${parseFloat(c.avg_sale_value).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue & Net Profit Trend Timeline Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-6 rounded-2xl glass-card border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Revenue vs Profit Financial Timeline
              </h2>
              <p className="text-xs text-slate-400">Daily financial trajectory for selected timeframe</p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : [
                { date: '2026-09-20', sales: 1200, profit: 450 },
                { date: '2026-09-21', sales: 1850, profit: 720 },
                { date: '2026-09-22', sales: 1400, profit: 510 },
                { date: '2026-09-23', sales: 2200, profit: 890 },
                { date: '2026-09-24', sales: 2900, profit: 1150 },
                { date: '2026-09-25', sales: 2400, profit: 980 },
                { date: '2026-09-26', sales: 3100, profit: 1300 },
              ]}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="sales" name="Gross Revenue ($)" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="profit" name="Net Profit ($)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution Widget */}
        <div className="lg:col-span-4 p-6 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" /> Payment Distribution
            </h2>
            <p className="text-xs text-slate-400 mb-4">Breakdown by cash, UPI QR & cards</p>

            <div className="space-y-3">
              {paymentBreakdown.map((pm, idx) => (
                <div key={pm.payment_method} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <div>
                      <p className="text-xs font-bold text-white">{pm.payment_method}</p>
                      <p className="text-[10px] text-slate-400">{pm.transaction_count} transactions</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-blue-400">${parseFloat(pm.total_amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Wise Breakdown Financial Table */}
      <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-400" /> Month-by-Month Financial Performance Report
            </h2>
            <p className="text-xs text-slate-400">Monthly breakdown of revenue, COGS, net profit, tax, and order metrics</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="p-3.5">Month Period</th>
                <th className="p-3.5">Gross Revenue</th>
                <th className="p-3.5">Cost of Goods (COGS)</th>
                <th className="p-3.5">Net Profit</th>
                <th className="p-3.5">Tax Collected</th>
                <th className="p-3.5">Total Orders</th>
                <th className="p-3.5 text-right">Avg Order Value (AOV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {monthlyReports.length > 0 ? (
                monthlyReports.map((row) => (
                  <tr key={row.month_str} className="hover:bg-slate-900/40 transition">
                    <td className="p-3.5 font-bold font-mono text-blue-400">{row.month_str}</td>
                    <td className="p-3.5 font-bold text-white">${parseFloat(row.gross_revenue).toFixed(2)}</td>
                    <td className="p-3.5 text-amber-400">${parseFloat(row.cogs).toFixed(2)}</td>
                    <td className="p-3.5 font-bold text-emerald-400">${parseFloat(row.net_profit).toFixed(2)}</td>
                    <td className="p-3.5 text-slate-300">${parseFloat(row.tax_collected).toFixed(2)}</td>
                    <td className="p-3.5 text-slate-300">{row.total_invoices}</td>
                    <td className="p-3.5 text-right font-bold text-purple-300">${parseFloat(row.avg_order_value).toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    No monthly records generated yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
