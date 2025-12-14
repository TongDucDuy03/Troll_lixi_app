import { useState, useEffect } from 'react';
import { GameProvider } from './context/GameContext';
import { SlotMachine } from './components/SlotMachine';
import { AdminPanel } from './components/AdminPanel';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return (
    <GameProvider>
      {currentPath === '/admin-duy-only' ? <AdminPanel /> : <SlotMachine />}
    </GameProvider>
  );
}

export default App;
