import React from 'react';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="App">
      <Navbar />
      <div className="content">
        {children}
      </div>
    </div>
  );
};

export default Layout; 