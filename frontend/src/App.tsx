import type { ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Produtores from './pages/Produtores'
import Analises from './pages/Analises'
import Fichas from './pages/Fichas'
import Coletas from './pages/Coletas'
import Lotes from './pages/Lotes'

function PrivatePage({ children }: { children: ReactNode }) {
  return (
    <PrivateRoute>
      <Layout>{children}</Layout>
    </PrivateRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivatePage><Dashboard /></PrivatePage>} />
        <Route path="/produtores" element={<PrivatePage><Produtores /></PrivatePage>} />
        <Route path="/analises" element={<PrivatePage><Analises /></PrivatePage>} />
        <Route path="/fichas" element={<PrivatePage><Fichas /></PrivatePage>} />
        <Route path="/coletas" element={<PrivatePage><Coletas /></PrivatePage>} />
        <Route path="/lotes" element={<PrivatePage><Lotes /></PrivatePage>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
