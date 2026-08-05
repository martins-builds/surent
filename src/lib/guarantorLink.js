import { supabase } from './supabase.js'

const SITE_URL = import.meta.env.VITE_SITE_URL || window.location.origin
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-guarantor-link`

/**
 * Called once both parties confirm the "Viewing Scheduled" stage.
 * Creates a single read-only link for the property (reused if one already
 * exists, so refreshing the stage tracker doesn't spam duplicate emails)
 * and emails it to both the student's and the landlord's guarantors.
 */
export async function sendGuarantorLinksIfNeeded(property, studentProfile, landlordProfile) {
  // Avoid duplicate sends: check for an existing link first.
  const { data: existing } = await supabase
    .from('guarantor_links')
    .select('*')
    .eq('property_id', property.id)
    .maybeSingle()

  let token = existing?.token
  if (!token) {
    token = crypto.randomUUID()
    const { error } = await supabase.from('guarantor_links').insert({
      property_id: property.id,
      token
    })
    if (error) {
      console.error('Failed to create guarantor link:', error.message)
      return
    }
  } else {
    // Link already sent for this property — don't re-send.
    return
  }

  const link = `${SITE_URL}/guarantor/${token}`

  const sendOne = async (guarantorEmail, guarantorName, recipientRole) => {
    if (!guarantorEmail) return
    try {
      await fetch(FUNCTIONS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guarantorEmail,
          guarantorName,
          propertyTitle: property.title,
          link,
          recipientRole
        })
      })
    } catch (err) {
      console.error(`Failed to email ${recipientRole}'s guarantor:`, err.message)
    }
  }

  await sendOne(studentProfile.guarantor_email, studentProfile.guarantor_name, 'student')
  await sendOne(landlordProfile.guarantor_email, landlordProfile.guarantor_name, 'landlord')
}
