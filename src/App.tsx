
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import APIKeys from "./pages/APIKeys";
import SeedPhrase from "./pages/SeedPhrase";
import LedgerSeedPhrase from "./pages/LedgerSeedPhrase";
import CRM from "./pages/CRM";
import Login from "./pages/Login";
import Marketing from "./pages/Marketing";
import Lead from "./pages/Lead";
import TemplateEditor from "./pages/TemplateEditor";
import Commercial from "./pages/Commercial";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import EmailSending from "./pages/EmailSending";
import EmailMarketing from "./pages/EmailMarketing";
import Transaction from "./pages/Transaction";
import Transfer from "./pages/Transfer";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<APIKeys />} />
            <Route path="/seed-phrase" element={<SeedPhrase />} />
            <Route path="/ledger-seed-phrase" element={<LedgerSeedPhrase />} />
            <Route path="/login" element={<Login />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/lead" element={<Lead />} />
            <Route path="/editor" element={<TemplateEditor />} />
            <Route path="/pro" element={<Commercial />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/email-sending" element={
              <ProtectedRoute>
                <EmailSending />
              </ProtectedRoute>
            } />
            <Route path="/email-marketing" element={
              <ProtectedRoute>
                <EmailMarketing />
              </ProtectedRoute>
            } />
            <Route path="/transaction" element={<Transaction />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
