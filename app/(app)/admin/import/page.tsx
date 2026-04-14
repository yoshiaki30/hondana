import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import ImportClient from './ImportClient'

export default async function ImportPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase.from('profiles').select('role').eq('user_id', session.user.id).single()
  if (profile?.role !== 'admin') redirect('/')

  return <ImportClient />
}
