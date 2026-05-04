import { Routes, Route } from "react-router";
import AuthLayout from "./components/AuthLayout";
import Dashboard from "./pages/Dashboard";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Leads from "./pages/Leads";
import Billing from "./pages/Billing";
import Leaderboard from "./pages/Leaderboard";
import Visitors from "./pages/Visitors";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import VerifyEmail from "./pages/VerifyEmail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/dashboard" element={<AuthLayout><Dashboard /></AuthLayout>} />
      <Route path="/campaigns" element={<AuthLayout><Campaigns /></AuthLayout>} />
      <Route path="/campaigns/:id" element={<AuthLayout><CampaignDetail /></AuthLayout>} />
      <Route path="/leads" element={<AuthLayout><Leads /></AuthLayout>} />
      <Route path="/billing" element={<AuthLayout><Billing /></AuthLayout>} />
      <Route path="/leaderboard" element={<AuthLayout><Leaderboard /></AuthLayout>} />
      <Route path="/visitors" element={<AuthLayout><Visitors /></AuthLayout>} />
      <Route path="/profile" element={<AuthLayout><Profile /></AuthLayout>} />
      <Route path="/admin" element={<AuthLayout><Admin /></AuthLayout>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
