import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TransactionDetail from './pages/TransactionDetail';
import AddressDetail from './pages/AddressDetail';
import TokenDetail from './pages/TokenDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/transaction/:index" element={<TransactionDetail />} />
        <Route path="/address/:address" element={<AddressDetail />} />
        <Route path="/token/:symbol" element={<TokenDetail />} />
      </Routes>
    </Router>
  );
}

export default App;