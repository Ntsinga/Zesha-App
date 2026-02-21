/**
 * TELEBA APP THEME CONFIGURATION
 * ==============================
 *
 * DESIGN SYSTEM SPECIFICATION:
 * ----------------------------
 * Primary:    Bright Blue #1E6091 - Trust, stability, banking, telecom (lighter & brighter)
 * Secondary:  Teal/Cyan #1CB5BD - Connectivity, data flow, modern fintech
 * Accent:     Soft Gold #F2C94C - Value, money, success (used sparingly)
 * Terracotta: Reddish Gold #D97706 - Warmth, urgency, key highlights
 * Dark:       #0F172A (slate/almost black)
 * Light:      #F8FAFC (clean white)
 *
 * UI PHILOSOPHY:
 * - Minimal, structured layouts
 * - Lots of white/neutral space
 * - Card-based design
 * - Subtle gradients (blue → teal)
 * - Rounded corners (8-12px, not bubbly)
 * - Icons: outline or thin solid
 * - Feel: "Calm, powerful, won't break when millions transact"
 *
 * DARK MODE:
 * - Background: #020617
 * - Cards: #0F172A
 * - Primary text: #E5E7EB
 * - Accents: teal & gold
 */

export const Colors = {
  // Primary Brand Colors - Vibrant Blue (Trust, Stability) - Brighter!
  primary: {
    main: "#2563EB", // Vibrant Blue - Main actions, primary buttons
    light: "#3B82F6", // Light Blue - Hover states
    dark: "#1D4ED8", // Dark Blue - Active states
    contrast: "#FFFFFF", // White text on primary
  },

  // Secondary Brand Colors - Teal (Connectivity, Fintech)
  secondary: {
    main: "#1CB5BD", // Teal - Secondary actions, accents
    light: "#4DD4DB", // Light Teal - Highlights
    dark: "#148F95", // Dark Teal - Borders, active
    contrast: "#FFFFFF", // White text on secondary
  },

  // Accent Colors - Soft Gold (Money, Value, Success)
  accent: {
    main: "#F2C94C", // Soft Gold - Financial stats, money
    light: "#F7DC8C", // Light Gold - Backgrounds
    dark: "#D4A83A", // Dark Gold - Borders
    contrast: "#0F172A", // Dark text on accent
  },

  // Terracotta Accent - Reddish Gold (Warmth, Urgency)
  terracotta: {
    main: "#D97706", // Amber/Terracotta - Warm highlights
    light: "#F59E0B", // Light Amber - Backgrounds
    dark: "#B45309", // Dark Amber - Borders
    contrast: "#FFFFFF", // White text
  },

  // Gradient Colors (Vibrant Blue → Teal)
  gradient: {
    start: "#2563EB", // Vibrant Blue
    middle: "#0891B2", // Cyan mid transition
    end: "#14B8A6", // Teal
  },

  // Shift Colors (Keep distinct for operational clarity)
  shift: {
    am: {
      bg: "#DBEAFE", // Blue 100 - AM shift background
      text: "#1D4ED8", // Blue 700 - AM shift text
      icon: "#3B82F6", // Blue 500 - AM shift icon
    },
    pm: {
      bg: "#E0F2FE", // Sky 100 - PM shift background
      text: "#0369A1", // Sky 700 - PM shift text
      icon: "#0EA5E9", // Sky 500 - PM shift icon
    },
  },

  // Status Colors (Universal, kept standard)
  status: {
    success: {
      bg: "#DCFCE7", // Green 100
      text: "#15803D", // Green 700
      icon: "#22C55E", // Green 500
      main: "#16A34A", // Green 600
    },
    warning: {
      bg: "#FEF3C7", // Yellow 100
      text: "#A16207", // Yellow 700
      icon: "#F59E0B", // Yellow 500
      main: "#EAB308", // Yellow 500
    },
    error: {
      bg: "#FEE2E2", // Red 100
      text: "#B91C1C", // Red 700
      icon: "#EF4444", // Red 500
      main: "#DC2626", // Red 600
    },
    info: {
      bg: "#E0F2FE", // Sky 100
      text: "#0369A1", // Sky 700
      icon: "#0EA5E9", // Sky 500
      main: "#0284C7", // Sky 600
    },
  },

  // Feature Colors - Cash Count and Commissions use RED for emphasis
  feature: {
    balance: {
      bg: "#FEF9E7", // Warm light gold background
      text: "#D4A83A", // Gold - Balance amounts
      icon: "#F2C94C", // Soft Gold - Balance icons
    },
    commission: {
      bg: "#FEE2E2", // Light red background
      text: "#B91C1C", // Dark Red - Commission amounts
      icon: "#DC2626", // Red - Commission icons
    },
    cash: {
      bg: "#FEE2E2", // Light red background
      text: "#B91C1C", // Dark Red - Cash amounts
      icon: "#DC2626", // Red - Cash icons
    },
    expense: {
      bg: "#E8F4F8", // Light blue-gray
      text: "#1D4ED8", // Vibrant Blue - Expense amounts
      icon: "#2563EB", // Vibrant Blue - Expense icons
    },
    reconciliation: {
      bg: "#F0F9FF", // Sky 50
      text: "#0369A1", // Sky 700
      icon: "#0EA5E9", // Sky 500
    },
  },

  // Neutral Colors
  neutral: {
    white: "#FFFFFF",
    black: "#000000",
    gray: {
      50: "#F9FAFB",
      100: "#F3F4F6",
      200: "#E5E7EB",
      300: "#D1D5DB",
      400: "#9CA3AF",
      500: "#6B7280",
      600: "#4B5563",
      700: "#374151",
      800: "#1F2937",
      900: "#111827",
    },
  },

  // Background Colors
  background: {
    primary: "#F8FAFC", // Light neutral - Main app background
    secondary: "#F1F5F9", // Slightly darker - Section backgrounds
    card: "#FFFFFF", // White - Card backgrounds
    elevated: "#FFFFFF", // White - Elevated card backgrounds
  },

  // Text Colors
  text: {
    primary: "#0F172A", // Slate 900 - Main text (dark neutral)
    secondary: "#475569", // Slate 600 - Secondary text
    tertiary: "#94A3B8", // Slate 400 - Tertiary text/placeholders
    inverse: "#FFFFFF", // White - Text on dark backgrounds
    disabled: "#CBD5E1", // Slate 300 - Disabled text
  },

  // Border Colors
  border: {
    light: "#F1F5F9", // Slate 100 - Light borders
    default: "#E2E8F0", // Slate 200 - Default borders
    dark: "#CBD5E1", // Slate 300 - Dark borders
  },

  // Dark Mode Colors
  dark: {
    background: {
      primary: "#020617", // Very dark blue-black
      card: "#0F172A", // Slate 900
      elevated: "#1E293B", // Slate 800
    },
    text: {
      primary: "#E5E7EB", // Gray 200
      secondary: "#9CA3AF", // Gray 400
      tertiary: "#6B7280", // Gray 500
    },
    border: {
      default: "#1E293B", // Slate 800
      light: "#334155", // Slate 700
    },
  },
};

