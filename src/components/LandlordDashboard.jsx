import { useEffect, useState, useCallback, useRef } from 'react'
import { ShieldCheck, Plus, Eye, EyeOff, Pencil, Trash2, MessageCircle, User, LogOut, Star, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import PropertyForm from './PropertyForm.jsx'
import ChatModal from './ChatModal.jsx'
import EditProfileModal from './EditProfileModal.jsx'

export default function LandlordDashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('properties')
  const [properties, setProperties] = useState([])
  const [reviews, setReviews] = useState([])
  const [unreadMap, setUnreadMap] = useState({})
  const [chatMap, setChatMap] = useState({}) // property_id -> student profile most recently messaging

  const [showForm, setShowForm] = useState(false)
  const [editingProperty, setEditingProperty] = useState(null)
  const [chatTarget, setChatTarget] = useState(null) // { property, student }
  const [showEditProfile, setShowEditProfile] = useState(false)

  const lastMsgCountRef = useRef({})

  const fetchProperties = useCallback(async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('landlord_id', profile.id)
      .order('created_at', { ascending: false })
    setProperties(data || [])
  }, [profile.id])

  const fetchReviews = useCallback(async () => {
    const { data } = await supabase.from('reviews').select('*').eq('landlord_id', profile.id).order('created_at', { ascending: false })
    setReviews(data || [])
  }, [profile.id])

  const fetchMessagesInfo = useCallback(async () => {
    const { data } = await supabase.from('messages').select('*').eq('receiver_id', profile.id)
    if (!data) return
    const unread = {}
    const senders = {}
    for (const m of data) {
      if (!m.read) unread[m.property_id] = (unread[m.property_id] || 0) + 1
      senders[m.property_id] = m.sender_id // last known sender for that property thread
    }
    for (const [propId, count] of Object.entries(unread)) {
      const prev = lastMsgCountRef.current[propId] || 0
      if (count > prev && Notification?.permission === 'granted') {
        new Notification('New message on SURent', { body: 'A student sent you a message.' })
      }
    }
    lastMsgCountRef.current = unread
    setUnreadMap(unread)

    const studentIds = [...new Set(Object.values(senders))]
    if (studentIds.length) {
      const { data: students } = await supabase.from('profiles').select('*').in('id', studentIds)
      const map = {}
      for (const [propId, sid] of Object.entries(senders)) {
        map[propId] = students?.find((s) => s.id === sid)
      }
      setChatMap(map)
    }
  }, [profile.id])

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    fetchProperties()
    fetchReviews()
    fetchMessagesInfo()
    const propInterval = setInterval(fetchProperties, 5000)
    const msgInterval = setInterval(fetchMessagesInfo, 3000)
    return () => {
      clearInterval(propInterval)
      clearInterval(msgInterval)
    }
  }, [fetchProperties, fetchReviews, fetchMessagesInfo])

  const toggleVisibility = async (p) => {
    await supabase.from('properties').update({ is_active: !p.is_active }).eq('id', p.id)
    fetchProperties()
  }

  const deleteProperty = async (id) => {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    await supabase.from('properties').delete().eq('id', id)
    fetchProperties()
  }

  const markRoomsTaken = async (p) => {
    await supabase.from('properties').update({ vacant_rooms: 0 }).eq('id', p.id)
    fetchProperties()
  }

  const openChat = (property) => {
    const student = chatMap[property.id]
    if (!student) {
      alert('No student has messaged you about this listing yet.')
      return
    }
    setChatTarget({ property, student })
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <ShieldCheck className="text-white" size={18} />
            </div>
            <span className="font-display font-bold text-lg text-primary">SURent</span>
            <span className={`badge ml-2 ${profile.is_verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {profile.is_verified ? 'Verified' : 'Pending Verification'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEditProfile(true)} className="flex items-center gap-1.5 text-sm text-primary px-3 py-1.5 rounded-lg hover:bg-primary/10">
              <User size={16} /> {profile.full_name?.split(' ')[0]}
            </button>
            <button onClick={signOut} className="text-gray-400 hover:text-red-500 p-1.5"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex gap-2 mb-5">
          <TabBtn active={tab === 'properties'} onClick={() => setTab('properties')}>Properties</TabBtn>
          <TabBtn active={tab === 'reviews'} onClick={() => setTab('reviews')}>Reviews</TabBtn>
        </div>

        {tab === 'properties' && (
          <>
            <button onClick={() => { setEditingProperty(null); setShowForm(true) }} className="btn-accent flex items-center gap-2 mb-5">
              <Plus size={16} /> Add New Listing
            </button>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((p) => (
                <div key={p.id} className="card overflow-hidden">
                  <div className="h-36 bg-gray-100 relative">
                    {p.house_images?.[0] ? <img src={p.house_images[0]} className="w-full h-full object-cover" alt="" /> : null}
                    <span className={`absolute top-2 right-2 badge ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                      {p.is_active ? 'Visible' : 'Hidden'}
                    </span>
                    {p.negotiation_status && p.negotiation_status !== 'available' && (
                      <span className="absolute top-2 left-2 badge bg-accent text-white capitalize">{p.negotiation_status.replace('_', ' ')}</span>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="font-semibold text-sm text-ink">{p.title}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> {p.location}</p>
                    <p className="text-accent font-bold text-sm">₦{Number(p.price).toLocaleString()}/yr</p>
                    <p className="text-xs text-gray-400">{p.vacant_rooms} vacant room(s)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setEditingProperty(p); setShowForm(true) }} className="btn-outline text-xs px-2 py-1.5 flex items-center justify-center gap-1"><Pencil size={13} /> Edit</button>
                      <button onClick={() => toggleVisibility(p)} className="btn-outline text-xs px-2 py-1.5 flex items-center justify-center gap-1">
                        {p.is_active ? <EyeOff size={13} /> : <Eye size={13} />} {p.is_active ? 'Hide' : 'Show'}
                      </button>
                      <button onClick={() => markRoomsTaken(p)} className="btn-outline text-xs px-2 py-1.5">Mark Rooms Taken</button>
                      <button onClick={() => deleteProperty(p.id)} className="btn-outline text-xs px-2 py-1.5 flex items-center justify-center gap-1 text-red-500 border-red-200 hover:bg-red-50"><Trash2 size={13} /> Delete</button>
                    </div>
                    <button onClick={() => openChat(p)} className="btn-primary text-sm w-full relative flex items-center justify-center gap-2 mt-1">
                      <MessageCircle size={15} /> Chat
                      {unreadMap[p.id] > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{unreadMap[p.id]}</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {properties.length === 0 && <p className="text-gray-400 text-sm col-span-full text-center py-12">You haven't listed any properties yet.</p>}
            </div>
          </>
        )}

        {tab === 'reviews' && (
          <div className="space-y-3 max-w-xl">
            {reviews.length === 0 && <p className="text-gray-400 text-sm">No reviews yet.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="card p-3">
                <div className="flex gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} className={n <= r.rating ? 'fill-accent text-accent' : 'text-gray-300'} />)}
                </div>
                {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <PropertyForm
          property={editingProperty}
          onClose={() => setShowForm(false)}
          onSaved={fetchProperties}
        />
      )}

      {chatTarget && (
        <ChatModal property={chatTarget.property} otherParty={chatTarget.student} onClose={() => setChatTarget(null)} />
      )}

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${active ? 'bg-primary text-white' : 'bg-white text-gray-600 border'}`}>
      {children}
    </button>
  )
}
