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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    companyName: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
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

  const loadAccounts = useCallback(async () => {
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
  }, [headers]);

  useEffect(() => {
    if (isSuperAdmin) loadAccounts();
  }, [isSuperAdmin, loadAccounts]);

  const deleteAccount = async (id: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the account for ${email}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/accounts/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed (${res.status})`);
      }
      await loadAccounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = items.filter((it) => {
    const matchesSearch = filter.search
      ? `${it.companyName} ${it.email} ${it.username ?? ""}`
          .toLowerCase()
          .includes(filter.search.toLowerCase())
      : true;
    const matchesPending = filter.onlyPending ? !it.isApproved : true;
    return matchesSearch && matchesPending;
  });

  const resetCreateForm = () => {
    setCreateForm({
      companyName: "",
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    });
    setCreateError(null);
    setCreateSuccess(null);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    setCreateError(null);
    setCreateSuccess(null);

    const { companyName, email, username, password, confirmPassword } =
      createForm;

    if (!companyName || !email || !username || !password) {
      setCreateError("All fields are required");
      return;
    }

    if (password.length < 8) {
      setCreateError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setCreateError("Passwords do not match");
      return;
    }

    setCreateLoading(true);
    try {
      const signupRes = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, email, username, password }),
      });

      const signupData = await signupRes.json().catch(() => ({}));
      if (!signupRes.ok) {
        throw new Error(
          (signupData as { error?: string }).error ||
            `Create failed (${signupRes.status})`,
        );
      }

      const newAccountId = (signupData as { account?: { id?: string } })
        ?.account?.id;

      if (newAccountId) {
        const approveRes = await fetch(`${API_BASE}/auth/approve-account`, {
          method: "POST",
          headers,
          body: JSON.stringify({ accountId: newAccountId }),
        });

        const approveData = await approveRes.json().catch(() => ({}));
        if (!approveRes.ok) {
          throw new Error(
            (approveData as { error?: string }).error ||
              `Auto-approval failed (${approveRes.status})`,
          );
        }
      }

      setCreateSuccess("Account created and approved successfully.");
      resetCreateForm();
      await loadAccounts();
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Failed to create account",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">All Accounts</h1>
              <p className="text-gray-600 mt-1">
                Manage and monitor all system accounts
              </p>
            </div>
            {isSuperAdmin && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(true);
                    setCreateError(null);
                    setCreateSuccess(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  + Create Account
                </button>
                <button
                  onClick={loadAccounts}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  ↻ Refresh
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex-1">
              <input
                value={filter.search}
                onChange={(e) =>
                  setFilter({ ...filter, search: e.target.value })
                }
                placeholder="🔍 Search by company, email, or username..."
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={filter.onlyPending}
                onChange={(e) =>
                  setFilter({ ...filter, onlyPending: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium">Pending only</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start gap-3">
            <span className="text-red-500 text-xl">⚠</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading accounts...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No accounts found
            </h3>
            <p className="text-gray-600">Try adjusting your search filters.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Close
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Approved
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filtered.map((acc) => (
                    <tr
                      key={acc.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {acc.companyName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {acc.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {acc.username ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {acc.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {acc.isApproved ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            ⏳ Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(acc.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {acc.approvedAt
                          ? new Date(acc.approvedAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {acc.createdByEmail ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          disabled={deletingId === acc.id}
                          onClick={() => deleteAccount(acc.id, acc.email)}
                          className="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          🗑 Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stats */}
        {!loading && filtered.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filtered.length} of {items.length} accounts
          </div>
        )}
      </div>

      {isSuperAdmin && showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Create Account
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Super admin can create and auto-approve customer accounts.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-5">
              {createError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm">
                  ✓ {createSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-gray-800">
                    Company Name
                  </span>
                  <input
                    value={createForm.companyName}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        companyName: e.target.value,
                      })
                    }
                    placeholder="Acme Inc."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-gray-800">Email</span>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    placeholder="owner@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-gray-800">Username</span>
                  <input
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, username: e.target.value })
                    }
                    placeholder="owner"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-gray-800">Password</span>
                    <input
                      type="password"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          password: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      minLength={8}
                      required
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-gray-800">
                      Confirm Password
                    </span>
                    <input
                      type="password"
                      value={createForm.confirmPassword}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      minLength={8}
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-gray-500">
                  New accounts are approved instantly and can sign in right
                  away.
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    disabled={createLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {createLoading ? "Creating..." : "Create & Approve"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