/**
 * Tailwind Class Mappings
 *
 * These provide consistent Tailwind class names for theme colors.
 * Use these in your components for easier theme changes.
 */
export const TailwindClasses = {
  // Primary (Deep Blue)
  primary: {
    bg: "bg-brand-primary",
    bgLight: "bg-brand-primary-light",
    text: "text-brand-primary",
    border: "border-brand-primary",
  },

  // Secondary (Teal)
  secondary: {
    bg: "bg-brand-secondary",
    bgLight: "bg-brand-secondary-light",
    text: "text-brand-secondary",
    border: "border-brand-secondary",
  },

  // Accent (Gold)
  accent: {
    bg: "bg-brand-accent",
    bgLight: "bg-brand-accent-light",
    text: "text-brand-accent",
    border: "border-brand-accent",
  },

  // Shifts
  shift: {
    am: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-500",
    },
    pm: {
      bg: "bg-sky-100",
      text: "text-sky-700",
      border: "border-sky-500",
    },
  },

  // Status
  status: {
    success: {
      bg: "bg-green-100",
      text: "text-green-700",
      icon: "text-green-500",
      main: "bg-green-500",
    },
    warning: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      icon: "text-yellow-500",
      main: "bg-yellow-500",
    },
    error: {
      bg: "bg-red-100",
      text: "text-red-700",
      icon: "text-red-500",
      main: "bg-red-500",
    },
    info: {
      bg: "bg-sky-100",
      text: "text-sky-700",
      icon: "text-sky-500",
      main: "bg-sky-500",
    },
  },

  // Features
  feature: {
    commission: {
      bg: "bg-teal-50",
      text: "text-teal-700",
    },
    balance: {
      bg: "bg-amber-50",
      text: "text-brand-accent",
    },
    cash: {
      bg: "bg-green-100",
      text: "text-green-700",
    },
    expense: {
      bg: "bg-slate-100",
      text: "text-brand-primary",
    },
  },

  // Dark mode
  dark: {
    bg: "dark:bg-dark-bg",
    card: "dark:bg-dark-card",
    text: "dark:text-dark-text",
    border: "dark:border-dark-border",
  },
};

/**
 * Icon Colors - Use these for icon color props
 * Import: import { IconColors } from '../constants/theme';
 * Usage: <Icon color={IconColors.primary} />
 */
export const IconColors = {
  primary: Colors.primary.main,
  secondary: Colors.secondary.main,
  accent: Colors.accent.main,
  success: Colors.status.success.icon,
  warning: Colors.status.warning.icon,
  error: Colors.status.error.icon,
  info: Colors.status.info.icon,
  muted: Colors.text.tertiary,
  inverse: Colors.text.inverse,
};

/**
 * Gradient Arrays - Use with LinearGradient
 * Import: import { Gradients } from '../constants/theme';
 * Usage: <LinearGradient colors={Gradients.primary} />
 */
export const Gradients = {
  // Main Teleba gradient (blue → teal)
  primary: [Colors.gradient.start, Colors.gradient.end] as const,

  // Extended gradient with middle step
  primaryExtended: [
    Colors.gradient.start,
    Colors.gradient.middle,
    Colors.gradient.end,
  ] as const,

  // Darker variant for headers
  dark: [Colors.primary.dark, Colors.secondary.dark] as const,

  // Light variant for backgrounds
  light: [Colors.primary.light, Colors.secondary.light] as const,

  // Success gradient
  success: ["#16A34A", "#22C55E"] as const,

  // Warning gradient
  warning: ["#D97706", "#F59E0B"] as const,
};

/**
 * Usage Examples:
 *
 * 1. For inline styles (React Native components):
 *    import { Colors } from '../constants/theme';
 *    <View style={{ backgroundColor: Colors.primary.main }}>
 *
 * 2. For Tailwind classes (NativeWind):
 *    import { TailwindClasses } from '../constants/theme';
 *    <View className={TailwindClasses.primary.bg}>
 *
 * 3. For icon colors:
 *    import { IconColors } from '../constants/theme';
 *    <Icon color={IconColors.primary} />
 *
 * 4. For gradients:
 *    import { Gradients } from '../constants/theme';
 *    <LinearGradient colors={Gradients.primary} />
 *
 * 5. For dark mode (with NativeWind):
 *    <View className="bg-white dark:bg-dark-bg">
 */
