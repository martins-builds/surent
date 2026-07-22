import { useState } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { supabase, uploadFile, makeStoragePath } from '../lib/supabase.js'
import { NIGERIAN_UNIVERSITIES } from '../lib/constants.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function EditProfileModal({ onClose }) {
  const { profile, refreshProfile } = useAuth()
  const isLandlord = profile.role === 'landlord'

  const [fullName, setFullName] = useState(profile.full_name || '')
  const [university, setUniversity] = useState(profile.university || '')
  const [propertyAreas, setPropertyAreas] = useState(profile.property_areas || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [guarantorName, setGuarantorName] = useState(profile.guarantor_name || '')
  const [guarantorPhone, setGuarantorPhone] = useState(profile.guarantor_phone || '')
  const [guarantorEmail, setGuarantorEmail] = useState(profile.guarantor_email || '')

  const [avatarFile, setAvatarFile] = useState(null)
  const [idFile, setIdFile] = useState(null)
  const [guarantorIdFile, setGuarantorIdFile] = useState(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const updates = {
        full_name: fullName,
        university,
        property_areas: isLandlord ? propertyAreas : null,
        phone,
        guarantor_name: guarantorName,
        guarantor_phone: guarantorPhone,
        guarantor_email: guarantorEmail
      }

      if (avatarFile) {
        const path = makeStoragePath(profile.id, avatarFile.name)
        updates.avatar_url = await uploadFile('avatars', path, avatarFile)
      }
      if (idFile) {
        const path = makeStoragePath(profile.id, idFile.name)
        updates.id_image_url = await uploadFile('avatars', path, idFile)
      }
      if (guarantorIdFile) {
        const path = makeStoragePath(profile.id, guarantorIdFile.name)
        updates.guarantor_id_url = await uploadFile('avatars', path, guarantorIdFile)
      }

      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', profile.id)
      if (updateError) throw updateError

      await refreshProfile()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-display font-bold text-lg text-primary">Edit Profile</h3>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div>
            <label className="text-sm font-medium text-ink">Full Name</label>
            <input className="input-field mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">University</label>
            <select className="input-field mt-1" value={university} onChange={(e) => setUniversity(e.target.value)}>
              {NIGERIAN_UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {isLandlord && (
            <div>
              <label className="text-sm font-medium text-ink">Property Areas</label>
              <input className="input-field mt-1" value={propertyAreas} onChange={(e) => setPropertyAreas(e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-ink">Phone</label>
            <input className="input-field mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <FileRow label={isLandlord ? 'Update ID Image' : 'Update Profile Picture'} onChange={isLandlord ? setIdFile : setAvatarFile} />

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-ink mb-2">Guarantor Details</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-ink">Name</label>
                <input className="input-field mt-1" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink">Phone</label>
                <input className="input-field mt-1" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-ink">Email {isLandlord && '(compulsory)'}</label>
                <input type="email" required={isLandlord} className="input-field mt-1" value={guarantorEmail} onChange={(e) => setGuarantorEmail(e.target.value)} />
              </div>
              <FileRow label="Update Guarantor ID" onChange={setGuarantorIdFile} />
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            {saving && <Loader2 className="animate-spin" size={16} />}
            Save Changes
          </button>
        </form>
      </div>
    </div>
  )
}

function FileRow({ label, onChange }) {
  const [fileName, setFileName] = useState('')
  return (
    <div>
      <label className="text-sm font-medium text-ink">{label}</label>
      <label className="mt-1 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-pointer hover:border-primary hover:text-primary transition">
        <Upload size={16} />
        {fileName || 'Choose file'}
        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
          const f = e.target.files?.[0] || null
          setFileName(f?.name || '')
          onChange(f)
        }} />
      </label>
    </div>
  )
}
