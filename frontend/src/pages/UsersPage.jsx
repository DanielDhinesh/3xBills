import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, ShieldCheck, Edit3, Trash2, Key, User, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { getUsers, createUser, updateUser, toggleUserStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    role: 'CASHIER',
    password: ''
  });

  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'CASHIER',
    password: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await createUser(newUser);
      setShowAddModal(false);
      setNewUser({
        full_name: '',
        email: '',
        role: 'CASHIER',
        password: ''
      });
      alert('New user account created successfully!');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating user');
    }
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setEditForm({
      full_name: u.full_name,
      role: u.role,
      password: ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const payload = {
        full_name: editForm.full_name,
        role: editForm.role
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await updateUser(editingUser.id, payload);
      setShowEditModal(false);
      setEditingUser(null);
      alert('User details updated successfully!');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error updating user');
    }
  };

  const handleToggleActive = async (u) => {
    if (u.id === currentUser?.id) {
      alert('You cannot deactivate your own admin account!');
      return;
    }

    const action = u.is_active ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} user "${u.full_name}"?`)) {
      try {
        await toggleUserStatus(u.id);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error toggling user status');
      }
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeStyle = (role) => {
    if (role === 'ADMIN') return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    if (role === 'INVENTORY_MANAGER') return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-400" /> Staff & User Role Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Admin privilege panel to create, assign roles, and manage store cashiers & staff accounts</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
        >
          <Plus className="w-4 h-4" /> Add New Staff Account
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl glass-card border border-slate-800 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search staff by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl glass-input text-xs"
          />
        </div>
        <span className="text-xs text-slate-400 font-semibold hidden sm:block">
          Total Users: <strong className="text-white">{filteredUsers.length}</strong>
        </span>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
            <tr>
              <th className="p-4">Staff Member</th>
              <th className="p-4">Email Address</th>
              <th className="p-4">Assigned Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created Date</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/40 transition">
                <td className="p-4 font-bold text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-indigo-400 font-bold flex items-center justify-center text-xs border border-slate-700 shrink-0">
                    {u.full_name?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white">{u.full_name}</p>
                    {u.id === currentUser?.id && (
                      <span className="text-[9px] font-black text-blue-400">(Your Account)</span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-slate-300 font-mono">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${getRoleBadgeStyle(u.role)}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    u.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(u)}
                      title="Edit Staff User"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={u.id === currentUser?.id}
                      title={u.is_active ? "Deactivate Account" : "Activate Account"}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${
                        u.id === currentUser?.id
                          ? 'opacity-30 cursor-not-allowed bg-slate-800 text-slate-500'
                          : u.is_active
                          ? 'bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30'
                          : 'bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30'
                      }`}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" /> Create New Staff Account
              </h3>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="cashier@shopbilling.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Assign System Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="CASHIER">CASHIER (POS Billing & Register)</option>
                  <option value="ADMIN">ADMIN (Full Store Access & Settings)</option>
                  <option value="INVENTORY_MANAGER">INVENTORY_MANAGER (Stock Control)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl glass-input text-white"
                  />
                </div>
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
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white">Edit User: {editingUser.email}</h3>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Assign Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold"
                >
                  <option value="CASHIER">CASHIER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Reset Password (Leave blank to keep existing)</label>
                <input
                  type="password"
                  placeholder="New password..."
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save User Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
