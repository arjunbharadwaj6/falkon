import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | undefined)?.from || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 p-10 space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 mb-2 shadow-lg">
              <svg
                className="w-10 h-10 text-white"
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-sm text-gray-600">
              Sign in to access your Falkon dashboard
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-gray-700"
              >
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300 text-gray-900"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-gray-700"
              >
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white hover:border-gray-300 text-gray-900"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-xs text-blue-600 hover:text-indigo-600 font-semibold transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">
                New to Falkon?
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 pb-2">
            <Link
              className="text-blue-600 hover:text-indigo-600 font-semibold transition-colors"
              to="/signup"
            >
              Create an account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
