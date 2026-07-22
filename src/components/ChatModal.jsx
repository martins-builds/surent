import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Send, Calendar, CheckCircle2, Clock, Star, ShieldCheck, UserRound } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { NEGOTIATION_STAGES, HIDDEN_AT_STAGES, VISIT_STATUS } from '../lib/constants.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import ImageLightbox from './ImageLightbox.jsx'

// property: the listing under negotiation
// otherParty: profile of the other participant (landlord if I'm student, student if I'm landlord)
export default function ChatModal({ property, otherParty, onClose }) {
  const { profile } = useAuth()
  const [tab, setTab] = useState('chat')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-display font-bold text-lg text-primary">{property.title}</h3>
            <p className="text-xs text-gray-500">Negotiating with {otherParty?.full_name || '...'}</p>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>

        <div className="flex border-b">
          <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>Chat</TabButton>
          <TabButton active={tab === 'visits'} onClick={() => setTab('visits')}>Visits</TabButton>
          <TabButton active={tab === 'stage'} onClick={() => setTab('stage')}>Track Stage</TabButton>
        </div>

        <div className="flex-1 overflow-hidden">
          {tab === 'chat' && <ChatTab property={property} otherParty={otherParty} profile={profile} />}
          {tab === 'visits' && <VisitsTab property={property} otherParty={otherParty} profile={profile} />}
          {tab === 'stage' && <StageTab property={property} otherParty={otherParty} profile={profile} />}
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition ${active ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-primary'}`}>
      {children}
    </button>
  )
}

// ---------------- CHAT TAB ----------------
function ChatTab({ property, otherParty, profile }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [showVisitPicker, setShowVisitPicker] = useState(false)
  const [showGuarantorInfo, setShowGuarantorInfo] = useState(false)
  const bottomRef = useRef(null)
  const pollRef = useRef(null)

  // Fetch without a profiles join — that join was returning null due to an
  // RLS interaction. We just fetch raw messages and label the "other" sender.
  const fetchAll = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('property_id', property.id)
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${otherParty.id}),and(sender_id.eq.${otherParty.id},receiver_id.eq.${profile.id})`)
      .order('created_at', { ascending: true })
    if (!error) setMessages(data || [])
  }, [property.id, profile.id, otherParty?.id])

  useEffect(() => {
    if (!otherParty?.id) return
    fetchAll()
    pollRef.current = setInterval(fetchAll, 3000)
    return () => clearInterval(pollRef.current)
  }, [fetchAll, otherParty?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    const body = text.trim()
    setText('')
    await supabase.from('messages').insert({
      property_id: property.id,
      sender_id: profile.id,
      receiver_id: otherParty.id,
      content: body
    })
    await fetchAll() // instant display, don't wait on the poll
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b flex gap-2">
        <button onClick={() => setShowVisitPicker(true)} className="text-xs flex items-center gap-1 text-primary bg-primary/10 px-2.5 py-1 rounded-full">
          <Calendar size={14} /> Request Visit
        </button>
        <button onClick={() => setShowGuarantorInfo(true)} className="text-xs flex items-center gap-1 text-accent bg-accent/10 px-2.5 py-1 rounded-full">
          <UserRound size={14} /> View Guarantor Details
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 && <p className="text-sm text-gray-400 text-center mt-6">No messages yet. Say hello!</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender_id === profile.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === profile.id ? 'bg-primary text-white rounded-br-sm' : 'bg-gray-100 text-ink rounded-bl-sm'}`}>
              {m.sender_id !== profile.id && (
                <p className="text-[10px] font-semibold opacity-60 mb-0.5">{otherParty.role === 'landlord' ? 'Landlord' : 'Student'}</p>
              )}
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t p-3 flex gap-2">
        <input className="input-field flex-1" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn-primary px-3"><Send size={16} /></button>
      </form>

      {showVisitPicker && <VisitRequestModal property={property} otherParty={otherParty} profile={profile} onClose={() => setShowVisitPicker(false)} />}
      {showGuarantorInfo && <GuarantorInfoModal profile={profile} otherParty={otherParty} onClose={() => setShowGuarantorInfo(false)} />}
    </div>
  )
}

