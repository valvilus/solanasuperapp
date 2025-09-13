import { MyNFT } from '../types'
import { filterNFTs } from './filtering'
import { sortNFTs } from './sorting'
import type { FilterType, SortBy, SortOrder } from '../types'

export function getFilteredAndSortedNFTs(
  nfts: MyNFT[],
  filter: FilterType,
  searchQuery: string,
  sortBy: SortBy,
  sortOrder: SortOrder
): MyNFT[] {
  const filtered = filterNFTs(nfts, filter, searchQuery)
  return sortNFTs(filtered, sortBy, sortOrder)
}

export function getFilterCounts(nfts: MyNFT[]) {
  return {
    all: nfts.length,
    tickets: nfts.filter(nft => nft.type === 'TICKET').length,
    coupons: nfts.filter(nft => nft.type === 'COUPON').length,
    badges: nfts.filter(nft => nft.type === 'BADGE').length,
    collectibles: nfts.filter(nft => nft.type === 'COLLECTIBLE').length
  }
}
