import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
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
  const stored = JSON.parse(localStorage.getItem('roadto660-v2') || '{}');
  const theme = stored?.state?.settings?.theme || 'dark';
  applyTheme(theme);
} catch {
  // default dark
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  try {
    const stored = JSON.parse(localStorage.getItem('roadto660-v2') || '{}');
    if (stored?.state?.settings?.theme === 'system') {
      applyTheme('system');
    }
  } catch {/* noop */}
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
