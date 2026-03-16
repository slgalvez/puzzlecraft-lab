import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "./AdminDashboard";
import UserOverview from "./UserOverview";

/** Route-aware landing page for /p — shows admin dashboard or user overview */
const PrivateHome = () => {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminDashboard /> : <UserOverview />;
};

export default PrivateHome;
