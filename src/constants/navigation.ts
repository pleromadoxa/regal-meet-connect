import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Mic,
  Palette,
  Sparkles,
  User,
} from 'lucide-react';

export type AppNavItem = {
  path: string;
  label: string;
  requiresAuth?: boolean;
  exact?: boolean;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { path: '/', label: 'Home', exact: true },
  { path: '/dashboard', label: 'Dashboard', requiresAuth: true },
  { path: '/calendar', label: 'Calendar' },
  { path: '/join', label: 'Join' },
  { path: '/settings', label: 'Settings', requiresAuth: true },
];

export type SettingsTabId = 'profile' | 'appearance' | 'notifications' | 'devices' | 'plan';

export type SettingsTabConfig = {
  id: SettingsTabId;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const SETTINGS_TABS: SettingsTabConfig[] = [
  {
    id: 'profile',
    label: 'Profile',
    description: 'Name, photo, and bio',
    icon: User,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    description: 'Theme and language',
    icon: Palette,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Email, push, and sounds',
    icon: Bell,
  },
  {
    id: 'devices',
    label: 'Devices',
    description: 'Camera, mic, and defaults',
    icon: Mic,
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'Regal One subscription',
    icon: Sparkles,
  },
];

export const FOOTER_NAV_ITEMS: AppNavItem[] = [
  { path: '/', label: 'Home', exact: true },
  { path: '/dashboard', label: 'Dashboard', requiresAuth: true },
  { path: '/calendar', label: 'Calendar' },
  { path: '/join', label: 'Join' },
  { path: '/settings', label: 'Settings', requiresAuth: true },
  { path: '/privacy', label: 'Privacy' },
  { path: '/terms', label: 'Terms' },
];

export const PUBLIC_QUICK_NAV: AppNavItem[] = [
  { path: '/', label: 'Home', exact: true },
  { path: '/calendar', label: 'Calendar' },
  { path: '/join', label: 'Join meeting' },
];
