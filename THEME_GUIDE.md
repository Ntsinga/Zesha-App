# Teleba App Theme Management Guide

This document explains how the app's theme system works and how to change colors in the future.

## Teleba Design System Specification

### Brand Colors

| Color | Hex | Purpose |
|-------|-----|---------|
| 🟦 **Primary (Deep Blue)** | `#0B3C5D` | Trust, stability, banking, telecom. Main actions, primary buttons |
| 🟩 **Secondary (Teal)** | `#1CB5BD` | Connectivity, data flow, modern fintech. Secondary actions, accents |
| 🟨 **Accent (Soft Gold)** | `#F2C94C` | Value, money, success. Use sparingly for financial highlights |
| ⬛ **Dark Neutral** | `#0F172A` | Slate/almost black. Primary text, dark backgrounds |
| ⬜ **Light Neutral** | `#F8FAFC` | Clean white. Main app background |

### UI Philosophy

- **Minimal, structured layouts** - Clean, organized information hierarchy
- **Lots of white/neutral space** - Reduces cognitive load for ops teams
- **Card-based design** - Clear content separation
- **Subtle gradients (blue → teal)** - Professional visual interest
- **Rounded corners (8-12px)** - Modern but not bubbly
- **Icons: outline or thin solid** - Clean, professional appearance
- **Feel:** "Calm, powerful, won't break when millions transact"

### Dark Mode Colors

| Element | Hex | Purpose |
|---------|-----|---------|
| Background | `#020617` | Very dark blue-black |
| Cards | `#0F172A` | Slate 900 |
| Elevated | `#1E293B` | Slate 800 |
| Primary Text | `#E5E7EB` | Gray 200 |
| Accents | Teal & Gold | Same as light mode |

---

## Theme Architecture

The theme system has three main components:

### 1. Tailwind Configuration (`tailwind.config.js`)

- Defines custom brand colors (`brand-primary`, `brand-secondary`, `brand-accent`)
- Dark mode colors (`dark-bg`, `dark-card`, etc.)
- Gradients (`bg-teleba-gradient`)
- Configured with `darkMode: 'class'` for dark mode support

### 2. Theme Constants (`constants/theme.ts`)

- Centralized color definitions for the entire app
- `Colors` object - All hex values organized by category
- `TailwindClasses` - Tailwind class mappings
- `IconColors` - Pre-built icon color references
- `Gradients` - Arrays for LinearGradient components

### 3. Web CSS Variables (`styles/web.css`)

- CSS custom properties for web-specific styling
- All CSS variables updated to Teleba palette

---

## How to Use Theme Colors

### Pattern 1: Tailwind Classes (Most Common)

```tsx
<View className="bg-brand-primary">           // Deep Blue background
<Text className="text-brand-secondary">       // Teal text
<View className="bg-brand-accent">            // Gold background
<View className="bg-brand-light">             // Light neutral background
```

### Pattern 2: Dynamic Colors (Icons, Charts)

```tsx
import { Colors, IconColors } from '../constants/theme';

<Icon color={Colors.primary.main} />          // Deep Blue icon
<Icon color={IconColors.secondary} />         // Teal icon
<Icon color={Colors.accent.main} />           // Gold icon
```

### Pattern 3: Gradients

```tsx
import { Gradients } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient 
  colors={Gradients.primary}           // Blue → Teal
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
/>

// Or extended with middle step:
<LinearGradient colors={Gradients.primaryExtended} />  // Blue → Mid → Teal
```

### Pattern 4: Conditional Styling

```tsx
import { TailwindClasses, Colors } from '../constants/theme';

// Tailwind classes
className={shift === "AM" ? TailwindClasses.shift.am.bg : TailwindClasses.shift.pm.bg}

// Inline styles
style={{ color: active ? Colors.primary.main : Colors.text.tertiary }}
```

### Pattern 5: Dark Mode (NativeWind)

```tsx
<View className="bg-white dark:bg-dark-bg">
<Text className="text-slate-900 dark:text-dark-text">
```

---

## Current Theme Colors

| Feature | Background | Text | Icon | Purpose |
|---------|------------|------|------|---------|
| **Primary (Deep Blue)** | `#0B3C5D` | `#0B3C5D` | `#0B3C5D` | Main actions, buttons, headers |
| **Secondary (Teal)** | `#1CB5BD` | `#1CB5BD` | `#1CB5BD` | Links, accents, connectivity |
| **Accent (Gold)** | `#F2C94C` | `#D4A83A` | `#F2C94C` | Financial stats, balances |
| **AM Shift** | `#DBEAFE` | `#1D4ED8` | `#3B82F6` | Morning shift indicators |
| **PM Shift** | `#E0F2FE` | `#0369A1` | `#0EA5E9` | Evening shift indicators |
| **Balance** | `#FEF9E7` | `#D4A83A` | `#F2C94C` | Balance features |
| **Commission** | `#E0F7F8` | `#148F95` | `#1CB5BD` | Commission features |
| **Cash** | `#DCFCE7` | `#15803D` | `#16A34A` | Cash counting |
| **Success** | `#DCFCE7` | `#15803D` | `#22C55E` | Success states |
| **Warning** | `#FEF3C7` | `#A16207` | `#F59E0B` | Warning states |
| **Error** | `#FEE2E2` | `#B91C1C` | `#EF4444` | Error states |

---

## Files That Use Theme Colors

### Core Components (Import Colors)

- `components/BottomNav.tsx` - Navigation bar (uses Colors import)
- `components/TopBar.tsx` - User info header (uses Colors import)
- `components/CustomDrawerContent.tsx` - Side drawer (uses Colors import)
- `components/LoadingSpinner.tsx` - Loading states (uses Colors import)

### Auth Screens (Import Gradients)

- `app/(auth)/sign-in.tsx` - Sign in page (uses Gradients.primaryExtended)
- `app/(auth)/sign-up.tsx` - Sign up page (uses Gradients.primaryExtended)

### Configuration Files

- `tailwind.config.js` - Tailwind custom colors
- `constants/theme.ts` - Central color definitions
- `styles/web.css` - Web-specific CSS variables

---

## Best Practices

### ✅ DO

- Import `Colors` from `constants/theme` for all dynamic colors
- Use `IconColors` for icon color props
- Use `Gradients` for LinearGradient components
- Use `TailwindClasses` for class name mappings
- Test changes in both light and dark mode

### ❌ DON'T

- Hardcode hex values directly in components
- Use inconsistent color values for the same purpose
- Mix different shades without documenting why
- Skip the theme system for "just one component"

---

## Testing Theme Changes

After updating colors, test these key screens:

1. **Auth screens** - Check gradient headers
2. **Dashboard** - Check primary/secondary colors
3. **Bottom navigation** - Check active/inactive states
4. **Balance page** - Check AM/PM shift colors
5. **History** - Check shift badges and status indicators
6. **Commissions page** - Check teal commission colors
7. **Settings** - Check avatar and user info colors

---

## Quick Reference Commands

```bash
# Clear cache and restart after theme changes
npm start -- --clear

# Rebuild Tailwind classes
npm run build

# Check for hardcoded colors (should return minimal results)
grep -r "#DC2626\|#C62828\|#B91C1C" app/ components/
```

---

## Support

For questions about theme customization, refer to:

- Tailwind CSS Documentation: https://tailwindcss.com/docs/customizing-colors
- NativeWind Documentation: https://www.nativewind.dev/
- Theme Constants: `constants/theme.ts`
