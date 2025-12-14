export interface Denomination {
  value: number;
  quantity: number;
  initial_quantity: number;
}

export interface SpinHistory {
  id: string;
  timestamp: number;
  user_name: string;
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
  denominations: Denomination[];
  spinHistory: SpinHistory[];
  riggingConfig: RiggingConfig;
  isAdminAuthenticated: boolean;
}
