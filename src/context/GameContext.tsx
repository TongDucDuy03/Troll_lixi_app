import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  setRiggingMode: (mode: RiggingMode, targetValue?: number, fakeValue?: number) => Promise<void>;
  performSpin: (userName: string, roleId: RoleId) => SpinResult;
  resetRoleInventory: (roleId: RoleId) => void;
  getTotalMoneyInSystem: () => number;
  getRoleBudget: (roleId: RoleId) => number;
  getRoleSpent: (roleId: RoleId) => number;
  getRoleRemaining: (roleId: RoleId) => number;
  getDenominationRemainingQuantity: (roleId: RoleId, value: number) => number;
  refreshSpinHistory: () => Promise<void>;
  resetAllData: () => Promise<void>;
}

export interface SpinResult {
  displayValue: number;
  realValue: number;
  scenario: string;
  isTroll: boolean;
  isEmpty: boolean;
  requiresReSpin?: boolean;
  errorMessage?: string;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children, userId, userName, isSharedMode = false, shareToken = '' }: { children: ReactNode; userId: string; userName: string; isSharedMode?: boolean; shareToken?: string }) => {
  const [state, setState] = useState<GameState>(initialState);
  const [loading, setLoading] = useState(true);
  const isProcessingSpinRef = useRef(false); // Prevent duplicate spin processing

  // Load game state and spin history from API on mount
  useEffect(() => {
    if (!userId) return;

    const loadGameState = async () => {
      try {
        let data: any;
        let history: SpinHistory[] = [];

        if (isSharedMode && shareToken) {
          // Load from shared endpoint (no auth)
          data = await gameAPI.getSharedState(shareToken);
          // Load spin history for shared mode too (to calculate budget correctly)
          try {
            const historyData = await gameAPI.getSharedSpinHistory(shareToken, 100);
            history = historyData.map((item: any) => ({
              id: item._id || item.id || Date.now().toString() + Math.random(),
              timestamp: item.timestamp || Date.now(),
              user_name: item.userName || item.user_name || 'Anonymous',
              role_id: item.roleId || item.role_id || null,
              display_value: item.displayValue !== undefined && item.displayValue !== null ? item.displayValue : (item.display_value !== undefined && item.display_value !== null ? item.display_value : 0),
              real_value: item.realValue !== undefined && item.realValue !== null ? item.realValue : (item.real_value !== undefined && item.real_value !== null ? item.real_value : 0),
              scenario_used: item.scenarioUsed || item.scenario_used || 'unknown',
            }));
          } catch (historyError) {
            console.error('Error loading shared spin history:', historyError);
            history = [];
          }
        } else {
          // Load game state (authenticated)
          data = await gameAPI.getState();
          
          // Load spin history
          try {
            const historyData = await gameAPI.getSpinHistory(100);
            // Convert backend format (camelCase) to frontend format (snake_case)
            history = historyData.map((item: any) => ({
              id: item._id || item.id || Date.now().toString() + Math.random(),
              timestamp: item.timestamp || Date.now(),
              user_name: item.userName || item.user_name || 'Anonymous',
              role_id: item.roleId || item.role_id || null,
              display_value: item.displayValue !== undefined && item.displayValue !== null ? item.displayValue : (item.display_value !== undefined && item.display_value !== null ? item.display_value : 0),
              real_value: item.realValue !== undefined && item.realValue !== null ? item.realValue : (item.real_value !== undefined && item.real_value !== null ? item.real_value : 0),
              scenario_used: item.scenarioUsed || item.scenario_used || 'unknown',
            }));
          } catch (historyError) {
            console.error('Error loading spin history:', historyError);
            // Continue without history if it fails
          }
        }

        const loadedRiggingConfig = data.riggingConfig || initialState.riggingConfig;
        console.log('📥 Loaded riggingConfig from API:', loadedRiggingConfig);
        
        setState({
          roleInventories: data.roleInventories || createInitialRoleInventories(),
          spinHistory: history,
          riggingConfig: loadedRiggingConfig,
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
  }, [userId, isSharedMode, shareToken]);

  // Save game state to API whenever it changes (debounced)
  // Skip saving in shared mode (read-only)
  useEffect(() => {
    if (!userId || loading || isSharedMode) return;

    const saveGameState = async () => {
      try {
        console.log('💾 Saving riggingConfig to API:', state.riggingConfig);
        await gameAPI.updateState(state.roleInventories, state.riggingConfig);
        console.log('✅ RiggingConfig saved successfully');
      } catch (error) {
        console.error('❌ Error saving game state:', error);
      }
    };

    // Debounce saves to avoid too many writes
    // Note: riggingConfig is saved immediately in setRiggingMode, so we exclude it from dependencies
    const timeoutId = setTimeout(saveGameState, 500);
    return () => clearTimeout(timeoutId);
  }, [state.roleInventories, userId, loading, isSharedMode]);

  // Poll riggingConfig from backend periodically to sync across tabs/devices
  // Works for both authenticated mode and shared mode
  useEffect(() => {
    if (loading) return;
    if (!userId && !isSharedMode) return;
    if (isSharedMode && !shareToken) return;

    const pollRiggingConfig = async () => {
      try {
        let data;
        if (isSharedMode && shareToken) {
          // Poll from shared endpoint
          data = await gameAPI.getSharedState(shareToken);
        } else if (userId) {
          // Poll from authenticated endpoint
          data = await gameAPI.getState();
        } else {
          return;
        }

        if (data.riggingConfig) {
          // Only update if different to avoid unnecessary re-renders
          setState((prev) => {
            if (
              prev.riggingConfig.next_spin_mode !== data.riggingConfig.next_spin_mode ||
              prev.riggingConfig.target_value !== data.riggingConfig.target_value ||
              prev.riggingConfig.fake_value !== data.riggingConfig.fake_value
            ) {
              console.log('🔄 RiggingConfig synced from backend:', data.riggingConfig, isSharedMode ? '(shared mode)' : '(authenticated mode)');
              return {
                ...prev,
                riggingConfig: data.riggingConfig,
              };
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('Error polling riggingConfig:', error);
      }
    };

    // Poll every 2 seconds to sync across tabs
    const intervalId = setInterval(pollRiggingConfig, 2000);
    
    // Also check when window gains focus
    const handleFocus = () => {
      pollRiggingConfig();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, loading, isSharedMode, shareToken]);

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

  const setRiggingMode = async (mode: RiggingMode, targetValue?: number, fakeValue?: number) => {
    const newConfig = {
      next_spin_mode: mode,
      target_value: targetValue !== undefined ? targetValue : null,
      fake_value: fakeValue !== undefined ? fakeValue : null,
    };
    console.log('🔧 Rigging mode set:', newConfig);
    
    // Update local state immediately
    setState((prev) => {
      // Save to backend IMMEDIATELY (no debounce) so other tabs/devices can use it
      if (!isSharedMode && userId) {
        // Save riggingConfig immediately in background (fire and forget)
        gameAPI.updateState(prev.roleInventories, newConfig)
          .then(() => {
            console.log('✅ RiggingConfig saved immediately - will sync across all tabs/devices');
          })
          .catch((error) => {
            console.error('❌ Error saving riggingConfig immediately:', error);
          });
      }
      
      // Return updated state
      return {
      ...prev,
        riggingConfig: newConfig,
      };
    });
  };

  const performSpin = (userName: string, roleId: RoleId): SpinResult => {
    // Prevent duplicate spin processing
    if (isProcessingSpinRef.current) {
      console.warn('⚠️ performSpin already in progress, ignoring duplicate call');
      return {
        displayValue: 0,
        realValue: 0,
        scenario: 'duplicate',
        isTroll: false,
        isEmpty: true,
        errorMessage: 'Đang xử lý lượt quay trước đó, vui lòng đợi...',
      };
    }

    isProcessingSpinRef.current = true;

    try {
      const { roleInventories, riggingConfig } = state;
      const roleInventory = roleInventories[roleId] || [];
      
      console.log('🎰 performSpin called:', {
        userName,
        roleId,
        riggingMode: riggingConfig.next_spin_mode,
        targetValue: riggingConfig.target_value,
        fakeValue: riggingConfig.fake_value,
      });

    // Tính budget còn lại cho role này
    const roleBudget = getRoleBudget(roleId);
    const roleSpent = getRoleSpent(roleId);
    const roleRemaining = roleBudget - roleSpent;

    // Kiểm tra budget còn lại
    if (roleRemaining <= 0) {
      const roleName = ROLES.find((r) => r.id === roleId)?.name || roleId;
      isProcessingSpinRef.current = false; // Reset flag before early return
      return {
        displayValue: 0,
        realValue: 0,
        scenario: 'budget_exhausted',
        isTroll: false,
        isEmpty: true,
        errorMessage: `Tiền cho ${roleName} đã hết, vui lòng nạp thêm!`,
      };
    }

    // Tính available denominations dựa trên budget còn lại
    // Chỉ lấy các mệnh giá:
    // - Có initial_quantity > 0
    // - Số tờ còn lại (sau khi trừ lịch sử quay) > 0
    // - Và còn đủ budget để quay
    const availableDenoms = roleInventory.filter((d) => {
      if (d.initial_quantity <= 0) return false;

      const remainingQuantity = getDenominationRemainingQuantity(roleId, d.value);
      if (remainingQuantity <= 0) return false;

      // Kiểm tra xem còn đủ budget để quay mệnh giá này không
      return roleRemaining >= d.value;
    });

    let realValue: number;
    let displayValue: number;
    let scenario: string;
    let isTroll = false;
    let shouldAutoSwitchToHonest = false;

    // Xử lý force mode TRƯỚC KHI check availableDenoms.length === 0
    // Để nếu force không thể apply nhưng vẫn còn mệnh giá khác, sẽ quay random
    if (riggingConfig.next_spin_mode === 'force_value' && riggingConfig.target_value) {
      console.log('🎯 Force mode check:', {
        roleId,
        targetValue: riggingConfig.target_value,
        roleInventory: roleInventory.map(d => ({ value: d.value, initial_quantity: d.initial_quantity })),
        roleRemaining,
        availableDenoms: availableDenoms.map(d => d.value),
      });
      
      // Kiểm tra target_value có trong roleInventory của role đang quay
      const targetDenom = roleInventory.find((d) => d.value === riggingConfig.target_value);
      
      // Kiểm tra số tờ còn lại > 0
      const remainingQuantity = getDenominationRemainingQuantity(roleId, riggingConfig.target_value);
      
      // Kiểm tra budget còn lại có đủ cho target_value không
      const canAffordTarget = roleRemaining >= riggingConfig.target_value;
      
      // Kiểm tra target_value có trong availableDenoms không (đã filter theo budget và remaining quantity)
      const targetInAvailable = availableDenoms.some((d) => d.value === riggingConfig.target_value);
      
      if (targetDenom && targetDenom.initial_quantity > 0 && remainingQuantity > 0 && canAffordTarget && targetInAvailable) {
        // Force mode: người này chắc chắn nhận giá trị này
        realValue = targetDenom.value;
        displayValue = realValue;
        scenario = 'forced';
        console.log('✅ Force mode applied successfully:', {
          roleId,
          targetValue: riggingConfig.target_value,
          realValue,
          roleRemaining,
          remainingQuantity,
        });
      } else {
        // Force không thể apply: mệnh giá đã hết tờ hoặc hết budget
        // Tự động chuyển sang honest mode và quay random trong các mệnh giá còn lại
        // KHÔNG gọi setRiggingMode ở đây vì sẽ được reset ở cuối performSpin
        shouldAutoSwitchToHonest = true;
        console.warn('⚠️ Force mode cannot be applied, switching to honest and picking random:', {
          roleId,
          targetValue: riggingConfig.target_value,
          targetDenom: targetDenom ? { value: targetDenom.value, initial_quantity: targetDenom.initial_quantity } : 'not found',
          hasInitialQuantity: targetDenom?.initial_quantity > 0,
          remainingQuantity,
          canAfford: canAffordTarget,
          targetInAvailable,
          roleRemaining,
          availableDenomsCount: availableDenoms.length,
          availableDenoms: availableDenoms.map(d => ({ value: d.value, initial_quantity: d.initial_quantity })),
        });
        
        // Nếu vẫn còn mệnh giá khác, quay random
        if (availableDenoms.length > 0) {
        realValue = weightedRandomPick(availableDenoms);
        displayValue = realValue;
        scenario = 'random';
        } else {
          // Thực sự không còn mệnh giá nào → không cho quay
          const roleName = ROLES.find((r) => r.id === roleId)?.name || roleId;
          isProcessingSpinRef.current = false; // Reset flag before early return
          return {
            displayValue: 0,
            realValue: 0,
            scenario: 'empty',
            isTroll: false,
            isEmpty: true,
            errorMessage: `Tất cả mệnh giá cho ${roleName} đã hết, vui lòng nạp thêm!`,
          };
        }
      }
    } else if (availableDenoms.length === 0) {
      // Không phải force mode và không còn mệnh giá nào → không cho quay
      const roleName = ROLES.find((r) => r.id === roleId)?.name || roleId;
      isProcessingSpinRef.current = false; // Reset flag before early return
      return {
        displayValue: 0,
        realValue: 0,
        scenario: 'empty',
        isTroll: false,
        isEmpty: true,
        errorMessage: `Tất cả mệnh giá cho ${roleName} đã hết, vui lòng nạp thêm!`,
      };
    } else if (
      riggingConfig.next_spin_mode === 'troll_fake_high_to_low' &&
      riggingConfig.fake_value &&
      riggingConfig.target_value
    ) {
      // Kiểm tra target_value có trong roleInventory và có initial_quantity > 0
      const targetDenom = roleInventory.find((d) => d.value === riggingConfig.target_value);
      
      // Kiểm tra số tờ còn lại > 0
      const remainingQuantity = getDenominationRemainingQuantity(roleId, riggingConfig.target_value);
      
      // Kiểm tra budget còn lại có đủ cho target_value không
      const canAffordTarget = roleRemaining >= riggingConfig.target_value;
      
      // Kiểm tra target_value có trong availableDenoms không (đã filter theo budget và remaining quantity)
      const targetInAvailable = availableDenoms.some((d) => d.value === riggingConfig.target_value);
      
      if (targetDenom && targetDenom.initial_quantity > 0 && remainingQuantity > 0 && canAffordTarget && targetInAvailable) {
        // Apply troll mode
        displayValue = riggingConfig.fake_value;
        realValue = riggingConfig.target_value;
        scenario = 'troll_fake_to_real';
        isTroll = true;
      } else {
        // Troll không thể apply: mệnh giá đã hết tờ hoặc hết budget
        // Tự động chuyển sang honest mode và quay random trong các mệnh giá còn lại
        // KHÔNG gọi setRiggingMode ở đây vì sẽ được reset ở cuối performSpin
        shouldAutoSwitchToHonest = true;
        console.warn('⚠️ Troll mode cannot be applied, switching to honest and picking random:', {
          roleId,
          targetValue: riggingConfig.target_value,
          fakeValue: riggingConfig.fake_value,
          targetDenom: targetDenom ? { value: targetDenom.value, initial_quantity: targetDenom.initial_quantity } : 'not found',
          hasInitialQuantity: targetDenom?.initial_quantity > 0,
          remainingQuantity,
          canAfford: canAffordTarget,
          targetInAvailable,
          roleRemaining,
          availableDenomsCount: availableDenoms.length,
          availableDenoms: availableDenoms.map(d => ({ value: d.value, initial_quantity: d.initial_quantity })),
        });
        
        // Nếu vẫn còn mệnh giá khác, quay random
        if (availableDenoms.length > 0) {
        realValue = weightedRandomPick(availableDenoms);
        displayValue = realValue;
        scenario = 'random';
        } else {
          // Thực sự không còn mệnh giá nào → không cho quay
          const roleName = ROLES.find((r) => r.id === roleId)?.name || roleId;
          isProcessingSpinRef.current = false; // Reset flag before early return
          return {
            displayValue: 0,
            realValue: 0,
            scenario: 'empty',
            isTroll: false,
            isEmpty: true,
            errorMessage: `Tất cả mệnh giá cho ${roleName} đã hết, vui lòng nạp thêm!`,
          };
        }
      }
    } else {
      realValue = weightedRandomPick(availableDenoms);
      displayValue = realValue;
      scenario = 'random';
    }

    // Check if this triggers a re-spin (1k or 2k for Kids or Younger roles)
    const requiresReSpin = (roleId === 'kids' || roleId === 'younger') && (realValue === 1000 || realValue === 2000);

    // Kiểm tra lại budget trước khi lưu (double check)
    const finalRemaining = roleRemaining - realValue;
    if (finalRemaining < 0) {
      const roleName = ROLES.find((r) => r.id === roleId)?.name || roleId;
      isProcessingSpinRef.current = false; // Reset flag before early return
      return {
        displayValue: 0,
        realValue: 0,
        scenario: 'budget_exhausted',
        isTroll: false,
        isEmpty: true,
        errorMessage: `Tiền cho ${roleName} đã hết, vui lòng nạp thêm!`,
      };
    }

    setState((prev) => {
      // KHÔNG giảm quantity - giữ nguyên budget
      // Tạo unique ID để tránh duplicate (timestamp + random + index)
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${prev.spinHistory.length}`;
      const history: SpinHistory = {
        id: uniqueId,
        timestamp: Date.now(),
        user_name: userName,
        role_id: roleId,
        display_value: displayValue,
        real_value: realValue,
        scenario_used: scenario,
      };

      // Debug: Log để kiểm tra xem setState có bị gọi nhiều lần không
      console.log('💾 Saving spin history:', {
        id: uniqueId,
        userName,
        roleId,
        realValue,
        scenario,
        currentHistoryCount: prev.spinHistory.length,
      });

      // Save to API (use shared API if in shared mode)
      if (isSharedMode && shareToken) {
        gameAPI.addSharedSpinHistory(shareToken, {
          timestamp: history.timestamp,
          userName: history.user_name,
          roleId: history.role_id,
          displayValue: history.display_value,
          realValue: history.real_value,
          scenarioUsed: history.scenario_used,
        }).catch(err => {
          console.error('Error saving shared spin history:', err);
        });
      } else {
        gameAPI.addSpinHistory({
          timestamp: history.timestamp,
          userName: history.user_name,
          roleId: history.role_id,
          displayValue: history.display_value,
          realValue: history.real_value,
          scenarioUsed: history.scenario_used,
        }).catch(err => {
          console.error('Error saving spin history:', err);
        });
      }

      // Add to local state immediately (optimistic update)
      // KHÔNG thay đổi roleInventories - giữ nguyên quantity
      // Reset riggingConfig sau khi đã quay (force/troll chỉ áp dụng 1 lần)
      
      // Check for duplicate: nếu đã có history với cùng timestamp, userName, roleId, realValue trong vòng 1 giây → skip
      const recentDuplicate = prev.spinHistory.find((h) => 
        Math.abs(h.timestamp - history.timestamp) < 1000 &&
        h.user_name === history.user_name &&
        h.role_id === history.role_id &&
        h.real_value === history.real_value
      );
      
      if (recentDuplicate) {
        console.warn('⚠️ Duplicate history detected, skipping:', {
          existing: recentDuplicate,
          new: history,
        });
        // Return unchanged state to prevent duplicate
        return prev;
      }
      
      console.log('🔄 Resetting riggingConfig after spin');
      return {
        ...prev,
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
    } finally {
      // Reset processing flag after a short delay to allow state update
      setTimeout(() => {
        isProcessingSpinRef.current = false;
      }, 100);
    }
  };

  const weightedRandomPick = (denoms: Denomination[]): number => {
    // Tính weight dựa trên budget còn lại, không phải quantity
    // Weight = số tiền còn lại có thể quay được mệnh giá này
    const totalWeight = denoms.reduce((sum, d) => {
      // Tính số lần có thể quay mệnh giá này dựa trên initial_quantity
      return sum + d.initial_quantity;
    }, 0);
    let random = Math.random() * totalWeight;

    for (const denom of denoms) {
      random -= denom.initial_quantity;
      if (random <= 0) {
        return denom.value;
      }
    }

    return denoms[0].value;
  };

  const resetRoleInventory = (roleId: RoleId) => {
    setState((prev) => {
      // Reset: xóa tất cả spin history của role này để số tờ còn lại = initial_quantity
      // Điều này sẽ làm cho budget của role này quay về ban đầu
      const filteredHistory = prev.spinHistory.filter(
        (log) => log.role_id !== roleId
      );

      return {
        ...prev,
        spinHistory: filteredHistory,
      };
    });
  };

  const getTotalMoneyInSystem = (): number => {
    let total = 0;
    Object.values(state.roleInventories).forEach((roleInv) => {
      roleInv.forEach((d) => {
        // Tính từ initial_quantity (budget ban đầu, không giảm)
        total += d.value * d.initial_quantity;
      });
    });
    return total;
  };

  const getRoleBudget = (roleId: RoleId): number => {
    const roleInv = state.roleInventories[roleId] || [];
    // Budget = initial_quantity (không giảm)
    return roleInv.reduce((sum, d) => sum + d.value * d.initial_quantity, 0);
  };

  const getRoleSpent = (roleId: RoleId): number => {
    // Tính từ spin history
    return state.spinHistory
      .filter((log) => log.role_id === roleId)
      .reduce((sum, log) => {
        const value = log.real_value || 0;
        return sum + value;
      }, 0);
  };

  const getRoleRemaining = (roleId: RoleId): number => {
    return getRoleBudget(roleId) - getRoleSpent(roleId);
  };

  // Tính số tờ còn lại của một mệnh giá cụ thể trong một role
  const getDenominationRemainingQuantity = (roleId: RoleId, value: number): number => {
    const roleInventory = state.roleInventories[roleId] || [];
    const denom = roleInventory.find((d) => d.value === value);
    if (!denom) return 0;
    
    const initialQuantity = denom.initial_quantity || 0;
    // Tính số tờ đã quay từ spin history
    const spentCount = state.spinHistory.filter(
      (log) => log.role_id === roleId && log.real_value === value
    ).length;
    
    return Math.max(0, initialQuantity - spentCount);
  };

  const refreshSpinHistory = async (): Promise<void> => {
    try {
      const historyData = await gameAPI.getSpinHistory(100);
      // Convert backend format (camelCase) to frontend format (snake_case)
      const history: SpinHistory[] = historyData.map((item: any) => ({
        id: item._id || item.id || Date.now().toString() + Math.random(),
        timestamp: item.timestamp || Date.now(),
        user_name: item.userName || item.user_name || 'Anonymous',
        role_id: item.roleId || item.role_id || null,
        display_value: item.displayValue !== undefined && item.displayValue !== null ? item.displayValue : (item.display_value !== undefined && item.display_value !== null ? item.display_value : 0),
        real_value: item.realValue !== undefined && item.realValue !== null ? item.realValue : (item.real_value !== undefined && item.real_value !== null ? item.real_value : 0),
        scenario_used: item.scenarioUsed || item.scenario_used || 'unknown',
      }));

    setState((prev) => ({
      ...prev,
        spinHistory: history,
      }));
    } catch (error) {
      console.error('Error refreshing spin history:', error);
      throw error;
    }
  };

  // Reset toàn bộ dữ liệu: xóa tất cả spin history, reset tất cả inventories về 0, reset riggingConfig
  const resetAllData = async (): Promise<void> => {
    try {
      // Bước 1: Xóa toàn bộ spin history trong database trước
      if (!isSharedMode) {
        await gameAPI.deleteAllSpinHistory();
        console.log('✅ Đã xóa toàn bộ spin history trong database');
      }

      // Bước 2: Reset tất cả roleInventories về 0
      const resetInventories: { [key: string]: Denomination[] } = {};
      Object.keys(state.roleInventories).forEach((roleId) => {
        resetInventories[roleId] = state.roleInventories[roleId as RoleId].map((d) => ({
        ...d,
          quantity: 0,
          initial_quantity: 0,
        }));
      });

      // Bước 3: Reset riggingConfig về random
      const resetRiggingConfig = {
        next_spin_mode: 'random' as RiggingMode,
        target_value: null,
        fake_value: null,
      };

      // Bước 4: Xóa toàn bộ spin history trong state và reset inventories
      setState((prev) => ({
        ...prev,
        roleInventories: resetInventories,
        spinHistory: [],
        riggingConfig: resetRiggingConfig,
      }));

      // Bước 5: Lưu inventories và riggingConfig vào backend
      if (!isSharedMode) {
        await gameAPI.updateState(resetInventories, resetRiggingConfig);
      }
      
      console.log('✅ Đã reset toàn bộ dữ liệu');
    } catch (error) {
      console.error('❌ Error resetting all data:', error);
      throw error;
    }
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
        getRoleSpent,
        getRoleRemaining,
        getDenominationRemainingQuantity,
        refreshSpinHistory,
        resetAllData,
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
