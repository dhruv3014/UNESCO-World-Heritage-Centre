import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth.jsx";
import { Spinner } from "@/components/ui/index.jsx";
import Layout from "@/components/Layout.jsx";
import Landing from "@/pages/Landing.jsx";
import Login from "@/pages/Login.jsx";
import Dashboard from "@/pages/Dashboard.jsx";
import Browse from "@/pages/Browse.jsx";
import History from "@/pages/History.jsx";
import Search from "@/pages/Search.jsx";
import MapView from "@/pages/MapView.jsx";
import Feed from "@/pages/Feed.jsx";
import SchemaEditor from "@/pages/SchemaEditor.jsx";

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
        <Route path="search" element={<Search />} />
        <Route path="map" element={<MapView />} />
        <Route path="feed" element={<Feed />} />
        <Route path="history" element={<History />} />
        <Route path="schema" element={<SchemaEditor />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
