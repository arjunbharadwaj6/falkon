import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useMemo } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Jobs } from "./pages/Jobs";
import { Candidates } from "./pages/Candidates";
import { Recruiters } from "./pages/Recruiters";
import { Partners } from "./pages/Partners";
import { Approvals } from "./pages/Approvals";
import { Accounts } from "./pages/Accounts";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Landing } from "./pages/Landing";
import { Reports } from "./pages/Reports";
import { useAuth } from "./auth/AuthProvider";

function App() {
  const { token, account } = useAuth();

  const homePath = useMemo(() => {
    if (!account) return "/dashboard";
    const isSuperAdmin = account.role === "admin" && !account.parentAccountId;
    if (isSuperAdmin) return "/approvals";
    if (account.role === "admin") return "/dashboard";
    return "/jobs";
  }, [account]);

  return (
    <BrowserRouter>
      <div className="flex">
        {token && <Sidebar />}
        <main
          className={
            token
              ? "ml-56 flex-1 bg-slate-900 min-h-screen text-slate-100"
              : "flex-1 bg-slate-900 min-h-screen text-slate-100"
          }
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              path="/"
              element={
                token ? (
                  <ProtectedRoute requireApproved={true}>
                    <Navigate to={homePath} replace />
                  </ProtectedRoute>
                ) : (
                  <Landing />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]} requireApproved={true}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "recruiter", "partner"]}
                  requireApproved={true}
                >
                  <Jobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidates"
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "recruiter", "partner"]}
                  requireApproved={true}
                >
                  <Candidates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiters"
              element={
                <ProtectedRoute allowedRoles={["admin"]} requireApproved={true}>
                  <Recruiters />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partners"
              element={
                <ProtectedRoute allowedRoles={["admin"]} requireApproved={true}>
                  <Partners />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={["admin"]} requireApproved={true}>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/approvals"
              element={
                <ProtectedRoute
                  allowedRoles={["admin"]}
                  superAdminOnly={true}
                  requireApproved={true}
                >
                  <Approvals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute
                  allowedRoles={["admin"]}
                  superAdminOnly={true}
                  requireApproved={true}
                >
                  <Accounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute
                  allowedRoles={["admin", "recruiter", "partner"]}
                  requireApproved={false}
                >
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={<Navigate to={token ? homePath : "/"} replace />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
