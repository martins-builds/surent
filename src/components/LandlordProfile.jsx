import { useEffect, useState } from 'react'
import { X, Star, ShieldCheck, Phone, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import ImageLightbox from './ImageLightbox.jsx'

export default function LandlordProfile({ landlordId, onClose }) {
  const [landlord, setLandlord] = useState(null)
  const [reviews, setReviews] = useState([])
  const [lightboxSrc, setLightboxSrc] = useState(null)

  useEffect(() => {
    supabase.from('profiles').select('*').eq('id', landlordId).single().then(({ data }) => setLandlord(data))
    supabase.from('reviews').select('*').eq('landlord_id', landlordId).order('created_at', { ascending: false }).then(({ data }) => setReviews(data || []))
  }, [landlordId])

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  if (!landlord) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-display font-bold text-lg text-primary">Landlord Profile</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-4">
            <img
              src={landlord.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(landlord.full_name)}`}
              alt={landlord.full_name}
              className="w-16 h-16 rounded-full object-cover border cursor-pointer"
              onClick={() => landlord.avatar_url && setLightboxSrc(landlord.avatar_url)}
            />
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-display font-bold text-lg text-ink">{landlord.full_name}</p>
                {landlord.is_verified && <ShieldCheck size={18} className="text-green-600" />}
              </div>
              {avgRating && (
                <div className="flex items-center gap-1 text-sm text-amber-600">
                  <Star size={14} className="fill-amber-500 text-amber-500" /> {avgRating} ({reviews.length} reviews)
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /> {landlord.phone}</div>
            {landlord.property_areas && <div className="flex items-center gap-2 text-gray-600"><MapPin size={14} /> {landlord.property_areas}</div>}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-ink mb-2">Guarantor Details</p>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">Name:</span> {landlord.guarantor_name || '—'}</p>
              <p><span className="text-gray-500">Phone:</span> {landlord.guarantor_phone || '—'}</p>
            </div>
            {landlord.guarantor_id_url && (
              <img
                src={landlord.guarantor_id_url}
                alt="Guarantor ID"
                className="mt-2 rounded-lg border w-full max-h-40 object-cover cursor-pointer hover:opacity-90"
                onClick={() => setLightboxSrc(landlord.guarantor_id_url)}
              />
            )}
          </div>

          {landlord.id_image_url && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-ink mb-2">Submitted ID Image</p>
              <img
                src={landlord.id_image_url}
                alt="Landlord ID"
                className="rounded-lg border w-full max-h-48 object-cover cursor-pointer hover:opacity-90"
                onClick={() => setLightboxSrc(landlord.id_image_url)}
              />
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-ink mb-2">Reviews</p>
            {reviews.length === 0 && <p className="text-sm text-gray-400">No reviews yet.</p>}
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex gap-0.5 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={13} className={n <= r.rating ? 'fill-accent text-accent' : 'text-gray-300'} />
                    ))}
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
