import { useState } from 'react'
import { X, Upload, ShieldAlert, Loader2 } from 'lucide-react'
import { supabase, uploadFile, makeStoragePath } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

// Shown when a student tries to open chat without a guarantor on file.
// Guarantor email becomes compulsory here even if it was optional at signup,
// since the read-only guarantor link (Stage 5) depends on it.
export default function GuarantorModal({ onClose, onSaved }) {
  const { profile, refreshProfile } = useAuth()

  const [guarantorName, setGuarantorName] = useState(profile.guarantor_name || '')
  const [guarantorPhone, setGuarantorPhone] = useState(profile.guarantor_phone || '')
  const [guarantorEmail, setGuarantorEmail] = useState(profile.guarantor_email || '')
  const [guarantorIdFile, setGuarantorIdFile] = useState(null)
  const [fileName, setFileName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const updates = {
        guarantor_name: guarantorName,
        guarantor_phone: guarantorPhone,
        guarantor_email: guarantorEmail
      }
      if (guarantorIdFile) {
        const path = makeStoragePath(profile.id, guarantorIdFile.name)
        updates.guarantor_id_url = await uploadFile('avatars', path, guarantorIdFile)
      }
      const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', profile.id)
      if (updateError) throw updateError
      await refreshProfile()
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
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2 text-primary">
            <ShieldAlert size={20} />
            <h3 className="font-display font-bold text-lg">Add a Guarantor First</h3>
          </div>
          <button onClick={onClose}><X size={20} className="text-gray-500" /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            SURent requires a guarantor on file before you can start a negotiation with a landlord.
            This protects both you and the landlord.
          </p>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-ink">Guarantor Name</label>
            <input required className="input-field mt-1" value={guarantorName} onChange={(e) => setGuarantorName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Guarantor Phone</label>
            <input required className="input-field mt-1" value={guarantorPhone} onChange={(e) => setGuarantorPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Guarantor Email</label>
            <input type="email" required className="input-field mt-1" value={guarantorEmail} onChange={(e) => setGuarantorEmail(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Used to send a read-only negotiation link once a viewing is confirmed.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-ink">Guarantor ID Image (optional but recommended)</label>
            <label className="mt-1 flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-pointer hover:border-primary hover:text-primary transition">
              <Upload size={16} />
              {fileName || 'Choose file'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0] || null
                setFileName(f?.name || '')
                setGuarantorIdFile(f)
              }} />
            </label>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            {saving && <Loader2 className="animate-spin" size={16} />}
            Save and Continue
          </button>
        </form>
      </div>
    </div>
  )
}
