import React, { useState } from 'react';
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import CoursePlayer from './components/CoursePlayer';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const handleLogin = () => {
    localStorage.setItem('isLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  return (
    <Router>
      <Routes>
        {/* Root Redirect (SAFE & STABLE) */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Login */}
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/admin" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            isLoggedIn ? (
              <AdminPanel onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Player / Course */}
        <Route
          path="/player"
          element={
            isLoggedIn ? (
              <CoursePlayer onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;