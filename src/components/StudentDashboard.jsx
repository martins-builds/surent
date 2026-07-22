import { useEffect, useState, useCallback, useRef } from 'react'
import { ShieldCheck, Search, MapPin, Zap, Droplet, Home, MessageCircle, User, LogOut, Star, X, CreditCard } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import ChatModal from './ChatModal.jsx'
import LandlordProfile from './LandlordProfile.jsx'
import GuarantorModal from './GuarantorModal.jsx'
import EditProfileModal from './EditProfileModal.jsx'
import ImageLightbox from './ImageLightbox.jsx'

export default function StudentDashboard() {
  const { profile, signOut } = useAuth()
  const [properties, setProperties] = useState([])
  const [unreadMap, setUnreadMap] = useState({})
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  const [selectedProperty, setSelectedProperty] = useState(null)
  const [chatProperty, setChatProperty] = useState(null)
  const [chatLandlord, setChatLandlord] = useState(null)
  const [viewLandlordId, setViewLandlordId] = useState(null)
  const [showGuarantorModal, setShowGuarantorModal] = useState(false)
  const [pendingChatTarget, setPendingChatTarget] = useState(null)
  const [showEditProfile, setShowEditProfile] = useState(false)

  const lastMsgCountRef = useRef({})

  const fetchProperties = useCallback(async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*, landlord:profiles!properties_landlord_id_fkey(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (!error) setProperties(data || [])
  }, [])

  const fetchUnread = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', profile.id)
    if (!data) return
    const map = {}
    for (const m of data) {
      if (!m.read) map[m.property_id] = (map[m.property_id] || 0) + 1
    }
    // Browser notification when landlord replies with a new message
    for (const [propId, count] of Object.entries(map)) {
      const prev = lastMsgCountRef.current[propId] || 0
      if (count > prev && Notification?.permission === 'granted') {
        new Notification('New message on SURent', { body: 'A landlord replied to your chat.' })
      }
    }
    lastMsgCountRef.current = map
    setUnreadMap(map)
  }, [profile.id])

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    fetchProperties()
    fetchUnread()
    const propInterval = setInterval(fetchProperties, 5000) // properties refresh every 5s
    const msgInterval = setInterval(fetchUnread, 3000)
    return () => {
      clearInterval(propInterval)
      clearInterval(msgInterval)
    }
  }, [fetchProperties, fetchUnread])

  const filtered = properties.filter((p) => {
    const matchesSearch = !search || [p.title, p.location, p.description].some((f) => f?.toLowerCase().includes(search.toLowerCase()))
    const matchesLocation = !locationFilter || p.location?.toLowerCase().includes(locationFilter.toLowerCase())
    const matchesPrice = !maxPrice || p.price <= Number(maxPrice)
    const matchesVerified = !verifiedOnly || p.landlord?.is_verified
    return matchesSearch && matchesLocation && matchesPrice && matchesVerified
  })

  const openChat = (property) => {
    if (!profile.guarantor_name || !profile.guarantor_phone) {
      setPendingChatTarget(property)
      setShowGuarantorModal(true)
      return
    }
    setChatProperty(property)
    setChatLandlord(property.landlord)
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
        <div className="card p-4 mb-5 grid md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search by title, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <input className="input-field" placeholder="Filter by location" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
          <input type="number" className="input-field" placeholder="Max price (₦)" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          <label className="flex items-center gap-2 text-sm md:col-span-4">
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
            Verified landlords only
          </label>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              unreadCount={unreadMap[p.id] || 0}
              onOpen={() => setSelectedProperty(p)}
              onChat={() => openChat(p)}
              onLandlordClick={() => setViewLandlordId(p.landlord_id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-400 text-sm col-span-full text-center py-12">No listings match your filters right now.</p>
          )}
        </div>
      </div>

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onChat={() => { setSelectedProperty(null); openChat(selectedProperty) }}
          onLandlordClick={() => setViewLandlordId(selectedProperty.landlord_id)}
        />
      )}

      {chatProperty && chatLandlord && (
        <ChatModal property={chatProperty} otherParty={chatLandlord} onClose={() => { setChatProperty(null); setChatLandlord(null) }} />
      )}

      {viewLandlordId && <LandlordProfile landlordId={viewLandlordId} onClose={() => setViewLandlordId(null)} />}

      {showGuarantorModal && (
        <GuarantorModal
          onClose={() => setShowGuarantorModal(false)}
          onSaved={() => {
            if (pendingChatTarget) {
              setChatProperty(pendingChatTarget)
              setChatLandlord(pendingChatTarget.landlord)
              setPendingChatTarget(null)
            }
          }}
        />
      )}

      {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
    </div>
  )
}

