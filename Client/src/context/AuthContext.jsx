import { useState, useEffect } from "react";
import { AuthContext } from "./auth-context";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔄 Load user + token from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (storedUser && token) {
        setUser({ ...JSON.parse(storedUser), token });
      }
    } catch (err) {
      console.error("❌ Failed to load user from localStorage:", err);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ LOGIN: store user + token and update state
  const login = (userData, token) => {
    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser({ ...userData, token });
    } catch (err) {
      console.error("❌ Auth login failed:", err);
    }
  };

  // ✅ LOGOUT: clear localStorage and state
  const logout = () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    } catch (err) {
      console.error("❌ Auth logout failed:", err);
    }
  };

  // ✅ UPDATE USER: when profile updates, keep token intact
  const updateUser = (updatedUser) => {
    if (!user?.token) return;
    const newUser = { ...updatedUser, token: user.token };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, logout, updateUser, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
