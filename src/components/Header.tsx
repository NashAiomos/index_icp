import React, { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onSearch?: (query: string) => void;
  isDark?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onSearch, isDark }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  return (
    <header className={`${isDark ? 'bg-dark-bg border-dark-border' : 'border-gray-200'}`}>
      <div className="container mx-auto" style={{ padding: '0 3rem' }}>
        <div className="flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="cursor-pointer">
              <img 
                src="/logo.svg" 
                alt="Vly Explorer" 
                style={{ height: '5rem' }} 
                className="w-auto hover:opacity-70 transition-opacity" 
              />
            </Link>
          </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-xl w-full md:w-96">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className={`w-full ${isDark
                      ? 'bg-dark-card border-dark-border text-white placeholder-gray-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                    } border rounded-lg py-2.5 px-4 pl-10 focus:outline-none focus:border-primary-blue transition-colors`}
                />
                <FiSearch className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'
                  } text-lg`} />
              </div>
            </form>

        </div>
      </div>
    </header>
  );
};

export default Header; 