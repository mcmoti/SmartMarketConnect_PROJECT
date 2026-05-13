import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import smcLogo from "@/assets/smc-logo.png";
import { SMCCopilot } from "@/components/SMCCopilot";

const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SignUp = lazy(() => import("./pages/SignUp"));
const SignIn = lazy(() => import("./pages/SignIn"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const FarmerOnboarding = lazy(() => import("./pages/farmer/FarmerOnboarding"));
const FarmerDashboard = lazy(() => import("./pages/farmer/FarmerDashboard"));
const Marketplace = lazy(() => import("./pages/buyer/Marketplace"));
const Checkout = lazy(() => import("./pages/buyer/Checkout"));
const BuyerDashboard = lazy(() => import("./pages/buyer/BuyerDashboard"));
const CreditorDashboard = lazy(() => import("./pages/creditor/CreditorDashboard"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="relative">
      <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
      <img src={smcLogo} alt="SMC Logo" className="h-16 w-16 rounded-full object-cover relative z-10 animate-bounce" />
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <SMCCopilot />
        <BrowserRouter>
          <GlobalErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/farmer/onboarding" element={
                <ProtectedRoute allowedRoles={["farmer"]}><FarmerOnboarding /></ProtectedRoute>
              } />
              <Route path="/farmer/dashboard" element={
                <ProtectedRoute allowedRoles={["farmer"]}><FarmerDashboard /></ProtectedRoute>
              } />
              <Route path="/buyer/marketplace" element={
                <ProtectedRoute allowedRoles={["buyer"]}><Marketplace /></ProtectedRoute>
              } />
              <Route path="/buyer/checkout" element={
                <ProtectedRoute allowedRoles={["buyer"]}><Checkout /></ProtectedRoute>
              } />
              <Route path="/buyer/dashboard" element={
                <ProtectedRoute allowedRoles={["buyer"]}><BuyerDashboard /></ProtectedRoute>
              } />
              <Route path="/creditor/dashboard" element={
                <ProtectedRoute allowedRoles={["creditor"]}><CreditorDashboard /></ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </GlobalErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
