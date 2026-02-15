import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type AccountItem = {
  id: string;
  companyName: string;
  email: string;
  username: string | null;
  role: string;
  isApproved: boolean;
  createdAt?: string;
  approvedAt?: string | null;
};

type PendingItem = {
  id: string;
  companyName: string;
  email: string;
  createdAt?: string;
};

export const SuperDashboard: React.FC = () => {
  const { token, account } = useAuth();
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = account?.role === "admin" && !account?.parentAccountId;

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    [token],
  );

  const loadData = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, pendingRes] = await Promise.all([
        fetch(`${API_BASE}/auth/accounts`, { headers }),
        fetch(`${API_BASE}/auth/pending-approvals`, { headers }),
      ]);

      const [accountsData, pendingData] = await Promise.all([
        accountsRes.json().catch(() => ({})),
        pendingRes.json().catch(() => ({})),
      ]);

      if (!accountsRes.ok) {
        throw new Error(
          (accountsData as { error?: string }).error ||
            `Failed to load accounts (${accountsRes.status})`,
        );
      }

      if (!pendingRes.ok) {
        throw new Error(
          (pendingData as { error?: string }).error ||
            `Failed to load pending approvals (${pendingRes.status})`,
        );
      }

      setAccounts(
        (accountsData as { accounts?: AccountItem[] }).accounts || [],
      );
      setPending((pendingData as { pending?: PendingItem[] }).pending || []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  }, [headers, isSuperAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const approvedCount = useMemo(
    () => accounts.filter((a) => a.isApproved).length,
    [accounts],
  );

  const pendingCount = useMemo(() => pending.length, [pending]);

  const recentAccounts = useMemo(() => {
    const withDates = accounts.map((acc) => ({
      ...acc,
      createdAtTs: acc.createdAt ? new Date(acc.createdAt).getTime() : 0,
    }));
    return withDates
      .sort((a, b) => b.createdAtTs - a.createdAtTs)
      .slice(0, 5)
      .map(({ createdAtTs, ...rest }) => rest);
  }, [accounts]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Overview of all accounts and approvals.
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm"
          >
            ↻ Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Total Accounts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {accounts.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Includes all tenants and team members.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Pending Approvals</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">
                  {pendingCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">Awaiting review.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Approved Accounts</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">
                  {approvedCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">Active and ready.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Pending approvals
                  </h2>
                  <span className="text-xs text-gray-500">Latest</span>
                </div>
                {pending.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending approvals.</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {pending.slice(0, 5).map((p) => (
                      <li
                        key={p.id}
                        className="py-3 flex items-start justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {p.companyName}
                          </p>
                          <p className="text-xs text-gray-600">{p.email}</p>
                        </div>
                        <span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-1">
                          Pending
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Recent activity
                  </h2>
                  <span className="text-xs text-gray-500">Last 5 accounts</span>
                </div>
                {recentAccounts.length === 0 ? (
                  <p className="text-sm text-gray-500">No accounts yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {recentAccounts.map((acc) => (
                      <li
                        key={acc.id}
                        className="py-3 flex items-start justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {acc.companyName}
                          </p>
                          <p className="text-xs text-gray-600">{acc.email}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full border border-gray-300 text-gray-700">
                          {acc.isApproved ? "Approved" : "Pending"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
