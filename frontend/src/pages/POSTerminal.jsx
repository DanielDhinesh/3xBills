import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  Share2, 
  Phone, 
  User, 
  Printer,
  Grid,
  LayoutGrid,
  List,
  Filter,
  ShoppingBag,
  Receipt,
  X,
  ArrowRight
} from 'lucide-react';
import { getProducts, getCategories, createInvoice, getPdfDownloadUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

const POSTerminal = () => {
  const { user } = useAuth();
  const { activeBranch, activeTerminal, formatCurrency, currencySymbol } = useCompany();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [catalogViewMode, setCatalogViewMode] = useState('GRID'); // 'GRID' | 'LIST'
  const [searchQuery, setSearchQuery] = useState('');
  const [excelInput, setExcelInput] = useState('');

  const [showExcelDropdown, setShowExcelDropdown] = useState(false);
  const [excelSelectedIndex, setExcelSelectedIndex] = useState(0);
  const excelInputRef = useRef(null);

  const matchingExcelProducts = products.filter((p) =>
    p.name.toLowerCase().includes(excelInput.toLowerCase()) ||
    p.barcode.toLowerCase().includes(excelInput.toLowerCase())
  );

  const handleAddExcelProduct = (product) => {
    if (!product) return;
    if (product.stock_quantity <= 0) {
      alert(`Item "${product.name}" is OUT OF STOCK!`);
      return;
    }
    addToCart(product);
    setExcelInput('');
    setShowExcelDropdown(false);
    setExcelSelectedIndex(0);
    excelInputRef.current?.focus();
  };

  const handleExcelKeyDown = (e) => {
    if (!excelInput.trim()) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowExcelDropdown(true);
      setExcelSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, matchingExcelProducts.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowExcelDropdown(true);
      setExcelSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const exact = products.find((p) => p.barcode.toLowerCase() === excelInput.trim().toLowerCase());
      const target = exact || matchingExcelProducts[excelSelectedIndex] || matchingExcelProducts[0];
      if (target) {
        handleAddExcelProduct(target);
      }
    } else if (e.key === 'Escape') {
      setShowExcelDropdown(false);
    }
  };
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Keyboard navigation for barcode & product search box
  const handleKeyDown = (e) => {
    if (!searchQuery.trim()) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setShowDropdown(true);
      setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredProducts.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setShowDropdown(true);
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Check if exact barcode matches first (for fast barcode gun scanning)
      const exactBarcodeItem = products.find((p) => p.barcode.toLowerCase() === searchQuery.trim().toLowerCase());
      const selectedItem = exactBarcodeItem || filteredProducts[selectedIndex] || filteredProducts[0];

      if (selectedItem) {
        if (selectedItem.stock_quantity <= 0) {
          alert(`Item "${selectedItem.name}" is OUT OF STOCK!`);
        } else {
          addToCart(selectedItem);
          setSearchQuery('');
          setShowDropdown(false);
          setSelectedIndex(0);
          barcodeInputRef.current?.focus();
        }
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };
  
  // Mobile Screen Responsive View State ('CATALOG' | 'CART')
  const [mobileView, setMobileView] = useState('CATALOG');

  // Multi-tab Bills State
  const [tabs, setTabs] = useState([
    {
      id: 'bill-1',
      title: 'Bill 1',
      cart: [],
      customerName: '',
      customerPhone: '',
      paymentMethod: 'UPI_QR',
      discountAmount: 0
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('bill-1');
  const [tabCounter, setTabCounter] = useState(1);

  const [completedInvoice, setCompletedInvoice] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const barcodeInputRef = useRef(null);

  // Safely retrieve active tab object
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0] || {
    id: 'bill-1',
    title: 'Bill 1',
    cart: [],
    customerName: '',
    customerPhone: '',
    paymentMethod: 'UPI_QR',
    discountAmount: 0
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await getProducts();
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to update fields on active tab
  const updateActiveTab = (updates) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => {
        if (t.id === activeTab.id) {
          return typeof updates === 'function' ? updates(t) : { ...t, ...updates };
        }
        return t;
      })
    );
  };

  // Add item to active tab POS cart
  const addToCart = (product) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTab.id) return tab;

        const existing = tab.cart.find((item) => item.product_id === product.id);
        let updatedCart;
        if (existing) {
          if (existing.quantity >= product.stock_quantity) {
            alert(`Maximum available stock reached (${product.stock_quantity})`);
            return tab;
          }
          updatedCart = tab.cart.map((item) =>
            item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          );
        } else {
          updatedCart = [
            ...tab.cart,
            {
              product_id: product.id,
              name: product.name,
              barcode: product.barcode,
              unit_price: parseFloat(product.selling_price),
              tax_rate: parseFloat(product.tax_rate),
              quantity: 1,
              stock: product.stock_quantity
            }
          ];
        }
        return { ...tab, cart: updatedCart };
      })
    );
  };

  // Incremental (+ / -) adjustment on active tab
  const updateQuantity = (product_id, delta) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTab.id) return tab;

        const updatedCart = tab.cart
          .map((item) => {
            if (item.product_id === product_id) {
              const newQty = item.quantity + delta;
              if (newQty > item.stock) {
                alert(`Maximum available stock reached (${item.stock})`);
                return item;
              }
              return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
          })
          .filter(Boolean);

        return { ...tab, cart: updatedCart };
      })
    );
  };

  // Direct Manual Numeric Input on active tab
  const handleQuantityDirectInput = (product_id, valueStr) => {
    const parsedVal = parseInt(valueStr, 10);
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTab.id) return tab;

        const updatedCart = tab.cart.map((item) => {
          if (item.product_id === product_id) {
            if (isNaN(parsedVal) || parsedVal <= 0) {
              return { ...item, quantity: 1 };
            }
            if (parsedVal > item.stock) {
              alert(`Stock limit reached! Max available is ${item.stock}`);
              return { ...item, quantity: item.stock };
            }
            return { ...item, quantity: parsedVal };
          }
          return item;
        });

        return { ...tab, cart: updatedCart };
      })
    );
  };

  // Remove item from active tab cart
  const removeFromCart = (product_id) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => {
        if (tab.id !== activeTab.id) return tab;
        return {
          ...tab,
          cart: tab.cart.filter((item) => item.product_id !== product_id)
        };
      })
    );
  };

  // Tab operations
  const handleAddNewTab = () => {
    const nextNum = tabCounter + 1;
    setTabCounter(nextNum);
    const newTabId = `bill-${Date.now()}`;
    const newTab = {
      id: newTabId,
      title: `Bill ${nextNum}`,
      cart: [],
      customerName: '',
      customerPhone: '',
      paymentMethod: 'UPI_QR',
      discountAmount: 0
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
  };

  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    const targetTab = tabs.find((t) => t.id === tabId);
    if (targetTab && targetTab.cart.length > 0) {
      if (!window.confirm(`Bill "${targetTab.title}" has ${targetTab.cart.length} item(s). Close and discard this bill?`)) {
        return;
      }
    }

    if (tabs.length === 1) {
      setTabs([
        {
          id: 'bill-1',
          title: 'Bill 1',
          cart: [],
          customerName: '',
          customerPhone: '',
          paymentMethod: 'UPI_QR',
          discountAmount: 0
        }
      ]);
      setActiveTabId('bill-1');
      setTabCounter(1);
      return;
    }

    const remainingTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(remainingTabs);
    if (activeTabId === tabId) {
      setActiveTabId(remainingTabs[remainingTabs.length - 1].id);
    }
  };

  // Active tab cart & customer calculations
  const cart = activeTab.cart || [];
  const customerName = activeTab.customerName || '';
  const customerPhone = activeTab.customerPhone || '';
  const paymentMethod = activeTab.paymentMethod || 'UPI_QR';
  const discountAmount = activeTab.discountAmount || 0;

  const subtotal = cart.reduce((acc, item) => acc + item.unit_price * item.quantity, 0);
  const taxTotal = cart.reduce((acc, item) => {
    const lineSub = item.unit_price * item.quantity;
    return acc + (lineSub * item.tax_rate) / 100;
  }, 0);
  const grandTotal = Math.max(0, subtotal + taxTotal - discountAmount);

  // Handle Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        customer_name: customerName || 'Retail Customer',
        customer_phone: customerPhone,
        payment_method: paymentMethod,
        discount_amount: discountAmount,
        branch_name: activeBranch,
        terminal_name: activeTerminal,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity
        }))
      };

      const res = await createInvoice(payload);
      setCompletedInvoice(res.data);
      
      // Reset active tab after checkout
      updateActiveTab({
        cart: [],
        customerName: '',
        customerPhone: '',
        discountAmount: 0
      });

      fetchProducts(); // Refresh stock
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || p.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-slate-950">
      {/* Left 7 Columns: Compact Catalog Selector & Scanner */}
      <div className={`lg:col-span-7 p-3 sm:p-4 border-r border-slate-800 flex-col h-full overflow-hidden ${mobileView === 'CART' ? 'hidden lg:flex' : 'flex'}`}>
        {/* Mobile Screen View Switcher Pill (iPhone / Samsung / Tablet) */}
        <div className="flex lg:hidden items-center p-1 bg-slate-900 border border-slate-800 rounded-xl mb-3 shrink-0">
          <button
            onClick={() => setMobileView('CATALOG')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mobileView === 'CATALOG'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" /> Catalog ({filteredProducts.length})
          </button>
          <button
            onClick={() => setMobileView('CART')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mobileView === 'CART'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Cart ({cart.length}) • {formatCurrency(grandTotal)}
          </button>
        </div>

        {/* Search Bar & Barcode Scanner with Live Autocomplete Dropdown */}
        <div className="relative mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan Barcode Gun or Search Item..."
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs font-medium border focus:border-blue-500"
                autoFocus
              />
            </div>
            <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
              <Barcode className="w-4 h-4" /> Fast Scan Ready
            </div>
          </div>

          {/* High-Speed Interactive Keyboard Dropdown */}
          {showDropdown && searchQuery.trim().length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-14 top-full mt-1 bg-slate-900/95 border border-slate-700 shadow-2xl rounded-2xl z-50 overflow-hidden max-h-64 overflow-y-auto backdrop-blur-xl"
            >
              <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-between">
                <span>⚡ Matching Items ({filteredProducts.length})</span>
                <span>Use ↑ ↓ to navigate • ↵ Enter to Select</span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No items found matching "<strong className="text-white">{searchQuery}</strong>"
                </div>
              ) : (
                filteredProducts.map((p, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (p.stock_quantity > 0) {
                          addToCart(p);
                          setSearchQuery('');
                          setShowDropdown(false);
                          barcodeInputRef.current?.focus();
                        }
                      }}
                      className={`p-2.5 px-3 flex items-center justify-between gap-3 cursor-pointer border-b border-slate-800/50 transition ${
                        isSelected
                          ? 'bg-blue-600/30 border-l-4 border-l-blue-500 text-white'
                          : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-blue-400 font-bold border border-slate-800 shrink-0">
                          {p.barcode}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white truncate">{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.category_name || 'General'}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <p className="text-xs font-black text-emerald-400">{formatCurrency(p.selling_price)}</p>
                          <p className={`text-[9px] font-bold ${p.stock_quantity <= p.min_stock_alert ? 'text-rose-400' : 'text-slate-400'}`}>
                            {p.stock_quantity} {p.unit} left
                          </p>
                        </div>

                        {isSelected && (
                          <span className="px-2 py-0.5 rounded bg-blue-500 text-[10px] font-black text-white shadow">
                            ↵ Select
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Category Pills Filter & Catalog View Switcher (Grid vs List) */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-3 shrink-0 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat.name
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Grid vs List View Toggle */}
          <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg shrink-0">
            <button
              onClick={() => setCatalogViewMode('GRID')}
              title="Grid View"
              className={`p-1.5 rounded-md transition ${
                catalogViewMode === 'GRID' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCatalogViewMode('LIST')}
              title="List View"
              className={`p-1.5 rounded-md transition ${
                catalogViewMode === 'LIST' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dense Responsive Product Catalog (Grid vs List View) */}
        {catalogViewMode === 'GRID' ? (
          <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 auto-rows-max content-start items-start">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => product.stock_quantity > 0 && addToCart(product)}
                className={`p-2.5 rounded-xl border transition duration-150 flex flex-col justify-between cursor-pointer select-none h-fit ${
                  product.stock_quantity <= 0
                    ? 'bg-slate-900/30 border-slate-800 opacity-40 cursor-not-allowed'
                    : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-blue-500/50 hover:shadow-md hover:shadow-blue-500/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-950 px-1 py-0.5 rounded truncate max-w-[70px] sm:max-w-[80px]">
                      {product.barcode}
                    </span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                      product.stock_quantity <= product.min_stock_alert ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {product.stock_quantity} {product.unit}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white leading-tight line-clamp-2">{product.name}</h4>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                  <span className="text-xs font-extrabold text-blue-400">{formatCurrency(product.selling_price)}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white px-2 py-0.5 rounded transition">
                    + Add
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => product.stock_quantity > 0 && addToCart(product)}
                className={`p-2 px-3 rounded-xl border transition duration-150 flex items-center justify-between gap-2.5 cursor-pointer select-none ${
                  product.stock_quantity <= 0
                    ? 'bg-slate-900/30 border-slate-800 opacity-40 cursor-not-allowed'
                    : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 hover:border-blue-500/50 hover:shadow-md hover:shadow-blue-500/10'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-blue-400 font-bold border border-slate-800 shrink-0">
                    {product.barcode}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{product.name}</h4>
                    <p className="text-[10px] text-slate-400">{product.category_name || 'General'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                    product.stock_quantity <= product.min_stock_alert ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {product.stock_quantity} {product.unit}
                  </span>
                  <span className="text-xs font-black text-emerald-400 font-mono">
                    {formatCurrency(product.selling_price)}
                  </span>
                  <button className="px-2 py-0.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-bold transition">
                    + Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile View Floating Quick Pay Bar */}
        {cart.length > 0 && (
          <div className="mt-2 lg:hidden">
            <button
              onClick={() => setMobileView('CART')}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-between shadow-lg"
            >
              <span>View Cart ({cart.length} items)</span>
              <span className="flex items-center gap-1 font-mono text-emerald-300">
                {formatCurrency(grandTotal)} <ArrowRight className="w-4 h-4" />
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Right 5 Columns: Checkout Cart & Flexible Quantity Controls */}
      <div className={`lg:col-span-5 p-3 sm:p-4 bg-slate-900/60 border-l border-slate-800/80 flex-col h-full justify-between ${mobileView === 'CATALOG' ? 'hidden lg:flex' : 'flex'}`}>
        {/* Customer & Multi-Tab Cart List */}
        <div>
          {/* Mobile Screen View Switcher Pill */}
          <div className="flex lg:hidden items-center p-1 bg-slate-900 border border-slate-800 rounded-xl mb-3 shrink-0">
            <button
              onClick={() => setMobileView('CATALOG')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mobileView === 'CATALOG'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Catalog ({filteredProducts.length})
            </button>
            <button
              onClick={() => setMobileView('CART')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                mobileView === 'CART'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Cart ({cart.length}) • ${grandTotal.toFixed(2)}
            </button>
          </div>

          {/* Multiple Bill Tabs Switcher Bar */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2.5 mb-3 overflow-x-auto no-scrollbar shrink-0">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab.id;
              const itemCount = tab.cart.reduce((sum, i) => sum + i.quantity, 0);
              const tabDisplayName = tab.customerName ? `${tab.title} (${tab.customerName})` : tab.title;

              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group relative px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer select-none whitespace-nowrap border ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Receipt className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                  <span className="truncate max-w-[90px] sm:max-w-[110px]">{tabDisplayName}</span>

                  {itemCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {itemCount}
                    </span>
                  )}

                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    title="Close tab"
                    className={`p-0.5 rounded-full hover:bg-rose-500/20 hover:text-rose-300 transition ${
                      isActive ? 'text-white/70 hover:text-white' : 'text-slate-500'
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={handleAddNewTab}
              title="Create New Bill Tab"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 flex items-center gap-1 transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> + New Tab
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-blue-400" /> Checkout Register ({activeTab.title})
              </h3>
              {user && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Operator: <strong className="text-emerald-400">{user.full_name}</strong> ({user.role})
                </p>
              )}
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {cart.length} Items in Cart
            </span>
          </div>

          {/* Customer Input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={(e) => updateActiveTab({ customerName: e.target.value })}
                className="w-full pl-8 pr-2 py-1.5 rounded-lg glass-input text-xs"
              />
            </div>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="WhatsApp Phone #"
                value={customerPhone}
                onChange={(e) => updateActiveTab({ customerPhone: e.target.value })}
                className="w-full pl-8 pr-2 py-1.5 rounded-lg glass-input text-xs"
              />
            </div>
          </div>

          {/* Excel-Style Barcode Direct Entry Row inside Bill Box */}
          <div className="relative mb-3 p-2.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 shadow-xl space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-blue-300">
              <span className="flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-blue-400" /> Excel Barcode Entry Row
              </span>
              <span className="text-slate-400 font-medium">Type / Scan Barcode & Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-white font-mono text-[9px]">Enter ↵</kbd></span>
            </div>

            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={excelInputRef}
                  type="text"
                  placeholder="Enter Barcode / Scan Gun (e.g. 89010010001)..."
                  value={excelInput}
                  onFocus={() => setShowExcelDropdown(true)}
                  onChange={(e) => {
                    setExcelInput(e.target.value);
                    setShowExcelDropdown(true);
                    setExcelSelectedIndex(0);
                  }}
                  onKeyDown={handleExcelKeyDown}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />

                {/* Autocomplete Dropdown for Excel Row */}
                {showExcelDropdown && excelInput.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 shadow-2xl rounded-xl z-50 overflow-hidden max-h-48 overflow-y-auto backdrop-blur-xl">
                    {matchingExcelProducts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No item found for barcode "<strong className="text-white">{excelInput}</strong>"
                      </div>
                    ) : (
                      matchingExcelProducts.map((p, idx) => (
                        <div
                          key={p.id}
                          onClick={() => handleAddExcelProduct(p)}
                          className={`p-2 px-3 flex items-center justify-between text-xs cursor-pointer border-b border-slate-800/60 transition ${
                            idx === excelSelectedIndex
                              ? 'bg-blue-600/30 text-white font-bold border-l-4 border-l-blue-500'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-blue-400 text-[10px] px-1 py-0.5 bg-slate-950 rounded border border-slate-800">{p.barcode}</span>
                            <span>{p.name}</span>
                          </div>
                          <span className="font-bold text-emerald-400">{formatCurrency(p.selling_price)}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const exact = products.find((p) => p.barcode.toLowerCase() === excelInput.trim().toLowerCase());
                  const target = exact || matchingExcelProducts[excelSelectedIndex] || matchingExcelProducts[0];
                  if (target) handleAddExcelProduct(target);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md transition whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>
          </div>

          {/* Cart Table with Dual Quantity Controls (Manual Typing & +/- Buttons) */}
          <div className="max-h-[260px] sm:max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {cart.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-500">Cart is empty for {activeTab.title}. Click catalog items or scan barcode gun.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product_id} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {formatCurrency(item.unit_price)} x {item.quantity} = <span className="text-emerald-400 font-bold">{formatCurrency(item.unit_price * item.quantity)}</span>
                    </p>
                  </div>

                  {/* Dual Quantity Options: Plus/Minus Buttons AND Manual Direct Input Box */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700/80 overflow-hidden">
                      {/* Plus / Minus Button Option */}
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Decrease Quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>

                      {/* Manual Numeric Direct Input Option */}
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) => handleQuantityDirectInput(item.product_id, e.target.value)}
                        className="w-11 py-0.5 text-center text-xs font-bold text-white bg-slate-950 border-x border-slate-800 focus:outline-none focus:border-blue-500"
                        title="Type exact quantity manually"
                      />

                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="Increase Quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary Totals & Checkout Button */}
        <div className="border-t border-slate-800 pt-3 space-y-2.5 shrink-0">
          <div className="space-y-1 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Subtotal:</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tax Breakdown (GST/VAT):</span>
              <span className="font-semibold text-amber-400">+{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Discount ({currencySymbol}):</span>
              <input
                type="number"
                value={discountAmount}
                onChange={(e) => updateActiveTab({ discountAmount: parseFloat(e.target.value) || 0 })}
                className="w-20 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-right text-xs text-white"
              />
            </div>
            <div className="flex justify-between text-sm font-black text-white border-t border-slate-800 pt-1.5">
              <span>Grand Total:</span>
              <span className="text-emerald-400">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: 'UPI_QR', label: 'Payment QR', icon: QrCode },
              { key: 'CASH', label: 'Cash', icon: CreditCard },
              { key: 'CARD', label: 'Card', icon: CreditCard },
            ].map((method) => {
              const Icon = method.icon;
              return (
                <button
                  key={method.key}
                  onClick={() => updateActiveTab({ paymentMethod: method.key })}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition ${
                    paymentMethod === method.key
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {method.label}
                </button>
              );
            })}
          </div>

          {/* Complete Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={isProcessing || cart.length === 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? 'Processing Transaction...' : `Complete & Print Invoice (${formatCurrency(grandTotal)})`}
          </button>
        </div>
      </div>

      {/* Completed Invoice Success Modal */}
      {completedInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Invoice #{completedInvoice.invoice_number}</h3>
              <p className="text-xs text-slate-400 mt-1">Transaction Completed • {formatCurrency(completedInvoice.grand_total)}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-left">
              <p className="text-slate-300">⭐ Includes <b>Google Rating QR Code</b> on PDF</p>
              <p className="text-slate-300">📲 Includes <b>Instant Payment UPI QR</b></p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <a
                href={getPdfDownloadUrl(completedInvoice.pdf_url)}
                target="_blank"
                rel="noreferrer"
                className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" /> Download PDF
              </a>

              {completedInvoice.whatsapp_share_url ? (
                <a
                  href={completedInvoice.whatsapp_share_url}
                  target="_blank"
                  rel="noreferrer"
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> WhatsApp Bill
                </a>
              ) : (
                <button
                  disabled
                  className="py-3 px-4 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs"
                >
                  No WhatsApp Phone
                </button>
              )}
            </div>

            <button
              onClick={() => setCompletedInvoice(null)}
              className="w-full py-2.5 text-xs font-bold text-slate-400 hover:text-white"
            >
              Close & Next Sale
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSTerminal;