function VisitRequestModal({ property, otherParty, profile, onClose }) {
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('visit_requests').insert({
      property_id: property.id,
      student_id: profile.role === 'student' ? profile.id : otherParty.id,
      landlord_id: profile.role === 'landlord' ? profile.id : otherParty.id,
      requested_date: date,
      message,
      status: VISIT_STATUS.PENDING
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="card w-full max-w-sm p-5">
        <h4 className="font-display font-bold text-primary mb-3">Request a Visit</h4>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">Date</label>
            <input type="date" required className="input-field mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <textarea rows={3} className="input-field mt-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Preferred time, questions, etc." />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">Send Request</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Stage 3 — guarantor details cross-visible in chat. Each party can see the
// other's guarantor name, phone, and ID image for mutual accountability.
function GuarantorInfoModal({ profile, otherParty, onClose }) {
  const [lightboxSrc, setLightboxSrc] = useState(null)
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="card w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-display font-bold text-primary">{otherParty.full_name}'s Guarantor</h4>
          <button onClick={onClose}><X size={18} className="text-gray-500" /></button>
        </div>
        {otherParty.guarantor_name ? (
          <div className="space-y-2 text-sm">
            <Row label="Name" value={otherParty.guarantor_name} />
            <Row label="Phone" value={otherParty.guarantor_phone} />
            <Row label="Email" value={otherParty.guarantor_email} />
            {otherParty.guarantor_id_url && (
              <div>
                <p className="text-gray-500 mb-1">ID Image</p>
                <img
                  src={otherParty.guarantor_id_url}
                  alt="Guarantor ID"
                  className="rounded-lg border w-full max-h-48 object-cover cursor-pointer hover:opacity-90"
                  onClick={() => setLightboxSrc(otherParty.guarantor_id_url)}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">This party hasn't added guarantor details yet.</p>
        )}
      </div>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-ink text-right">{value || '—'}</span>
    </div>
  )
}

// ---------------- VISITS TAB ----------------
function VisitsTab({ property, otherParty, profile }) {
  const [visits, setVisits] = useState([])
  const isLandlord = profile.role === 'landlord'

  const fetchVisits = useCallback(async () => {
    const { data } = await supabase
      .from('visit_requests')
      .select('*')
      .eq('property_id', property.id)
      .order('created_at', { ascending: false })
    setVisits(data || [])
  }, [property.id])

  useEffect(() => {
    fetchVisits()
    const interval = setInterval(fetchVisits, 5000)
    return () => clearInterval(interval)
  }, [fetchVisits])

  const updateStatus = async (id, status) => {
    await supabase.from('visit_requests').update({ status }).eq('id', id)
    fetchVisits()
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      {visits.length === 0 && <p className="text-sm text-gray-400 text-center mt-6">No visit requests yet.</p>}
      {visits.map((v) => (
        <div key={v.id} className="card p-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-semibold text-ink">{v.requested_date}</p>
              {v.message && <p className="text-xs text-gray-500 mt-0.5">{v.message}</p>}
            </div>
            <StatusBadge status={v.status} />
          </div>
          {isLandlord && v.status === VISIT_STATUS.PENDING && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => updateStatus(v.id, VISIT_STATUS.APPROVED)} className="btn-primary text-xs px-3 py-1.5 flex-1">Approve</button>
              <button onClick={() => updateStatus(v.id, VISIT_STATUS.REJECTED)} className="btn-outline text-xs px-3 py-1.5 flex-1">Reject</button>
            </div>
          )}
          {isLandlord && v.status === VISIT_STATUS.APPROVED && (
            <button onClick={() => updateStatus(v.id, VISIT_STATUS.COMPLETED)} className="btn-accent text-xs px-3 py-1.5 mt-3 w-full">Mark Completed</button>
          )}
          {!isLandlord && v.status === VISIT_STATUS.COMPLETED && (
            <ReviewPrompt property={property} landlordId={otherParty.id} studentId={profile.id} />
          )}
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    rejected: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700'
  }
  return <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
}

function ReviewPrompt({ property, landlordId, studentId }) {
  const [existing, setExisting] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    supabase.from('reviews').select('*').eq('property_id', property.id).eq('student_id', studentId).maybeSingle()
      .then(({ data }) => setExisting(data))
  }, [property.id, studentId])

  if (existing || submitted) {
    return <p className="text-xs text-green-600 mt-2 flex items-center gap-1"><CheckCircle2 size={14} /> Review submitted. Thank you!</p>
  }

  const submit = async () => {
    setSaving(true)
    await supabase.from('reviews').insert({
      property_id: property.id,
      landlord_id: landlordId,
      student_id: studentId,
      rating,
      comment
    })
    setSaving(false)
    setSubmitted(true)
  }

  return (
    <div className="mt-3 border-t pt-3">
      <p className="text-xs font-semibold text-ink mb-1">Leave a review</p>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)}>
            <Star size={18} className={n <= rating ? 'fill-accent text-accent' : 'text-gray-300'} />
          </button>
        ))}
      </div>
      <textarea rows={2} className="input-field" placeholder="How was your visit?" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button onClick={submit} disabled={saving} className="btn-accent text-xs px-3 py-1.5 mt-2">Submit Review</button>
    </div>
  )
}

