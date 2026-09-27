import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Plus, Search, AlertTriangle, Barcode, Trash2, Edit3, Tag, Truck, RefreshCw,
  DollarSign, TrendingUp, Filter, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Layers, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { 
  getProducts, createProduct, updateProduct, restockProduct, deleteProduct, 
  getCategories, createCategory, getSuppliers, createSupplier 
} from '../services/api';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Multi-Select Goods State
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [showBulkRestockModal, setShowBulkRestockModal] = useState(false);
  const [bulkRestockQty, setBulkRestockQty] = useState(10);
  const [showBulkTaxModal, setShowBulkTaxModal] = useState(false);
  const [bulkTaxRate, setBulkTaxRate] = useState(18);

  // Filter & Column Sort States
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');

  // Direct Column Header Sorting: default to Highest Selling Price
  const [sortField, setSortField] = useState('selling_price');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockForm, setRestockForm] = useState({
    quantity_to_add: 10,
    new_cost_price: 0,
    new_selling_price: 0
  });

  const [newProduct, setNewProduct] = useState({
    barcode: '',
    name: '',
    category_id: '',
    supplier_id: '',
    cost_price: 0,
    selling_price: 0,
    tax_rate: 18,
    stock_quantity: 50,
    min_stock_alert: 10,
    unit: 'pcs'
  });

  useEffect(() => {
    fetchInventory();
    fetchCategoriesAndSuppliers();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await getProducts('', false);
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const fetchCategoriesAndSuppliers = async () => {
    try {
      const catRes = await getCategories();
      const supRes = await getSuppliers();
      setCategories(catRes.data);
      setSuppliers(supRes.data);
    } catch (err) {
      console.error('Error fetching categories/suppliers:', err);
    }
  };

  // Calculated Metrics
  const metrics = useMemo(() => {
    if (!products.length) {
      return {
        totalProducts: 0,
        totalInventoryCost: 0,
        totalRetailValue: 0,
        lowStockCount: 0,
        highestPriceItem: null,
      };
    }

    let totalCost = 0;
    let totalRetail = 0;
    let lowStock = 0;
    let highestPriceProduct = products[0];

    products.forEach((p) => {
      const cost = (parseFloat(p.cost_price) || 0) * (p.stock_quantity || 0);
      const retail = (parseFloat(p.selling_price) || 0) * (p.stock_quantity || 0);
      totalCost += cost;
      totalRetail += retail;

      if (p.stock_quantity <= p.min_stock_alert) {
        lowStock += 1;
      }

      if (parseFloat(p.selling_price) > parseFloat(highestPriceProduct.selling_price)) {
        highestPriceProduct = p;
      }
    });

    return {
      totalProducts: products.length,
      totalInventoryCost: totalCost,
      totalRetailValue: totalRetail,
      lowStockCount: lowStock,
      highestPriceItem: highestPriceProduct,
    };
  }, [products]);

  // Handle column header click for sorting
  const handleSortClick = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      if (field === 'selling_price' || field === 'cost_price' || field === 'stock_quantity') {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
  };

  // Filtered & Sorted Products List
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        !search ||
        p.name.toLowerCase().includes(searchLower) ||
        p.barcode.toLowerCase().includes(searchLower) ||
        (p.category_name && p.category_name.toLowerCase().includes(searchLower)) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(searchLower));

      const matchesCategory = 
        categoryFilter === 'ALL' || 
        String(p.category_id) === String(categoryFilter) ||
        p.category_name === categoryFilter;

      const matchesSupplier = 
        supplierFilter === 'ALL' || 
        String(p.supplier_id) === String(supplierFilter) ||
        p.supplier_name === supplierFilter;

      let matchesStockStatus = true;
      if (stockStatusFilter === 'LOW_STOCK') {
        matchesStockStatus = p.stock_quantity <= p.min_stock_alert && p.stock_quantity > 0;
      } else if (stockStatusFilter === 'OUT_OF_STOCK') {
        matchesStockStatus = p.stock_quantity === 0;
      } else if (stockStatusFilter === 'IN_STOCK') {
        matchesStockStatus = p.stock_quantity > p.min_stock_alert;
      }

      return matchesSearch && matchesCategory && matchesSupplier && matchesStockStatus;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'selling_price' || sortField === 'cost_price' || sortField === 'tax_rate') {
        valA = parseFloat(valA) || 0;
        valB = parseFloat(valB) || 0;
      } else if (sortField === 'stock_quantity') {
        valA = parseInt(valA) || 0;
        valB = parseInt(valB) || 0;
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, search, categoryFilter, supplierFilter, stockStatusFilter, sortField, sortOrder]);

  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('ALL');
    setSupplierFilter('ALL');
    setStockStatusFilter('ALL');
    setSortField('selling_price');
    setSortOrder('desc');
    setSelectedProductIds([]);
  };

  // Multi-Select Handlers
  const isAllSelected = useMemo(() => {
    if (!filteredProducts.length) return false;
    return filteredProducts.every((p) => selectedProductIds.includes(p.id));
  }, [filteredProducts, selectedProductIds]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleToggleSelectProduct = (id, e) => {
    if (e) e.stopPropagation();
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedProductIds.length) return;
    if (window.confirm(`Are you sure you want to deactivate ${selectedProductIds.length} selected goods?`)) {
      try {
        await Promise.all(selectedProductIds.map((id) => deleteProduct(id)));
        setSelectedProductIds([]);
        fetchInventory();
        alert(`Successfully deactivated ${selectedProductIds.length} items.`);
      } catch (err) {
        alert('Error executing bulk deactivation');
      }
    }
  };

  const handleBulkRestockSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductIds.length) return;
    try {
      await Promise.all(
        selectedProductIds.map((id) =>
          restockProduct(id, {
            quantity_to_add: bulkRestockQty,
            new_cost_price: 0,
            new_selling_price: 0
          })
        )
      );
      setShowBulkRestockModal(false);
      setSelectedProductIds([]);
      fetchInventory();
      alert(`Successfully added +${bulkRestockQty} units to ${selectedProductIds.length} products!`);
    } catch (err) {
      alert('Error applying bulk restock.');
    }
  };

  const handleBulkTaxSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProductIds.length) return;
    try {
      const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));
      await Promise.all(
        selectedProducts.map((p) =>
          updateProduct(p.id, {
            ...p,
            cost_price: parseFloat(p.cost_price),
            selling_price: parseFloat(p.selling_price),
            tax_rate: parseFloat(bulkTaxRate)
          })
        )
      );
      setShowBulkTaxModal(false);
      setSelectedProductIds([]);
      fetchInventory();
      alert(`Successfully updated Tax Rate to ${bulkTaxRate}% for ${selectedProducts.length} items!`);
    } catch (err) {
      alert('Error updating bulk tax rate.');
    }
  };

  const [isCreatingNewCat, setIsCreatingNewCat] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      let finalCategoryId = newProduct.category_id;
      if (isCreatingNewCat && customCategoryName.trim()) {
        const catRes = await createCategory({
          name: customCategoryName.trim(),
          description: 'Custom added category from inventory'
        });
        finalCategoryId = catRes.data.id;
        await fetchCategoriesAndSuppliers();
      }

      const payload = {
        ...newProduct,
        category_id: finalCategoryId || null,
        supplier_id: newProduct.supplier_id || null
      };

      const res = await createProduct(payload);
      setShowAddModal(false);
      setIsCreatingNewCat(false);
      setCustomCategoryName('');
      setNewProduct({
        barcode: '',
        name: '',
        category_id: '',
        supplier_id: '',
        cost_price: 0,
        selling_price: 0,
        tax_rate: 18,
        stock_quantity: 50,
        min_stock_alert: 10,
        unit: 'pcs'
      });
      alert(`Product saved! Current Stock: ${res.data.stock_quantity} units.`);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating product');
    }
  };

  const handleOpenRestock = (product) => {
    setRestockItem(product);
    setRestockForm({
      quantity_to_add: 10,
      new_cost_price: parseFloat(product.cost_price),
      new_selling_price: parseFloat(product.selling_price)
    });
    setShowRestockModal(true);
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockItem) return;
    try {
      await restockProduct(restockItem.id, restockForm);
      setShowRestockModal(false);
      setRestockItem(null);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error restocking product');
    }
  };

  const handleOpenEdit = (product) => {
    setEditingProduct({
      ...product,
      cost_price: parseFloat(product.cost_price),
      selling_price: parseFloat(product.selling_price),
      tax_rate: parseFloat(product.tax_rate)
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await updateProduct(editingProduct.id, editingProduct);
      setShowEditModal(false);
      setEditingProduct(null);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error updating product');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to deactivate this product?')) {
      try {
        await deleteProduct(id);
        fetchInventory();
      } catch (err) {
        alert('Error deleting product');
      }
    }
  };

  // Helper component for interactive sortable header name
  const SortableTh = ({ field, label, align = 'left' }) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSortClick(field)} 
        className={`p-4 cursor-pointer select-none transition hover:text-white ${align === 'right' ? 'text-right' : ''}`}
        title={`Click to sort by ${label}`}
      >
        <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''} ${isSorted ? 'text-amber-400 font-black' : ''}`}>
          <span>{label}</span>
          {isSorted ? (
            sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-amber-400" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60 hover:opacity-100" />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-full">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-400" /> Inventory & Stock Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">Click any table column header to sort by price, stock, or product name</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition"
        >
          <Plus className="w-4 h-4" /> Add / Auto-Merge Product
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Highest Price Goods */}
        <div 
          onClick={() => { setSortField('selling_price'); setSortOrder('desc'); }}
          className="p-4 rounded-2xl glass-card border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 cursor-pointer hover:border-amber-500/40 transition"
          title="Click to sort table by Highest Price"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">Highest Price Good</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-2xl font-black text-amber-300">
              ${metrics.highestPriceItem ? parseFloat(metrics.highestPriceItem.selling_price).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-slate-300 font-medium truncate mt-0.5">
              {metrics.highestPriceItem ? metrics.highestPriceItem.name : 'No items'}
            </p>
          </div>
        </div>

        {/* Total Inventory Cost Valuation */}
        <div className="p-4 rounded-2xl glass-card border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-400">Total Stock Cost</span>
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-2xl font-black text-white">
              ${metrics.totalInventoryCost.toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Retail Valuation: <span className="text-emerald-400 font-bold">${metrics.totalRetailValue.toFixed(2)}</span>
            </p>
          </div>
        </div>

        {/* Total Products Count */}
        <div className="p-4 rounded-2xl glass-card border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400">Active Products</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-2xl font-black text-white">
              {metrics.totalProducts} <span className="text-xs text-slate-400 font-normal">items</span>
            </div>
            <p className="text-xs text-emerald-300 font-medium mt-0.5">
              {filteredProducts.length} showing after filters
            </p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div 
          onClick={() => setStockStatusFilter(stockStatusFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
          className="p-4 rounded-2xl glass-card border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-900 cursor-pointer hover:border-rose-500/40 transition"
          title="Click to filter low stock items"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-400">Low Stock Alerts</span>
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg sm:text-2xl font-black text-rose-300">
              {metrics.lowStockCount} <span className="text-xs text-slate-400 font-normal">items</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {metrics.lowStockCount > 0 ? 'Requires restock' : 'All stock healthy'}
            </p>
          </div>
        </div>
      </div>

      {/* Table with Seamless Toolbar Header */}
      <div className="rounded-2xl glass-card border border-slate-800 overflow-hidden">
        {/* Seamless Header Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl glass-input text-xs text-white bg-slate-900 font-medium border border-slate-800"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Supplier Filter */}
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl glass-input text-xs text-white bg-slate-900 font-medium border border-slate-800"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Stock Level Filter */}
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl glass-input text-xs text-white bg-slate-900 font-medium border border-slate-800"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="LOW_STOCK">⚠️ Low Stock Alerts</option>
              <option value="OUT_OF_STOCK">⛔ Out of Stock</option>
              <option value="IN_STOCK">✅ Healthy Stock</option>
            </select>
          </div>

          {(search || categoryFilter !== 'ALL' || supplierFilter !== 'ALL' || stockStatusFilter !== 'ALL' || sortField !== 'selling_price') && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition"
            >
              <RotateCcw className="w-3 h-3 text-blue-400" /> Reset
            </button>
          )}
        </div>

        {/* Product Catalog Table with Multi-Select Checkboxes & Header Click Sorting */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 cursor-pointer"
                    title="Select all filtered items"
                  />
                </th>
                <SortableTh field="barcode" label="Barcode" />
                <SortableTh field="name" label="Product Name" />
                <SortableTh field="category_name" label="Category" />
                <SortableTh field="cost_price" label="Cost Price" />
                <SortableTh field="selling_price" label="Selling Price" />
                <SortableTh field="tax_rate" label="Tax %" />
                <SortableTh field="stock_quantity" label="Stock Level" />
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-12 text-center text-slate-500">
                    <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-bold text-sm text-slate-400">No matching products found</p>
                    <p className="text-xs text-slate-500 mt-1">Click any header name above to sort or reset filters</p>
                    <button
                      onClick={handleResetFilters}
                      className="mt-3 px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-bold transition"
                    >
                      Clear Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isHighestPrice = metrics.highestPriceItem && metrics.highestPriceItem.id === p.id;
                  const isLowStock = p.stock_quantity <= p.min_stock_alert;
                  const isSelected = selectedProductIds.includes(p.id);

                  return (
                    <tr 
                      key={p.id} 
                      className={`transition ${
                        isSelected 
                          ? 'bg-blue-950/40 text-white font-bold border-l-4 border-l-blue-500' 
                          : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectProduct(p.id, e)}
                          className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-900 cursor-pointer"
                        />
                      </td>
                      <td className="p-4 font-mono text-blue-400 font-bold">{p.barcode}</td>
                      <td className="p-4 font-bold text-white flex items-center gap-2">
                        {p.name}
                        {isHighestPrice && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                            👑 Highest Price
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-300">{p.category_name || 'General'}</td>
                      <td className="p-4 text-slate-400">${parseFloat(p.cost_price).toFixed(2)}</td>
                      <td className="p-4 font-bold text-emerald-400 text-sm">
                        ${parseFloat(p.selling_price).toFixed(2)}
                      </td>
                      <td className="p-4 text-slate-300">{parseFloat(p.tax_rate)}%</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1 ${
                          isLowStock
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {isLowStock && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                          {p.stock_quantity} {p.unit}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenRestock(p)}
                            title="Restock Item Shipment"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1 transition"
                          >
                            <RefreshCw className="w-3 h-3" /> Restock
                          </button>

                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Product Details"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            title="Deactivate Product"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Multi-Select Bulk Actions Toolbar */}
      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-blue-500/50 shadow-2xl backdrop-blur-xl rounded-2xl p-3 sm:px-6 flex items-center justify-between gap-4 max-w-2xl w-[92%] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow">
              {selectedProductIds.length}
            </span>
            <span className="text-xs font-bold text-white">Goods Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkRestockModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Bulk Restock
            </button>
            <button
              onClick={() => setShowBulkTaxModal(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 transition shadow"
            >
              <Tag className="w-3.5 h-3.5" /> Bulk Tax %
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 transition shadow"
            >
              <Trash2 className="w-3.5 h-3.5" /> Bulk Deactivate
            </button>
            <button
              onClick={() => setSelectedProductIds([])}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Restock Modal */}
      {showBulkRestockModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" /> Bulk Restock Shipment ({selectedProductIds.length} Products)
            </h3>
            <p className="text-xs text-slate-400">
              Enter stock units quantity to add to all <strong className="text-white">{selectedProductIds.length}</strong> selected goods.
            </p>

            <form onSubmit={handleBulkRestockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Quantity to Add per Product (+ Units)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={bulkRestockQty}
                  onChange={(e) => setBulkRestockQty(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl glass-input font-bold text-sm text-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBulkRestockModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Apply Bulk Restock (+{bulkRestockQty})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Tax Rate Modal */}
      {showBulkTaxModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-400" /> Update Tax Rate ({selectedProductIds.length} Products)
            </h3>
            <p className="text-xs text-slate-400">
              Apply new tax percentage rate to all <strong className="text-white">{selectedProductIds.length}</strong> selected goods.
            </p>

            <form onSubmit={handleBulkTaxSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">New Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={bulkTaxRate}
                  onChange={(e) => setBulkTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl glass-input font-bold text-sm text-blue-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBulkTaxModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Apply {bulkTaxRate}% Tax Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Shipment Modal */}
      {showRestockModal && restockItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" /> Restock Shipment: {restockItem.name}
              </h3>
            </div>
            
            <p className="text-xs text-slate-400">
              Current Stock: <strong className="text-emerald-400">{restockItem.stock_quantity} {restockItem.unit}</strong> (Barcode: {restockItem.barcode})
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Quantity to Add (+ Units)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={restockForm.quantity_to_add}
                  onChange={(e) => setRestockForm({ ...restockForm, quantity_to_add: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl glass-input font-bold text-sm text-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">New Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={restockForm.new_cost_price}
                    onChange={(e) => setRestockForm({ ...restockForm, new_cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">New Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={restockForm.new_selling_price}
                    onChange={(e) => setRestockForm({ ...restockForm, new_selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Confirm Restock (+{restockForm.quantity_to_add})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white">Edit Product Details</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Barcode Number</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.barcode}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Product Name</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.cost_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.selling_price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingProduct.tax_rate}
                    onChange={(e) => setEditingProduct({ ...editingProduct, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Total Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.stock_quantity}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Min Stock Alert</label>
                  <input
                    type="number"
                    required
                    value={editingProduct.min_stock_alert}
                    onChange={(e) => setEditingProduct({ ...editingProduct, min_stock_alert: parseInt(e.target.value) || 5 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
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
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div>
              <h3 className="text-lg font-black text-white">Add New Product to Catalog</h3>
              <p className="text-xs text-blue-400 font-medium mt-1">
                💡 Tip: Scanning or entering an existing barcode will automatically add stock to that item!
              </p>
            </div>
            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Barcode Number</label>
                  <input
                    type="text"
                    required
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                    placeholder="890100..."
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl glass-input"
                    placeholder="Item title"
                  />
                </div>
              </div>

              {/* Category & Supplier Selection / Creation */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-semibold block">Category</label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewCat(!isCreatingNewCat)}
                      className="text-[10px] text-blue-400 hover:underline font-bold"
                    >
                      {isCreatingNewCat ? '← Select Existing' : '+ Add New Category'}
                    </button>
                  </div>
                  {isCreatingNewCat ? (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Fresh Dairy & Bakery"
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      className="w-full p-2 rounded-xl glass-input text-white border-blue-500/50"
                    />
                  ) : (
                    <select
                      value={newProduct.category_id}
                      onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                      className="w-full p-2 rounded-xl glass-input text-white bg-slate-900 border-slate-800"
                    >
                      <option value="">Select Category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Supplier (Optional)</label>
                  <select
                    value={newProduct.supplier_id}
                    onChange={(e) => setNewProduct({ ...newProduct, supplier_id: e.target.value })}
                    className="w-full p-2 rounded-xl glass-input text-white bg-slate-900 border-slate-800"
                  >
                    <option value="">Select Supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.selling_price}
                    onChange={(e) => setNewProduct({ ...newProduct, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newProduct.tax_rate}
                    onChange={(e) => setNewProduct({ ...newProduct, tax_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Initial / Restock Stock</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl glass-input"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Low Stock Alert Limit</label>
                  <input
                    type="number"
                    required
                    value={newProduct.min_stock_alert}
                    onChange={(e) => setNewProduct({ ...newProduct, min_stock_alert: parseInt(e.target.value) || 5 })}
                    className="w-full p-2.5 rounded-xl glass-input"
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
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
