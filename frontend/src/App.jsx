import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import POSTerminal from './pages/POSTerminal';
import Inventory from './pages/Inventory';
import InvoicesList from './pages/InvoicesList';
import Customers from './pages/Customers';
import Marketing from './pages/Marketing';
import LicensePage from './pages/LicensePage';
import BackupsPage from './pages/BackupsPage';
import UsersPage from './pages/UsersPage';
import AdminSettings from './pages/AdminSettings';

const ProtectedLayout = () => {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="h-screen app-bg-main flex flex-col items-center justify-center app-text-primary text-xs font-bold gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        <p>Loading NextGen SaaS Terminal...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen app-bg-main overflow-hidden selection:bg-blue-500 selection:text-white">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Navbar onToggleMobileMenu={() => setMobileOpen(!mobileOpen)} />
        <main className="flex-1 overflow-y-auto app-bg-main">
          <Routes>
            <Route path="/" element={user.role === 'CASHIER' ? <Navigate to="/pos" replace /> : <Dashboard />} />
            <Route path="/pos" element={<POSTerminal />} />
            <Route path="/inventory" element={user.role === 'CASHIER' ? <Navigate to="/pos" replace /> : <Inventory />} />
            <Route path="/invoices" element={<InvoicesList />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/users" element={user.role === 'ADMIN' ? <UsersPage /> : <Navigate to="/" replace />} />
            <Route path="/settings" element={user.role === 'ADMIN' ? <AdminSettings /> : <Navigate to="/" replace />} />
            <Route path="/marketing" element={user.role === 'ADMIN' ? <Marketing /> : <Navigate to="/" replace />} />
            <Route path="/license" element={user.role === 'ADMIN' ? <LicensePage /> : <Navigate to="/" replace />} />
            <Route path="/backups" element={user.role === 'ADMIN' ? <BackupsPage /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <CompanyProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </Router>
      </AuthProvider>
    </CompanyProvider>
  );
}

export default App;

