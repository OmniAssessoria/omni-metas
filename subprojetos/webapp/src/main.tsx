import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Routes, Route, HashRouter } from 'react-router-dom';
import Principal from './pages/principal/Principal.js';
import ConsultorDash from './pages/consultor_dash/ConsultorDash';
import PipeSubirGeral from './pages/pipe/subirPipeGeral';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/consultores-dashboard" element={<Principal />} />
        <Route path="/consultor/:id" element={<ConsultorDash />} />
        <Route path="/pipe-subir" element={<PipeSubirGeral />} />
        <Route path="/" element={<PipeSubirGeral />} />
        <Route path="*" element={<div className="flex h-screen items-center justify-center text-white bg-black">404 - Página não encontrada</div>} />
      </Routes>
    </HashRouter>
  </StrictMode>
);