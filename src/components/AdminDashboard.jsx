import { useEffect, useState, useCallback } from 'react'
import { ShieldCheck, LogOut, Users, Home, Star, AlertTriangle, CheckCircle2, XCircle, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import ImageLightbox from './ImageLightbox.jsx'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [tab, setTab] = useState('stats')

  const [students, setStudents] = useState([])
  const [landlords, setLandlords] = useState([])
  const [properties, setProperties] = useState([])
  const [reviews, setReviews] = useState([])

  const [detailUser, setDetailUser] = useState(null)
  const [detailProperty, setDetailProperty] = useState(null)
  const [detailReview, setDetailReview] = useState(null)

  const fetchAll = useCallback(async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setStudents((profiles || []).filter((p) => p.role === 'student'))
    setLandlords((profiles || []).filter((p) => p.role === 'landlord'))
    const { data: props } = await supabase.from('properties').select('*').order('created_at', { ascending: false })
    setProperties(props || [])
    const { data: revs } = await supabase.from('reviews').select('*').order('created_at', { ascending: false })
    setReviews(revs || [])
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 6000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const pendingVerification = landlords.filter((l) => !l.is_verified && l.id_image_url)

  const toggleVerify = async (landlord) => {
    await supabase.from('profiles').update({ is_verified: !landlord.is_verified }).eq('id', landlord.id)
    fetchAll()
  }

  const deleteUser = async (user) => {
    if (!confirm(`Delete ${user.full_name}? This cannot be undone.`)) return
    await supabase.from('profiles').delete().eq('id', user.id)
    fetchAll()
  }

  const togglePropertyVisibility = async (p) => {
    await supabase.from('properties').update({ is_active: !p.is_active }).eq('id', p.id)
    fetchAll()
  }

  const deleteProperty = async (id) => {
    if (!confirm('Delete this listing?')) return
    await supabase.from('properties').delete().eq('id', id)
    fetchAll()
  }

  const deleteReview = async (id) => {
    if (!confirm('Delete this review?')) return
    await supabase.from('reviews').delete().eq('id', id)
    fetchAll()
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><ShieldCheck className="text-white" size={18} /></div>
            <span className="font-display font-bold text-lg text-primary">SURent Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{profile.full_name}</span>
            <button onClick={signOut} className="text-gray-400 hover:text-red-500 p-1.5"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-5">
        {pendingVerification.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-5 flex items-center gap-2 text-sm">
            <AlertTriangle size={18} />
            {pendingVerification.length} landlord(s) waiting for verification.
          </div>
        )}

        <div className="flex gap-2 mb-5 flex-wrap">
          <TabBtn active={tab === 'stats'} onClick={() => setTab('stats')}>Stats</TabBtn>
          <TabBtn active={tab === 'users'} onClick={() => setTab('users')}>Users</TabBtn>
          <TabBtn active={tab === 'properties'} onClick={() => setTab('properties')}>Properties</TabBtn>
          <TabBtn active={tab === 'reviews'} onClick={() => setTab('reviews')}>Reviews</TabBtn>
        </div>

        {tab === 'stats' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Users size={20} />} label="Students" value={students.length} />
            <StatCard icon={<Users size={20} />} label="Landlords" value={landlords.length} />
            <StatCard icon={<Home size={20} />} label="Properties" value={properties.length} />
            <StatCard icon={<Star size={20} />} label="Reviews" value={reviews.length} />
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-display font-bold text-primary mb-2">Landlords</h3>
              <div className="space-y-2">
                {landlords.map((l) => (
                  <div key={l.id} className="card p-3 flex items-center justify-between gap-3">
                    <button onClick={() => setDetailUser(l)} className="flex items-center gap-3 text-left flex-1">
                      <img src={l.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(l.full_name)}`} className="w-9 h-9 rounded-full object-cover border" alt="" />
                      <div>
                        <p className="text-sm font-medium text-ink flex items-center gap-1">{l.full_name} {l.is_verified && <ShieldCheck size={13} className="text-green-600" />}</p>
                        <p className="text-xs text-gray-400">{l.phone} · Guarantor: {l.guarantor_name || 'none'}</p>
                      </div>
                    </button>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => toggleVerify(l)} className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 ${l.is_verified ? 'bg-gray-100 text-gray-600' : 'bg-green-600 text-white'}`}>
                        {l.is_verified ? <XCircle size={13} /> : <CheckCircle2 size={13} />} {l.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                      <button onClick={() => deleteUser(l)} className="text-xs px-2.5 py-1.5 rounded-lg text-red-500 border border-red-200 hover:bg-red-50"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-display font-bold text-primary mb-2">Students</h3>
              <div className="space-y-2">
                {students.map((s) => (
                  <div key={s.id} className="card p-3 flex items-center justify-between gap-3">
                    <button onClick={() => setDetailUser(s)} className="flex items-center gap-3 text-left flex-1">
                      <img src={s.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.full_name)}`} className="w-9 h-9 rounded-full object-cover border" alt="" />
                      <div>
                        <p className="text-sm font-medium text-ink">{s.full_name}</p>
                        <p className="text-xs text-gray-400">{s.university} · Guarantor: {s.guarantor_name || 'none'}</p>
                      </div>
                    </button>
                    <button onClick={() => deleteUser(s)} className="text-xs px-2.5 py-1.5 rounded-lg text-red-500 border border-red-200 hover:bg-red-50"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'properties' && (
          <div className="space-y-2">
            {properties.map((p) => (
              <div key={p.id} className="card p-3 flex items-center justify-between gap-3">
                <button onClick={() => setDetailProperty(p)} className="flex items-center gap-3 text-left flex-1">
                  {p.house_images?.[0] && <img src={p.house_images[0]} className="w-12 h-10 rounded object-cover border" alt="" />}
                  <div>
                    <p className="text-sm font-medium text-ink">{p.title}</p>
                    <p className="text-xs text-gray-400">{p.location} · ₦{Number(p.price).toLocaleString()}/yr</p>
                  </div>
                </button>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => togglePropertyVisibility(p)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">{p.is_active ? 'Hide' : 'Show'}</button>
                  <button onClick={() => deleteProperty(p.id)} className="text-xs px-2.5 py-1.5 rounded-lg text-red-500 border border-red-200 hover:bg-red-50"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="card p-3 flex items-center justify-between gap-3">
                <button onClick={() => setDetailReview(r)} className="flex items-center gap-2 text-left flex-1">
                  <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={13} className={n <= r.rating ? 'fill-accent text-accent' : 'text-gray-300'} />)}</div>
                  <p className="text-sm text-gray-600 truncate">{r.comment || 'No comment'}</p>
                </button>
                <button onClick={() => deleteReview(r.id)} className="text-xs px-2.5 py-1.5 rounded-lg text-red-500 border border-red-200 hover:bg-red-50 shrink-0"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailUser && <UserDetailModal user={detailUser} onClose={() => setDetailUser(null)} />}
      {detailProperty && <PropertyDetailModal property={detailProperty} onClose={() => setDetailProperty(null)} />}
      {detailReview && <ReviewDetailModal review={detailReview} onClose={() => setDetailReview(null)} />}
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

function StatCard({ icon, label, value }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xl font-bold text-ink">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// Stage 6 — full detail views for admin
function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-display font-bold text-lg text-primary">{title}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">{children}</div>
      </div>
    </div>
  )
}

function UserDetailModal({ user, onClose }) {
  const [lightboxSrc, setLightboxSrc] = useState(null)
  return (
    <ModalShell title="User Detail" onClose={onClose}>
      <div className="flex items-center gap-3">
        <img
          src={user.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name)}`}
          className="w-14 h-14 rounded-full object-cover border cursor-pointer"
          alt=""
          onClick={() => user.avatar_url && setLightboxSrc(user.avatar_url)}
        />
        <div>
          <p className="font-semibold text-ink flex items-center gap-1">{user.full_name} {user.is_verified && <ShieldCheck size={14} className="text-green-600" />}</p>
          <p className="text-xs text-gray-400 capitalize">{user.role}</p>
        </div>
      </div>
      <Detail label="Phone" value={user.phone} />
      <Detail label="University" value={user.university} />
      {user.property_areas && <Detail label="Property Areas" value={user.property_areas} />}
      <Detail label="Guarantor Name" value={user.guarantor_name} />
      <Detail label="Guarantor Phone" value={user.guarantor_phone} />
      <Detail label="Guarantor Email" value={user.guarantor_email} />
      {user.id_image_url && (
        <div>
          <p className="text-gray-500 mb-1">Submitted ID</p>
          <img
            src={user.id_image_url}
            className="rounded-lg border w-full max-h-56 object-cover cursor-zoom-in hover:opacity-90"
            alt="ID"
            onClick={() => setLightboxSrc(user.id_image_url)}
          />
        </div>
      )}
      {user.guarantor_id_url && (
        <div>
          <p className="text-gray-500 mb-1">Guarantor ID</p>
          <img
            src={user.guarantor_id_url}
            className="rounded-lg border w-full max-h-56 object-cover cursor-zoom-in hover:opacity-90"
            alt="Guarantor ID"
            onClick={() => setLightboxSrc(user.guarantor_id_url)}
          />
        </div>
      )}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </ModalShell>
  )
}

function PropertyDetailModal({ property, onClose }) {
  const images = [...(property.house_images || []), ...(property.room_images || [])]
  const [lightboxSrc, setLightboxSrc] = useState(null)
  return (
    <ModalShell title="Property Detail" onClose={onClose}>
      <p className="font-semibold text-ink">{property.title}</p>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              className="rounded-lg h-20 w-full object-cover cursor-zoom-in hover:opacity-90"
              alt=""
              onClick={() => setLightboxSrc(img)}
            />
          ))}
        </div>
      )}
      <Detail label="Location" value={property.location} />
      <Detail label="Price" value={`₦${Number(property.price).toLocaleString()}/yr`} />
      <Detail label="Type" value={property.property_type === 'Others' ? property.other_type : property.property_type} />
      <Detail label="Status" value={property.is_active ? 'Visible' : 'Hidden'} />
      <Detail label="Negotiation Stage" value={property.negotiation_status} />
      <Detail label="Description" value={property.description} />
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </ModalShell>
  )
}

function ReviewDetailModal({ review, onClose }) {
  return (
    <ModalShell title="Review Detail" onClose={onClose}>
      <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((n) => <Star key={n} size={16} className={n <= review.rating ? 'fill-accent text-accent' : 'text-gray-300'} />)}</div>
      <p className="text-gray-700">{review.comment || 'No written comment.'}</p>
      <Detail label="Submitted" value={new Date(review.created_at).toLocaleString()} />
    </ModalShell>
  )
}

function Detail({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-gray-500 text-xs">{label}</p>
      <p className="text-ink">{value}</p>
    </div>
  )
}
