import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './styles/global.css';
import './styles/mobile/index.css';
import './styles/admin/index.css';

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('is-capacitor');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="app">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </div>
  </React.StrictMode>
);
