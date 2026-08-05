import { useEffect, useState } from 'react'
import { ShieldCheck, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { NEGOTIATION_STAGES } from '../lib/constants.js'

// Rendered when the URL is /guarantor/:token — no login required.
// Everything here is read-only: no message input, no confirm buttons.
export default function GuarantorLinkPage({ token }) {
  const [state, setState] = useState('loading') // loading | notfound | ready
  const [property, setProperty] = useState(null)
  const [student, setStudent] = useState(null)
  const [landlord, setLandlord] = useState(null)
  const [messages, setMessages] = useState([])
  const [agreements, setAgreements] = useState([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: linkRow } = await supabase
        .from('guarantor_links')
        .select('*')
        .eq('token', token)
        .maybeSingle()

      if (!linkRow) {
        if (!cancelled) setState('notfound')
        return
      }

      const { data: prop } = await supabase
        .from('properties')
        .select('*, landlord:profiles!properties_landlord_id_fkey(*)')
        .eq('id', linkRow.property_id)
        .single()

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('property_id', linkRow.property_id)
        .order('created_at', { ascending: true })

      const { data: stages } = await supabase
        .from('negotiation_agreements')
        .select('*')
        .eq('property_id', linkRow.property_id)

      // The other participant is whoever sent/received messages besides the landlord.
      const otherId = msgs?.find((m) => m.sender_id !== prop?.landlord_id)?.sender_id
        || msgs?.find((m) => m.receiver_id !== prop?.landlord_id)?.receiver_id

      let studentProfile = null
      if (otherId) {
        const { data } = await supabase.from('profiles').select('*').eq('id', otherId).single()
        studentProfile = data
      }

      if (!cancelled) {
        setProperty(prop)
        setLandlord(prop?.landlord)
        setStudent(studentProfile)
        setMessages(msgs || [])
        setAgreements(stages || [])
        setState('ready')
      }
    }

    load()
    return () => { cancelled = true }
  }, [token])

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-bg text-primary">Loading…</div>
  }

  if (state === 'notfound') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <p className="text-gray-500">This link is invalid or has expired.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
          <ShieldCheck className="text-primary" size={22} />
          <span className="font-display font-bold text-lg text-primary">SURent — Guarantor View (Read Only)</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="card p-4">
          <h1 className="font-display font-bold text-xl text-ink">{property.title}</h1>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={14} /> {property.location}</p>
          <p className="text-accent font-bold mt-2">₦{Number(property.price).toLocaleString()}/yr</p>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold text-ink mb-3">Parties</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <PartyCard label="Landlord" profile={landlord} />
            <PartyCard label="Student" profile={student} />
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold text-ink mb-3">Negotiation Progress</h2>
          <div className="space-y-2">
            {NEGOTIATION_STAGES.map((stage) => {
              const record = agreements.find((a) => a.stage === stage.key)
              const bothConfirmed = record?.confirmed_by_landlord && record?.confirmed_by_student
              return (
                <div key={stage.key} className="flex items-center gap-2 text-sm">
                  {bothConfirmed ? <CheckCircle2 size={16} className="text-green-600" /> : <Clock size={16} className="text-gray-300" />}
                  <span className={bothConfirmed ? 'text-ink font-medium' : 'text-gray-400'}>
                    Stage {stage.order}: {stage.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="font-semibold text-ink mb-3">Chat History</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.length === 0 && <p className="text-sm text-gray-400">No messages yet.</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_id === property.landlord_id ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === property.landlord_id ? 'bg-gray-100 text-ink' : 'bg-primary/10 text-ink'}`}>
                  <p className="text-[10px] font-semibold opacity-60 mb-0.5">
                    {m.sender_id === property.landlord_id ? 'Landlord' : 'Student'}
                  </p>
                  {m.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center">
          This is a read-only view. You cannot send messages or modify this negotiation.
        </p>
      </div>
    </div>
  )
}

function PartyCard({ label, profile }) {
  if (!profile) return <div className="text-gray-400">— {label} not found —</div>
  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="font-medium text-ink flex items-center gap-1">
        {profile.full_name}
        {profile.is_verified && <ShieldCheck size={14} className="text-green-600" />}
      </p>
      <p className="text-gray-500">{profile.phone}</p>
    </div>
  )
}
