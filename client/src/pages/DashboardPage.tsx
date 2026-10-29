import { useAuth } from "../context/AuthContext";
import StaffDashboard from "./StaffDashboard";
import RequesterDashboard from "./RequesterDashboard";

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR") {
    return <StaffDashboard />;
  }

  return <RequesterDashboard />;
}

