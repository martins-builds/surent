import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, uploadFile, makeStoragePath } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Error fetching profile:', error.message)
      return null
    }
    setProfile(data)
    return data
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id)
    }
  }, [session, fetchProfile])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user?.id) {
        fetchProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user?.id) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [fetchProfile])

  /**
   * Sign up a new user.
   *
   * IMPORTANT — fixes the "Invalid path specified in request URL" bug:
   * We create the auth user, then insert the profiles row with NULL image
   * fields FIRST. Only after that row exists do we upload the ID / avatar /
   * guarantor-ID images and PATCH the profile with their URLs. Uploading
   * before the row exists (or in the same transaction) was the root cause
   * of the original failure.
   */
  const signUp = async ({ email, password, details, guarantor, files }) => {
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    })
    if (signUpError) throw signUpError

    const userId = signUpData.user?.id
    if (!userId) throw new Error('Sign up did not return a user id.')

    // Step A: insert profile with null image fields.
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      role: details.role,
      full_name: details.full_name,
      university: details.university,
      property_areas: details.property_areas || null,
      phone: details.phone,
      avatar_url: null,
      id_image_url: null,
      is_verified: false,
      guarantor_name: guarantor.guarantor_name,
      guarantor_phone: guarantor.guarantor_phone,
      guarantor_email: guarantor.guarantor_email || null,
      guarantor_id_url: null
    })
    if (insertError) throw insertError

    // Step B: upload images now that the row exists, then patch URLs in.
    const updates = {}
    try {
      if (files?.avatar) {
        const path = makeStoragePath(userId, files.avatar.name)
        updates.avatar_url = await uploadFile('avatars', path, files.avatar)
      }
      if (files?.idImage) {
        const path = makeStoragePath(userId, files.idImage.name)
        updates.id_image_url = await uploadFile('avatars', path, files.idImage)
      }
      if (files?.guarantorId) {
        const path = makeStoragePath(userId, files.guarantorId.name)
        updates.guarantor_id_url = await uploadFile('avatars', path, files.guarantorId)
      }
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
        if (updateError) throw updateError
      }
    } catch (imgErr) {
      // Profile already exists even if images failed — surface a soft warning
      // rather than blocking account creation.
      console.error('Image upload after signup failed:', imgErr.message)
    }

    await fetchProfile(userId)
    return signUpData
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setSession(null)
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
