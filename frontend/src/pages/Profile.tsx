import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const Profile: React.FC = () => {
  const { account, token, logout } = useAuth();

  const [companyName, setCompanyName] = useState(account?.companyName || "");
  const [username, setUsername] = useState(account?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          ...(account?.role === "admin" ? { companyName } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update profile");
      }

      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to change password");
      }

      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change password",
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900">
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Profile Settings</h1>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
            {success}
          </div>
        )}

        {/* Account Information */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-800">
                Account Information
              </h2>
              <p className="text-sm text-gray-600">{account?.email}</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300"
                  placeholder="Acme Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  disabled={account?.role === "recruiter"}
                />
                {account?.role === "recruiter" && (
                  <p className="text-xs text-gray-500">
                    Company name is managed by your admin.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 bg-gray-50 text-gray-500 cursor-not-allowed"
                  value={account?.email || ""}
                  disabled
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Change Password
          </h2>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Current Password
              </label>
              <input
                type="password"
                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Password must be at least 8 characters long
            </p>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              >
                {passwordLoading ? "Changing..." : "Change Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow border border-red-200 p-8">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">
            Danger Zone
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            Once you log out, you'll need to sign in again with your
            credentials.
          </p>
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
