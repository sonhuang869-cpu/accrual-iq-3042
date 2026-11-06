import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Contracts } from './pages/Contracts';
import { ContractDetail } from './pages/ContractDetail';
import { Recognition } from './pages/Recognition';
import { AuditTrail } from './pages/AuditTrail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="contracts/:id" element={<ContractDetail />} />
          <Route path="recognition" element={<Recognition />} />
          <Route path="audit" element={<AuditTrail />} />
          <Route path="*" element={
            <div className="p-6 text-center">
              <div className="text-4xl font-bold num text-text-muted">404</div>
              <div className="text-text-secondary mt-2">Page not found</div>
            </div>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
