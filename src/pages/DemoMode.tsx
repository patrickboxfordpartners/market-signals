import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import logoIcon from "../assets/logo-icon.png";
import { useAuth } from "../hooks/useAuth";
import { trackDemoEngagement } from "../lib/analytics";

interface DemoScenario {
  stock: string;
  company_name: string;
  trigger_event: string;
  posts: any[];
  predictions: any[];
  baseline_volume: number;
  spike_volume: number;
  days_before_spike: number;
  days_after_spike: number;
  outcome: {
    price_change_percent: number;
    days_elapsed: number;
  };
}

export default function DemoMode() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState<DemoScenario | null>(null);
  const [selectedStock, setSelectedStock] = useState<"NVDA" | "COIN" | "PLTR">("NVDA");
  const [currentDay, setCurrentDay] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 10x, 100x
  const [showTutorial, setShowTutorial] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Load scenario data
  useEffect(() => {
    setCurrentDay(0);
    setIsPlaying(false);
    fetch(`/demo-data/scenario_${selectedStock}.json`)
      .then((res) => res.json())
      .then((data) => setScenario(data))
      .catch(console.error);
  }, [selectedStock]);

  // Track engagement
  useEffect(() => {
    if (!hasInteracted && (isPlaying || currentDay > 0)) {
      setHasInteracted(true);
      trackDemoEngagement({ action: 'demo_start', stock: selectedStock });
    }
  }, [isPlaying, currentDay, hasInteracted, selectedStock]);

  // Auto-advance playback
  useEffect(() => {
    if (!isPlaying || !scenario) return;

    const interval = setInterval(() => {
      setCurrentDay((prev) => {
        const maxDay = scenario.posts[scenario.posts.length - 1]?.day || 90;
        return prev >= maxDay ? prev : prev + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, scenario]);

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!scenario) return;
    const maxDay = scenario.days_before_spike + scenario.days_after_spike;

    if (e.code === 'Space') {
      e.preventDefault();
      setIsPlaying(prev => !prev);
      setShowTutorial(false);
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      setCurrentDay(prev => Math.max(0, prev - 1));
      setShowTutorial(false);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      setCurrentDay(prev => Math.min(maxDay, prev + 1));
      setShowTutorial(false);
    } else if (e.code === 'KeyR') {
      e.preventDefault();
      setCurrentDay(0);
      setIsPlaying(false);
      setShowTutorial(false);
    }
  }, [scenario]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Dismiss tutorial on any interaction
  useEffect(() => {
    if (hasInteracted) {
      setShowTutorial(false);
    }
  }, [hasInteracted]);

  if (!scenario) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading demo scenario...</p>
        </div>
      </div>
    );
  }

  const currentPosts = scenario.posts.filter(
    (p) => new Date(p.timestamp) <= addDays(new Date(), currentDay)
  );

  const currentPredictions = scenario.predictions.filter(
    (p) => new Date(p.timestamp) <= addDays(new Date(), currentDay)
  );

  const maxDay = scenario.days_before_spike + scenario.days_after_spike;
  const spikeDay = scenario.days_before_spike;
  const isSpike = currentDay >= spikeDay && currentDay <= spikeDay + 3;
  const isComplete = currentDay >= scenario.outcome.days_elapsed;

  // Track completion
  useEffect(() => {
    if (isComplete && hasInteracted) {
      trackDemoEngagement({
        action: 'demo_complete',
        stock: selectedStock,
        progress: 100,
        outcome: scenario.outcome.price_change_percent > 0 ? 'bullish' : 'bearish',
      });
    }
  }, [isComplete, hasInteracted, selectedStock, scenario.outcome.price_change_percent]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Interactive Demo
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Watch 90 days of social media chatter unfold. See how mention spikes predict price movements.
            </p>
            <div className="space-y-3 text-sm text-left bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-mono">Space</kbd>
                <span className="text-gray-700 dark:text-gray-300">Play / Pause</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-mono">← →</kbd>
                <span className="text-gray-700 dark:text-gray-300">Scrub timeline</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs font-mono">R</kbd>
                <span className="text-gray-700 dark:text-gray-300">Reset</span>
              </div>
            </div>
            <button
              onClick={() => {
                setShowTutorial(false);
                setIsPlaying(true);
              }}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Demo
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img src={logoIcon} alt="Street Insights" className="h-8 w-auto" />
              <div>
                <h1 className="text-sm font-bold tracking-tight">STREET INSIGHTS</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">Interactive Demo</p>
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span>Day {currentDay} of {maxDay}</span>
              </div>
              <Link
                to="/"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Scenario Selector + Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{scenario.company_name} ({scenario.stock})</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{scenario.trigger_event}</p>
              </div>
              <div className="flex items-center gap-3">
                {(["NVDA", "COIN", "PLTR"] as const).map((stock) => (
                  <button
                    key={stock}
                    onClick={() => setSelectedStock(stock)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      selectedStock === stock
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {stock}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Outcome</p>
                <p className="text-3xl font-bold">
                  {currentDay >= scenario.outcome.days_elapsed ? (
                    <span className={scenario.outcome.price_change_percent > 0 ? "text-green-600" : "text-red-600"}>
                      {scenario.outcome.price_change_percent > 0 ? "+" : ""}
                      {scenario.outcome.price_change_percent}%
                    </span>
                  ) : (
                    <span className="text-gray-400">, </span>
                  )}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Mentions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{currentPosts.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Predictions</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{currentPredictions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Spike Alert */}
        {isSpike && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 border-2 border-red-300 dark:border-red-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 dark:text-red-100 mb-1">
                  Spike Detected
                </h3>
                <p className="text-red-800 dark:text-red-200 mb-2">{scenario.trigger_event}</p>
                <div className="flex items-center gap-4 text-sm text-red-700 dark:text-red-300">
                  <span className="font-mono">+{Math.round((scenario.spike_volume / scenario.baseline_volume - 1) * 100)}% volume</span>
                  <span>•</span>
                  <span>{scenario.spike_volume} mentions/day (baseline: {scenario.baseline_volume})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Playback Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <button
                  className={`px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm ${
                    isPlaying
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                      Pause
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play
                    </span>
                  )}
                </button>

                <button
                  className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setCurrentDay((prev) => Math.min(prev + 7, maxDay))}
                >
                  +7 Days
                </button>

                <button
                  className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    setCurrentDay(0);
                    setIsPlaying(false);
                  }}
                >
                  Reset
                </button>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Speed:</span>
                <div className="flex items-center gap-2">
                  {[1, 10, 100].map((speed) => (
                    <button
                      key={speed}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
                        playbackSpeed === speed
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                      }`}
                      onClick={() => setPlaybackSpeed(speed)}
                    >
                      {speed}×
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={maxDay}
                  step="1"
                  value={currentDay}
                  onChange={(e) => setCurrentDay(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  style={{
                    background: `linear-gradient(to right, rgb(37, 99, 235) 0%, rgb(37, 99, 235) ${(currentDay / maxDay) * 100}%, rgb(229, 231, 235) ${(currentDay / maxDay) * 100}%, rgb(229, 231, 235) 100%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-gray-500 dark:text-gray-400">Day 0</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">Spike (Day {spikeDay})</span>
                <span className="text-gray-500 dark:text-gray-400">Day {maxDay}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mention Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Live Mentions</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentPosts.length} total mentions</p>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {currentPosts
                .slice(-20)
                .reverse()
                .map((post) => (
                  <div
                    key={post.id}
                    className={`p-4 rounded-lg border transition-all ${
                      post.is_prediction
                        ? "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800"
                        : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">@{post.source_username}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300">
                          {post.platform}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(post.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{post.content}</p>
                    {post.is_prediction && (
                      <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                          Target: ${post.price_target} ({post.timeframe_days}d)
                        </p>
                        <p className="text-xs text-blue-800 dark:text-blue-200">{post.reasoning}</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Predictions Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Active Predictions</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentPredictions.length} price targets</p>
            </div>
            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {currentPredictions.slice(-10).map((pred) => (
                <div key={pred.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">@{pred.source_username}</span>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium ${
                        pred.sentiment === "bullish"
                          ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                          : pred.sentiment === "bearish"
                          ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {pred.sentiment?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-2">
                    ${pred.price_target} <span className="text-sm font-normal text-gray-600 dark:text-gray-400">in {pred.timeframe_days} days</span>
                  </p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{pred.reasoning}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Outcome Reveal + CTA */}
        {isComplete && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 rounded-xl border-2 border-blue-300 dark:border-blue-700 p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Outcome Validated</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">90-day prediction window complete</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide font-medium">Price Movement</p>
                  <p className={`text-4xl font-bold ${scenario.outcome.price_change_percent > 0 ? "text-green-600" : "text-red-600"}`}>
                    {scenario.outcome.price_change_percent > 0 ? "+" : ""}
                    {scenario.outcome.price_change_percent}%
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide font-medium">Correct Predictions</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white">
                    {currentPredictions.filter(p =>
                      (scenario.outcome.price_change_percent > 0 && p.sentiment === "bullish") ||
                      (scenario.outcome.price_change_percent < 0 && p.sentiment === "bearish")
                    ).length} <span className="text-2xl text-gray-400">/ {currentPredictions.length}</span>
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide font-medium">Days Elapsed</p>
                  <p className="text-4xl font-bold text-gray-900 dark:text-white">{scenario.outcome.days_elapsed}</p>
                </div>
              </div>
            </div>

            {/* Conversion CTA */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center shadow-xl">
              <h3 className="text-2xl font-bold mb-2">Ready to Track Live Signals?</h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                This was synthetic data. The real platform tracks {selectedStock} and 500+ other tickers in real-time.
                Get alerts before the market moves.
              </p>
              <div className="flex items-center justify-center gap-4">
                {session ? (
                  <button
                    onClick={() => {
                      trackDemoEngagement({ action: 'demo_cta_dashboard', stock: selectedStock });
                      navigate('/dashboard');
                    }}
                    className="px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all shadow-lg"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <Link
                      to="/sign-up"
                      onClick={() => trackDemoEngagement({ action: 'demo_cta_signup', stock: selectedStock })}
                      className="px-8 py-4 bg-white text-blue-600 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all shadow-lg"
                    >
                      Get Started
                    </Link>
                    <button
                      onClick={() => {
                        setCurrentDay(0);
                        setIsPlaying(false);
                        trackDemoEngagement({ action: 'demo_cta_replay', stock: selectedStock });
                      }}
                      className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg text-lg font-semibold hover:bg-white/10 transition-all"
                    >
                      Watch Again
                    </button>
                  </>
                )}
              </div>
              <p className="text-blue-200 text-sm mt-4">
                Try {(["NVDA", "COIN", "PLTR"] as const).filter(s => s !== selectedStock).map((s) =>
                  <button
                    key={s}
                    onClick={() => {
                      trackDemoEngagement({ action: 'demo_switch_stock', stock: s, from: selectedStock, to: s });
                      setSelectedStock(s);
                    }}
                    className="underline hover:text-white mx-1"
                  >
                    {s}
                  </button>
                )} too
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - (90 - days)); // Work backwards from today
  return result;
}
