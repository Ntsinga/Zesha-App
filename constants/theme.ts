/**
 * Zesha App Theme Configuration
 *
 * This file centralizes all color definitions for the app.
 * To change the app's theme, simply update the colors here.
 */

export const Colors = {
  // Primary Brand Colors
  primary: {
    main: "#C62828", // Brand Red - Main actions, primary buttons
    light: "#FFEBEE", // Light Red - Hover states, backgrounds
    dark: "#B71C1C", // Dark Red - Active states
  },

  // Secondary Brand Colors
  secondary: {
    main: "#B8860B", // Brand Gold - Financial stats, balances
    light: "#FDD835", // Light Gold - Highlights
    dark: "#FBC02D", // Dark Gold - Borders, dividers
  },

  // Shift Colors
  shift: {
    am: {
      bg: "#DBEAFE", // Blue 100 - AM shift background
      text: "#1D4ED8", // Blue 700 - AM shift text
      icon: "#3B82F6", // Blue 500 - AM shift icon
    },
    pm: {
      bg: "#FEE2E2", // Red 100 - PM shift background
      text: "#B91C1C", // Red 700 - PM shift text
      icon: "#EF4444", // Red 500 - PM shift icon
    },
  },

  // Status Colors
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
      bg: "#DBEAFE", // Blue 100
      text: "#1E40AF", // Blue 800
      icon: "#3B82F6", // Blue 500
      main: "#2563EB", // Blue 600
    },
  },

  // Feature Colors
  feature: {
    balance: {
      bg: "#FEF3C7", // Yellow 100 - Balance card backgrounds
      text: "#B8860B", // Gold - Balance amounts
      icon: "#B8860B", // Gold - Balance icons
    },
    commission: {
      bg: "#FEE2E2", // Red 100 - Commission card backgrounds
      text: "#C62828", // Red - Commission amounts
      icon: "#C62828", // Red - Commission icons
    },
    cash: {
      bg: "#DCFCE7", // Green 100 - Cash card backgrounds
      text: "#15803D", // Green 700 - Cash amounts
      icon: "#16A34A", // Green 600 - Cash icons
    },
    expense: {
      bg: "#FFEDD5", // Orange 100 - Expense backgrounds
      text: "#EA580C", // Orange 600 - Expense amounts
      icon: "#F97316", // Orange 500 - Expense icons
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
    primary: "#F9FAFB", // Gray 50 - Main app background
    card: "#FFFFFF", // White - Card backgrounds
    elevated: "#FFFFFF", // White - Elevated card backgrounds
  },

  // Text Colors
  text: {
    primary: "#111827", // Gray 900 - Main text
    secondary: "#6B7280", // Gray 500 - Secondary text
    tertiary: "#9CA3AF", // Gray 400 - Tertiary text/placeholders
    inverse: "#FFFFFF", // White - Text on dark backgrounds
    disabled: "#D1D5DB", // Gray 300 - Disabled text
  },

  // Border Colors
  border: {
    light: "#F3F4F6", // Gray 100 - Light borders
    default: "#E5E7EB", // Gray 200 - Default borders
    dark: "#D1D5DB", // Gray 300 - Dark borders
  },
};

/**
 * Tailwind Class Mappings
 *
 * These provide consistent Tailwind class names for theme colors.
 * Use these in your components for easier theme changes.
 */
export const TailwindClasses = {
  // Primary
  primary: {
    bg: "bg-brand-red",
    bgLight: "bg-red-50",
    text: "text-brand-red",
    border: "border-brand-red",
  },

  // Secondary (Gold)
  secondary: {
    bg: "bg-brand-gold",
    bgLight: "bg-yellow-50",
    text: "text-brand-gold",
    border: "border-brand-gold",
  },

  // Shifts
  shift: {
    am: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      border: "border-blue-500",
    },
    pm: {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-500",
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
  },

  // Features
  feature: {
    commission: {
      bg: "bg-red-100",
      text: "text-red-700",
    },
    balance: {
      bg: "bg-yellow-100",
      text: "text-brand-gold",
    },
    cash: {
      bg: "bg-green-100",
      text: "text-green-700",
    },
  },
};

/**
 * Usage Examples:
 *
 * 1. For inline styles (React Native components):
 *    <View style={{ backgroundColor: Colors.primary.main }}>
 *
 * 2. For Tailwind classes (NativeWind):
 *    <View className={TailwindClasses.primary.bg}>
 *
 * 3. For icon colors:
 *    <Icon color={Colors.primary.main} />
 *
 * 4. For custom components:
 *    const buttonColor = Colors.primary.main;
 */
