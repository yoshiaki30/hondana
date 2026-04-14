import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import Providers from '@/components/Providers'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <Providers>
      <div className="min-h-screen bg-amber-50">
        <AppHeader />
        <main>{children}</main>
      </div>
    </Providers>
  )
}
