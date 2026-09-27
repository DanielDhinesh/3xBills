import axios from 'axios';

const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer Token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      // Optional: Clear invalid token
      // localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export const getPdfDownloadUrl = (pdfUrl) => {
  if (!pdfUrl) return '#';
  if (pdfUrl.startsWith('http://') || pdfUrl.startsWith('https://')) return pdfUrl;
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:8000${pdfUrl}`;
};

export const getFinancialReportExportUrl = (startDate = '', endDate = '') => {
  const hostname = window.location.hostname || 'localhost';
  let url = `http://${hostname}:8000/api/v1/dashboard/export-report`;
  const params = [];
  if (startDate) params.push(`start_date=${encodeURIComponent(startDate)}`);
  if (endDate) params.push(`end_date=${encodeURIComponent(endDate)}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return url;
};

// Auth & User Management Endpoints
export const loginUser = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  return api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
};

export const getCurrentUser = () => api.get('/auth/me');
export const updateUserProfile = (profileData) => api.put('/auth/profile', profileData);

export const registerUser = (userData) => api.post('/auth/register', userData);

export const getUsers = () => api.get('/auth/users');
export const createUser = (userData) => api.post('/auth/users', userData);
export const updateUser = (id, userData) => api.put(`/auth/users/${id}`, userData);
export const toggleUserStatus = (id) => api.delete(`/auth/users/${id}`);

// System Settings & Email Automation Endpoints
export const getSystemSettings = () => api.get('/settings');
export const updateSystemSettings = (data) => api.put('/settings', data);
export const testEmailConnection = (recipient_email) => api.post('/settings/test-email', { recipient_email });
export const sendEmailReport = (report_type = 'WEEKLY', recipient_email = '') => 
  api.post('/settings/send-report', { report_type, recipient_email });
export const sendLowStockAlertEmail = () => api.post('/settings/send-low-stock-alert');

// Dashboard & Financial Analytics Endpoints
export const getDashboardKPIs = (startDate = '', endDate = '') => 
  api.get(`/dashboard/kpi?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`);

export const getSalesChartData = (startDate = '', endDate = '') => 
  api.get(`/dashboard/chart?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`);

export const getTopProducts = (startDate = '', endDate = '') => 
  api.get(`/dashboard/top-products?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`);

export const getMonthlyReports = () => api.get('/dashboard/monthly-reports');

export const getPaymentBreakdown = (startDate = '', endDate = '') => 
  api.get(`/dashboard/payment-breakdown?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`);

export const getCashierPerformance = (startDate = '', endDate = '') => 
  api.get(`/dashboard/cashiers-performance?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`);

// Catalog & Inventory Endpoints (with Restock Support)
export const getProducts = (search = '', lowStockOnly = false) => 
  api.get(`/products?search=${encodeURIComponent(search)}&low_stock_only=${lowStockOnly}`);
export const createProduct = (data) => api.post('/products', data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const restockProduct = (id, restockData) => api.post(`/products/${id}/restock`, restockData);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const getCategories = () => api.get('/categories');
export const createCategory = (data) => api.post('/categories', data);
export const getSuppliers = () => api.get('/suppliers');
export const createSupplier = (data) => api.post('/suppliers', data);

// Invoices & Lost Bill Regeneration Endpoints
export const createInvoice = (invoiceData) => api.post('/invoices', invoiceData);
export const getInvoices = () => api.get('/invoices');
export const regenerateInvoiceBill = (invoiceId) => api.post(`/invoices/${invoiceId}/regenerate`);

// Customer CRM Endpoints
export const getCustomers = (search = '') => api.get(`/customers?search=${encodeURIComponent(search)}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
export const getCustomerInvoices = (id) => api.get(`/customers/${id}/invoices`);

// Licensing & Campaign Endpoints
export const getLicenseStatus = () => api.get('/license/status');
export const activateLicense = (license_key) => api.post('/license/activate', { license_key });
export const generateDemoKey = () => api.get('/license/generate-demo-key');

export const createCampaign = (campaignData) => api.post('/campaigns', campaignData);
export const getCampaigns = () => api.get('/campaigns');

export const triggerBackup = () => api.post('/backups/trigger');
export const getBackupLogs = () => api.get('/backups/logs');

export default api;
