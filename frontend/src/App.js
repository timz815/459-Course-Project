import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Tournaments from "./pages/Tournaments";
import AddTournament from "./pages/AddTournament";
import StockMarket from "./pages/StockMarket";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import TournamentDetail from "./pages/TournamentDetail";

import BuyStock from "./pages/BuyStock";
import SellStock from "./pages/SellStock";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/stock-market" element={<StockMarket />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />

          {/* protected routes - ProtectedRoute bounces unauthenticated users to /login */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/tournaments/:id/buy/:symbol" element={<ProtectedRoute><BuyStock /></ProtectedRoute>} />
          <Route path="/tournaments/:id/sell/:symbol" element={<ProtectedRoute><SellStock /></ProtectedRoute>} />
          <Route
            path="/add-tournament"
            element={
              <ProtectedRoute>
                <AddTournament />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;