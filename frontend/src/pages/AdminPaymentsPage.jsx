import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function AdminPaymentsPage() {
  const { authHeaders } = useAuth();
  const [payments, setPayments] = useState([]);
  const [metrics, setMetrics] = useState({
    totalRevenueCents: 0,
    totalRefundedCents: 0,
    pendingRefunds: 0,
    successRate: 100,
    totalCount: 0
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");

  const dateTimeLine = useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" }) + " • " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (methodFilter !== "all") params.append("paymentMethod", methodFilter);
      
      const res = await api.get(`/payments/admin/all-payments?${params.toString()}`, authHeaders);
      setPayments(res.data.payments || []);
      setMetrics(res.data.metrics || {
        totalRevenueCents: 0,
        totalRefundedCents: 0,
        pendingRefunds: 0,
        successRate: 100,
        totalCount: 0
      });
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHeaders, statusFilter, methodFilter]);

  const formatLkr = (cents) => {
    return `LKR ${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "-";
    }
  };

  const getStatusBadge = (status) => {
    if (status === "paid") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
          <span className="material-symbols-outlined text-[14px] mr-1">check_circle</span>
          PAID
        </span>
      );
    }
    if (status === "refunded") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <span className="material-symbols-outlined text-[14px] mr-1">replay</span>
          REFUNDED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
        {status?.toUpperCase()}
      </span>
    );
  };

  const getMethodIcon = (method) => {
    if (method === "stripe") return "credit_card";
    if (method === "helakuru") return "account_balance";
    return "payments";
  };

  return (
    <div className="font-body text-on-surface pb-10">
      {message ? (
        <p className="mb-4 rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm font-medium border border-red-100">{message}</p>
      ) : null}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline tracking-tighter text-on-surface">Payments Management</h2>
          <p className="text-on-surface-variant font-medium mt-1">{dateTimeLine}</p>
        </div>
      </div>

      {/* Bento metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-emerald-700 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">account_balance_wallet</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Gross Revenue</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{formatLkr(metrics.totalRevenueCents)}</div>
          <div className="mt-2 text-xs text-emerald-700 font-semibold">Total processed payments</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">history</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Refunded</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{formatLkr(metrics.totalRefundedCents)}</div>
          <div className="mt-2 text-xs text-on-surface-variant">{metrics.pendingRefunds} refund transactions</div>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg ring-1 ring-emerald-200/80">
              <span className="material-symbols-outlined text-emerald-800">check_circle</span>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Success Rate</span>
          </div>
          <div className="text-4xl font-black font-headline tracking-tight text-on-surface">{metrics.successRate}%</div>
          <div className="mt-2 text-xs text-on-surface-variant">{metrics.totalCount} total transactions</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          className="bg-white border border-emerald-200/70 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-sm cursor-pointer appearance-none min-w-[140px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          className="bg-white border border-emerald-200/70 rounded-xl px-4 py-2 text-sm font-semibold text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none shadow-sm cursor-pointer appearance-none min-w-[140px]"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
        >
          <option value="all">All Methods</option>
          <option value="stripe">Stripe</option>
          <option value="helakuru">Helakuru</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-emerald-100 bg-emerald-50/50">
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Transaction</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Patient/Doctor</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Amount</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Status</th>
              <th className="text-left p-4 font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-on-surface-variant font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-5xl opacity-20 animate-spin">refresh</span>
                    <p>Loading payments...</p>
                  </div>
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-on-surface-variant font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-5xl opacity-20">payments</span>
                    <p>No transactions found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment._id} className="hover:bg-emerald-50/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                        {getMethodIcon(payment.paymentMethod)}
                      </span>
                      <div>
                        <p className="font-semibold text-on-surface">{payment.orderId}</p>
                        <p className="text-xs text-on-surface-variant capitalize">{payment.paymentMethod}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-on-surface">{payment.doctorName || "Unknown Doctor"}</p>
                    <p className="text-xs text-on-surface-variant">{payment.specialization || "-"}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-bold text-on-surface">{formatLkr(payment.totalCents)}</p>
                    <p className="text-xs text-on-surface-variant">
                      Fee: {formatLkr(payment.consultationFeeCents)} + Service: {formatLkr(payment.serviceFeeCents)}
                    </p>
                  </td>
                  <td className="p-4">{getStatusBadge(payment.status)}</td>
                  <td className="p-4 text-on-surface-variant">{formatDate(payment.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

