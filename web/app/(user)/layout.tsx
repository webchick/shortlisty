import { Nav } from '@/components/nav'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      {children}
    </>
  )
}
