import Hero from '@/components/home/Hero'
import Marquee from '@/components/home/Marquee'
import CategoryGrid from '@/components/home/CategoryGrid'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import BrandBanner from '@/components/home/BrandBanner'
import Newsletter from '@/components/home/Newsletter'

export default function HomePage() {
  return (
    <>
      <Hero />
      <Marquee />
      <CategoryGrid />
      <FeaturedProducts />
      <BrandBanner />
      <Newsletter />
    </>
  )
}
