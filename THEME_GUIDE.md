# Zesha App Theme Management Guide

This document explains how the app's theme system works and how to change colors in the future.

## Theme Architecture

The theme system has two main components:

### 1. Tailwind Configuration (`tailwind.config.js`)

- Defines custom brand colors that can be used with Tailwind classes
- Colors: `brand-red`, `brand-gold`, `brand-lightRed`, `brand-darkGold`
- These are compiled at build time

### 2. Theme Constants (`constants/theme.ts`)

- Centralized color definitions for the entire app
- Provides both hex values and Tailwind class mappings
- Import this file when you need dynamic colors or icon colors

## How to Change Theme Colors

### Option 1: Quick Color Change (Recommended for minor tweaks)

1. **Update Tailwind Config** (`tailwind.config.js`):

```javascript
colors: {
  brand: {
    red: "#YOUR_NEW_PRIMARY_COLOR",     // Change primary brand color
    gold: "#YOUR_NEW_SECONDARY_COLOR",  // Change secondary brand color
  },
}
```

2. **Update Theme Constants** (`constants/theme.ts`):

```typescript
export const Colors = {
  primary: {
    main: "#YOUR_NEW_PRIMARY_COLOR",
  },
  secondary: {
    main: "#YOUR_NEW_SECONDARY_COLOR",
  },
  // ... update other colors as needed
};
```

3. **Rebuild the app**:

```bash
npm start -- --clear
```

### Option 2: Complete Theme Overhaul

For a complete redesign, update all color definitions in `constants/theme.ts`:

```typescript
export const Colors = {
  primary: { main: '#NEW_COLOR', light: '#NEW_COLOR', dark: '#NEW_COLOR' },
  secondary: { main: '#NEW_COLOR', light: '#NEW_COLOR', dark: '#NEW_COLOR' },
  shift: { am: {...}, pm: {...} },
  status: { success: {...}, warning: {...}, error: {...} },
  feature: { balance: {...}, commission: {...}, cash: {...} },
};
```

## Color Usage Patterns

### Pattern 1: Tailwind Classes (Most Common)

```tsx
<View className="bg-brand-red">           // Primary background
<Text className="text-brand-gold">        // Secondary text
<View className="bg-blue-100">            // AM shift background
<View className="bg-red-100">             // PM shift / Commission background
```

### Pattern 2: Dynamic Colors (Icons, Charts)

```tsx
import { Colors } from '../constants/theme';

<Icon color={Colors.primary.main} />      // Primary color icon
<Icon color={Colors.shift.am.icon} />     // AM shift icon
<Icon color={Colors.feature.commission.icon} /> // Commission icon
```

### Pattern 3: Conditional Styling

```tsx
import { TailwindClasses } from '../constants/theme';

className={shift === "AM" ? TailwindClasses.shift.am.bg : TailwindClasses.shift.pm.bg}
```

## Color Mapping Reference

### Current Theme Colors

| Feature                 | Background             | Text                   | Icon                   | Purpose                          |
| ----------------------- | ---------------------- | ---------------------- | ---------------------- | -------------------------------- |
| **Primary (Brand Red)** | `#C62828`              | `#C62828`              | `#C62828`              | Main actions, buttons, PM shifts |
| **Secondary (Gold)**    | `#B8860B`              | `#B8860B`              | `#B8860B`              | Financial stats, balances        |
| **AM Shift**            | `#DBEAFE` (Blue 100)   | `#1D4ED8` (Blue 700)   | `#3B82F6` (Blue 500)   | Morning shift indicators         |
| **PM Shift**            | `#FEE2E2` (Red 100)    | `#B91C1C` (Red 700)    | `#EF4444` (Red 500)    | Evening shift indicators         |
| **Commissions**         | `#FEE2E2` (Red 100)    | `#C62828` (Red)        | `#C62828` (Red)        | Commission features              |
| **Cash**                | `#DCFCE7` (Green 100)  | `#15803D` (Green 700)  | `#16A34A` (Green 600)  | Cash counting                    |
| **Success**             | `#DCFCE7` (Green 100)  | `#15803D` (Green 700)  | `#22C55E` (Green 500)  | Success states                   |
| **Warning**             | `#FEF3C7` (Yellow 100) | `#A16207` (Yellow 700) | `#F59E0B` (Yellow 500) | Warning states                   |
| **Error**               | `#FEE2E2` (Red 100)    | `#B91C1C` (Red 700)    | `#EF4444` (Red 500)    | Error states                     |

### Files That Use Theme Colors

#### Core Pages

- `app/index.tsx` - Dashboard (uses primary, secondary, status colors)
- `app/balance.tsx` - Balance management (uses primary, secondary, shift colors)
- `app/history.tsx` - History view (uses shift, status colors)
- `app/balance-detail.tsx` - Detail view (uses all color types)
- `app/commissions.tsx` - Commission view (uses commission colors)
- `app/add-balance.tsx` - Balance entry (uses primary, validation colors)
- `app/add-commission.tsx` - Commission entry (uses commission colors)

#### Components

- `components/CustomDrawerContent.tsx` - Navigation (uses primary color)
- `components/LoadingSpinner.tsx` - Loading states (uses primary color)

## Best Practices

### ✅ DO

- Use theme constants for all colors
- Use Tailwind classes for static styling
- Use `Colors` object for dynamic/conditional colors
- Document any new color additions
- Test theme changes on both light backgrounds

### ❌ DON'T

- Hardcode hex values directly in components
- Use inconsistent color values for the same purpose
- Mix different shades without documenting why
- Create new color variations without updating theme.ts

## Testing Theme Changes

After updating colors, test these key screens:

1. Dashboard - Check primary/secondary colors
2. Balance page - Check AM/PM shift colors
3. History - Check shift badges and status indicators
4. Commissions page - Check commission-specific colors
5. Add Balance/Commission - Check validation states

## Future Considerations

### Dark Mode Support

To add dark mode in the future:

1. Extend `Colors` object with dark variants
2. Create a theme context/hook to toggle between light/dark
3. Update Tailwind config with dark mode strategy
4. Use conditional classes: `className="bg-white dark:bg-gray-900"`

### Multiple Themes

To support multiple theme presets:

1. Create theme objects in `constants/theme.ts`
2. Use React Context to provide active theme
3. Create a theme switcher in settings
4. Update components to use theme from context

## Quick Reference Commands

```bash
# Clear cache and restart after theme changes
npm start -- --clear

# Rebuild Tailwind classes
npm run build

# Check for hardcoded colors
grep -r "#[0-9A-Fa-f]{6}" app/ components/
```

## Support

For questions about theme customization, refer to:

- Tailwind CSS Documentation: https://tailwindcss.com/docs/customizing-colors
- NativeWind Documentation: https://www.nativewind.dev/
- Theme Constants: `constants/theme.ts`
