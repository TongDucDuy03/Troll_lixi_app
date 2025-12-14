import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GameState, Denomination, SpinHistory, RiggingConfig, RiggingMode } from '../types';

const STORAGE_KEY = 'tet-lucky-money-data';
const ADMIN_PIN = '1234';

const initialDenominations: Denomination[] = [
  { value: 10000, quantity: 20, initial_quantity: 20 },
  { value: 20000, quantity: 15, initial_quantity: 15 },
  { value: 50000, quantity: 10, initial_quantity: 10 },
  { value: 100000, quantity: 8, initial_quantity: 8 },
  { value: 200000, quantity: 5, initial_quantity: 5 },
  { value: 500000, quantity: 2, initial_quantity: 2 },
];

const initialState: GameState = {
  denominations: initialDenominations,
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
  adminLogin: (pin: string) => boolean;
  adminLogout: () => void;
  updateDenominationQuantity: (value: number, delta: number) => void;
  setRiggingMode: (mode: RiggingMode, targetValue?: number, fakeValue?: number) => void;
  performSpin: (userName: string) => SpinResult;
  resetInventory: () => void;
  getTotalMoneyInSystem: () => number;
}

export interface SpinResult {
  displayValue: number;
  realValue: number;
  scenario: string;
  isTroll: boolean;
  isEmpty: boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...parsed, isAdminAuthenticated: false };
      } catch {
        return initialState;
      }
    }
    return initialState;
  });

  useEffect(() => {
    const toSave = { ...state, isAdminAuthenticated: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state]);

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

  const updateDenominationQuantity = (value: number, delta: number) => {
    setState((prev) => ({
      ...prev,
      denominations: prev.denominations.map((d) =>
        d.value === value
          ? { ...d, quantity: Math.max(0, d.quantity + delta) }
          : d
      ),
    }));
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

  const performSpin = (userName: string): SpinResult => {
    const { denominations, riggingConfig } = state;

    const availableDenoms = denominations.filter((d) => d.quantity > 0);

    if (availableDenoms.length === 0) {
      const history: SpinHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        user_name: userName,
        display_value: 0,
        real_value: 0,
        scenario_used: 'empty',
      };
      setState((prev) => ({
        ...prev,
        spinHistory: [history, ...prev.spinHistory],
      }));
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

    setState((prev) => {
      const newDenominations = prev.denominations.map((d) =>
        d.value === realValue ? { ...d, quantity: d.quantity - 1 } : d
      );

      const history: SpinHistory = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        user_name: userName,
        display_value: displayValue,
        real_value: realValue,
        scenario_used: scenario,
      };

      return {
        ...prev,
        denominations: newDenominations,
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

  const resetInventory = () => {
    setState((prev) => ({
      ...prev,
      denominations: prev.denominations.map((d) => ({
        ...d,
        quantity: d.initial_quantity,
      })),
    }));
  };

  const getTotalMoneyInSystem = (): number => {
    return state.denominations.reduce((sum, d) => sum + d.value * d.quantity, 0);
  };

  return (
    <GameContext.Provider
      value={{
        state,
        adminLogin,
        adminLogout,
        updateDenominationQuantity,
        setRiggingMode,
        performSpin,
        resetInventory,
        getTotalMoneyInSystem,
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
