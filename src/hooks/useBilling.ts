import { useState } from "react";
import { supabase } from "../lib/supabase";

export function useBilling() {
  const [loading, setLoading] = useState(false);

  async function startCheckout(priceId: string) {
    if (!priceId) {
      console.error("[useBilling] No price ID provided");
      return;
    }

    setLoading(true);
    try {
      // Refresh session to get a fresh token
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      console.log("[useBilling] Session check:", { hasSession: !!session, userId: session?.user?.id, refreshError });

      if (!session) {
        console.log("[useBilling] No session found, redirecting to signup");
        window.location.href = `/sign-up?redirect=${encodeURIComponent(`/pricing?plan=${priceId}`)}`;
        return;
      }

      console.log("[useBilling] Calling stripe-checkout Edge Function with priceId:", priceId);

      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          priceId,
          successUrl: `${window.location.origin}/?checkout=success`,
          cancelUrl: `${window.location.origin}/pricing?checkout=cancelled`,
        },
      });

      if (error) {
        console.error("[useBilling] Supabase function error:", error);
        throw error;
      }
      if (data?.error) {
        console.error("[useBilling] Edge function returned error:", data.error);
        throw new Error(data.error);
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error("[useBilling] No checkout URL returned:", data);
        throw new Error("No checkout URL returned from server");
      }
    } catch (err: any) {
      console.error("[useBilling] Full checkout error:", err);
      alert(`Checkout failed: ${err.message || "Please try again"}`);
    } finally {
      setLoading(false);
    }
  }

  return { startCheckout, loading };
}
