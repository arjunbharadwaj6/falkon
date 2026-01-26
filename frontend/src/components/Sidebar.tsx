import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import logo from "../assets/logo.png";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { logout, account } = useAuth();
  const isRecruiter = account?.role === "recruiter";

  const isSuperAdmin = account?.role === "admin" && !account?.parentAccountId;
  const navItems = isRecruiter
    ? [
        { path: "/jobs", label: "Jobs", icon: "💼" },
        { path: "/candidates", label: "Candidates", icon: "👥" },
        { path: "/profile", label: "Profile", icon: "⚙️" },
      ]
    : isSuperAdmin
    ? [
        { path: "/approvals", label: "Approvals", icon: "✅" },
        { path: "/accounts", label: "Accounts", icon: "📇" },
      ]
    : [
        { path: "/", label: "Dashboard", icon: "📊" },
        { path: "/jobs", label: "Jobs", icon: "💼" },
        { path: "/candidates", label: "Candidates", icon: "👥" },
        { path: "/recruiters", label: "Team Members", icon: "🧑‍💼" },
        { path: "/profile", label: "Profile", icon: "⚙️" },
      ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-56 bg-blue-900 text-white h-screen fixed left-0 top-0 shadow-lg">
      {/* Logo Section */}
      <div className="p-4 border-b border-blue-800">
        <h1 className="text-xl font-bold flex items-center gap-3">
          <img
            src={logo}
            alt="Falkon logo"
            className="w-9 h-9 rounded-lg shadow-sm"
          />
          Falkon
        </h1>
        <p className="text-xs text-blue-200 mt-1">Recruitment platform</p>
      </div>

      {/* Navigation Items */}
      <nav className="p-3 mt-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition font-medium text-sm ${
              isActive(item.path)
                ? "bg-blue-700 text-white shadow-md"
                : "text-blue-100 hover:bg-blue-800"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-blue-800 space-y-2">
        <div className="bg-blue-800 rounded-lg p-2">
          <p className="text-xs text-blue-200 mb-1">Logged in as</p>
          <p className="text-xs font-semibold text-white truncate">
            {account?.email}
          </p>
        </div>
        <button
          onClick={logout}
          className="w-full px-3 py-1.5 rounded-lg text-xs font-semibold text-red-200 hover:text-red-100 hover:bg-blue-800 transition"
        >
          Log out
        </button>
      </div>
    </div>
  );
};
