/**
 * useSubscription.ts
 * Unified subscription management hook.
 * Abstracts platform difference so the rest of the app
 * never needs to know whether the user paid via Stripe or Apple.
 */

import { useState, useCallback } from "react";
import { isNativeApp } from "@/lib/appMode";
import { supabase } from "@/integrations/supabase/client";
import { useUserAccount } from "@/contexts/UserAccountContext";

// ── Config ────────────────────────────────────────────────────────────────

const STRIPE_MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID ?? "";
const STRIPE_ANNUAL_PRICE_ID  = import.meta.env.VITE_STRIPE_ANNUAL_PRICE_ID ?? "";

const RC_ENTITLEMENT_ID = "puzzlecraft_plus";

const SUBSCRIBE_WEB_URL = "https://www.puzzlecrft.com/account?upgrade=1";

// ── Hidden dynamic import helper ──────────────────────────────────────────
// Uses a variable to prevent Vite/Rollup from statically analysing the specifier.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function nativeImport(specifier: string): Promise<any> {
  return new Function("s", "return import(s)")(specifier);
}

// ── Platform detection ────────────────────────────────────────────────────

type SubscriptionPlatform = "stripe" | "apple" | "web_redirect";

function getActivePlatform(): SubscriptionPlatform {
  if (!isNativeApp()) return "stripe";
  return "web_redirect";
}

// ── Stripe purchase (web only) ─────────────────────────────────────────────

async function openStripeCheckout(annual: boolean, userId: string): Promise<void> {
  const priceId = annual ? STRIPE_ANNUAL_PRICE_ID : STRIPE_MONTHLY_PRICE_ID;

  if (!priceId) {
    console.error("[Subscription] Stripe price IDs not configured.");
    throw new Error("Stripe not configured");
  }

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: {
      priceId,
      userId,
      successUrl: `${window.location.origin}/account?subscribed=1`,
      cancelUrl:  `${window.location.origin}/account`,
    },
  });

  if (error || !data?.url) {
    throw new Error(error?.message ?? "Failed to create checkout session");
  }

  window.location.href = data.url;
}

// ── Apple IAP purchase (RevenueCat) ───────────────────────────────────────

async function purchaseWithRevenueCat(annual: boolean): Promise<boolean> {
  try {
    const RC = await nativeImport("@revenuecat/purchases-capacitor");
    const Purchases = RC.Purchases;
    const APPLE_ANNUAL_PRODUCT_ID  = "com.puzzlecraft.plus.annual";
    const APPLE_MONTHLY_PRODUCT_ID = "com.puzzlecraft.plus.monthly";
    const productId = annual ? APPLE_ANNUAL_PRODUCT_ID : APPLE_MONTHLY_PRODUCT_ID;

    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) throw new Error("No RevenueCat offerings available");

    const pkg = current.availablePackages.find(
      (p: { identifier: string }) => p.identifier === productId
    );
    if (!pkg) throw new Error(`Product ${productId} not found in offerings`);

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return !!customerInfo.entitlements.active[RC_ENTITLEMENT_ID];
  } catch (err: unknown) {
    if ((err as { userCancelled?: boolean }).userCancelled) return false;
    throw err;
  }
}

// ── Web redirect (Path C — iOS with no IAP) ───────────────────────────────

async function openSubscribeOnWebsite(): Promise<void> {
  try {
    const mod = await nativeImport("@capacitor/browser");
    await mod.Browser.open({ url: SUBSCRIBE_WEB_URL });
  } catch {
    window.open(SUBSCRIBE_WEB_URL, "_blank");
  }
}

// ── RevenueCat initialisation ──────────────────────────────────────────

export async function initRevenueCat(userId?: string): Promise<void> {
  if (!isNativeApp()) return;

  const RC_API_KEY = import.meta.env.VITE_REVENUECAT_IOS_API_KEY;
  if (!RC_API_KEY) {
    console.warn("[RevenueCat] VITE_REVENUECAT_IOS_API_KEY not set — skipping init");
    return;
  }

  try {
    const RC = await nativeImport("@revenuecat/purchases-capacitor");
    const Purchases = RC.Purchases;
    await Purchases.configure({ apiKey: RC_API_KEY });
    if (userId) {
      await Purchases.logIn({ appUserID: userId });
    }
  } catch {
    // Package not installed — running Path C
  }
}

// ── Manage subscription ───────────────────────────────────────────────────

async function openManageSubscription(platform: SubscriptionPlatform): Promise<void> {
  if (platform === "apple") {
    try {
      const mod = await nativeImport("@capacitor/browser");
      await mod.Browser.open({ url: "https://apps.apple.com/account/subscriptions" });
    } catch {
      window.open("https://apps.apple.com/account/subscriptions", "_blank");
    }
  } else {
    const { data } = await supabase.functions.invoke("customer-portal");
    if (data?.url) window.location.href = data.url;
  }
}

// ── Restore purchases (iOS requirement) ───────────────────────────────────

async function restorePurchases(): Promise<boolean> {
  try {
    const RC = await nativeImport("@revenuecat/purchases-capacitor");
    const Purchases = RC.Purchases;
    const { customerInfo } = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[RC_ENTITLEMENT_ID];
  } catch {
    return false;
  }
}

// ── Main hook ─────────────────────────────────────────────────────────────

export interface UseSubscriptionReturn {
  purchase: (annual: boolean) => Promise<void>;
  manage: () => Promise<void>;
  restore: () => Promise<void>;
  purchasing: boolean;
  isNative: boolean;
  result: "idle" | "success" | "cancelled" | "error";
  errorMessage: string | null;
}

export function useSubscription(): UseSubscriptionReturn {
  const { refreshSubscription } = useUserAccount();
  const [purchasing, setPurchasing] = useState(false);
  const [result, setResult] = useState<UseSubscriptionReturn["result"]>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const platform = getActivePlatform();
  const native = isNativeApp();

  const purchase = useCallback(async (annual: boolean) => {
    if (purchasing) return;
    setPurchasing(true);
    setResult("idle");
    setErrorMessage(null);

    try {
      if (platform === "stripe") {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Sign in first to subscribe");
        await openStripeCheckout(annual, user.id);
        setResult("error");
      } else if (platform === "apple") {
        const success = await purchaseWithRevenueCat(annual);
        if (success) {
          await refreshSubscription();
          setResult("success");
        } else {
          setResult("cancelled");
        }
      } else {
        openSubscribeOnWebsite();
        setResult("idle");
      }
    } catch (err) {
      setResult("error");
      setErrorMessage((err as Error).message ?? "Something went wrong");
    } finally {
      setPurchasing(false);
    }
  }, [platform, purchasing, refreshSubscription]);

  const manage = useCallback(async () => {
    await openManageSubscription(platform);
  }, [platform]);

  const restore = useCallback(async () => {
    setPurchasing(true);
    try {
      const restored = await restorePurchases();
      if (restored) {
        await refreshSubscription();
        setResult("success");
      }
    } finally {
      setPurchasing(false);
    }
  }, [refreshSubscription]);

  return { purchase, manage, restore, purchasing, isNative: native, result, errorMessage };
}
