import { useState, useEffect } from 'react';
import { UserProvider, useUser } from './context/UserContext';
import { GameProvider } from './context/GameContext';
import { SlotMachine } from './components/SlotMachine';
import { AdminPanel } from './components/AdminPanel';
import { Auth } from './components/Auth';

function AppContent() {
  const { user, profile, loading } = useUser();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-800 to-red-900 flex items-center justify-center">
        <div className="text-yellow-400 text-2xl font-bold">Đang tải...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const displayName = profile?.displayName || user?.displayName || user?.email || 'User';
  
  return (
    <GameProvider userId={user.id} userName={displayName}>
      {currentPath === '/admin' ? <AdminPanel /> : <SlotMachine />}
    </GameProvider>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
