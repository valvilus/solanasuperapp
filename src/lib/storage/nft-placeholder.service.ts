/**
 * NFT Placeholder Service - Local fallback for NFT images
 * Generates SVG-based placeholder images as data URIs
 * Solana SuperApp
 */

interface PlaceholderOptions {
  width?: number
  height?: number
  backgroundColor?: string
  textColor?: string
  fontSize?: number
  borderRadius?: number
}

export class NFTPlaceholderService {
  /**
   * Generate SVG placeholder image for NFT based on type
   */
  static generatePlaceholder(
    nftName: string,
    nftType: string = 'COLLECTIBLE',
    options: PlaceholderOptions = {}
  ): string {
    const {
      width = 400,
      height = 400,
      backgroundColor = '#8B5CF6',
      textColor = '#FFFFFF',
      fontSize = 48,
      borderRadius = 12
    } = options

    // Get emoji based on NFT type
    const emoji = this.getTypeEmoji(nftType)
    
    // Clean name for display (max 20 chars)
    const displayName = nftName.length > 20 
      ? nftName.substring(0, 17) + '...' 
      : nftName

    // Create SVG
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${backgroundColor};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${this.darkenColor(backgroundColor, 20)};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" rx="${borderRadius}" fill="url(#bg)"/>
        
        <!-- Decorative pattern -->
        <g opacity="0.1">
          ${this.generatePattern(width, height)}
        </g>
        
        <!-- Main content -->
        <g transform="translate(${width/2}, ${height/2})" text-anchor="middle">
          <!-- Emoji icon -->
          <text x="0" y="-20" font-size="${fontSize * 1.5}" fill="${textColor}" opacity="0.9">
            ${emoji}
          </text>
          
          <!-- NFT name -->
          <text x="0" y="40" font-size="${fontSize * 0.6}" fill="${textColor}" font-family="system-ui, -apple-system, sans-serif" font-weight="600">
            ${displayName}
          </text>
          
          <!-- NFT type -->
          <text x="0" y="70" font-size="${fontSize * 0.35}" fill="${textColor}" opacity="0.8" font-family="system-ui, -apple-system, sans-serif">
            ${nftType}
          </text>
        </g>
        
        <!-- Subtle border -->
        <rect x="2" y="2" width="${width-4}" height="${height-4}" rx="${borderRadius-1}" 
              fill="none" stroke="${textColor}" stroke-width="1" opacity="0.2"/>
      </svg>
    `.trim()

    // Convert to data URI
    const encodedSvg = encodeURIComponent(svg)
    return `data:image/svg+xml,${encodedSvg}`
  }

  /**
   * Generate animated placeholder for loading state
   */
  static generateLoadingPlaceholder(
    width: number = 400,
    height: number = 400
  ): string {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#374151;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#6B7280;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#374151;stop-opacity:1" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-100 0;100 0;-100 0"
              dur="2s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" rx="12" fill="url(#shimmer)"/>
        
        <!-- Loading icon -->
        <g transform="translate(${width/2}, ${height/2})" text-anchor="middle">
          <circle cx="0" cy="0" r="20" fill="none" stroke="#9CA3AF" stroke-width="3" opacity="0.3"/>
          <circle cx="0" cy="0" r="20" fill="none" stroke="#D1D5DB" stroke-width="3" stroke-linecap="round"
                  stroke-dasharray="31.416" stroke-dashoffset="31.416">
            <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
            <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
          </circle>
          
          <text x="0" y="50" font-size="14" fill="#9CA3AF" font-family="system-ui, -apple-system, sans-serif">
            Загрузка...
          </text>
        </g>
      </svg>
    `.trim()

    const encodedSvg = encodeURIComponent(svg)
    return `data:image/svg+xml,${encodedSvg}`
  }

  /**
   * Generate error placeholder for failed image loads
   */
  static generateErrorPlaceholder(
    nftName: string,
    width: number = 400,
    height: number = 400
  ): string {
    const displayName = nftName.length > 15 
      ? nftName.substring(0, 12) + '...' 
      : nftName

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="errorBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#64748B;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#475569;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" rx="12" fill="url(#errorBg)"/>
        
        <!-- Error icon -->
        <g transform="translate(${width/2}, ${height/2})" text-anchor="middle">
          <circle cx="0" cy="-10" r="30" fill="none" stroke="#F87171" stroke-width="2" opacity="0.7"/>
          <text x="0" y="-5" font-size="24" fill="#F87171"></text>
          
          <text x="0" y="25" font-size="16" fill="#E2E8F0" font-family="system-ui, -apple-system, sans-serif" font-weight="600">
            ${displayName}
          </text>
          
          <text x="0" y="45" font-size="12" fill="#CBD5E1" font-family="system-ui, -apple-system, sans-serif">
            Изображение недоступно
          </text>
        </g>
      </svg>
    `.trim()

    const encodedSvg = encodeURIComponent(svg)
    return `data:image/svg+xml,${encodedSvg}`
  }

  /**
   * Get emoji for NFT type
   */
  private static getTypeEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      'COLLECTIBLE': '',
      'ART': '',
      'TICKET': '',
      'COUPON': '',
      'CERTIFICATE': '',
      'BADGE': '',
      'MUSIC': '',
      'VIDEO': '',
      'GAME': '',
      'UTILITY': ''
    }
    return emojiMap[type] || ''
  }

  /**
   * Generate decorative pattern for background
   */
  private static generatePattern(width: number, height: number): string {
    const patterns: string[] = []
    const gridSize = 40
    
    for (let x = 0; x < width; x += gridSize) {
      for (let y = 0; y < height; y += gridSize) {
        patterns.push(`<circle cx="${x}" cy="${y}" r="2" fill="white"/>`)
      }
    }
    
    return patterns.join('')
  }

  /**
   * Darken a hex color by percentage
   */
  private static darkenColor(hex: string, percent: number): string {
    // Remove # if present
    hex = hex.replace('#', '')
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    // Darken each component
    const factor = (100 - percent) / 100
    const newR = Math.round(r * factor)
    const newG = Math.round(g * factor)
    const newB = Math.round(b * factor)
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
  }
}

export default NFTPlaceholderService

















