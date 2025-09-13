import { MyNFT, FilterType } from '../types'
import { FILTER_TYPE_MAP } from '../data'

export function filterNFTs(nfts: MyNFT[], filter: FilterType, searchQuery: string): MyNFT[] {
  let filtered = nfts

  // Фильтрация по типу
  if (filter !== 'ALL') {
    const nftType = FILTER_TYPE_MAP[filter as keyof typeof FILTER_TYPE_MAP]
    filtered = filtered.filter(nft => nft.type === nftType)
  }

  // Поиск
  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filtered = filtered.filter(nft => 
      nft.name.toLowerCase().includes(query) ||
      nft.collection.toLowerCase().includes(query) ||
      (nft.description && nft.description.toLowerCase().includes(query))
    )
  }

  return filtered
}