// ---------------- TRACK STAGE TAB ----------------
function StageTab({ property, otherParty, profile }) {
  const [agreements, setAgreements] = useState([])

  const fetchAgreements = useCallback(async () => {
    const { data } = await supabase
      .from('negotiation_agreements')
      .select('*')
      .eq('property_id', property.id)
    setAgreements(data || [])
  }, [property.id])

  useEffect(() => {
    fetchAgreements()
    const interval = setInterval(fetchAgreements, 4000)
    return () => clearInterval(interval)
  }, [fetchAgreements])

  const confirmStage = async (stageKey) => {
    const existing = agreements.find((a) => a.stage === stageKey)
    if (existing) {
      const already = existing[`confirmed_by_${profile.role === 'landlord' ? 'landlord' : 'student'}`]
      if (already) return
      await supabase.from('negotiation_agreements')
        .update({ [`confirmed_by_${profile.role === 'landlord' ? 'landlord' : 'student'}`]: true, [`confirmed_at_${profile.role === 'landlord' ? 'landlord' : 'student'}`]: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabase.from('negotiation_agreements').insert({
        property_id: property.id,
        stage: stageKey,
        [`confirmed_by_${profile.role === 'landlord' ? 'landlord' : 'student'}`]: true,
        [`confirmed_at_${profile.role === 'landlord' ? 'landlord' : 'student'}`]: new Date().toISOString()
      })
    }
    await fetchAgreements()
    await maybeUpdatePropertyVisibility(stageKey, agreements, property.id)
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <p className="text-xs text-gray-500 bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
        Both parties must confirm a stage for it to count. Confirmed stages create a timestamped record.
      </p>
      {NEGOTIATION_STAGES.map((stage) => {
        const record = agreements.find((a) => a.stage === stage.key)
        const landlordConfirmed = record?.confirmed_by_landlord
        const studentConfirmed = record?.confirmed_by_student
        const bothConfirmed = landlordConfirmed && studentConfirmed
        const myConfirmed = profile.role === 'landlord' ? landlordConfirmed : studentConfirmed

        return (
          <div key={stage.key} className={`card p-3 ${bothConfirmed ? 'border-green-300 bg-green-50/40' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {bothConfirmed ? <CheckCircle2 size={18} className="text-green-600" /> : <Clock size={18} className="text-gray-300" />}
                <span className="font-medium text-sm text-ink">Stage {stage.order}: {stage.label}</span>
              </div>
              {!bothConfirmed && (
                <button
                  onClick={() => confirmStage(stage.key)}
                  disabled={myConfirmed}
                  className="text-xs btn-outline px-3 py-1"
                >
                  {myConfirmed ? 'Waiting for other party' : 'Confirm'}
                </button>
              )}
            </div>
            {bothConfirmed && (
              <p className="text-xs text-green-700 mt-1 ml-6">
                Confirmed by both parties
                {record?.confirmed_at_landlord ? ` · Landlord ${new Date(record.confirmed_at_landlord).toLocaleDateString()}` : ''}
                {record?.confirmed_at_student ? ` · Student ${new Date(record.confirmed_at_student).toLocaleDateString()}` : ''}
              </p>
            )}
            {!bothConfirmed && (landlordConfirmed || studentConfirmed) && (
              <p className="text-xs text-amber-600 mt-1 ml-6">
                {landlordConfirmed ? 'Landlord confirmed — ' : ''}{studentConfirmed ? 'Student confirmed — ' : ''}waiting for the other party
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Stage 4 — property visibility tied to negotiation stage.
// Auto-hides at Price Agreed / Deposit Paid / Moved In; re-lists automatically
// once BOTH parties confirm Vacated. Landlord can still manually re-list.
async function maybeUpdatePropertyVisibility(stageKey, agreementsBeforeUpdate, propertyId) {
  const { data: agreements } = await supabase
    .from('negotiation_agreements')
    .select('*')
    .eq('property_id', propertyId)

  const record = agreements.find((a) => a.stage === stageKey)
  const bothConfirmed = record?.confirmed_by_landlord && record?.confirmed_by_student
  if (!bothConfirmed) return

  if (HIDDEN_AT_STAGES.includes(stageKey)) {
    await supabase.from('properties').update({ is_active: false, negotiation_status: stageKey }).eq('id', propertyId)
  } else if (stageKey === 'vacated') {
    await supabase.from('properties').update({ is_active: true, negotiation_status: 'available' }).eq('id', propertyId)
  } else {
    await supabase.from('properties').update({ negotiation_status: stageKey }).eq('id', propertyId)
  }
}
