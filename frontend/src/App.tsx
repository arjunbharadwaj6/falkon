import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Jobs } from "./pages/Jobs";
import { Candidates } from "./pages/Candidates";
import { Recruiters } from "./pages/Recruiters";
import { Approvals } from "./pages/Approvals";
import { Accounts } from "./pages/Accounts";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { Landing } from "./pages/Landing";
import { useAuth } from "./auth/AuthProvider";

function App() {
  const { token } = useAuth();

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

            <Route path="/" element={token ? <Dashboard /> : <Landing />} />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute allowedRoles={["admin", "recruiter"]}>
                  <Jobs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidates"
              element={
                <ProtectedRoute allowedRoles={["admin", "recruiter"]}>
                  <Candidates />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiters"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <Recruiters />
                </ProtectedRoute>
              }
            />
            <Route
              path="/approvals"
              element={
                <ProtectedRoute allowedRoles={["admin"]} superAdminOnly={true}>
                  <Approvals />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute allowedRoles={["admin"]} superAdminOnly={true}>
                  <Accounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={["admin", "recruiter"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={<Navigate to={token ? "/" : "/"} replace />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
