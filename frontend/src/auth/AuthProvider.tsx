import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

type Role = "admin" | "recruiter" | "partner";

type Account = {
  id: string;
  companyName?: string;
  email: string;
  username?: string;
  role: Role;
  parentAccountId?: string | null;
  isApproved?: boolean;
};

type AuthContextType = {
  token: string | null;
  account: Account | null;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (
    companyName: string,
    email: string,
    username: string,
    password: string,
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get Firebase ID token
          const idToken = await user.getIdToken();

          // Get user account data from Firestore
          const accountRef = doc(db, "accounts", user.uid);
          const accountSnap = await getDoc(accountRef);

          if (accountSnap.exists()) {
            const accountData = accountSnap.data();
            const acc: Account = {
              id: user.uid,
              email: user.email || "",
              companyName: accountData.companyName,
              username: accountData.username,
              role: accountData.role || "admin",
              parentAccountId: accountData.parentAccountId,
              isApproved: accountData.isApproved !== false,
            };

            setToken(idToken);
            setAccount(acc);
            setFirebaseUser(user);
            localStorage.setItem("auth_token", idToken);
            localStorage.setItem("auth_account", JSON.stringify(acc));
          }
        } catch (error) {
          console.error("Error fetching account data:", error);
          setToken(null);
          setAccount(null);
          setFirebaseUser(null);
        }
      } else {
        setToken(null);
        setAccount(null);
        setFirebaseUser(null);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_account");
      }
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Refresh token periodically
  useEffect(() => {
    if (!firebaseUser) return;

    const refreshToken = async () => {
      try {
        const idToken = await firebaseUser.getIdToken(true);
        setToken(idToken);
        localStorage.setItem("auth_token", idToken);
      } catch (error) {
        console.error("Error refreshing token:", error);
      }
    };

    // Refresh token every 50 minutes (tokens expire in 1 hour)
    const interval = setInterval(refreshToken, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [firebaseUser]);

  const login = async (identifier: string, password: string) => {
    try {
      let email = identifier;

      // If identifier doesn't contain @, it's a username - look it up
      if (!identifier.includes("@")) {
        // Call backend to get email from username
        const response = await fetch(`${API_BASE}/auth/username-lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: identifier }),
        });

        if (!response.ok) {
          throw new Error("Invalid credentials");
        }

        const data = await response.json();
        email = data.email;
      }

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Get account data
      const accountRef = doc(db, "accounts", userCredential.user.uid);
      const accountSnap = await getDoc(accountRef);

      if (!accountSnap.exists()) {
        throw new Error("Account not found");
      }

      const accountData = accountSnap.data();

      // Check if account is approved
      if (accountData.isApproved === false) {
        await signOut(auth);
        throw new Error(
          "Your account is pending super admin approval. Please try again later.",
        );
      }
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Invalid credentials");
    }
  };

  const signup = async (
    companyName: string,
    email: string,
    username: string,
    password: string,
  ) => {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Get super admin ID
      // For now, we'll set this to null and handle it in backend
      const superAdminId = null;

      // Create account document in Firestore
      const accountData = {
        companyName,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        role: "admin",
        isApproved: false,
        parentAccountId: superAdminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "accounts", userCredential.user.uid), accountData);

      // Sign out immediately - user must wait for approval
      await signOut(auth);

      throw new Error(
        "Account created successfully! Please wait for super admin approval to log in.",
      );
    } catch (error: any) {
      console.error("Signup error:", error);
      throw new Error(error.message || "Signup failed");
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const value = useMemo(
    () => ({ token, account, login, signup, logout }),
    [token, account],
  );

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