function PropertyCard({ property, unreadCount, onOpen, onChat, onLandlordClick }) {
  const cover = property.house_images?.[0] || property.room_images?.[0]
  const [lightboxSrc, setLightboxSrc] = useState(null)
  return (
    <div className="card overflow-hidden flex flex-col">
      <button onClick={onOpen} className="block h-40 bg-gray-100 relative">
        {cover ? <img src={cover} alt={property.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Home size={32} /></div>}
        <span className="absolute top-2 left-2 badge bg-white/90 text-primary">{property.property_type === 'Others' ? property.other_type : property.property_type}</span>
        {property.negotiation_status && property.negotiation_status !== 'available' && (
          <span className="absolute top-2 right-2 badge bg-accent text-white capitalize">{property.negotiation_status.replace('_', ' ')}</span>
        )}
      </button>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <button onClick={onOpen} className="text-left">
          <p className="font-semibold text-ink text-sm">{property.title}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin size={12} /> {property.location}</p>
        </button>
        <p className="text-accent font-bold text-sm">₦{Number(property.price).toLocaleString()}/yr {property.is_negotiable && <span className="text-xs text-gray-400 font-normal">(negotiable)</span>}</p>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Zap size={12} /> {property.electricity_supply}</span>
          <span className="flex items-center gap-1"><Droplet size={12} /> {property.water_supply}</span>
        </div>
        <p className="text-xs text-gray-400">{property.vacant_rooms} room(s) vacant</p>

        <button onClick={onLandlordClick} className="flex items-center gap-2 mt-1 hover:bg-gray-50 rounded-lg p-1 -m-1">
          <img
            src={property.landlord?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(property.landlord?.full_name || 'L')}`}
            className="w-7 h-7 rounded-full object-cover border"
            alt="landlord"
          />
          <div className="text-left">
            <p className="text-xs font-medium text-ink flex items-center gap-1">
              {property.landlord?.full_name}
              {property.landlord?.is_verified && <ShieldCheck size={12} className="text-green-600" />}
            </p>
            <p className="text-[11px] text-gray-400">{property.landlord?.phone}</p>
          </div>
          {property.landlord?.id_image_url && (
            <img
              src={property.landlord.id_image_url}
              alt="Landlord ID"
              className="w-8 h-6 rounded object-cover border ml-auto cursor-zoom-in hover:opacity-80"
              title="Click to view verification ID"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxSrc(property.landlord.id_image_url)
              }}
            />
          )}
        </button>
        {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

        <button onClick={onChat} className="btn-primary text-sm mt-1 relative flex items-center justify-center gap-2">
          <MessageCircle size={15} /> Chat
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">{unreadCount}</span>
          )}
        </button>
      </div>
    </div>
  )
}

function PropertyDetailModal({ property, onClose, onChat, onLandlordClick }) {
  const [reviews, setReviews] = useState([])
  const [lightboxSrc, setLightboxSrc] = useState(null)

  useEffect(() => {
    supabase.from('reviews').select('*').eq('landlord_id', property.landlord_id).order('created_at', { ascending: false }).then(({ data }) => setReviews(data || []))
  }, [property.landlord_id])

  const images = [...(property.house_images || []), ...(property.room_images || [])]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-display font-bold text-lg text-primary">{property.title}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  className="rounded-lg h-24 w-full object-cover cursor-zoom-in hover:opacity-90"
                  alt=""
                  onClick={() => setLightboxSrc(img)}
                />
              ))}
            </div>
          )}
          {property.videos?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {property.videos.map((v, i) => <video key={i} src={v} controls className="rounded-lg w-full" />)}
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500"><MapPin size={14} /> {property.location}</div>
          <p className="text-accent font-bold text-lg">₦{Number(property.price).toLocaleString()}/yr</p>
          <p className="text-sm text-gray-700">{property.description}</p>
          {property.room_description && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{property.room_description}</p>}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2"><Zap size={14} className="text-primary" /> {property.electricity_supply}</div>
            <div className="flex items-center gap-2"><Droplet size={14} className="text-primary" /> {property.water_supply}</div>
            <div>{property.vacant_rooms} vacant room(s)</div>
            <div>{property.tenants_per_room} tenant(s) per room</div>
          </div>

          <button onClick={onLandlordClick} className="w-full flex items-center gap-3 border rounded-xl p-3 hover:bg-gray-50">
            <img
              src={property.landlord?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(property.landlord?.full_name || 'L')}`}
              className="w-10 h-10 rounded-full object-cover border"
              alt="landlord"
            />
            <div className="text-left flex-1">
              <p className="text-sm font-medium text-ink flex items-center gap-1">
                {property.landlord?.full_name}
                {property.landlord?.is_verified && <ShieldCheck size={14} className="text-green-600" />}
              </p>
              <p className="text-xs text-gray-400">{property.landlord?.phone}</p>
            </div>
            {property.landlord?.id_image_url && (
              <div className="flex items-center gap-1 text-xs text-gray-400"><CreditCard size={14} /> ID on file</div>
            )}
          </button>

          <button onClick={onChat} className="btn-primary w-full flex items-center justify-center gap-2"><MessageCircle size={16} /> Start Chat</button>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-ink mb-2">Reviews of this landlord</p>
            {reviews.length === 0 && <p className="text-sm text-gray-400">No reviews yet.</p>}
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} className={n <= r.rating ? 'fill-accent text-accent' : 'text-gray-300'} />)}
                  </div>
                  {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </div>
  )
}
