import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type PendingAccount = {
  id: string;
  companyName: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  isApproved: boolean;
};

export const Approvals: React.FC = () => {
  const { token, account } = useAuth();
  const [pending, setPending] = useState<PendingAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const isSuperAdmin = account?.role === "admin" && !account?.parentAccountId;

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }),
    [token],
  );

  const loadPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/pending-approvals`, {
        headers,
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to load approvals (${res.status}): ${errText}`);
      }
      const data = await res.json();
      setPending(data.pendingApprovals || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadPending();
  }, [isSuperAdmin]);

  const approve = async (id: string) => {
    setActionBusy(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/approve-account/${id}`, {
        method: "POST",
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Approve failed (${res.status})`);
      }
      await loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActionBusy(null);
    }
  };

  const reject = async (id: string) => {
    setActionBusy(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/reject-account/${id}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason: "Not a valid company" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Reject failed (${res.status})`);
      }
      await loadPending();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActionBusy(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold">Approvals</h2>
        <p className="text-sm text-gray-300 mt-2">
          Only the super admin can view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Pending Approvals</h2>
        <button
          onClick={loadPending}
          className="px-3 py-1.5 rounded bg-blue-700 text-white text-sm hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 border border-red-200 rounded p-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-300">Loading pending accounts...</div>
      ) : pending.length === 0 ? (
        <div className="text-gray-300">No pending approvals.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-700">
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Username</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((acc) => (
                <tr key={acc.id} className="border-b border-gray-800">
                  <td className="py-2 pr-4">{acc.companyName}</td>
                  <td className="py-2 pr-4">{acc.email}</td>
                  <td className="py-2 pr-4">{acc.username}</td>
                  <td className="py-2 pr-4">{acc.role}</td>
                  <td className="py-2 pr-4">
                    {new Date(acc.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 space-x-2">
                    <button
                      disabled={actionBusy === acc.id}
                      onClick={() => approve(acc.id)}
                      className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actionBusy === acc.id}
                      onClick={() => reject(acc.id)}
                      className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
