import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: Array<"admin" | "recruiter">;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { token, account } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && account && !allowedRoles.includes(account.role)) {
    const fallback = account.role === "recruiter" ? "/candidates" : "/";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};
