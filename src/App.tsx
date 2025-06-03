import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TransactionDetail from './pages/TransactionDetail';
import AddressDetail from './pages/AddressDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/transaction/:index" element={<TransactionDetail />} />
        <Route path="/address/:address" element={<AddressDetail />} />
      </Routes>
    </Router>
  );
}

export default App;