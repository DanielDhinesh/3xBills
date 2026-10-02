import React, { useState, useEffect } from 'react';
import { 
  Banknote,
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
  UserCheck
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart as RePieChart, Pie, Cell } from 'recharts';
import MetricCard from '../components/MetricCard';
import { useCompany } from '../context/CompanyContext';
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
  const { formatCurrency, currencySymbol } = useCompany();
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
    <div className="p-4 sm:p-5 xl:p-6 space-y-5 xl:space-y-6 max-w-screen-2xl mx-auto w-full">
      {/* Header & Timeframe Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 xl:gap-4">
        <div>
          <h1 className="text-xl xl:text-2xl font-black app-text-primary tracking-tight flex items-center gap-2">
            Executive Financial Dashboard <Sparkles className="w-5 h-5 text-blue-500" />
          </h1>
          <p className="text-xs app-text-muted mt-1">Real-time Retail Analytics, Cashier Audit Logs, Profit &amp; Loss (P&amp;L) &amp; Financial Statements</p>
        </div>

        {/* Action Controls & Report Export */}
        <div className="flex items-center gap-2">
          <a
            href={getFinancialReportExportUrl(startDate, endDate)}
            target="_blank"
            rel="noreferrer"
            className="px-3 xl:px-4 py-2 xl:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> Export Financial PDF Statement
          </a>
        </div>
      </div>

      {/* Timeframe Filter Bar */}
      <div className="p-3 xl:p-4 rounded-2xl glass-card border app-border flex flex-wrap items-center justify-between gap-3">
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
                  : 'app-card-inner border app-border app-text-muted hover:app-text-primary'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Custom Date Pickers */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 app-card-inner px-3 py-1.5 rounded-xl border app-border text-xs">
            <Calendar className="w-3.5 h-3.5 app-text-muted" />
            <span className="app-text-muted">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setTimeframe('CUSTOM'); }}
              className="bg-transparent app-text-primary font-bold outline-none cursor-pointer text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 app-card-inner px-3 py-1.5 rounded-xl border app-border text-xs">
            <Calendar className="w-3.5 h-3.5 app-text-muted" />
            <span className="app-text-muted">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setTimeframe('CUSTOM'); }}
              className="bg-transparent app-text-primary font-bold outline-none cursor-pointer text-xs"
            />
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-7 gap-3 xl:gap-4">
        <MetricCard
          title="Gross Revenue"
          value={formatCurrency(kpi.total_revenue)}
          icon={Banknote}
          color="blue"
          subtitle="Total Sales Income"
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(kpi.net_profit)}
          icon={TrendingUp}
          color="emerald"
          subtitle={`Margin: ${parseFloat(kpi.profit_margin_percentage).toFixed(1)}%`}
        />
        <MetricCard
          title="Total Inventory Cost"
          value={formatCurrency(kpi.total_inventory_cost || 0)}
          icon={PackageCheck}
          color="indigo"
          subtitle="Stock Valuation (Cost)"
        />
        <MetricCard
          title="Cost of Goods (COGS)"
          value={formatCurrency(kpi.cogs)}
          icon={Receipt}
          color="amber"
          subtitle="Sold Products Cost"
        />
        <MetricCard
          title="Avg Order Value (AOV)"
          value={formatCurrency(kpi.avg_order_value)}
          icon={Percent}
          color="purple"
          subtitle="Revenue per transaction"
        />
        <MetricCard
          title="Total Invoices"
          value={kpi.total_invoices}
          icon={CreditCard}
          color="blue"
          subtitle="Bills processed"
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
      <div className="p-4 xl:p-6 rounded-2xl glass-card border app-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm xl:text-base font-bold app-text-primary flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500" /> Cashier Sales Audit Logs &amp; Register Performance
            </h2>
            <p className="text-xs app-text-muted">Track individual cashier sales performance, total orders processed, and average ticket size</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {cashierLogs.map((c) => (
            <div key={c.cashier_id} className="p-3 xl:p-4 rounded-xl app-card-inner border app-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 font-bold flex items-center justify-center text-xs border border-indigo-500/20">
                  {c.full_name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold app-text-primary">{c.full_name}</h4>
                  <p className="text-[10px] app-text-muted">{c.role} • {c.total_invoices} orders</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-black text-emerald-500">{formatCurrency(c.total_sales)}</p>
                <p className="text-[10px] app-text-muted">Avg: {formatCurrency(c.avg_sale_value)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue & Net Profit Trend Timeline Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6">
        <div className="lg:col-span-8 p-4 xl:p-6 rounded-2xl glass-card border app-border">
          <div className="flex items-center justify-between mb-4 xl:mb-6">
            <div>
              <h2 className="text-sm xl:text-base font-bold app-text-primary flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue vs Profit Financial Timeline
              </h2>
              <p className="text-xs app-text-muted">Daily financial trajectory for selected timeframe</p>
            </div>
          </div>

          <div className="h-56 xl:h-72">
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
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-card-border)" />
                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--bg-card-border)', borderRadius: '12px', color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="sales" name={`Gross Revenue (${currencySymbol})`} stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="profit" name={`Net Profit (${currencySymbol})`} stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution Widget */}
        <div className="lg:col-span-4 p-4 xl:p-6 rounded-2xl glass-card border app-border flex flex-col justify-between">
          <div>
            <h2 className="text-sm xl:text-base font-bold app-text-primary mb-1 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-500" /> Payment Distribution
            </h2>
            <p className="text-xs app-text-muted mb-4">Breakdown by cash, UPI QR &amp; cards</p>

            <div className="space-y-3">
              {paymentBreakdown.map((pm, idx) => (
                <div key={pm.payment_method} className="p-3 rounded-xl app-card-inner border app-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <div>
                      <p className="text-xs font-bold app-text-primary">{pm.payment_method}</p>
                      <p className="text-[10px] app-text-muted">{pm.transaction_count} transactions</p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-blue-500">{formatCurrency(pm.total_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Wise Breakdown Financial Table */}
      <div className="p-4 xl:p-6 rounded-2xl glass-card border app-border space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm xl:text-base font-bold app-text-primary flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-purple-500" /> Month-by-Month Financial Performance Report
            </h2>
            <p className="text-xs app-text-muted">Monthly breakdown of revenue, COGS, net profit, tax, and order metrics</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border app-border">
          <table className="w-full text-left text-xs min-w-[600px]">
            <thead className="app-table-header uppercase font-semibold">
              <tr>
                <th className="p-3 xl:p-3.5">Month Period</th>
                <th className="p-3 xl:p-3.5">Gross Revenue</th>
                <th className="p-3 xl:p-3.5">Cost of Goods (COGS)</th>
                <th className="p-3 xl:p-3.5">Net Profit</th>
                <th className="p-3 xl:p-3.5">Tax Collected</th>
                <th className="p-3 xl:p-3.5">Total Orders</th>
                <th className="p-3 xl:p-3.5 text-right">Avg Order Value (AOV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-medium">
              {monthlyReports.length > 0 ? (
                monthlyReports.map((row) => (
                  <tr key={row.month_str} className="app-table-row transition">
                    <td className="p-3 xl:p-3.5 font-bold font-mono text-blue-500">{row.month_str}</td>
                    <td className="p-3 xl:p-3.5 font-bold app-text-primary">{formatCurrency(row.gross_revenue)}</td>
                    <td className="p-3 xl:p-3.5 text-amber-500">{formatCurrency(row.cogs)}</td>
                    <td className="p-3 xl:p-3.5 font-bold text-emerald-500">{formatCurrency(row.net_profit)}</td>
                    <td className="p-3 xl:p-3.5 app-text-secondary">{formatCurrency(row.tax_collected)}</td>
                    <td className="p-3 xl:p-3.5 app-text-secondary">{row.total_invoices}</td>
                    <td className="p-3 xl:p-3.5 text-right font-bold text-purple-400">{formatCurrency(row.avg_order_value)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-6 text-center app-text-muted">
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
