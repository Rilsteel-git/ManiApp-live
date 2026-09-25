import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { AuthProvider } from './context/AuthContext';
import { App } from './App';
import { PwaUpdatePrompt } from './components/PwaUpdatePrompt';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <PwaUpdatePrompt />
    </AuthProvider>
  </StrictMode>
);
