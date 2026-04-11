import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../hooks/useAuth";
import { History } from "lucide-react";

interface AlertPreferences {
  id?: string;
  user_id: string;
  spike_alerts_enabled: boolean;
  prediction_alerts_enabled: boolean;
  daily_digest_enabled: boolean;
  spike_mention_threshold: number;
  prediction_confidence_threshold: number;
  email_enabled: boolean;
  email_address: string;
  webhook_enabled: boolean;
  webhook_url: string;
}

export default function AlertPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [preferences, setPreferences] = useState<AlertPreferences>({
    user_id: user?.id || "",
    spike_alerts_enabled: true,
    prediction_alerts_enabled: true,
    daily_digest_enabled: false,
    spike_mention_threshold: 20,
    prediction_confidence_threshold: 70,
    email_enabled: true,
    email_address: user?.email || "",
    webhook_enabled: false,
    webhook_url: "",
  });

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("alert_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setPreferences({
          ...data as unknown as AlertPreferences,
          email_address: data.email_address || user!.email || "",
        });
      } else {
        // No preferences yet, use defaults with user email
        setPreferences(prev => ({
          ...prev,
          user_id: user!.id,
          email_address: user!.email || "",
        }));
      }
    } catch (err: any) {
      console.error("Error fetching preferences:", err);
      setMessage({ type: "error", text: "Failed to load preferences" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("alert_preferences")
        .upsert({
          ...preferences,
          user_id: user.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;

      setMessage({ type: "success", text: "Preferences saved successfully" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error("Error saving preferences:", err);
      setMessage({ type: "error", text: err.message || "Failed to save preferences" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Loading preferences...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Alert Preferences</h1>
            <p className="text-gray-400 mt-2">
              Configure how and when you receive notifications
            </p>
          </div>
          <Link
            to="/alerts/history"
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg font-medium transition-colors"
          >
            <History className="h-4 w-4" />
            View History
          </Link>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg border border-gray-700 divide-y divide-gray-700">
          {/* Alert Types */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Alert Types</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.spike_alerts_enabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, spike_alerts_enabled: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium">Spike Alerts</div>
                  <div className="text-sm text-gray-400">
                    Get notified when mention frequency spikes above baseline
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.prediction_alerts_enabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, prediction_alerts_enabled: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium">Prediction Alerts</div>
                  <div className="text-sm text-gray-400">
                    Get notified about high-confidence predictions
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={preferences.daily_digest_enabled}
                  onChange={(e) =>
                    setPreferences({ ...preferences, daily_digest_enabled: e.target.checked })
                  }
                  className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium">Daily Digest</div>
                  <div className="text-sm text-gray-400">
                    Receive a morning summary of yesterday's activity (9 AM daily)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Thresholds */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Thresholds</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Spike Mention Threshold
                </label>
                <input
                  type="number"
                  min="5"
                  max="1000"
                  value={preferences.spike_mention_threshold}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      spike_mention_threshold: parseInt(e.target.value) || 20,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Minimum mentions required to trigger a spike alert
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Prediction Confidence Threshold (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={preferences.prediction_confidence_threshold}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      prediction_confidence_threshold: parseInt(e.target.value) || 70,
                    })
                  }
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-400 mt-1">
                  Minimum confidence level to receive prediction alerts (Low=30, Medium=60, High=80)
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Channels */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Delivery Channels</h2>
            <div className="space-y-6">
              <div>
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={preferences.email_enabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, email_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Email Notifications</span>
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={preferences.email_address}
                  onChange={(e) =>
                    setPreferences({ ...preferences, email_address: e.target.value })
                  }
                  disabled={!preferences.email_enabled}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={preferences.webhook_enabled}
                    onChange={(e) =>
                      setPreferences({ ...preferences, webhook_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium">Webhook Notifications</span>
                </label>
                <input
                  type="url"
                  placeholder="https://your-webhook-url.com/alerts"
                  value={preferences.webhook_url}
                  onChange={(e) =>
                    setPreferences({ ...preferences, webhook_url: e.target.value })
                  }
                  disabled={!preferences.webhook_enabled}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-sm text-gray-400 mt-1">
                  POST requests will be sent to this URL with alert data
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </>
  );
}
