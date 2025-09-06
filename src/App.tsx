import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { GroupProvider } from "@/hooks/useGroupContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Ideas from "./pages/Ideas";
import SubmitIdea from "./pages/SubmitIdea";
import IdeaDetail from "./pages/IdeaDetail";
import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import GroupJoin from "./pages/GroupJoin";
import GroupCreate from "./pages/GroupCreate";
import Groups from "./pages/Groups";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <GroupProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/groups/join" element={
                <ProtectedRoute>
                  <GroupJoin />
                </ProtectedRoute>
              } />
              <Route path="/groups/join/:inviteCode" element={<GroupJoin />} />
              <Route path="/groups/create" element={
                <ProtectedRoute>
                  <GroupCreate />
                </ProtectedRoute>
              } />
              <Route path="/groups" element={
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/ideas" element={
                <ProtectedRoute>
                  <Ideas />
                </ProtectedRoute>
              } />
              <Route path="/submit-idea" element={
                <ProtectedRoute>
                  <SubmitIdea />
                </ProtectedRoute>
              } />
              <Route path="/ideas/:id" element={
                <ProtectedRoute>
                  <IdeaDetail />
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </GroupProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
