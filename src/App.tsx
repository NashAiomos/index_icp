import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TransactionDetail from './pages/TransactionDetail';
import AddressDetail from './pages/AddressDetail';
import TokenDetail from './pages/TokenDetail';
import { GlobalCacheProvider } from './contexts/GlobalCacheContext';
import { useInstantPage } from './hooks/useInstantPage';

function App() {
  // 配置 instant.page 预加载
  useInstantPage({
    intensity: 'mousedown', // 在鼠标按下时预加载，平衡性能和用户体验
    delay: 7, // 鼠标悬停7ms后开始预加载
    allowExternalLinks: false, // 不预加载外部链接，节省带宽
    allowQueryString: true, // 允许带查询参数的链接
    excludeSelectors: [
      'a[download]', // 排除下载链接
      'a[href^="mailto:"]', // 排除邮件链接
      'a[href^="tel:"]', // 排除电话链接
      '.no-preload', // 排除带有 no-preload 类的链接
      '.no-preload *' // 排除 no-preload 类内的所有元素
    ]
  });

  return (
    <GlobalCacheProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/transaction/:index" element={<TransactionDetail />} />
          <Route path="/address/:address" element={<AddressDetail />} />
          <Route path="/token/:symbol" element={<TokenDetail />} />
        </Routes>
      </Router>
    </GlobalCacheProvider>
  );
}

export default App;