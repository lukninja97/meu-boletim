import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ProfessorDashboard from "./pages/professor/ProfessorDashboard";
import Turmas from "./pages/professor/Turmas";
import Materias from "./pages/professor/Materias";
import Notas from "./pages/professor/Notas";
import Presenca from "./pages/professor/Presenca";
import AlunoDashboard from "./pages/aluno/AlunoDashboard";
import MinhasTurmas from "./pages/aluno/MinhasTurmas";
import MinhasNotas from "./pages/aluno/MinhasNotas";
import MinhaFrequencia from "./pages/aluno/MinhaFrequencia";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/professor" element={<ProfessorDashboard />} />
          <Route path="/professor/turmas" element={<Turmas />} />
          <Route path="/professor/materias" element={<Materias />} />
          <Route path="/professor/notas" element={<Notas />} />
          <Route path="/professor/presenca" element={<Presenca />} />
          <Route path="/aluno" element={<AlunoDashboard />} />
          <Route path="/aluno/turmas" element={<MinhasTurmas />} />
          <Route path="/aluno/notas" element={<MinhasNotas />} />
          <Route path="/aluno/frequencia" element={<MinhaFrequencia />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
