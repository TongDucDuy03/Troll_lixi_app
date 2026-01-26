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

    // Listen for navigation changes
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    // Listen for pushState/replaceState (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      handleLocationChange();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-800 to-red-900 flex items-center justify-center">
        <div className="text-yellow-400 text-2xl font-bold">Đang tải...</div>
      </div>
    );
  }

  // Nếu vào /admin và chưa đăng nhập → hiện Auth
  // Nếu vào /admin và đã đăng nhập → hiện AdminPanel (chỉ cần PIN)
  if (currentPath === '/admin') {
    if (!user) {
      return <Auth />;
    }
    // Đã đăng nhập → hiện AdminPanel (sẽ check PIN bên trong)
    const displayName = profile?.displayName || user?.displayName || user?.email || 'User';
    return (
      <GameProvider userId={user.id} userName={displayName}>
        <AdminPanel />
      </GameProvider>
    );
  }

  // Trang chính (SlotMachine) - yêu cầu đăng nhập
  if (!user) {
    return <Auth />;
  }

  const displayName = profile?.displayName || user?.displayName || user?.email || 'User';
  
  return (
    <GameProvider userId={user.id} userName={displayName}>
      <SlotMachine />
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
