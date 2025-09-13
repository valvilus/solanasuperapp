'use client'

import { useMemo } from 'react'
import { MyNFT, FilterType, SortBy, SortOrder } from '../types'
import { getFilteredAndSortedNFTs, getFilterCounts } from '../utils'

export function useNFTFiltering(
  nfts: MyNFT[],
  selectedFilter: FilterType,
  searchQuery: string,
  sortBy: SortBy,
  sortOrder: SortOrder
) {
  const filteredNFTs = useMemo(() => {
    return getFilteredAndSortedNFTs(nfts, selectedFilter, searchQuery, sortBy, sortOrder)
  }, [nfts, selectedFilter, searchQuery, sortBy, sortOrder])

  const filterCounts = useMemo(() => {
    return getFilterCounts(nfts)
  }, [nfts])

  return {
    filteredNFTs,
    filterCounts
  }
}
