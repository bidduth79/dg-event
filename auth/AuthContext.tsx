import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserProfile {
  id?: string;
  email: string;
  name: string;
  picture?: string;
}

interface AuthContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('google_access_token');
    if (token) {
      setAccessToken(token);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch user info when access token changes
  useEffect(() => {
    const fetchUser = async () => {
      if (!accessToken) {
        setUser(null);
        return;
      }
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
           headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
           const data = await response.json();
           setUser({
             id: data.id,
             email: data.email,
             name: data.name,
             picture: data.picture
           });
        }
      } catch (error) {
        console.error("Error fetching user info", error);
      }
    };
    fetchUser();
  }, [accessToken]);

  const login = (token: string) => {
    localStorage.setItem('google_access_token', token);
    setAccessToken(token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('google_access_token');
    setAccessToken(null);
    setIsAuthenticated(false); 
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      accessToken,
      isAuthenticated,
      user,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};