import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const Recruiters: React.FC = () => {
  const { token, account } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"recruiter" | "admin">("recruiter");
  const [companyName, setCompanyName] = useState(account?.companyName || "");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recruiters, setRecruiters] = useState<
    Array<{
      id: string;
      email: string;
      username: string;
      role: string;
      createdAt?: string;
    }>
  >([]);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetTarget, setResetTarget] = useState<{
    id: string;
    username: string;
    email: string;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchRecruiters = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/recruiters`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const cleaned = (data.recruiters || []).filter(
        (rec: { role: string }) => rec.role !== "partner",
      );
      setRecruiters(cleaned);
    } catch (err) {
      console.error("Failed to load recruiters", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiters();
    setCompanyName(account?.companyName || "");
  }, [token]);

  const openResetModal = (rec: {
    id: string;
    username: string;
    email: string;
  }) => {
    setResetTarget(rec);
    setResetPassword("");
    setStatus(null);
    setShowResetModal(true);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetTarget(null);
    setResetPassword("");
  };

  const openAddModal = () => {
    setEmail("");
    setUsername("");
    setPassword("");
    setRole("recruiter");
    setStatus(null);
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setEmail("");
    setUsername("");
    setPassword("");
    setRole("recruiter");
    setStatus(null);
  };

  const handleResetPassword = async () => {
    if (!token || !resetTarget) return;
    if (!resetPassword || resetPassword.length < 8) {
      setStatus("Password must be at least 8 characters");
      return;
    }
    setResettingId(resetTarget.id);
    setStatus(null);
    try {
      const res = await fetch(
        `${API_BASE}/auth/recruiters/${resetTarget.id}/password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ newPassword: resetPassword }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }
      setStatus("Password reset successfully.");
      closeResetModal();
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Failed to reset password",
      );
    } finally {
      setResettingId(null);
    }
  };

  // Pagination
  const totalPages = Math.ceil(recruiters.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecruiters = recruiters.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch(`${API_BASE}/auth/recruiters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          password,
          role,
          companyName,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed (${res.status})`);
      }

      const data = await res.json();
      setStatus(
        data.message ||
          "Team member created successfully! Awaiting super admin approval.",
      );
      setEmail("");
      setUsername("");
      setPassword("");
      setRole("recruiter");
      setCompanyName(account?.companyName || "");
      closeAddModal();
      fetchRecruiters();
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Failed to create team member",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-10">
      <div className="px-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Team Members
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Manage team members (admins and recruiters) in your organization
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm text-white font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            + Add Team Member
          </button>
        </div>

        {status && !showAddModal && (
          <div className="rounded-lg border px-5 py-3 text-sm font-semibold bg-blue-50 border-blue-300 text-blue-800 shadow-sm flex items-center gap-2">
            <span className="text-xl">ℹ️</span>
            <span>{status}</span>
          </div>
        )}

        {/* Recruiters Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  All Team Members
                </h2>
                <p className="text-xs text-gray-600 mt-1">
                  Manage admins and recruiters in your organization
                </p>
              </div>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading...</span>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recruiters.length === 0 ? (
                  <tr>
                    <td
                      className="px-5 py-8 text-center text-gray-500"
                      colSpan={5}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl">👥</span>
                        <p className="font-medium text-sm">
                          No team members yet
                        </p>
                        <p className="text-xs">
                          Click "Add Team Member" to get started
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecruiters.map((rec) => (
                    <tr
                      key={rec.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                        {rec.username}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {rec.email}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            rec.role === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {rec.role === "admin" ? "Admin" : "Recruiter"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {rec.createdAt
                          ? new Date(rec.createdAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <button
                          onClick={() => openResetModal(rec)}
                          disabled={resettingId === rec.id}
                          className="px-4 py-2 bg-blue-600 text-xs text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors shadow-sm hover:shadow-md"
                        >
                          {resettingId === rec.id
                            ? "Resetting..."
                            : "Reset Password"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, recruiters.length)} of {recruiters.length}{" "}
                team members
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          currentPage === page
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Team Member Modal */}
        {showAddModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Add New Team Member
                  </h2>
                  <button
                    onClick={closeAddModal}
                    className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full w-9 h-9 flex items-center justify-center transition-all"
                  >
                    <span className="text-xl">✕</span>
                  </button>
                </div>
              </div>
              <div className="px-6 py-5">
                {status && (
                  <div className="rounded-lg border px-4 py-3 text-xs font-semibold bg-red-50 border-red-300 text-red-800 mb-5 flex items-center gap-2 shadow-sm">
                    <span className="text-base">⚠️</span>
                    <span>{status}</span>
                  </div>
                )}
                <form
                  className="grid gap-5 md:grid-cols-2"
                  onSubmit={handleCreate}
                >
                  <label className="flex flex-col gap-1.5 text-xs text-gray-700 md:col-span-2">
                    <span className="font-semibold">Company Name</span>
                    <input
                      className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-600 cursor-not-allowed text-sm"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled
                    />
                    <span className="text-xs text-gray-500">
                      Auto-set from your organization
                    </span>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs text-gray-700">
                    <span className="font-semibold">Email</span>
                    <input
                      type="email"
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="recruiter@example.com"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs text-gray-700">
                    <span className="font-semibold">Username</span>
                    <input
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="john_doe"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs text-gray-700">
                    <span className="font-semibold">Role</span>
                    <select
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={role}
                      onChange={(e) =>
                        setRole(e.target.value as "recruiter" | "admin")
                      }
                    >
                      <option value="recruiter">Recruiter</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs text-gray-700 md:col-span-2">
                    <span className="font-semibold">Temporary Password</span>
                    <input
                      type="password"
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      minLength={8}
                    />
                    <span className="text-xs text-gray-500">
                      Recruiter should change this on first login
                    </span>
                  </label>
                </form>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg border-2 border-gray-300 text-sm text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  onClick={handleCreate}
                  className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm text-white font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 transition-all shadow-lg hover:shadow-xl"
                >
                  {submitting ? "Creating..." : "Create Team Member"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetModal && resetTarget && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Reset Password
                </h2>
              </div>
              <div className="px-6 py-5">
                <p className="text-xs text-gray-700 mb-5">
                  Set a new password for{" "}
                  <span className="font-semibold text-gray-900">
                    {resetTarget.username}
                  </span>
                  <span className="text-gray-500"> ({resetTarget.email})</span>
                </p>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  New Password
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimum 8 characters"
                  disabled={!!resettingId}
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={closeResetModal}
                  disabled={!!resettingId}
                  className="px-5 py-2 rounded-lg border-2 border-gray-300 text-sm text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={!!resettingId}
                  className="px-5 py-2 rounded-lg bg-blue-600 text-sm text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
                >
                  {resettingId ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
