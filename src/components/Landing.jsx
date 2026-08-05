import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { NIGERIAN_UNIVERSITIES } from '../lib/constants.js'
import { ShieldCheck, Users, KeyRound, Home, Upload, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'

export default function Landing() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
// needed
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <span className="font-display font-bold text-xl text-primary">SURent</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('login')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'login' ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10'}`}
            >
              Log In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${mode === 'signup' ? 'bg-accent text-white' : 'text-accent hover:bg-accent/10'}`}
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-12 items-start">
        <div className="hidden md:block">
          <h1 className="font-display text-4xl font-bold text-primary leading-tight mb-4">
            Secure University Rent
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            Off-campus housing built on trust, not just listings. Verified landlords,
            compulsory guarantors, and mutually confirmed negotiation stages protect
            both students and landlords at every step.
          </p>
          <div className="space-y-4">
            <Feature icon={<ShieldCheck size={20} />} title="Verified Landlords" desc="ID-checked landlords carry a green verified badge on every listing." />
            <Feature icon={<Users size={20} />} title="Guarantor Accountability" desc="Every negotiation requires a guarantor on file for both sides." />
            <Feature icon={<KeyRound size={20} />} title="Mutual Stage Tracking" desc="Both parties confirm each step — from viewing to move-in — with a timestamped audit trail." />
            <Feature icon={<Home size={20} />} title="Built for Nigerian Campuses" desc="Search by university, location, and price with landlords who know your area." />
          </div>
        </div>

        <div className="card p-6 md:p-8">
          {mode === 'login' ? <LoginForm switchToSignup={() => setMode('signup')} /> : <SignupForm switchToLogin={() => setMode('login')} />}
        </div>
      </section>
    </div>
  )
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
    </div>
  )
}

function LoginForm({ switchToSignup }) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn({ email, password })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-display text-2xl font-bold text-primary">Welcome back</h2>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      <div>
        <label className="text-sm font-medium text-ink">Email</label>
        <input type="email" required className="input-field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-ink">Password</label>
        <input type="password" required className="input-field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading && <Loader2 className="animate-spin" size={16} />}
        Log In
      </button>
      <p className="text-sm text-center text-gray-500">
        No account? <button type="button" onClick={switchToSignup} className="text-accent font-medium">Sign up</button>
      </p>
    </form>
  )
}

function SignupForm({ switchToLogin }) {
  const { signUp } = useAuth()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [otherUniversity, setOtherUniversity] = useState('')
  const [propertyAreas, setPropertyAreas] = useState('')
  const [phone, setPhone] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [idImage, setIdImage] = useState(null)

  const [guarantorName, setGuarantorName] = useState('')
  const [guarantorPhone, setGuarantorPhone] = useState('')
  const [guarantorEmail, setGuarantorEmail] = useState('')
  const [guarantorId, setGuarantorId] = useState(null)

  const isLandlord = role === 'landlord'

  const goToStep2 = (e) => {
    e.preventDefault()
    setError('')
    if (isLandlord && !idImage) {
      setError('Landlords must upload an ID image for verification.')
      return
    }
    setStep(2)
  }

  const handleFinalSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (isLandlord && !guarantorEmail) {
      setError('Guarantor email is compulsory for landlords.')
      return
    }
    setLoading(true)
    try {
      await signUp({
        email,
        password,
        details: {
          role,
          full_name: fullName,
          university: university === 'Others' ? otherUniversity : university,
          property_areas: isLandlord ? propertyAreas : null,
          phone
        },
        guarantor: {
          guarantor_name: guarantorName,
          guarantor_phone: guarantorPhone,
          guarantor_email: guarantorEmail
        },
        files: { avatar, idImage, guarantorId }
      })
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <StepDot active={step === 1} done={step > 1} label="1" />
        <div className="flex-1 h-0.5 bg-gray-200" />
        <StepDot active={step === 2} done={false} label="2" />
      </div>
      <h2 className="font-display text-2xl font-bold text-primary mb-1">
        {step === 1 ? 'Create your account' : 'Guarantor details'}
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        {step === 1 ? 'Step 1 of 2 — personal details' : 'Step 2 of 2 — required for accountability'}
      </p>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {step === 1 && (
        <form onSubmit={goToStep2} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink">I am a</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button type="button" onClick={() => setRole('student')} className={`py-2 rounded-lg border text-sm font-medium ${role === 'student' ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600'}`}>Student</button>
              <button type="button" onClick={() => setRole('landlord')} className={`py-2 rounded-lg border text-sm font-medium ${role === 'landlord' ? 'bg-primary text-white border-primary' : 'border-gray-300 text-gray-600'}`}>Landlord</button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Full Name</label>
            <input required className="input-field mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Email</label>
            <input type="email" required className="input-field mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Password</label>
            <input type="password" required minLength={6} className="input-field mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Phone Number</label>
            <input required className="input-field mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">University</label>
            <select required className="input-field mt-1" value={university} onChange={(e) => setUniversity(e.target.value)}>
              <option value="">Select university</option>
              {NIGERIAN_UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            {university === 'Others' && (
              <input required placeholder="Enter university name" className="input-field mt-2" value={otherUniversity} onChange={(e) => setOtherUniversity(e.target.value)} />
            )}
          </div>
          {isLandlord && (
            <div>
              <label className="text-sm font-medium text-ink">Property Areas</label>
              <input required placeholder="e.g. Ugbowo, Benin City" className="input-field mt-1" value={propertyAreas} onChange={(e) => setPropertyAreas(e.target.value)} />
            </div>
          )}
          <FileInput
            label={isLandlord ? 'ID Image (required for verification)' : 'Profile Picture (optional)'}
            required={isLandlord}
            onChange={(f) => (isLandlord ? setIdImage(f) : setAvatar(f))}
          />
          <button type="submit" className="btn-accent w-full flex items-center justify-center gap-2">
            Continue <ArrowRight size={16} />
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleFinalSubmit} className="space-y-4">
          <p className="text-sm bg-primary/5 border border-primary/20 text-primary rounded-lg px-3 py-2">
            {isLandlord
              ? 'A guarantor is compulsory for landlords. This information builds trust with prospective tenants.'
              : 'Adding a guarantor now is optional — you\'ll be required to add one before starting a chat negotiation with a landlord.'}
          </p>
          <div>
            <label className="text-sm font-medium text-ink">Guarantor Name</label>
            <input required={isLandlord} className="input-field mt-1" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Guarantor Phone</label>
            <input required={isLandlord} className="input-field mt-1" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">
              Guarantor Email {isLandlord ? '(compulsory)' : '(optional for now)'}
            </label>
            <input type="email" required={isLandlord} className="input-field mt-1" value={guarantorEmail} onChange={(e) => setGuarantorEmail(e.target.value)} />
          </div>
          <FileInput label="Guarantor ID Image (optional but recommended)" onChange={setGuarantorId} />
          <div className="flex gap-2">
            <button type="button" onClick={() => setStep(1)} className="btn-outline flex-1 flex items-center justify-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading && <Loader2 className="animate-spin" size={16} />}
              Create Account
            </button>
          </div>
        </form>
      )}

      <p className="text-sm text-center text-gray-500 mt-5">
        Already have an account? <button type="button" onClick={switchToLogin} className="text-accent font-medium">Log in</button>
      </p>
    </div>
  )
}

function StepDot({ active, done, label }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${active || done ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
      {label}
    </div>
  )
}

function FileInput({ label, required, onChange }) {
  const [fileName, setFileName] = useState('')
  return (
    <div>
      <label className="text-sm font-medium text-ink">{label}</label>
      <label className="mt-1 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-pointer hover:border-primary hover:text-primary transition">
        <Upload size={16} />
        {fileName || 'Choose file'}
        <input
          type="file"
          accept="image/*"
          required={required}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] || null
            setFileName(f?.name || '')
            onChange(f)
          }}
        />
      </label>
    </div>
  )
}
