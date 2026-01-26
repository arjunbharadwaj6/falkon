import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type AccountItem = {
  id: string;
  companyName: string;
  email: string;
  username: string | null;
  role: string;
  isApproved: boolean;
  createdAt: string;
  approvedAt: string | null;
  parentAccountId: string | null;
  createdBy: string | null;
  createdByEmail: string | null;
};

export const Accounts: React.FC = () => {
  const { token, account } = useAuth();
  const [items, setItems] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    search: string;
    onlyPending: boolean;
  }>({ search: "", onlyPending: false });

  const isSuperAdmin = account?.role === "admin" && !account?.parentAccountId;

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    [token],
  );

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/accounts`, { headers });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load accounts (${res.status}): ${text}`);
      }
      const data = await res.json();
      setItems(data.accounts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadAccounts();
  }, [isSuperAdmin]);

  const filtered = items.filter((it) => {
    const matchesSearch = filter.search
      ? `${it.companyName} ${it.email} ${it.username ?? ""}`
          .toLowerCase()
          .includes(filter.search.toLowerCase())
      : true;
    const matchesPending = filter.onlyPending ? !it.isApproved : true;
    return matchesSearch && matchesPending;
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold">Accounts</h2>
        <p className="text-sm text-gray-300 mt-2">
          Only the super admin can view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">All Accounts</h2>
        <div className="flex items-center gap-2">
          <input
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            placeholder="Search company/email/username"
            className="px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-sm text-gray-100 w-72"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filter.onlyPending}
              onChange={(e) =>
                setFilter({ ...filter, onlyPending: e.target.checked })
              }
            />
            Show only pending
          </label>
          <button
            onClick={loadAccounts}
            className="px-3 py-1.5 rounded bg-blue-700 text-white text-sm hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 border border-red-200 rounded p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-300">Loading accounts...</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-300">No accounts match your filters.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Approved</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Approved At</th>
                <th className="py-2 pr-4">Created By</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => (
                <tr key={acc.id} className="border-b border-gray-800">
                  <td className="py-2 pr-4">{acc.companyName}</td>
                  <td className="py-2 pr-4">{acc.email}</td>
                  <td className="py-2 pr-4">{acc.username ?? "—"}</td>
                  <td className="py-2 pr-4">{acc.role}</td>
                  <td className="py-2 pr-4">{acc.isApproved ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">
                    {new Date(acc.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    {acc.approvedAt
                      ? new Date(acc.approvedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-2 pr-4">{acc.createdByEmail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
