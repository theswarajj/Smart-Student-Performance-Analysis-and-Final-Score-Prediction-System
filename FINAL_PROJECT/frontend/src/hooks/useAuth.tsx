import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User, authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => { },
  logout: () => { },
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('acadiq_auth');
    if (saved) {
      try {
        const { user: u, token: t } = JSON.parse(saved);
        setUser(u);
        setToken(t);
      } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    setUser(res.user);
    setToken(res.token);
    localStorage.setItem('acadiq_auth', JSON.stringify(res));
  };

  const logout = () => {
    if (token) authApi.logout(token).catch(() => { });
    setUser(null);
    setToken(null);
    localStorage.removeItem('acadiq_auth');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
