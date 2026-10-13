import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Filter,
  Eye,
  Sliders,
  Settings2,
  FileSpreadsheet,
  FileCode,
  Zap,
  Info,
  ShieldCheck,
  Plus,
  Edit2,
  Check,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ExpensesViewProps {
  getHeaders: () => Record<string, string>;
  isConnected: boolean;
}

// BDT Currency Formatter with high precision for micro-costs
export function formatBDT(amount: number | null | undefined, precision: number = 6): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '৳0.00';
  if (amount === 0) return '৳0.00';
  if (amount < 0.01) {
    // Show high precision for sub-paisa API calls e.g. ৳0.001343075
    const str = amount.toFixed(Math.max(6, Math.min(9, precision)));
    // Trim unnecessary trailing zeros past 6 digits
    return `৳${str.replace(/(\.\d{6,})0+$/, '$1')}`;
  }
  return `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export function ExpensesView({ getHeaders, isConnected }: ExpensesViewProps) {
  // Navigation sub-tabs within Expenses
  const [subTab, setSubTab] = useState<'overview' | 'logs' | 'analytics' | 'tokens' | 'pricing' | 'config'>('overview');

  // Date Range state
  const [datePreset, setDatePreset] = useState<'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'all' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Overview metrics state
  const [overview, setOverview] = useState<any>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);

  // Request logs state
  const [logsData, setLogsData] = useState<{ items: any[]; page: number; limit: number; totalCount: number; totalPages: number }>({
    items: [],
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1
  });
  const [logSearch, setLogSearch] = useState('');
  const [logModelFilter, setLogModelFilter] = useState('all');
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logUsageFilter, setLogUsageFilter] = useState('all');
  const [logSortBy, setLogSortBy] = useState('timestamp');
  const [logSortOrder, setLogSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Model pricing state
  const [modelsList, setModelsList] = useState<any[]>([]);
  const [pricingHistory, setPricingHistory] = useState<any[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<any | null>(null);
  const [isRecalculateModalOpen, setIsRecalculateModalOpen] = useState(false);
  const [recalculateTargetModel, setRecalculateTargetModel] = useState('');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculateMessage, setRecalculateMessage] = useState('');

  // Config & Test state
  const [apiConfig, setApiConfig] = useState<any>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testApiResult, setTestApiResult] = useState<any | null>(null);

  // Fetch Overview Data
  const fetchOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const params = new URLSearchParams();
      params.set('preset', datePreset);
      if (datePreset === 'custom') {
        if (customStart) params.set('startDate', customStart);
        if (customEnd) params.set('endDate', customEnd);
      }
      const res = await fetch(`/api/expenses/overview?${params.toString()}`, { headers: getHeaders() });
      if (res.ok) {
        setOverview(await res.json());
      }
    } catch (err) {
      console.error('Failed to load expenses overview', err);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  // Fetch Logs Data
  const fetchLogs = async (page: number = logsData.page) => {
    setIsLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(logsData.limit));
      params.set('preset', datePreset);
      if (datePreset === 'custom') {
        if (customStart) params.set('startDate', customStart);
        if (customEnd) params.set('endDate', customEnd);
      }
      if (logSearch.trim()) params.set('search', logSearch.trim());
      if (logModelFilter !== 'all') params.set('model', logModelFilter);
      if (logStatusFilter !== 'all') params.set('status', logStatusFilter);
      if (logUsageFilter !== 'all') params.set('usageAvailable', logUsageFilter);
      params.set('sortBy', logSortBy);
      params.set('sortOrder', logSortOrder);

      const res = await fetch(`/api/expenses/logs?${params.toString()}`, { headers: getHeaders() });
      if (res.ok) {
        setLogsData(await res.json());
      }
    } catch (err) {
      console.error('Failed to load expenses logs', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Fetch Analytics Data
  const fetchAnalytics = async () => {
    setIsLoadingAnalytics(true);
    try {
      const params = new URLSearchParams();
      params.set('preset', datePreset);
      if (datePreset === 'custom') {
        if (customStart) params.set('startDate', customStart);
        if (customEnd) params.set('endDate', customEnd);
      }
      const res = await fetch(`/api/expenses/analytics?${params.toString()}`, { headers: getHeaders() });
      if (res.ok) {
        setAnalytics(await res.json());
      }
    } catch (err) {
      console.error('Failed to load expenses analytics', err);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Fetch Model Pricing
  const fetchPricing = async () => {
    setIsLoadingPricing(true);
    try {
      const res = await fetch('/api/expenses/models', { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setModelsList(data.models || []);
        setPricingHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load model pricing', err);
    } finally {
      setIsLoadingPricing(false);
    }
  };

  // Fetch API Configuration
  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/expenses/config', { headers: getHeaders() });
      if (res.ok) {
        setApiConfig(await res.json());
      }
    } catch (err) {
      console.error('Failed to load API config', err);
    }
  };

  // Handle Export (CSV or JSON)
  const handleExport = (format: 'csv' | 'json') => {
    const params = new URLSearchParams();
    params.set('format', format);
    params.set('preset', datePreset);
    if (datePreset === 'custom') {
      if (customStart) params.set('startDate', customStart);
      if (customEnd) params.set('endDate', customEnd);
    }
    if (logModelFilter !== 'all') params.set('model', logModelFilter);
    if (logStatusFilter !== 'all') params.set('status', logStatusFilter);

    window.open(`/api/expenses/export?${params.toString()}`, '_blank');
  };

  // Handle Safe Progga Connection Test
  const handleTestProgga = async () => {
    setIsTestingApi(true);
    setTestApiResult(null);
    try {
      const res = await fetch('/api/expenses/test-progga', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ prompt: 'Ping from Bohurupi OpsCenter Expenses' })
      });
      const data = await res.json();
      setTestApiResult(data);
      await fetchConfig();
      await fetchOverview();
    } catch (err: any) {
      setTestApiResult({ success: false, error: err.message || 'Connection test failed' });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Handle Save Model Pricing
  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;

    try {
      const res = await fetch('/api/expenses/models', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...editingModel,
          inputPricePerMillion: parseFloat(editingModel.inputPricePerMillion),
          outputPricePerMillion: parseFloat(editingModel.outputPricePerMillion),
          cachedInputPricePerMillion: parseFloat(editingModel.cachedInputPricePerMillion)
        })
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditingModel(null);
        await fetchPricing();
      }
    } catch (err) {
      console.error('Failed to save model pricing', err);
    }
  };

  // Handle Set Default Model
  const handleSetDefaultModel = async (modelKey: string) => {
    try {
      const res = await fetch('/api/expenses/models/set-default', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ model: modelKey })
      });
      if (res.ok) {
        await fetchPricing();
      }
    } catch (err) {
      console.error('Failed to set default model', err);
    }
  };

  // Handle Recalculation
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setRecalculateMessage('');
    try {
      const res = await fetch('/api/expenses/recalculate', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          confirm: true,
          model: recalculateTargetModel || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRecalculateMessage(`Successfully recalculated ${data.recalculatedCount} records while preserving audit history.`);
        await fetchOverview();
        await fetchLogs(1);
        await fetchAnalytics();
      } else {
        setRecalculateMessage(`Error: ${data.error || 'Failed to recalculate'}`);
      }
    } catch (err: any) {
      setRecalculateMessage(`Error: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Reload data when datePreset or subTab changes
  useEffect(() => {
    fetchOverview();
    if (subTab === 'logs') fetchLogs(1);
    if (subTab === 'analytics' || subTab === 'tokens') fetchAnalytics();
    if (subTab === 'pricing') fetchPricing();
    if (subTab === 'config') fetchConfig();
  }, [subTab, datePreset, customStart, customEnd]);

  // Initial load
  useEffect(() => {
    fetchOverview();
    fetchConfig();
    fetchPricing();
  }, []);

  return (
    <div className="flex flex-col gap-6 text-neutral-200">
      {/* Top Header Banner with Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-sm">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Expenses & Progga API Tracking</h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
                Live BDT (৳)
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Accurate token accounting, configurable DeepSeek V4 pricing, and cost intelligence for Progga inference.
            </p>
          </div>
        </div>

        {/* Global Date Range Selector */}
        <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 p-1.5 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-neutral-400 ml-1.5" />
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as any)}
            className="bg-transparent border-none text-neutral-200 font-medium focus:ring-0 cursor-pointer pr-3 py-1"
          >
            <option value="today" className="bg-neutral-900">Today</option>
            <option value="7d" className="bg-neutral-900">Last 7 Days</option>
            <option value="30d" className="bg-neutral-900">Last 30 Days</option>
            <option value="this_month" className="bg-neutral-900">This Month</option>
            <option value="last_month" className="bg-neutral-900">Last Month</option>
            <option value="all" className="bg-neutral-900">All Time</option>
            <option value="custom" className="bg-neutral-900">Custom Date Range</option>
          </select>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-800">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-[11px] text-neutral-200"
              />
              <span className="text-neutral-500">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded px-2 py-0.5 text-[11px] text-neutral-200"
              />
            </div>
          )}

          <button
            onClick={() => {
              fetchOverview();
              if (subTab === 'logs') fetchLogs();
              if (subTab === 'analytics' || subTab === 'tokens') fetchAnalytics();
              if (subTab === 'config') fetchConfig();
            }}
            title="Refresh current view"
            className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOverview ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-800 pb-2 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'logs', label: 'API Request Logs', icon: Clock },
          { id: 'analytics', label: 'Cost Analytics', icon: DollarSign },
          { id: 'tokens', label: 'Token Usage', icon: Cpu },
          { id: 'pricing', label: 'Model Pricing', icon: Sliders },
          { id: 'config', label: 'API Configuration', icon: Settings2 }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 1. OVERVIEW VIEW */}
      {/* ======================================================== */}
      {subTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Top 10 Dashboard Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Card 1: Total API Expenses */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Total Expenses (Range)</span>
                <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400">৳</span>
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {formatBDT(overview?.totalExpenses, 6)}
              </div>
              {overview?.preTrackingBaselineExpenses > 0 && (
                <div className="text-[10px] text-amber-400 font-sans mt-0.5 font-medium flex items-center gap-1">
                  <span>Incl. ৳{Number(overview.preTrackingBaselineExpenses).toFixed(5)} pre-feature baseline</span>
                </div>
              )}
              <div className="text-[11px] text-neutral-500 mt-1">
                Precision accounting in BDT
              </div>
            </div>

            {/* Card 2: Today's Expenses */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Today's Expenses</span>
                <span className="p-1 rounded-md bg-blue-500/10 text-blue-400">24h</span>
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {formatBDT(overview?.todayExpenses, 6)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Calculated since 00:00 local
              </div>
            </div>

            {/* Card 3: Expenses This Month */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Expenses This Month</span>
                <span className="p-1 rounded-md bg-purple-500/10 text-purple-400">MTD</span>
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {formatBDT(overview?.thisMonthExpenses, 6)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Current billing cycle total
              </div>
            </div>

            {/* Card 4: Total API Requests */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Total API Requests</span>
                <Layers className="w-3.5 h-3.5 text-neutral-400" />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {(overview?.totalRequests || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Completed Progga calls
              </div>
            </div>

            {/* Card 5: Successful Requests */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Successful Requests</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400 tracking-tight">
                {(overview?.successfulRequests || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                {overview?.totalRequests > 0
                  ? `${Math.round(((overview?.successfulRequests || 0) / overview?.totalRequests) * 100)}% Success Rate`
                  : '100% Rate'}
              </div>
            </div>

            {/* Card 6: Failed Requests */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Failed Requests</span>
                <XCircle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <div className="text-xl font-bold text-red-400 tracking-tight">
                {(overview?.failedRequests || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Recorded & error tracked
              </div>
            </div>

            {/* Card 7: Total Input Tokens */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Total Input Tokens</span>
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {(overview?.totalInputTokens || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Prompt & context tokens
              </div>
            </div>

            {/* Card 8: Total Output Tokens */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Total Output Tokens</span>
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {(overview?.totalOutputTokens || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Completion tokens generated
              </div>
            </div>

            {/* Card 9: Total Cached Input Tokens */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Cached Input Tokens</span>
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-emerald-400 tracking-tight">
                {(overview?.totalCachedInputTokens || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Discounted rate (৳0.50/1M)
              </div>
            </div>

            {/* Card 10: Average Cost Per Request */}
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl flex flex-col justify-between hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                <span>Avg Cost / Request</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl font-bold text-white tracking-tight">
                {formatBDT(overview?.averageCostPerRequest, 6)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Across {overview?.totalRequests || 0} calls
              </div>
            </div>
          </div>

          {/* Pre-Tracking Historical Baseline Notice */}
          {overview?.preTrackingBaselineExpenses > 0 && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-amber-200">
                    Pre-Tracking Expense Baseline Active: ৳{Number(overview.preTrackingBaselineExpenses).toFixed(5)} BDT
                  </div>
                  <div className="text-neutral-400 text-[11px] mt-0.5">
                    Covers historical Progga API inference accrued before expenses tracking feature deployment (Step 393). Fully consolidated into all metrics.
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                Historical Audit Baseline
              </span>
            </div>
          )}

          {/* Pricing Highlight & Billing Assumptions Notice */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white">Active Model Pricing: DeepSeek V4 Flash 0731 (BDT)</h4>
                <p className="text-xs text-neutral-400 mt-1">
                  Input Tokens: <strong className="text-neutral-200">৳14.45 / 1M</strong> &bull; Output Tokens: <strong className="text-neutral-200">৳28.875 / 1M</strong> &bull; Cached Input: <strong className="text-neutral-200">৳0.50 / 1M</strong>.
                  Standard input tokens are strictly calculated as <code className="text-emerald-400 font-mono text-[11px]">max(0, prompt_tokens - cached_input_tokens)</code> to prevent double-counting.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSubTab('pricing')}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              Manage Pricing
            </button>
          </div>

          {/* Quick Overview Charts Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Cost Breakdown Area Chart */}
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
              <h3 className="text-sm font-bold text-white mb-1">Expenses Distribution (BDT)</h3>
              <p className="text-xs text-neutral-500 mb-4">Input vs Output vs Cached Token Cost</p>
              <div className="h-64 w-full">
                {analytics?.timeSeries && analytics.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorInput" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="date" stroke="#737373" fontSize={11} />
                      <YAxis stroke="#737373" fontSize={11} tickFormatter={(v) => `৳${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(val: any) => [`৳${Number(val).toFixed(6)}`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#a3a3a3' }} />
                      <Area type="monotone" dataKey="outputCost" name="Output Cost (৳)" stroke="#f59e0b" fillOpacity={1} fill="urlColorOutput" />
                      <Area type="monotone" dataKey="inputCost" name="Input Cost (৳)" stroke="#06b6d4" fillOpacity={1} fill="urlColorInput" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                    <Receipt className="w-8 h-8 text-neutral-700 mb-2" />
                    No API expense records yet for this period.
                  </div>
                )}
              </div>
            </div>

            {/* Daily Request Volume (Success vs Failure) */}
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
              <h3 className="text-sm font-bold text-white mb-1">Request Reliability & Throughput</h3>
              <p className="text-xs text-neutral-500 mb-4">Successful vs Failed Progga API Calls</p>
              <div className="h-64 w-full">
                {analytics?.timeSeries && analytics.timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="date" stroke="#737373" fontSize={11} />
                      <YAxis stroke="#737373" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#a3a3a3' }} />
                      <Bar dataKey="successfulRequests" name="Successful" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="failedRequests" name="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                    <Layers className="w-8 h-8 text-neutral-700 mb-2" />
                    No request history yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. DETAILED API REQUEST LOGS VIEW */}
      {/* ======================================================== */}
      {subTab === 'logs' && (
        <div className="flex flex-col gap-4 bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-lg">
          {/* Action & Filter Toolbar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Request ID, model, error..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchLogs(1)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Model Filter */}
              <select
                value={logModelFilter}
                onChange={(e) => { setLogModelFilter(e.target.value); }}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Models</option>
                <option value="deepseek-v4-flash-0731">deepseek-v4-flash-0731</option>
                {modelsList.map(m => (
                  <option key={m.id} value={m.model}>{m.displayName || m.model}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={logStatusFilter}
                onChange={(e) => { setLogStatusFilter(e.target.value); }}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success Only</option>
                <option value="failure">Failure Only</option>
              </select>

              {/* Usage Availability Filter */}
              <select
                value={logUsageFilter}
                onChange={(e) => { setLogUsageFilter(e.target.value); }}
                className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="all">Usage Status</option>
                <option value="yes">Usage Available</option>
                <option value="no">Usage Missing / Provisional</option>
              </select>

              <button
                onClick={() => fetchLogs(1)}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>

            {/* Actions: Refresh & Export */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(logsData.page)}
                disabled={isLoadingLogs}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Export filtered records to CSV (Secrets excluded)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export CSV
              </button>

              <button
                onClick={() => handleExport('json')}
                className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Export filtered records to JSON (Secrets excluded)"
              >
                <FileCode className="w-3.5 h-3.5" />
                Export JSON
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-lg border border-neutral-800">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-[10px] border-b border-neutral-800">
                <tr>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Provider</th>
                  <th className="py-3 px-3">Model</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Latency</th>
                  <th className="py-3 px-3">Input</th>
                  <th className="py-3 px-3">Cached</th>
                  <th className="py-3 px-3">Output</th>
                  <th className="py-3 px-3">Total Tokens</th>
                  <th className="py-3 px-3">Input Cost</th>
                  <th className="py-3 px-3">Output Cost</th>
                  <th className="py-3 px-3 font-bold text-white">Total Cost (৳)</th>
                  <th className="py-3 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-mono text-[11px]">
                {logsData.items.length > 0 ? (
                  logsData.items.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-neutral-400">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        <span className="block text-[9px] text-neutral-600 font-sans">{new Date(log.timestamp).toISOString().slice(0, 10)}</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300 font-mono text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span title={log.request_id}>
                            {log.request_id.slice(0, 14)}...
                          </span>
                          {log.metadata?.is_pre_tracking_baseline && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                              Baseline
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400 font-sans">{log.provider}</td>
                      <td className="py-2.5 px-3 text-neutral-300 font-sans">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-[10px]">
                          {log.model}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-sans">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> {log.http_status || 200}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <XCircle className="w-3 h-3" /> {log.http_status || 'ERR'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">{log.latency_ms}ms</td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        {log.usage_available ? (log.prompt_tokens ?? 0) : <span className="text-neutral-600">--</span>}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400">
                        {log.usage_available ? (log.cached_tokens ?? 0) : <span className="text-neutral-600">--</span>}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300">
                        {log.usage_available ? (log.completion_tokens ?? 0) : <span className="text-neutral-600">--</span>}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-neutral-200">
                        {log.usage_available ? (log.total_tokens ?? 0) : <span className="text-neutral-600">Unavailable</span>}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">
                        {log.usage_available ? formatBDT(log.standard_input_cost, 6) : '--'}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">
                        {log.usage_available ? formatBDT(log.output_cost, 6) : '--'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-400">
                        {log.usage_available ? (
                          formatBDT(log.total_cost, 6)
                        ) : (
                          <span className="text-amber-500/90 text-[10px] font-sans font-medium">Provisional</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] flex items-center gap-1 cursor-pointer mx-auto"
                          title="View Accounting Breakdown & Metadata"
                        >
                          <Eye className="w-3 h-3" /> Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={14} className="py-8 text-center text-neutral-500 text-xs">
                      {isLoadingLogs ? 'Loading request logs...' : 'No API request logs match your current filter criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between text-xs text-neutral-400 pt-2">
            <div>
              Showing {logsData.items.length} of {logsData.totalCount} recorded requests
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => fetchLogs(logsData.page - 1)}
                disabled={logsData.page <= 1}
                className="px-3 py-1 rounded bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 py-1 text-neutral-300">
                Page {logsData.page} of {logsData.totalPages}
              </span>
              <button
                onClick={() => fetchLogs(logsData.page + 1)}
                disabled={logsData.page >= logsData.totalPages}
                className="px-3 py-1 rounded bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. COST ANALYTICS VIEW */}
      {/* ======================================================== */}
      {subTab === 'analytics' && (
        <div className="flex flex-col gap-6">
          {/* Main Time-series Chart: API Expenses Over Time */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">API Expenses Over Time (BDT)</h3>
                <p className="text-xs text-neutral-500">Historical trend showing cost progression per calendar day</p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                BDT (৳)
              </span>
            </div>

            <div className="h-72 w-full">
              {analytics?.timeSeries && analytics.timeSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.timeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" fontSize={11} />
                    <YAxis stroke="#737373" fontSize={11} tickFormatter={(v) => `৳${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`৳${Number(val).toFixed(6)}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#a3a3a3' }} />
                    <Line type="monotone" dataKey="expenses" name="Total Daily Expense (৳)" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="avgCostPerRequest" name="Avg Cost/Req (৳)" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                  <Receipt className="w-8 h-8 text-neutral-700 mb-2" />
                  No analytics data available for selected range.
                </div>
              )}
            </div>
          </div>

          {/* Model & Provider Distribution Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cost by Model */}
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
              <h3 className="text-sm font-bold text-white mb-1">Expenses by Model</h3>
              <p className="text-xs text-neutral-500 mb-4">Total accumulated cost per AI model architecture</p>
              <div className="h-60 w-full">
                {analytics?.costByModel && analytics.costByModel.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.costByModel} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis type="number" stroke="#737373" fontSize={11} tickFormatter={(v) => `৳${v}`} />
                      <YAxis type="category" dataKey="model" stroke="#737373" fontSize={11} width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(val: any) => [`৳${Number(val).toFixed(6)}`, 'Total Cost']}
                      />
                      <Bar dataKey="totalCost" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                    No model data available.
                  </div>
                )}
              </div>
            </div>

            {/* Input vs Output Expense Ratio */}
            <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
              <h3 className="text-sm font-bold text-white mb-1">Input vs Output Cost Ratio</h3>
              <p className="text-xs text-neutral-500 mb-4">Distribution between prompt ingestion and completion output</p>
              <div className="h-60 w-full flex items-center justify-center">
                {overview && (overview.totalInputTokens > 0 || overview.totalOutputTokens > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Standard Input Cost', value: overview.totalExpenses > 0 ? (overview.totalInputTokens * 14.45 / 1000000) : 1 },
                          { name: 'Cached Input Cost', value: overview.totalExpenses > 0 ? (overview.totalCachedInputTokens * 0.50 / 1000000) : 0 },
                          { name: 'Output Cost', value: overview.totalExpenses > 0 ? (overview.totalOutputTokens * 28.875 / 1000000) : 1 }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        <Cell fill="#06b6d4" />
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
                        formatter={(val: any) => [`৳${Number(val).toFixed(6)}`, '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', color: '#a3a3a3' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-neutral-500 text-xs">No cost distribution data yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TOKEN USAGE DEEP DIVE VIEW */}
      {/* ======================================================== */}
      {subTab === 'tokens' && (
        <div className="flex flex-col gap-6">
          {/* Token Totals Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
              <span className="text-xs text-neutral-400">Total Tokens Processed</span>
              <div className="text-2xl font-bold text-white mt-1">
                {((overview?.totalInputTokens || 0) + (overview?.totalOutputTokens || 0)).toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">Prompt + Completion</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
              <span className="text-xs text-neutral-400">Prompt Tokens (Input)</span>
              <div className="text-2xl font-bold text-cyan-400 mt-1">
                {(overview?.totalInputTokens || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">Rate: ৳14.45 / 1M</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
              <span className="text-xs text-neutral-400">Cached Tokens (Discounted)</span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {(overview?.totalCachedInputTokens || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">Rate: ৳0.50 / 1M (~96.5% savings!)</p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
              <span className="text-xs text-neutral-400">Completion Tokens (Output)</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {(overview?.totalOutputTokens || 0).toLocaleString()}
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">Rate: ৳28.875 / 1M</p>
            </div>
          </div>

          {/* Token Trends Over Time */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl shadow-lg">
            <h3 className="text-sm font-bold text-white mb-1">Token Throughput Over Time</h3>
            <p className="text-xs text-neutral-500 mb-4">Prompt tokens vs Completion tokens vs Cached tokens per day</p>
            <div className="h-72 w-full">
              {analytics?.timeSeries && analytics.timeSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.timeSeries} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" fontSize={11} />
                    <YAxis stroke="#737373" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#a3a3a3' }} />
                    <Bar dataKey="promptTokens" name="Prompt Tokens" fill="#06b6d4" stackId="a" />
                    <Bar dataKey="cachedTokens" name="Cached Tokens" fill="#10b981" stackId="b" />
                    <Bar dataKey="outputTokens" name="Output Tokens" fill="#f59e0b" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs">
                  No token usage trends recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODEL PRICING MANAGEMENT VIEW */}
      {/* ======================================================== */}
      {subTab === 'pricing' && (
        <div className="flex flex-col gap-6">
          {/* Top Model Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-5 rounded-xl">
            <div>
              <h3 className="text-sm font-bold text-white">Configurable Model Pricing System</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Manage BDT pricing rates per 1M tokens. Historical requests retain snapshots to preserve accounting integrity.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingModel({
                    model: '',
                    displayName: '',
                    inputPricePerMillion: 14.45,
                    outputPricePerMillion: 28.875,
                    cachedInputPricePerMillion: 0.50,
                    enabled: true,
                    isDefault: false
                  });
                  setIsEditModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Model
              </button>

              <button
                onClick={() => {
                  setRecalculateTargetModel('');
                  setIsRecalculateModalOpen(true);
                }}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                title="Explicitly recalculate historical records with updated rates"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Recalculate History...
              </button>
            </div>
          </div>

          {/* Pricing Table */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-[10px] border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Model & Name</th>
                    <th className="py-3 px-4">Standard Input Rate</th>
                    <th className="py-3 px-4">Output Rate</th>
                    <th className="py-3 px-4">Cached Input Rate</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Default</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 font-mono text-[11px]">
                  {modelsList.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-sans font-semibold text-white block">{m.displayName || m.model}</span>
                        <span className="text-[10px] text-neutral-500">{m.model}</span>
                      </td>
                      <td className="py-3 px-4 text-cyan-400 font-bold">
                        ৳{Number(m.inputPricePerMillion).toFixed(2)} <span className="text-[10px] text-neutral-500 font-normal">/ 1M tokens</span>
                      </td>
                      <td className="py-3 px-4 text-amber-400 font-bold">
                        ৳{Number(m.outputPricePerMillion).toFixed(3)} <span className="text-[10px] text-neutral-500 font-normal">/ 1M tokens</span>
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        ৳{Number(m.cachedInputPricePerMillion).toFixed(2)} <span className="text-[10px] text-neutral-500 font-normal">/ 1M tokens</span>
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {m.enabled ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-semibold">
                            Disabled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {m.isDefault ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                            Default
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetDefaultModel(m.model)}
                            className="text-neutral-500 hover:text-neutral-300 text-[10px] cursor-pointer"
                          >
                            Set Default
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-4 text-neutral-400 font-sans text-[10px]">
                        {new Date(m.updatedAt).toLocaleDateString()}
                        <span className="block text-neutral-600">{m.updatedBy || 'System'}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingModel({ ...m });
                            setIsEditModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-sans inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing Change History Audit Log */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-xl shadow-lg">
            <h4 className="text-sm font-bold text-white mb-2">Pricing Audit Trail & History</h4>
            <p className="text-xs text-neutral-500 mb-4">Historical record of pricing modifications and rate adjustments</p>
            {pricingHistory.length > 0 ? (
              <div className="space-y-2.5">
                {pricingHistory.slice(0, 10).map((h) => (
                  <div key={h.id} className="bg-neutral-950 border border-neutral-800/80 p-3 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-neutral-200">{h.model}</span>
                      <span className="text-neutral-500 ml-2">({h.action})</span>
                      <span className="text-neutral-400 block text-[11px] mt-0.5">
                        In: ৳{h.newPricing?.inputPricePerMillion}/M | Out: ৳{h.newPricing?.outputPricePerMillion}/M | Cached: ৳{h.newPricing?.cachedInputPricePerMillion}/M
                      </span>
                    </div>
                    <div className="text-right text-[11px] text-neutral-500">
                      <span>{new Date(h.timestamp).toLocaleString()}</span>
                      <span className="block text-neutral-600">by {h.updatedBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic">No historical price changes recorded yet.</p>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. API CONFIGURATION VIEW */}
      {/* ======================================================== */}
      {subTab === 'config' && (
        <div className="flex flex-col gap-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-neutral-800 pb-5">
              <div>
                <h3 className="text-base font-bold text-white">Progga API Integration Configuration</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Server-side connection parameters, model endpoint health, and real-time inference telemetry.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                  apiConfig?.hasKeyConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {apiConfig?.hasKeyConfigured ? 'PROGGA_KEY Active' : 'API Key Missing'}
                </span>
              </div>
            </div>

            {/* Config Specs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Provider</span>
                <div className="text-lg font-bold text-white mt-1">Progga AI</div>
                <p className="text-xs text-neutral-500 mt-1">OpenAI-compatible inference gateway</p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">API Base URL</span>
                <div className="text-sm font-mono font-bold text-emerald-400 mt-1 break-all">
                  {apiConfig?.baseUrl || 'https://api.progga.app/v1'}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Endpoint: /chat/completions</p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Configured Model</span>
                <div className="text-base font-bold text-white mt-1 font-mono">
                  {apiConfig?.configuredModel || 'deepseek-v4-flash-0731'}
                </div>
                <p className="text-xs text-neutral-500 mt-1">{apiConfig?.defaultModelDisplayName || 'DeepSeek V4 Flash 0731'}</p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Last Successful Request</span>
                <div className="text-sm font-bold text-emerald-400 mt-1 font-mono">
                  {apiConfig?.lastSuccessfulRequest
                    ? `${new Date(apiConfig.lastSuccessfulRequest.timestamp).toLocaleTimeString()} (${apiConfig.lastSuccessfulRequest.latencyMs}ms)`
                    : 'No requests yet'}
                </div>
                <p className="text-xs text-neutral-500 mt-1 font-mono text-[10px] truncate">
                  {apiConfig?.lastSuccessfulRequest?.requestId || '--'}
                </p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Last Failed Request</span>
                <div className="text-sm font-bold text-red-400 mt-1 font-mono truncate">
                  {apiConfig?.lastFailedRequest
                    ? `${new Date(apiConfig.lastFailedRequest.timestamp).toLocaleTimeString()} (${apiConfig.lastFailedRequest.error})`
                    : 'None (Healthy)'}
                </div>
                <p className="text-xs text-neutral-500 mt-1 font-mono text-[10px]">
                  {apiConfig?.lastFailedRequest?.requestId || '--'}
                </p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Total Known Expenses</span>
                <div className="text-lg font-bold text-white mt-1">
                  {formatBDT(apiConfig?.totalKnownExpenses, 6)}
                </div>
                <p className="text-xs text-neutral-500 mt-1">Across all recorded requests</p>
              </div>
            </div>

            {/* Secret Security Policy Notice */}
            <div className="mt-6 p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-neutral-400">
                <strong className="text-neutral-200">Zero-Secret Exposure Guarantee:</strong> The Progga API authorization token (<code className="text-emerald-400">PROGGA_KEY</code>) is stored exclusively in secure server-side environment variables. It is never transmitted to the browser, exposed to frontend bundles, printed in audit exports, or logged in client telemetry.
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="mt-6 pt-5 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-neutral-400">
                Trigger a live health check ping through the backend Progga client to verify latency and token capture.
              </p>
              <button
                onClick={handleTestProgga}
                disabled={isTestingApi || !apiConfig?.hasKeyConfigured}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-md"
              >
                <Zap className={`w-4 h-4 ${isTestingApi ? 'animate-spin' : ''}`} />
                {isTestingApi ? 'Testing Connection...' : 'Test Progga Connection'}
              </button>
            </div>

            {/* Test Connection Output Feedback */}
            {testApiResult && (
              <div className={`mt-4 p-4 rounded-xl border text-xs font-mono ${
                testApiResult.success
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-950/20 border-red-500/30 text-red-300'
              }`}>
                <div className="flex items-center gap-2 font-bold mb-1">
                  {testApiResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                  {testApiResult.success ? 'Connection Successful!' : 'Connection Failed'}
                </div>
                {testApiResult.latencyMs && <div>Roundtrip Latency: {testApiResult.latencyMs}ms</div>}
                {testApiResult.output && <div>Sample Output: "{testApiResult.output}"</div>}
                {testApiResult.error && <div>Error: {testApiResult.error}</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIEW REQUEST LOG DETAILS */}
      {/* ======================================================== */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">API Accounting Breakdown</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-neutral-950 p-4 rounded-xl border border-neutral-800 font-mono">
              <div>
                <span className="text-neutral-500 block text-[10px] font-sans">Request ID</span>
                <span className="text-neutral-200 select-all font-semibold">{selectedLog.request_id}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] font-sans">Timestamp</span>
                <span className="text-neutral-200">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] font-sans">Provider & Model</span>
                <span className="text-neutral-200">{selectedLog.provider} &bull; {selectedLog.model}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] font-sans">Status & Latency</span>
                <span className={selectedLog.status === 'success' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {selectedLog.status.toUpperCase()} ({selectedLog.http_status}) &bull; {selectedLog.latency_ms}ms
                </span>
              </div>
            </div>

            {/* Token & Cost Breakdown */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Accounting Breakdown</h4>
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-xs space-y-2.5 font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-800/80">
                  <span className="text-neutral-400 font-sans">Prompt Tokens (Raw)</span>
                  <span className="text-neutral-200">{selectedLog.prompt_tokens ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-neutral-800/80">
                  <span className="text-neutral-400 font-sans">Cached Input Tokens</span>
                  <span className="text-emerald-400">{selectedLog.cached_tokens ?? 0}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-neutral-800/80">
                  <span className="text-neutral-400 font-sans">Completion (Output) Tokens</span>
                  <span className="text-neutral-200">{selectedLog.completion_tokens ?? 'N/A'}</span>
                </div>
                {selectedLog.reasoning_tokens > 0 && (
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-800/80">
                    <span className="text-neutral-400 font-sans">Reasoning Tokens (Subset of Output)</span>
                    <span className="text-purple-400">{selectedLog.reasoning_tokens}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-2 border-b border-neutral-800/80">
                  <span className="text-neutral-400 font-sans">Total Tokens Incurred</span>
                  <span className="text-white font-bold">{selectedLog.total_tokens ?? 'N/A'}</span>
                </div>

                {/* Sub-costs */}
                <div className="flex justify-between items-center pt-1 text-cyan-400">
                  <span className="font-sans text-neutral-400">Standard Input Cost</span>
                  <span>{formatBDT(selectedLog.standard_input_cost, 8)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-400">
                  <span className="font-sans text-neutral-400">Cached Input Cost</span>
                  <span>{formatBDT(selectedLog.cached_input_cost, 8)}</span>
                </div>
                <div className="flex justify-between items-center text-amber-400">
                  <span className="font-sans text-neutral-400">Output Cost</span>
                  <span>{formatBDT(selectedLog.output_cost, 8)}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-800 text-sm font-bold text-emerald-400">
                  <span className="font-sans text-white">Total Calculated Cost</span>
                  <span>{formatBDT(selectedLog.total_cost, 8)}</span>
                </div>
              </div>
            </div>

            {/* Applied Pricing Snapshot */}
            {selectedLog.pricing_snapshot && (
              <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-xl text-[11px] font-mono text-neutral-400">
                <span className="text-neutral-300 font-sans font-bold block mb-1">Pricing Snapshot Applied at Execution</span>
                <div>Model: {selectedLog.pricing_snapshot.model}</div>
                <div>Standard Input Rate: ৳{selectedLog.pricing_snapshot.inputPricePerMillion} / 1M</div>
                <div>Output Rate: ৳{selectedLog.pricing_snapshot.outputPricePerMillion} / 1M</div>
                <div>Cached Rate: ৳{selectedLog.pricing_snapshot.cachedInputPricePerMillion} / 1M</div>
              </div>
            )}

            {/* Historical Baseline explanation if applicable */}
            {selectedLog.metadata?.is_pre_tracking_baseline && (
              <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl text-xs text-amber-200">
                <span className="font-bold flex items-center gap-1.5 font-sans mb-1 text-amber-300">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  Pre-Tracking Baseline Audit Record
                </span>
                <p className="text-neutral-300 text-[11px] leading-relaxed">
                  This record represents <strong>৳0.93375 BDT</strong> in Progga API inference accrued before the expenses tracking feature was introduced (Step 393, 2026-10-13T11:39:33Z). It is permanently archived into application accounting totals.
                </p>
              </div>
            )}

            {/* Error detail if any */}
            {selectedLog.error_message && (
              <div className="bg-red-950/20 border border-red-500/30 p-3 rounded-xl text-xs text-red-300 font-mono">
                <span className="font-bold block font-sans mb-1">Safe Error Detail</span>
                {selectedLog.error_message}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT MODEL PRICING */}
      {/* ======================================================== */}
      {isEditModalOpen && editingModel && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveModel} className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingModel.id ? 'Edit Model Pricing' : 'Add New Model'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Model Identifier (Exact API name)</label>
                <input
                  type="text"
                  required
                  value={editingModel.model}
                  onChange={(e) => setEditingModel({ ...editingModel, model: e.target.value })}
                  placeholder="e.g. deepseek-v4-flash-0731"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={editingModel.displayName}
                  onChange={(e) => setEditingModel({ ...editingModel, displayName: e.target.value })}
                  placeholder="e.g. DeepSeek V4 Flash 0731"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Input Price per 1 Million Tokens (BDT ৳)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={editingModel.inputPricePerMillion}
                  onChange={(e) => setEditingModel({ ...editingModel, inputPricePerMillion: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Output Price per 1 Million Tokens (BDT ৳)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={editingModel.outputPricePerMillion}
                  onChange={(e) => setEditingModel({ ...editingModel, outputPricePerMillion: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Cached Input Price per 1 Million Tokens (BDT ৳)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={editingModel.cachedInputPricePerMillion}
                  onChange={(e) => setEditingModel({ ...editingModel, cachedInputPricePerMillion: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={editingModel.enabled}
                    onChange={(e) => setEditingModel({ ...editingModel, enabled: e.target.checked })}
                    className="rounded bg-neutral-950 border-neutral-800 text-emerald-500 focus:ring-0"
                  />
                  Enabled
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={editingModel.isDefault}
                    onChange={(e) => setEditingModel({ ...editingModel, isDefault: e.target.checked })}
                    className="rounded bg-neutral-950 border-neutral-800 text-emerald-500 focus:ring-0"
                  />
                  Default Model
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Save Pricing
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: HISTORICAL RECALCULATION WITH CONFIRMATION */}
      {/* ======================================================== */}
      {isRecalculateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">Confirm Historical Recalculation</h3>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              By default, every API request preserves its original pricing snapshot to maintain immutable accounting records.
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Recalculating will update past costs with the current configured rates. For auditing purposes, the system will preserve the <strong className="text-neutral-200">original_cost_before_recalculation</strong> value and log a timestamp.
            </p>

            <div className="text-xs">
              <label className="block text-neutral-400 mb-1">Target Model (Leave empty for all models)</label>
              <select
                value={recalculateTargetModel}
                onChange={(e) => setRecalculateTargetModel(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-neutral-200"
              >
                <option value="">All Configured Models</option>
                {modelsList.map(m => (
                  <option key={m.id} value={m.model}>{m.displayName || m.model}</option>
                ))}
              </select>
            </div>

            {recalculateMessage && (
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300">
                {recalculateMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsRecalculateModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRecalculating}
                onClick={handleRecalculate}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
              >
                {isRecalculating ? 'Recalculating...' : 'Confirm Recalculation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
