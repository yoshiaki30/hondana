import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import Providers from '@/components/Providers'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const supabase = getSupabaseAdmin()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single()

  return (
    <Providers>
      <div className="min-h-screen bg-[#F0F4F8]">
        <AppHeader
          userName={session.user.name ?? ''}
          userImage={session.user.image}
          role={profile?.role ?? 'member'}
        />
        <main>{children}</main>
      </div>
    </Providers>
  )
}
