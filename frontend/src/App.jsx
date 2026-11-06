import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "sonner";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import AuditList from "@/pages/AuditList";
import AuditDetail from "@/pages/AuditDetail";
import NewAudit from "@/pages/NewAudit";
import TemplateEditor from "@/pages/TemplateEditor";
import TaskList from "@/pages/TaskList";
import AdminPortal from "@/pages/AdminPortal";
import Drafts from "@/pages/Drafts";
import DirectorMIS from "@/pages/DirectorMIS";
import BranchScorecards from "@/pages/BranchScorecards";
import AuditorProductivity from "@/pages/AuditorProductivity";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/mis" element={<ProtectedRoute><DirectorMIS /></ProtectedRoute>} />
            <Route path="/scorecards" element={<ProtectedRoute><BranchScorecards /></ProtectedRoute>} />
            <Route path="/productivity" element={<ProtectedRoute><AuditorProductivity /></ProtectedRoute>} />
            <Route path="/audits" element={<ProtectedRoute><AuditList /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TaskList /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPortal /></ProtectedRoute>} />
            <Route path="/template" element={<ProtectedRoute><TemplateEditor /></ProtectedRoute>} />
            <Route path="/drafts" element={<ProtectedRoute><Drafts /></ProtectedRoute>} />
            <Route path="/audits/new" element={<ProtectedRoute><NewAudit /></ProtectedRoute>} />
            <Route path="/audits/:id" element={<ProtectedRoute><AuditDetail /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
