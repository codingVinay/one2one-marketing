import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Install from "./pages/Install";
import ClientDetail from "./pages/ClientDetail";
import ClientAnalytics from "./pages/ClientAnalytics";
import ClientSocialAccountsPage from "./pages/ClientSocialAccountsPage";
import ClientDashboard from "./pages/ClientDashboard";
import UserManagement from "./pages/UserManagement";
import ClientManagement from "./pages/ClientManagement";
import OAuthCallback from "./pages/OAuthCallback";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import MFAVerification from "./pages/MFAVerification";
import AccountSettings from "./pages/AccountSettings";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleBasedRoute from "./components/RoleBasedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={
              <ProtectedRoute>
                <RoleBasedRoute>
                  <Index />
                </RoleBasedRoute>
              </ProtectedRoute>
            } />
            <Route path="/client-dashboard" element={
              <ProtectedRoute>
                <RoleBasedRoute>
                  <ClientDashboard />
                </RoleBasedRoute>
              </ProtectedRoute>
            } />
            <Route path="/user-management" element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/client-management" element={
              <ProtectedRoute>
                <ClientManagement />
              </ProtectedRoute>
            } />
            <Route path="/client/:id" element={
              <ProtectedRoute>
                <ClientDetail />
              </ProtectedRoute>
            } />
            <Route path="/client/:id/analytics" element={
              <ProtectedRoute>
                <ClientAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/client/:id/social-accounts" element={
              <ProtectedRoute>
                <ClientSocialAccountsPage />
              </ProtectedRoute>
            } />
            <Route path="/oauth-callback" element={<OAuthCallback />} />
            <Route path="/mfa-verify" element={<MFAVerification />} />
            <Route path="/account-settings" element={
              <ProtectedRoute>
                <AccountSettings />
              </ProtectedRoute>
            } />
            <Route path="/install" element={<Install />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
