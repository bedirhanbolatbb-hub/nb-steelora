import ProductCardV2 from './ProductCardV2'
import type { Product } from '@/types'

interface ProductGridProps {
  products: Product[]
  columns?: 2 | 3 | 4
}

export default function ProductGrid({ products, columns = 4 }: ProductGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-x-3 gap-y-7 sm:gap-x-4 lg:gap-x-6 lg:gap-y-10`}>
      {products.map((product, i) => (
        <ProductCardV2 key={product.id} product={product} priority={i < 4} />
      ))}
    </div>
  )
}
