import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, setToken } from '../utils/api';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

interface UserContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (displayName: string) => Promise<{ error: any }>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const userData = await authAPI.getMe();
      setUser(userData);
      setProfile(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading user profile:', error);
      // Token might be invalid, clear it
      setToken(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const response = await authAPI.register(email, password, displayName);
      setToken(response.token);
      setUser(response.user);
      setProfile(response.user);
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Registration failed' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authAPI.login(email, password);
      setToken(response.token);
      setUser(response.user);
      setProfile(response.user);
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Login failed' } };
    }
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (displayName: string) => {
    try {
      const updatedUser = await authAPI.updateProfile(displayName);
      setUser(updatedUser);
      setProfile(updatedUser);
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message || 'Update failed' } };
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        loading,
        signUp,
        signIn,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};
