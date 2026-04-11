interface CategoryBadgeProps {
  category: string
  className?: string
}

export default function CategoryBadge({ category, className = '' }: CategoryBadgeProps) {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      technology: 'bg-blue-100 text-blue-800',
      business: 'bg-green-100 text-green-800',
      lifestyle: 'bg-purple-100 text-purple-800',
      education: 'bg-yellow-100 text-yellow-800',
      health: 'bg-red-100 text-red-800',
      entertainment: 'bg-pink-100 text-pink-800',
      sports: 'bg-indigo-100 text-indigo-800',
      general: 'bg-gray-100 text-gray-800',
    }
    
    const lowerCategory = category.toLowerCase()
    return colors[lowerCategory] || colors.general
  }

  return (
    <span
      className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getCategoryColor(category)} ${className}`}
    >
      {category}
    </span>
  )
}
