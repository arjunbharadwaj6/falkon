import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

type Analytics = {
  summary: {
    total: number;
    hired: number;
    rejected: number;
    acceptanceRate: number;
  };
  recruiterStats: Array<{
    username: string;
    email: string;
    candidatesAdded: number;
    hired: number;
    acceptanceRate: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  visaDistribution: Array<{
    visaStatus: string;
    count: number;
  }>;
  jobPositionStats: Array<{
    position: string;
    count: number;
    hired: number;
  }>;
};

const statusColorMap: Record<string, string> = {
  new: "#e5e7eb",
  screening: "#fef3c7",
  interview: "#93c5fd",
  offer: "#bbf7d0",
  hired: "#86efac",
  rejected: "#fecaca",
  "on-hold": "#fcd34d",
};

export const Reports: React.FC = () => {
  const { token, account } = useAuth();
  const isAdmin = account?.role === "admin";
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE}/api/candidates/analytics/insights`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!res.ok) throw new Error("Failed to load analytics");
        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load analytics",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [token, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h1 className="text-2xl font-bold text-slate-900">
            Access Restricted
          </h1>
          <p className="text-slate-600">
            Reports are only available for super admins.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-slate-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
            {error || "Failed to load analytics"}
          </div>
        </div>
      </div>
    );
  }

  const statusData = analytics.statusDistribution.map((item) => ({
    name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    value: item.count,
    color: statusColorMap[item.status] || "#e5e7eb",
  }));

  const visaData = analytics.visaDistribution.slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 py-10 md:px-12 lg:px-16 space-y-8 text-slate-900">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Analytics & Insights
        </h1>
        <p className="text-slate-600">
          Comprehensive overview of your recruitment pipeline performance
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">
              Total Candidates
            </span>
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {analytics.summary.total}
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Hired</span>
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600">
            {analytics.summary.hired}
          </p>
          <p className="text-xs text-slate-500">
            {Math.round(
              (analytics.summary.hired / analytics.summary.total) * 100,
            )}
            % of total
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">
              Rejected
            </span>
            <span className="text-2xl">✕</span>
          </div>
          <p className="text-3xl font-bold text-red-600">
            {analytics.summary.rejected}
          </p>
          <p className="text-xs text-slate-500">
            {Math.round(
              (analytics.summary.rejected / analytics.summary.total) * 100,
            )}
            % of total
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">
              Acceptance Rate
            </span>
            <span className="text-2xl">📈</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {analytics.summary.acceptanceRate}%
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Candidate Status Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Visa Status */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Candidates by Visa Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={visaData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="visaStatus"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Job Position Performance */}
      {analytics.jobPositionStats.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">
            Performance by Job Position
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.jobPositionStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="position"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                name="Total Candidates"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="hired"
                fill="#10b981"
                name="Hired"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Team Member Performance */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-6">
          Team Member Performance
        </h3>
        {analytics.recruiterStats.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            No team member data available
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Candidates Added
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Hired
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Acceptance Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics.recruiterStats.map((recruiter, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {recruiter.username || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {recruiter.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-semibold text-blue-600">
                      {recruiter.candidatesAdded}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-semibold text-emerald-600">
                      {recruiter.hired}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-semibold">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {recruiter.acceptanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Key Insights */}
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 font-semibold mb-1">
              Top Performer
            </p>
            <p className="text-lg font-bold text-blue-700">
              {analytics.recruiterStats.length > 0
                ? analytics.recruiterStats[0].username
                : "N/A"}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {analytics.recruiterStats.length > 0
                ? `Added ${analytics.recruiterStats[0].candidatesAdded} candidates`
                : "No team members"}
            </p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm text-emerald-900 font-semibold mb-1">
              Highest Acceptance Rate
            </p>
            <p className="text-lg font-bold text-emerald-700">
              {analytics.recruiterStats.length > 0
                ? Math.max(
                    ...analytics.recruiterStats.map((r) => r.acceptanceRate),
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {analytics.recruiterStats.length > 0
                ? analytics.recruiterStats.find(
                    (r) =>
                      r.acceptanceRate ===
                      Math.max(
                        ...analytics.recruiterStats.map(
                          (rec) => rec.acceptanceRate,
                        ),
                      ),
                  )?.username
                : "N/A"}
            </p>
          </div>

          <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900 font-semibold mb-1">
              Most Common Status
            </p>
            <p className="text-lg font-bold text-amber-700">
              {statusData.length > 0 ? statusData[0].name : "N/A"}
            </p>
            <p className="text-xs text-amber-600 mt-1">
              {statusData.length > 0
                ? `${statusData[0].value} candidates`
                : "No data"}
            </p>
          </div>

          <div className="bg-purple-50/50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-900 font-semibold mb-1">
              Pipeline Health
            </p>
            <p className="text-lg font-bold text-purple-700">
              {analytics.summary.acceptanceRate >= 30
                ? "Excellent"
                : analytics.summary.acceptanceRate >= 20
                  ? "Good"
                  : analytics.summary.acceptanceRate >= 10
                    ? "Fair"
                    : "Needs Improvement"}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              Based on acceptance rate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
