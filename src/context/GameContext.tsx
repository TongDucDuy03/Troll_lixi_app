import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { gameAPI } from '../utils/api';
import { GameState, Denomination, SpinHistory, RiggingConfig, RiggingMode, RoleId, ROLES, RoleInventory, ALL_DENOMINATIONS } from '../types';

const ADMIN_PIN = '1234';

// Default initial quantities per role (can be customized in admin)
const getDefaultRoleInventory = (): Denomination[] => {
  return ALL_DENOMINATIONS.map((value) => ({
    value,
    quantity: 0,
    initial_quantity: 0,
  }));
};

const createInitialRoleInventories = (): RoleInventory => {
  const inventories: RoleInventory = {};
  ROLES.forEach((role) => {
    inventories[role.id] = getDefaultRoleInventory();
  });
  return inventories;
};

const initialState: GameState = {
  roleInventories: createInitialRoleInventories(),
  spinHistory: [],
  riggingConfig: {
    next_spin_mode: 'random',
    target_value: null,
    fake_value: null,
  },
  isAdminAuthenticated: false,
};

interface GameContextType {
  state: GameState;
  userName: string;
  adminLogin: (pin: string) => boolean;
  adminLogout: () => void;
  updateRoleDenominationQuantity: (roleId: RoleId, value: number, quantity: number) => void;
  setRiggingMode: (mode: RiggingMode, targetValue?: number, fakeValue?: number) => void;
  performSpin: (userName: string, roleId: RoleId) => SpinResult;
  resetRoleInventory: (roleId: RoleId) => void;
  getTotalMoneyInSystem: () => number;
  getRoleBudget: (roleId: RoleId) => number;
}

