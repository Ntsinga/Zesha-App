import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const sentryNavigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
  ignoreEmptyBackNavigationTransactions: true,
});
const enableMobileReplay = Platform.OS !== "android";

export function initSentry(): void {
  if (!SENTRY_DSN) {
    if (__DEV__) {
      console.warn("[Sentry] No DSN configured — skipping initialization");
    }
    return;
  }

  const integrations: NonNullable<
    Parameters<typeof Sentry.init>[0]["integrations"]
  > = [sentryNavigationIntegration, Sentry.feedbackIntegration()];

  if (enableMobileReplay) {
    integrations.push(Sentry.mobileReplayIntegration());
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    environment: __DEV__ ? "development" : "production",
    sendDefaultPii: true,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableLogs: true,
    replaysSessionSampleRate: enableMobileReplay ? 0.1 : 0,
    replaysOnErrorSampleRate: enableMobileReplay ? 1.0 : 0,
    integrations,
    beforeSend(event) {
      // Strip PII from breadcrumbs in production
      if (!__DEV__ && event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => {
          if (bc.category === "http" && bc.data?.url) {
            // Keep only the pathname, not query params
            try {
              const url = new URL(bc.data.url as string);
              bc.data.url = url.pathname;
            } catch {
              // URL parsing failed — leave as-is
            }
          }
          return bc;
        });
      }
      return event;
    },
  });
}

export function registerSentryNavigationContainer(
  navigationContainerRef: unknown,
): void {
  sentryNavigationIntegration.registerNavigationContainer(
    navigationContainerRef,
  );
}

const SCREEN_NAMES: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Transactions",
  "/balance": "Balances",
  "/add-balance": "Add Balance",
  "/commissions": "Commissions",
  "/add-commission": "Add Commission",
  "/commission-schedules": "Commission Schedules",
  "/expenses": "Expenses",
  "/expenses/recurring": "Recurring Expenses",
  "/add-cash-count": "Add Cash Count",
  "/accounts": "Accounts",
  "/account-templates": "Account Templates",
  "/reconciliation": "Reconciliation",
  "/history": "History",
  "/insights": "Insights",
  "/settings": "Settings",
  "/agencies": "Agencies",
  "/agency-form": "Agency Form",
  "/agency-setup": "Agency Setup",
  "/sign-in": "Sign In",
  "/sign-up": "Sign Up",
  "/welcome": "Welcome",
  "/set-password": "Set Password",
  "/forgot-password": "Forgot Password",
};

function getScreenName(pathname: string): string {
  return SCREEN_NAMES[pathname] ?? pathname;
}

export function setCurrentRouteContext(pathname: string): void {
  const normalizedPathname = pathname || "/";
  const screenName = getScreenName(normalizedPathname);
  Sentry.setTag("route.pathname", normalizedPathname);
  Sentry.setTag("route.screen", screenName);
  Sentry.setContext("route", {
    pathname: normalizedPathname,
    screen: screenName,
  });
}

export function setCurrentUserContext(
  user: {
    id?: string | number | null;
    clerkUserId?: string | null;
    email?: string | null;
    role?: string | null;
    companyId?: number | null;
  } | null,
): void {
  if (!user) {
    Sentry.setUser(null);
    Sentry.setContext("auth", null);
    return;
  }

  Sentry.setUser({
    id: user.id != null ? String(user.id) : (user.clerkUserId ?? undefined),
    email: user.email ?? undefined,
  });
  Sentry.setTag("user.role", user.role ?? "unknown");
  Sentry.setTag(
    "user.companyId",
    user.companyId != null ? String(user.companyId) : "none",
  );
  Sentry.setContext("auth", {
    clerkUserId: user.clerkUserId ?? null,
    role: user.role ?? null,
    companyId: user.companyId ?? null,
  });
}

/**
 * Capture a sync queue stall as a Sentry error event with full context.
 */
export function captureSyncStall(context: {
  entityType: string;
  endpoint: string;
  method: string;
  status: string;
  httpStatus: number;
  error: string;
  retryCount: number;
  queueItemId: string;
  idempotencyKey?: string;
  requestPayload?: Record<string, unknown> | null;
}): void {
  Sentry.withScope((scope) => {
    scope.setTag("sync.entityType", context.entityType);
    scope.setTag("sync.status", context.status);
    scope.setTag("sync.httpStatus", String(context.httpStatus));
    scope.setTag("sync.method", context.method);
    scope.setContext("syncItem", {
      queueItemId: context.queueItemId,
      endpoint: context.endpoint,
      retryCount: context.retryCount,
      idempotencyKey: context.idempotencyKey,
      error: context.error,
    });
    if (context.requestPayload) {
      scope.setContext("requestPayload", context.requestPayload);
    }
    scope.setLevel("error");
    Sentry.captureMessage(
      `Sync stalled: ${context.entityType} ${context.status} (HTTP ${context.httpStatus})`,
    );
  });
}

/**
 * Add a breadcrumb for sync engine activity (non-error events).
 */
export function addSyncBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({
    category: "sync",
    message,
    data,
    level: "info",
  });
}

/**
 * Add a breadcrumb for API requests.
 */
export function addApiBreadcrumb(
  method: string,
  endpoint: string,
  status: number,
  duration?: number,
): void {
  Sentry.addBreadcrumb({
    category: "http",
    message: `${method} ${endpoint}`,
    data: { status, duration },
    level: status >= 400 ? "warning" : "info",
  });
}

export { Sentry };
