import { Slot } from "expo-router";

// Universal fallback layout — web uses _layout.web.tsx (sub-nav).
// Native uses this, which is a transparent pass-through.
export default function ExpensesLayout() {
  return <Slot />;
}
