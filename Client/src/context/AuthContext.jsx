import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "./auth-context";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const persistUser = useCallback((nextUser, token = nextUser?.token) => {
    localStorage.setItem("token", token || "");
    localStorage.setItem("user", JSON.stringify(nextUser));
  }, []);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (storedUser && token) {
        setUser({ ...JSON.parse(storedUser), token });
      }
    } catch (err) {
      console.error("Failed to load user from localStorage:", err);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback((userData, token) => {
    try {
      const nextUser = { ...userData, token };
      persistUser(nextUser, token);
      setUser(nextUser);
    } catch (err) {
      console.error("Auth login failed:", err);
    }
  }, [persistUser]);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setUser(null);
    } catch (err) {
      console.error("Auth logout failed:", err);
    }
  }, []);

  // Keep auth helpers referentially stable so data-loading effects do not loop.
  const updateUser = useCallback((updatedUser) => {
    const token = updatedUser?.token || userRef.current?.token || localStorage.getItem("token");
    if (!updatedUser || !token) return;

    const nextUser = { ...updatedUser, token };
    const previousUser = userRef.current;

    try {
      persistUser(nextUser, token);
      if (JSON.stringify(previousUser) !== JSON.stringify(nextUser)) {
        setUser(nextUser);
      }
    } catch (err) {
      console.error("Auth user update failed:", err);
    }
  }, [persistUser]);

  const authValue = useMemo(
    () => ({ user, setUser, login, logout, updateUser, loading }),
    [user, login, logout, updateUser, loading]
  );

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};
