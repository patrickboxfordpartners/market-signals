import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { DashboardLayout } from './components/dashboard/DashboardLayout'
import { Overview } from './pages/Overview'
import { SourceLeaderboard } from './pages/SourceLeaderboard'
import { TickerAnalysis } from './pages/TickerAnalysis'
import { TickerDetail } from './pages/TickerDetail'
import { PredictionsTracker } from './pages/PredictionsTracker'
import { LiveSignals } from './pages/LiveSignals'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="sources" element={<SourceLeaderboard />} />
          <Route path="tickers" element={<TickerAnalysis />} />
          <Route path="tickers/:symbol" element={<TickerDetail />} />
          <Route path="predictions" element={<PredictionsTracker />} />
          <Route path="signals" element={<LiveSignals />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
