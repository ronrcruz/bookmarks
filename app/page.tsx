import dynamic from 'next/dynamic'

const ThreejsCarousel = dynamic(() => import('@/components/ThreejsCarousel'), { ssr: false })

export default function Home() {
  return (
    <main className="min-h-screen">
      <ThreejsCarousel />
    </main>
  )
}

