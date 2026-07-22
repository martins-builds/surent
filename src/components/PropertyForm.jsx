import { useState } from 'react'
import { X, Upload, Loader2, Trash2 } from 'lucide-react'
import { supabase, uploadFile, makeStoragePath } from '../lib/supabase.js'
import { PROPERTY_TYPES } from '../lib/constants.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function PropertyForm({ property, onClose, onSaved }) {
  const { profile } = useAuth()
  const isEdit = Boolean(property)

  const [title, setTitle] = useState(property?.title || '')
  const [propertyType, setPropertyType] = useState(property?.property_type || PROPERTY_TYPES[0])
  const [otherType, setOtherType] = useState(property?.other_type || '')
  const [description, setDescription] = useState(property?.description || '')
  const [location, setLocation] = useState(property?.location || '')
  const [price, setPrice] = useState(property?.price || '')
  const [isNegotiable, setIsNegotiable] = useState(property?.is_negotiable ?? true)
  const [electricitySupply, setElectricitySupply] = useState(property?.electricity_supply || 'Public (PHCN)')
  const [waterSupply, setWaterSupply] = useState(property?.water_supply || 'Borehole')
  const [vacantRooms, setVacantRooms] = useState(property?.vacant_rooms ?? 1)
  const [tenantsPerRoom, setTenantsPerRoom] = useState(property?.tenants_per_room ?? 1)
  const [roomDescription, setRoomDescription] = useState(property?.room_description || '')

  const [houseImages, setHouseImages] = useState([])
  const [roomImages, setRoomImages] = useState([])
  const [videos, setVideos] = useState([])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const uploadMany = async (bucket, files) => {
    const urls = []
    for (const file of files) {
      const path = makeStoragePath(profile.id, file.name)
      const url = await uploadFile(bucket, path, file)
      urls.push(url)
    }
    return urls
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const newHouseUrls = await uploadMany('property-images', houseImages)
      const newRoomUrls = await uploadMany('property-images', roomImages)
      const newVideoUrls = await uploadMany('property-videos', videos)

      const payload = {
        landlord_id: profile.id,
        title,
        property_type: propertyType,
        other_type: propertyType === 'Others' ? otherType : null,
        description,
        location,
        price: Number(price),
        is_negotiable: isNegotiable,
        electricity_supply: electricitySupply,
        water_supply: waterSupply,
        vacant_rooms: Number(vacantRooms),
        tenants_per_room: Number(tenantsPerRoom),
        room_description: roomDescription,
        house_images: [...(property?.house_images || []), ...newHouseUrls],
        room_images: [...(property?.room_images || []), ...newRoomUrls],
        videos: [...(property?.videos || []), ...newVideoUrls]
      }

      if (isEdit) {
        const { error: updateError } = await supabase.from('properties').update(payload).eq('id', property.id)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('properties').insert({
          ...payload,
          is_active: true,
          negotiation_status: 'available'
        })
        if (insertError) throw insertError
      }

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-display font-bold text-lg text-primary">{isEdit ? 'Edit Listing' : 'Add New Listing'}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="text-sm font-medium text-ink">Title</label>
            <input required className="input-field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink">Property Type</label>
              <select className="input-field mt-1" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-ink">Price (₦ / year)</label>
              <input type="number" required className="input-field mt-1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          {propertyType === 'Others' && (
            <input required placeholder="Describe property type" className="input-field" value={otherType} onChange={(e) => setOtherType(e.target.value)} />
          )}

          <div>
            <label className="text-sm font-medium text-ink">Location</label>
            <input required className="input-field mt-1" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium text-ink">Description</label>
            <textarea required rows={3} className="input-field mt-1" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isNegotiable} onChange={(e) => setIsNegotiable(e.target.checked)} />
            Price is negotiable
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink">Electricity Supply</label>
              <select className="input-field mt-1" value={electricitySupply} onChange={(e) => setElectricitySupply(e.target.value)}>
                <option>Public (PHCN)</option>
                <option>Generator</option>
                <option>Solar</option>
                <option>Public + Generator Backup</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-ink">Water Supply</label>
              <select className="input-field mt-1" value={waterSupply} onChange={(e) => setWaterSupply(e.target.value)}>
                <option>Borehole</option>
                <option>Public Water Corporation</option>
                <option>Well</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-ink">Vacant Rooms</label>
              <input type="number" min={0} className="input-field mt-1" value={vacantRooms} onChange={(e) => setVacantRooms(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink">Tenants per Room</label>
              <input type="number" min={1} className="input-field mt-1" value={tenantsPerRoom} onChange={(e) => setTenantsPerRoom(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-ink">Room Description</label>
            <textarea rows={2} className="input-field mt-1" value={roomDescription} onChange={(e) => setRoomDescription(e.target.value)} />
          </div>

          <MultiFileRow label="House Images" onChange={setHouseImages} accept="image/*" />
          <MultiFileRow label="Room Images" onChange={setRoomImages} accept="image/*" />
          <MultiFileRow label="Videos" onChange={setVideos} accept="video/*" />

          {isEdit && (property?.house_images?.length || property?.room_images?.length || property?.videos?.length) ? (
            <p className="text-xs text-gray-400">Existing media will be kept; new uploads are appended.</p>
          ) : null}

          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            {saving && <Loader2 className="animate-spin" size={16} />}
            {isEdit ? 'Save Changes' : 'Publish Listing'}
          </button>
        </form>
      </div>
    </div>
  )
}

function MultiFileRow({ label, onChange, accept }) {
  const [count, setCount] = useState(0)
  return (
    <div>
      <label className="text-sm font-medium text-ink">{label}</label>
      <label className="mt-1 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-pointer hover:border-primary hover:text-primary transition">
        <Upload size={16} />
        {count > 0 ? `${count} file(s) selected` : 'Choose files'}
        <input type="file" accept={accept} multiple className="hidden" onChange={(e) => {
          const files = Array.from(e.target.files || [])
          setCount(files.length)
          onChange(files)
        }} />
      </label>
    </div>
  )
}

export function DeleteMediaButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="text-red-500 hover:text-red-700">
      <Trash2 size={14} />
    </button>
  )
}
