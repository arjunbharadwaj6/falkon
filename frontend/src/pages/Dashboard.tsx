import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type DashboardStats = {
  jobs: {
    total: number;
    active: number;
    onhold: number;
    closed: number;
  };
  candidates: {
    total: number;
    new: number;
    screening: number;
    interview: number;
    offer: number;
    hired: number;
    rejected: number;
  };
  recruiters: number;
  recentActivity: Array<{
    type: "job" | "candidate";
    title: string;
    status: string;
    createdAt: string;
    createdBy: string;
  }>;
};

export const Dashboard: React.FC = () => {
  const { token, account } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllActivities, setShowAllActivities] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/dashboard/stats`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getStatusColor = (type: string, status: string) => {
    if (type === "job") {
      if (status === "active") return "bg-green-100 text-green-800";
      if (status === "onhold") return "bg-amber-100 text-amber-800";
      return "bg-gray-100 text-gray-700";
    } else {
      if (status === "hired") return "bg-emerald-100 text-emerald-800";
      if (status === "interview") return "bg-blue-100 text-blue-800";
      if (status === "offer") return "bg-green-100 text-green-800";
      if (status === "rejected") return "bg-red-100 text-red-800";
      return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
        <div className="px-10 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg">Loading dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8">
        <div className="px-10 max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
            <p className="font-semibold">Error loading dashboard</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = account?.role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-10">
      <div className="px-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            {isAdmin
              ? "Overview of your organization"
              : "Your recruitment overview"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Jobs */}
          <div className="group bg-white border border-blue-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-400 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">💼</span>
              </div>
            </div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Total Jobs
            </h3>
            <p className="text-3xl font-bold text-blue-600 mb-3">
              {stats.jobs.total}
            </p>
            <div className="flex gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {stats.jobs.active} Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                {stats.jobs.onhold} On Hold
              </span>
            </div>
          </div>

          {/* Total Candidates */}
          <div className="group bg-white border border-blue-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-400 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
            </div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Total Candidates
            </h3>
            <p className="text-3xl font-bold text-blue-600 mb-3">
              {stats.candidates.total}
            </p>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {stats.candidates.interview} Interview
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                {stats.candidates.new} New
              </span>
            </div>
          </div>

          {/* Hired Candidates */}
          <div className="group bg-white border border-blue-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-400 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
            </div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Hired Candidates
            </h3>
            <p className="text-3xl font-bold text-blue-600 mb-3">
              {stats.candidates.hired}
            </p>
            <div className="flex gap-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {stats.candidates.offer} Offers
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                {stats.candidates.rejected} Rejected
              </span>
            </div>
          </div>

          {/* Recruiters (Admin only) or Active Jobs */}
          {isAdmin ? (
            <div className="group bg-white border border-blue-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-400 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Team Members
              </h3>
              <p className="text-3xl font-bold text-blue-600 mb-3">
                {stats.recruiters}
              </p>
              <p className="text-xs text-gray-600">Active recruiters</p>
            </div>
          ) : (
            <div className="group bg-white border border-blue-200 rounded-xl p-6 hover:shadow-xl hover:border-blue-400 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Active Jobs
              </h3>
              <p className="text-3xl font-bold text-blue-600 mb-3">
                {stats.jobs.active}
              </p>
              <p className="text-xs text-gray-600">Open positions</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Latest updates from your organization
            </p>
          </div>
          <div className="p-5">
            {stats.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm font-medium">No recent activity</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {(showAllActivities
                    ? stats.recentActivity
                    : stats.recentActivity.slice(0, 4)
                  ).map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`p-1.5 rounded-lg ${activity.type === "job" ? "bg-blue-100" : "bg-green-100"}`}
                        >
                          <span className="text-lg">
                            {activity.type === "job" ? "💼" : "👤"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-600">
                            {activity.type === "job" ? "Job" : "Candidate"} •
                            {activity.createdBy
                              ? ` by ${activity.createdBy}`
                              : " Added"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getStatusColor(activity.type, activity.status)}`}
                        >
                          {activity.status}
                        </span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {stats.recentActivity.length > 4 && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowAllActivities(!showAllActivities)}
                      className="px-5 py-2 rounded-lg border-2 border-gray-300 text-sm text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-all"
                    >
                      {showAllActivities
                        ? "Show Less"
                        : `View More (${stats.recentActivity.length - 4} more)`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
