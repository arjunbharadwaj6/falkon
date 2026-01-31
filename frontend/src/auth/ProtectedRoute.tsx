import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: Array<"admin" | "recruiter" | "partner">;
  superAdminOnly?: boolean;
  requireApproved?: boolean;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  superAdminOnly = false,
  requireApproved = true,
}) => {
  const { token, account } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check if account is approved (if required)
  if (requireApproved && account && !account.isApproved) {
    return (
      <Navigate
        to="/profile"
        state={{
          from: location.pathname,
          message:
            "Your account is pending approval. Please wait for admin approval.",
        }}
        replace
      />
    );
  }

  // Check if super admin only route
  if (superAdminOnly) {
    const isSuperAdmin = account?.role === "admin" && !account?.parentAccountId;
    if (!isSuperAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  if (allowedRoles && account && !allowedRoles.includes(account.role)) {
    const fallback = account.role === "recruiter" ? "/candidates" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};
