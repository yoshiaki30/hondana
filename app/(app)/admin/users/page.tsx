import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import AdminUsersClient from './AdminUsersClient'

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const supabase = getSupabaseAdmin()
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  if (myProfile?.role !== 'admin') redirect('/')

  const { data: users } = await supabase
    .from('profiles')
    .select('user_id, name, email, role, avatar, created_at')
    .order('created_at', { ascending: true })

  return <AdminUsersClient users={users ?? []} currentUserId={session.user.id} />
}
