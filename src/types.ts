export interface Denomination {
  value: number;
  quantity: number;
  initial_quantity: number;
}

// All denominations including new ones: 1k, 2k, 5k
export const ALL_DENOMINATIONS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];

export type RoleId = 'kids' | 'younger' | 'friends' | 'aunts_uncles' | 'parents';

export interface Role {
  id: RoleId;
  name: string;
}

export const ROLES: Role[] = [
  { id: 'kids', name: 'Các Cháu' },
  { id: 'younger', name: 'Các Em' },
  { id: 'friends', name: 'Bạn Bè / Đồng Nghiệp' },
  { id: 'aunts_uncles', name: 'Cô Dì Chú Bác' },
  { id: 'parents', name: 'Ông Bà / Bố Mẹ' },
];

export interface RoleInventory {
  [roleId: string]: Denomination[];
}

export interface SpinHistory {
  id: string;
  timestamp: number;
  user_name: string;
  role_id: RoleId | null;
  display_value: number;
  real_value: number;
  scenario_used: string;
}

export type RiggingMode = 'random' | 'force_value' | 'troll_fake_high_to_low';

export interface RiggingConfig {
  next_spin_mode: RiggingMode;
  target_value: number | null;
  fake_value: number | null;
}

export interface GameState {
  roleInventories: RoleInventory;
  spinHistory: SpinHistory[];
  riggingConfig: RiggingConfig;
  isAdminAuthenticated: boolean;
}

export interface ReSpinState {
  isActive: boolean;
  firstPrize: number;
  roleId: RoleId | null;
}
