import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './lib/auth';
import { DataProvider } from './lib/DataProvider';
import './index.css';

function applyTheme(theme: 'dark' | 'light' | 'system') {
  const root = document.documentElement;
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('light', !prefersDark);
  } else {
    root.classList.toggle('light', theme === 'light');
  }
}

// Apply saved theme before first render
try {
  const stored = JSON.parse(localStorage.getItem('roadto660-v3') || '{}');
  const theme = stored?.state?.cachedTheme || 'dark';
  applyTheme(theme);
} catch {
  // default dark
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  try {
    const stored = JSON.parse(localStorage.getItem('roadto660-v3') || '{}');
    if (stored?.state?.cachedTheme === 'system') {
      applyTheme('system');
    }
  } catch {/* noop */}
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </AuthProvider>
  </React.StrictMode>
);
