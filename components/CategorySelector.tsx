'use client'

import { useRouter, usePathname } from 'next/navigation'

interface CategorySelectorProps {
  categories: string[]
  currentCategory?: string
  lang: string
}

export default function CategorySelector({ categories, currentCategory, lang }: CategorySelectorProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const category = e.target.value
    if (category === '') {
      router.push(pathname)
    } else {
      router.push(`${pathname}?category=${category}`)
    }
  }

  return (
    <select
      value={currentCategory || ''}
      onChange={handleCategoryChange}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <option value="">All Categories</option>
      {categories.map((category) => (
        <option key={category} value={category}>
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </option>
      ))}
    </select>
  )
}
