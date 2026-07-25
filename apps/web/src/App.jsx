import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import { Spinner } from "@/components/ui/index.jsx";
import AppLayout from "@/components/layout/AppLayout.jsx";
import LoginPage from "@/pages/LoginPage.jsx";
import LandingPage from "@/pages/LandingPage.jsx";
import DashboardPage from "@/pages/DashboardPage.jsx";
import ExplorerPage from "@/pages/ExplorerPage.jsx";
import SearchPage from "@/pages/SearchPage.jsx";
import MapPage from "@/pages/MapPage.jsx";
import FeedPage from "@/pages/FeedPage.jsx";
import HistoryPage from "@/pages/HistoryPage.jsx";
import SchemaEditorPage from "@/pages/SchemaEditorPage.jsx";

function FullScreenSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

function RequireAuth({ children }) {
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
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<LandingPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="explorer/:resourceKey?" element={<ExplorerPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="feed" element={<FeedPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="schema" element={<SchemaEditorPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
