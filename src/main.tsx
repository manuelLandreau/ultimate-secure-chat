import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  // Wait for page load to avoid affecting initial load performance
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('PWA service worker registered:', registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update()
            .then(() => console.log('Service worker updated'))
            .catch(error => console.error('Error updating service worker:', error));
        }, 60 * 60 * 1000); // Every hour
      })
      .catch(error => {
        console.error('Service worker registration failed:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
