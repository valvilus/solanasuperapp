import { MyNFT, SortBy, SortOrder } from '../types'
import { RARITY_ORDER } from '../data'

export function sortNFTs(nfts: MyNFT[], sortBy: SortBy, sortOrder: SortOrder): MyNFT[] {
  const sorted = [...nfts]
  
  sorted.sort((a, b) => {
    let comparison = 0
    
    switch (sortBy) {
      case 'NAME':
        comparison = a.name.localeCompare(b.name)
        break
      case 'DATE':
        const dateA = a.earnedAt || a.expiresAt || '2024-01-01'
        const dateB = b.earnedAt || b.expiresAt || '2024-01-01'
        comparison = new Date(dateA).getTime() - new Date(dateB).getTime()
        break
      case 'VALUE' as any: // was RARITY
        const rarityA = a.rarity ? RARITY_ORDER[a.rarity as keyof typeof RARITY_ORDER] || 0 : 0
        const rarityB = b.rarity ? RARITY_ORDER[b.rarity as keyof typeof RARITY_ORDER] || 0 : 0
        comparison = rarityA - rarityB
        break
      case 'VALUE':
        const priceA = a.lastPrice ? parseFloat(a.lastPrice.replace(' SOL', '')) : 0
        const priceB = b.lastPrice ? parseFloat(b.lastPrice.replace(' SOL', '')) : 0
        comparison = priceA - priceB
        break
    }
    
    return sortOrder === 'ASC' ? comparison : -comparison
  })
  
  return sorted
}
