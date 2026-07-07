import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.jsx";
import { Spinner } from "@/components/ui/index.jsx";
import Layout from "@/components/Layout.jsx";
import Landing from "@/pages/Landing.jsx";
import Login from "@/pages/Login.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import Browse from "@/pages/Browse.jsx";
import History from "@/pages/History.jsx";

function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <FullScreenSpinner />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Landing />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="browse/:resourceKey?" element={<Browse />} />
        <Route path="history" element={<History />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
