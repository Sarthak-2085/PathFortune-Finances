import React, { useEffect, useState } from 'react';
import { Search, Filter, Plus, Trash2, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { fetchTransactions, createTransaction, deleteTransaction } from '../services/api';
import { Transaction } from '../types';

export const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'Expense' as 'Income' | 'Expense',
    category: 'Marketing',
    amount: '',
    payment_method: 'Bank Transfer',
    department: 'General',
    vendor_customer: ''
  });

  useEffect(() => {
    loadTransactions();
  }, [selectedType]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedType !== 'all') params.type = selectedType;
      const data = await fetchTransactions(params);
      setTransactions(data);
    } catch (err) {
      console.error("Error loading transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction record?")) {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.description || !newTx.amount) return;

    try {
      const created = await createTransaction({
        ...newTx,
        amount: parseFloat(newTx.amount)
      });
      setTransactions(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewTx({
        date: new Date().toISOString().split('T')[0],
        description: '',
        type: 'Expense',
        category: 'Marketing',
        amount: '',
        payment_method: 'Bank Transfer',
        department: 'General',
        vendor_customer: ''
      });
    } catch (err) {
      alert("Failed creating transaction.");
    }
  };

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase()) ||
    (t.vendor_customer && t.vendor_customer.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      {/* Controls Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center space-x-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, category, or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="Income">Income Only</option>
            <option value="Expense">Expense Only</option>
          </select>
        </div>

        {/* Add Transaction Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0"
        >
          <Plus size={16} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Transactions Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Vendor / Client</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">Loading transactions directory...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No transaction records found.</td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isIncome = t.type === 'Income';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-900">{t.date}</td>
                      <td className="py-3.5 px-4 max-w-xs truncate font-medium text-slate-800" title={t.description}>
                        {t.description}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isIncome ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                        }`}>
                          {isIncome ? <ArrowUpRight size={13} className="mr-0.5" /> : <ArrowDownRight size={13} className="mr-0.5" />}
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">{t.category}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">{t.vendor_customer || '—'}</td>
                      <td className={`py-3.5 px-4 whitespace-nowrap text-right font-extrabold ${
                        isIncome ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {isIncome ? '+' : '-'}₹{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Transaction"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">New Financial Transaction</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'Expense' })}
                    className={`py-2 rounded-xl font-bold text-center border transition-all ${
                      newTx.type === 'Expense' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'Income' })}
                    className={`py-2 rounded-xl font-bold text-center border transition-all ${
                      newTx.type === 'Income' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Hosting License Renewal"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="85000"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newTx.category}
                    onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Salaries">Salaries</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Software">Software</option>
                    <option value="Rent">Rent</option>
                    <option value="Operations">Operations</option>
                    <option value="SaaS Subscriptions">SaaS Subscriptions</option>
                    <option value="Enterprise Contracts">Enterprise Contracts</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor / Client</label>
                  <input
                    type="text"
                    placeholder="Amazon Web Services"
                    value={newTx.vendor_customer}
                    onChange={(e) => setNewTx({ ...newTx, vendor_customer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-semibold shadow-xs"
                >
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
