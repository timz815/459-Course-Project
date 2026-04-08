import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Register from "./pages/Register";
import RegisterCompleted from "./pages/RegisterCompleted";
import Tournaments from "./pages/Tournaments";
import AddTournament from "./pages/AddTournament";
import StockMarket from "./pages/StockMarket";
import StockDetail from "./pages/StockDetail";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard"; // ← new
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminRoute from "./routes/AdminRoute"; // ← new
import TournamentDetail from "./pages/TournamentDetail";
import BuyStock from "./pages/BuyStock";
import SellStock from "./pages/SellStock";
import AccountSettings from "./pages/AccountSettings";
import NotFound from "./pages/NotFound";
import Footer from "./components/Footer";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register-completed" element={<RegisterCompleted />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/stock-market" element={<StockMarket />} />
          <Route path="/stocks/:symbol" element={<StockDetail />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />

          {/* protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tournaments/:id/buy/:symbol" element={<ProtectedRoute><BuyStock /></ProtectedRoute>} />
          <Route path="/tournaments/:id/sell/:symbol" element={<ProtectedRoute><SellStock /></ProtectedRoute>} />
          <Route path="/add-tournament" element={<ProtectedRoute><AddTournament /></ProtectedRoute>} />
          <Route path="/account-settings" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

          {/* admin route */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </Router>
    </AuthProvider>
  );
}

export default App;