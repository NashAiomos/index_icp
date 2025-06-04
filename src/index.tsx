import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { globalCache } from './services/globalCache';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// 在页面卸载时清理全局缓存
window.addEventListener('beforeunload', () => {
  globalCache.destroy();
}); 