import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

  const loadUserProfile = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        loadUserProfile();
      } else {
        setLoading(false);
      }
    };

    // Initial check
    checkAuth();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        if (e.newValue) {
          // Token was added in another tab, load user profile
          loadUserProfile();
        } else {
          // Token was removed in another tab, log out
          setUser(null);
          setProfile(null);
        }
      }
    };

    // Listen for custom auth-token-changed event (same tab)
    const handleAuthTokenChanged = (e: CustomEvent) => {
      if (e.detail.token) {
        loadUserProfile();
      } else {
        setUser(null);
        setProfile(null);
      }
    };

    // Check auth when window gains focus (user switches back to tab)
    const handleFocus = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-token-changed', handleAuthTokenChanged as EventListener);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-token-changed', handleAuthTokenChanged as EventListener);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadUserProfile]);

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
