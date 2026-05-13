import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as api from '../services/api';
import { User, UserRole } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      // El backend retorna solo { access, refresh }
      const data = await api.login(email, password);
      api.setTokens(data.access, data.refresh);

      // Decodificar el JWT para obtener los datos del usuario
      // El backend inyecta: email, nombre, username, rol en el payload
      const payload = api.decodeToken(data.access);
      if (!payload) throw new Error('Token inválido');

      const me: User = {
        id: payload.user_id,
        email: payload.email,
        nombre: payload.nombre,
        username: payload.username,
        rol: payload.rol as UserRole,
      };

      setUser(me);
      return me;
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    api.clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
