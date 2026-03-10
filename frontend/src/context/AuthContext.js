import { jwtDecode } from "jwt-decode";
import { createContext, useEffect, useState } from "react";

// create the Context object to be consumed by other components
export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // initialize state directly from localStorage
  // this ensures that on page refresh, the 'token' is NOT null
  // prevents the ProtectedRoute from redirecting to Login
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [user, setUser] = useState(null);

  // useEffect runs whenever the token changes (login, logout, or initial load)
  useEffect(() => {
    if (token) {
      try {
        // decode the JWT to get user details (like username or id)
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch (err) {
        console.error("Token is invalid or corrupted:", err);
        logout(); // wipe storage if the token is bad
      }
    } else {
      setUser(null);
    }
  }, [token]);

  // function to handle login
  function login(newToken) {
    localStorage.setItem("token", newToken); // save to browser memory
    setToken(newToken); // update state to trigger re-renders
  }

  // function to handle logout
  function logout() {
    localStorage.removeItem("token"); // remove from browser memory
    setToken(null); // reset state
    setUser(null);
  }

  return (
    // we provide 'token' and 'user' (data)
    // and 'login' and 'logout' (functions) to the whole app

    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