export interface SpinResult {
  displayValue: number;
  realValue: number;
  scenario: string;
  isTroll: boolean;
  isEmpty: boolean;
  requiresReSpin?: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children, userId, userName }: { children: ReactNode; userId: string; userName: string }) => {
  const [state, setState] = useState<GameState>(initialState);
  const [loading, setLoading] = useState(true);

  // Load game state from API on mount
  useEffect(() => {
    if (!userId) return;

    const loadGameState = async () => {
      try {
        const data = await gameAPI.getState();
        setState({
          roleInventories: data.roleInventories || createInitialRoleInventories(),
          spinHistory: [], // We'll load history separately if needed
          riggingConfig: data.riggingConfig || initialState.riggingConfig,
          isAdminAuthenticated: false,
        });
        setLoading(false);
      } catch (error) {
        console.error('Error loading game state:', error);
        // If error, use initial state
        setState(initialState);
        setLoading(false);
      }
    };

    loadGameState();
  }, [userId]);

  // Save game state to API whenever it changes (debounced)
  useEffect(() => {
    if (!userId || loading) return;

    const saveGameState = async () => {
      try {
        await gameAPI.updateState(state.roleInventories, state.riggingConfig);
      } catch (error) {
        console.error('Error saving game state:', error);
      }
    };

    // Debounce saves to avoid too many writes
    const timeoutId = setTimeout(saveGameState, 500);
    return () => clearTimeout(timeoutId);
  }, [state.roleInventories, state.riggingConfig, userId, loading]);

  const adminLogin = (pin: string): boolean => {
    if (pin === ADMIN_PIN) {
      setState((prev) => ({ ...prev, isAdminAuthenticated: true }));
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setState((prev) => ({ ...prev, isAdminAuthenticated: false }));
  };

  const updateRoleDenominationQuantity = (roleId: RoleId, value: number, quantity: number) => {
    setState((prev) => {
      const roleInv = prev.roleInventories[roleId] || [];
      const updatedRoleInv = roleInv.map((d) =>
        d.value === value
          ? { ...d, quantity: Math.max(0, quantity), initial_quantity: Math.max(0, quantity) }
          : d
      );
      
      // If denomination doesn't exist, add it
      if (!updatedRoleInv.find((d) => d.value === value)) {
        updatedRoleInv.push({ value, quantity: Math.max(0, quantity), initial_quantity: Math.max(0, quantity) });
        updatedRoleInv.sort((a, b) => a.value - b.value);
      }

      return {
        ...prev,
        roleInventories: {
          ...prev.roleInventories,
          [roleId]: updatedRoleInv,
        },
      };
    });
  };

  const setRiggingMode = (mode: RiggingMode, targetValue?: number, fakeValue?: number) => {
    setState((prev) => ({
      ...prev,
      riggingConfig: {
        next_spin_mode: mode,
        target_value: targetValue || null,
        fake_value: fakeValue || null,
      },
    }));
  };

  const performSpin = (userName: string, roleId: RoleId): SpinResult => {
    const { roleInventories, riggingConfig } = state;
    const roleInventory = roleInventories[roleId] || [];

    const availableDenoms = roleInventory.filter((d) => d.quantity > 0);

    if (availableDenoms.length === 0) {
      const history: SpinHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        user_name: userName,
        role_id: roleId,
        display_value: 0,
        real_value: 0,
        scenario_used: 'empty',
      };
      
      // Save to API
      gameAPI.addSpinHistory({
        timestamp: history.timestamp,
        userName: history.user_name,
        roleId: history.role_id,
        displayValue: history.display_value,
        realValue: history.real_value,
        scenarioUsed: history.scenario_used,
      }).catch(err => console.error('Error saving spin history:', err));

      return {
        displayValue: 0,
        realValue: 0,
        scenario: 'empty',
        isTroll: false,
        isEmpty: true,
      };
    }

    let realValue: number;
    let displayValue: number;
    let scenario: string;
    let isTroll = false;

    if (riggingConfig.next_spin_mode === 'force_value' && riggingConfig.target_value) {
      const targetDenom = availableDenoms.find((d) => d.value === riggingConfig.target_value);
      if (targetDenom) {
        realValue = targetDenom.value;
        displayValue = realValue;
        scenario = 'forced';
      } else {
        realValue = weightedRandomPick(availableDenoms);
        displayValue = realValue;
        scenario = 'random';
      }
    } else if (
      riggingConfig.next_spin_mode === 'troll_fake_high_to_low' &&
      riggingConfig.fake_value &&
      riggingConfig.target_value
    ) {
      const targetDenom = availableDenoms.find((d) => d.value === riggingConfig.target_value);
      if (targetDenom) {
        displayValue = riggingConfig.fake_value;
        realValue = riggingConfig.target_value;
        scenario = 'troll_fake_to_real';
        isTroll = true;
      } else {
        realValue = weightedRandomPick(availableDenoms);
        displayValue = realValue;
        scenario = 'random';
      }
    } else {
      realValue = weightedRandomPick(availableDenoms);
      displayValue = realValue;
      scenario = 'random';
    }

    // Check if this triggers a re-spin (1k or 2k for Kids or Younger roles)
    const requiresReSpin = (roleId === 'kids' || roleId === 'younger') && (realValue === 1000 || realValue === 2000);

    setState((prev) => {
      const roleInv = prev.roleInventories[roleId] || [];
      const newRoleInv = roleInv.map((d) =>
        d.value === realValue ? { ...d, quantity: d.quantity - 1 } : d
      );

      const history: SpinHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        user_name: userName,
        role_id: roleId,
        display_value: displayValue,
        real_value: realValue,
        scenario_used: scenario,
      };

      // Save to API
      gameAPI.addSpinHistory({
        timestamp: history.timestamp,
        userName: history.user_name,
        roleId: history.role_id,
        displayValue: history.display_value,
        realValue: history.real_value,
        scenarioUsed: history.scenario_used,
      }).catch(err => console.error('Error saving spin history:', err));

      return {
        ...prev,
        roleInventories: {
          ...prev.roleInventories,
          [roleId]: newRoleInv,
        },
        spinHistory: [history, ...prev.spinHistory],
        riggingConfig: {
          next_spin_mode: 'random',
          target_value: null,
          fake_value: null,
        },
      };
    });

    return {
      displayValue,
      realValue,
      scenario,
      isTroll,
      isEmpty: false,
      requiresReSpin,
    };
  };

  const weightedRandomPick = (denoms: Denomination[]): number => {
    const totalWeight = denoms.reduce((sum, d) => sum + d.quantity, 0);
    let random = Math.random() * totalWeight;

    for (const denom of denoms) {
      random -= denom.quantity;
      if (random <= 0) {
        return denom.value;
      }
    }

    return denoms[0].value;
  };

  const resetRoleInventory = (roleId: RoleId) => {
    setState((prev) => {
      const roleInv = prev.roleInventories[roleId] || [];
      const resetRoleInv = roleInv.map((d) => ({
        ...d,
        quantity: d.initial_quantity,
      }));

      return {
        ...prev,
        roleInventories: {
          ...prev.roleInventories,
          [roleId]: resetRoleInv,
        },
      };
    });
  };

  const getTotalMoneyInSystem = (): number => {
    let total = 0;
    Object.values(state.roleInventories).forEach((roleInv) => {
      roleInv.forEach((d) => {
        total += d.value * d.quantity;
      });
    });
    return total;
  };

  const getRoleBudget = (roleId: RoleId): number => {
    const roleInv = state.roleInventories[roleId] || [];
    return roleInv.reduce((sum, d) => sum + d.value * d.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-700 via-red-800 to-red-900 flex items-center justify-center">
        <div className="text-yellow-400 text-2xl font-bold">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <GameContext.Provider
      value={{
        state,
        userName,
        adminLogin,
        adminLogout,
        updateRoleDenominationQuantity,
        setRiggingMode,
        performSpin,
        resetRoleInventory,
        getTotalMoneyInSystem,
        getRoleBudget,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
