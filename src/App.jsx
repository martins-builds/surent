import { useAuth } from './contexts/AuthContext.jsx'
import Landing from './components/Landing.jsx'
import StudentDashboard from './components/StudentDashboard.jsx'
import LandlordDashboard from './components/LandlordDashboard.jsx'
import AdminDashboard from './components/AdminDashboard.jsx'
import GuarantorLinkPage from './components/GuarantorLinkPage.jsx'
import { Loader2 } from 'lucide-react'

export default function App() {
  const { session, profile, loading } = useAuth()

  // Lightweight routing (no router library needed): the public read-only
  // guarantor link at /guarantor/:token works with no login at all, so it's
  // checked before any auth state.
  const path = window.location.pathname
  const guarantorMatch = path.match(/^\/guarantor\/([^/]+)$/)
  if (guarantorMatch) {
    return <GuarantorLinkPage token={guarantorMatch[1]} />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3 text-primary">
          <Loader2 className="animate-spin" size={32} />
          <span className="font-display font-medium">Loading SURent…</span>
        </div>
      </div>
    )
  }

  if (!session || !profile) {
    return <Landing />
  }

  if (profile.role === 'admin') return <AdminDashboard />
  if (profile.role === 'landlord') return <LandlordDashboard />
  return <StudentDashboard />
}
