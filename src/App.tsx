import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Faturamento from "./pages/Faturamento";
import Gastos from "./pages/Gastos";
import Cartoes from "./pages/Cartoes";
import CustosFixos from "./pages/CustosFixos";
import Insumos from "./pages/Insumos";
import Bases from "./pages/Bases";
import Produtos from "./pages/Produtos";
import Encomendas from "./pages/Encomendas";
import NotFound from "./pages/NotFound";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import PaymentRequired from "./pages/PaymentRequired";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, perfil } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  // If user exists but hasn't paid, redirect to payment
  if (perfil && !perfil.is_paid) return <Navigate to="/payment-required" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/payment-success" element={<PaymentSuccess />} />
    <Route path="/payment-canceled" element={<PaymentCanceled />} />
    <Route path="/payment-required" element={<PaymentRequired />} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/faturamento" element={<ProtectedRoute><Faturamento /></ProtectedRoute>} />
    <Route path="/gastos" element={<ProtectedRoute><Gastos /></ProtectedRoute>} />
    <Route path="/cartoes" element={<ProtectedRoute><Cartoes /></ProtectedRoute>} />
    <Route path="/custos-fixos" element={<ProtectedRoute><CustosFixos /></ProtectedRoute>} />
    <Route path="/insumos" element={<ProtectedRoute><Insumos /></ProtectedRoute>} />
    <Route path="/bases" element={<ProtectedRoute><Bases /></ProtectedRoute>} />
    <Route path="/produtos" element={<ProtectedRoute><Produtos /></ProtectedRoute>} />
    <Route path="/encomendas" element={<ProtectedRoute><Encomendas /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
