import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Регистрация Service Worker для офлайн режима (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => {
        console.log('PWA ServiceWorker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.error('PWA ServiceWorker registration failed:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
