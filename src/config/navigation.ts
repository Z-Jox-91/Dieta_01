import { Calculator, Calendar, CookingPot, Apple, LucideIcon } from 'lucide-react';

export type DashboardTabId = 'calculations' | 'diet' | 'recipes' | 'foods';

export interface DashboardTab {
  id: DashboardTabId;
  label: string;
  icon: LucideIcon;
}

/** Configurazione condivisa delle schede, usata sia dall'intestazione (nav) sia dalla Dashboard (contenuto). */
export const DASHBOARD_TABS: DashboardTab[] = [
  { id: 'calculations', label: 'Calcoli', icon: Calculator },
  { id: 'diet', label: 'Dieta', icon: Calendar },
  { id: 'recipes', label: 'Ricette', icon: CookingPot },
  { id: 'foods', label: 'Alimenti', icon: Apple },
];
