import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('quizlive_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('quizlive_token'));
  const [loading, setLoading] = useState(true);

  // Verify token and refresh user on mount
  useEffect(() => {
    const verifyAuth = async () => {
      if (token) {
        try {
          const res = await authAPI.getProfile();
          setUser(res.data.user);
          localStorage.setItem('quizlive_user', JSON.stringify(res.data.user));
          // Initialize socket connection
          initSocket(token);
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    verifyAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('quizlive_token', newToken);
    localStorage.setItem('quizlive_user', JSON.stringify(newUser));
    initSocket(newToken);
    return newUser;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data);
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('quizlive_token', newToken);
    localStorage.setItem('quizlive_user', JSON.stringify(newUser));
    initSocket(newToken);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('quizlive_token');
    localStorage.removeItem('quizlive_user');
    disconnectSocket();
  }, []);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('quizlive_user', JSON.stringify(updatedUser));
  }, []);

  const isHost = user?.role === 'host';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, isHost }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
