/**
 * NFT Marketplace Mock Data
 * Solana SuperApp
 */

import { MarketplaceNFT } from '../types'

export const mockMarketplaceNFTs: MarketplaceNFT[] = [
  {
    id: '7',
    name: 'Premium Course Access',
    type: 'ticket',
    price: '2.5 SOL',
    priceUSD: '$425',
    creator: 'SuperApp Academy',
    description: 'Доступ к премиум курсам Web3',
    category: 'Education',
    image: '',
    rarity: 'Rare',
    likes: 124,
    views: 1520
  },
  {
    id: '8', 
    name: 'Restaurant VIP Pass',
    type: 'coupon',
    price: '0.8 SOL',
    priceUSD: '$136',
    creator: 'Food Partners',
    description: '30% скидка в топ ресторанах',
    category: 'Food & Drink',
    image: '',
    rarity: 'Common',
    likes: 89,
    views: 892
  },
  {
    id: '9',
    name: 'Gaming Champion Badge',
    type: 'badge',
    price: '5.0 SOL',
    priceUSD: '$850',
    creator: 'GameFi Arena',
    description: 'Значок чемпиона турнира',
    category: 'Gaming',
    image: '',
    rarity: 'Epic',
    likes: 245,
    views: 2891
  },
  {
    id: '10',
    name: 'Abstract Art #0001',
    type: 'collectible',
    price: '15.0 SOL',
    priceUSD: '$2550',
    creator: 'DigitalArtist',
    description: 'Уникальное цифровое искусство',
    category: 'Art',
    image: '',
    rarity: 'Legendary',
    likes: 567,
    views: 4523
  },
  {
    id: '11',
    name: 'Concert Backstage Pass',
    type: 'ticket',
    price: '3.2 SOL',
    priceUSD: '$544',
    creator: 'Music Events',
    description: 'Эксклюзивный доступ за кулисы',
    category: 'Music',
    image: '',
    rarity: 'Rare',
    likes: 178,
    views: 1967
  },
  {
    id: '12',
    name: 'Crypto Meetup Ticket',
    type: 'ticket',
    price: '1.5 SOL',
    priceUSD: '$255',
    creator: 'Crypto Community',
    description: 'Участие в эксклюзивном митапе',
    category: 'Events',
    image: '',
    rarity: 'Common',
    likes: 92,
    views: 1245
  }
]


















