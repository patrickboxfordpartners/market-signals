import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../hooks/useAuth";
import { Calendar, Mail, Webhook, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface AlertLog {
  id: string;
  alert_type: string;
  ticker_symbol: string | null;
  subject: string;
  message: string;
  status: string;
  delivery_channel: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export default function AlertHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<AlertLog | null>(null);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user, filter]);

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from("alert_log")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filter !== "all") {
        query = query.eq("alert_type", filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (err: any) {
      console.error("Error fetching alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="h-3 w-3" />
            Sent
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "spike":
        return <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/10 text-orange-400">Spike</span>;
      case "prediction":
        return <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/10 text-purple-400">Prediction</span>;
      case "digest":
        return <span className="px-2 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400">Digest</span>;
      default:
        return <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/10 text-gray-400">{type}</span>;
    }
  };

  const getDeliveryIcon = (channel: string | null) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4 text-gray-400" />;
      case "webhook":
        return <Webhook className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-400">Loading alert history...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alert History</h1>
          <p className="text-gray-400 mt-2">
            View past alerts and their delivery status
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all"
                ? "bg-emerald-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            All Alerts
          </button>
          <button
            onClick={() => setFilter("spike")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "spike"
                ? "bg-emerald-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Spikes
          </button>
          <button
            onClick={() => setFilter("prediction")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "prediction"
                ? "bg-emerald-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Predictions
          </button>
          <button
            onClick={() => setFilter("digest")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "digest"
                ? "bg-emerald-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Digests
          </button>
        </div>

        {/* Alerts Table */}
        {alerts.length === 0 ? (
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Alerts Yet</h3>
            <p className="text-gray-400">
              {filter === "all"
                ? "You haven't received any alerts yet. Configure your preferences to start receiving notifications."
                : `No ${filter} alerts found.`}
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50 border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {alerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className="hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getTypeBadge(alert.alert_type)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-xs">{alert.subject}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {alert.ticker_symbol ? (
                          <span className="font-mono text-sm text-emerald-400">{alert.ticker_symbol}</span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(alert.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getDeliveryIcon(alert.delivery_channel)}
                          <span className="text-sm text-gray-400 capitalize">{alert.delivery_channel || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(alert.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(alert.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Alert Detail Modal */}
        {selectedAlert && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedAlert(null)}
          >
            <div
              className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold mb-2">{selectedAlert.subject}</h2>
                    <div className="flex items-center gap-2">
                      {getTypeBadge(selectedAlert.alert_type)}
                      {getStatusBadge(selectedAlert.status)}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAlert(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 mb-1">Ticker</div>
                    <div className="font-medium">
                      {selectedAlert.ticker_symbol || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Channel</div>
                    <div className="font-medium capitalize">
                      {selectedAlert.delivery_channel || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Created</div>
                    <div className="font-medium">
                      {new Date(selectedAlert.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Sent</div>
                    <div className="font-medium">
                      {selectedAlert.sent_at
                        ? new Date(selectedAlert.sent_at).toLocaleString()
                        : "Not sent"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="text-gray-400 text-sm mb-2">Message</div>
                <pre className="text-sm whitespace-pre-wrap bg-gray-900 border border-gray-700 rounded-lg p-4">
                  {selectedAlert.message}
                </pre>

                {selectedAlert.error_message && (
                  <div className="mt-4">
                    <div className="text-red-400 text-sm mb-2">Error</div>
                    <div className="text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
                      {selectedAlert.error_message}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
