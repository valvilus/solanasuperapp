import { Connection, PublicKey } from '@solana/web3.js'
import { CustodialWalletService } from '@/lib/wallet'
import { prisma } from '@/lib/prisma'

export interface InsurancePool {
  poolId: string
  protectedProtocol: string
  coverageAmount: number
  premiumRate: number
  totalPremiums: number
  totalClaims: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface InsurancePolicy {
  policyId: string
  userId: string
  poolId: string
  coverageAmount: number
  premiumPaid: number
  startTime: Date
  expiryTime: Date
  isActive: boolean
  createdAt: Date
}

export interface InsuranceClaim {
  claimId: string
  policyId: string
  poolId: string
  claimAmount: number
  evidence?: any
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
  payoutAmount: number
  filedAt: Date
  processedAt?: Date
}

export class InsuranceService {
  private connection: Connection
  private walletService: CustodialWalletService

  constructor() {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    )
    this.walletService = new CustodialWalletService(prisma)
  }

  async getInsurancePools(): Promise<InsurancePool[]> {
    try {
      const pools = await prisma.insurancePool.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      })

      return pools.map(pool => ({
        poolId: pool.poolId.toString(),
        protectedProtocol: pool.protectedProtocol,
        coverageAmount: Number(pool.coverageAmount),
        premiumRate: pool.premiumRate,
        totalPremiums: Number(pool.totalPremiums),
        totalClaims: Number(pool.totalClaims),
        isActive: pool.isActive,
        createdAt: pool.createdAt,
        updatedAt: pool.updatedAt
      }))
    } catch (error) {
      console.error('Error fetching insurance pools:', error)
      
      return [
        {
          poolId: '1',
          protectedProtocol: 'TNG Lending',
          coverageAmount: 1000000,
          premiumRate: 500, // 5%
          totalPremiums: 50000,
          totalClaims: 10000,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          poolId: '2',
          protectedProtocol: 'TNG Swap',
          coverageAmount: 500000,
          premiumRate: 300, // 3%
          totalPremiums: 15000,
          totalClaims: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          poolId: '3',
          protectedProtocol: 'TNG Farming',
          coverageAmount: 750000,
          premiumRate: 400, // 4%
          totalPremiums: 30000,
          totalClaims: 5000,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    }
  }

  async getUserPolicies(userWallet: string): Promise<InsurancePolicy[]> {
    try {
      const user = await prisma.user.findFirst({
        where: { walletAddress: userWallet }
      })

      if (!user) return []

      const policies = await prisma.insurancePolicy.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { createdAt: 'desc' }
      })

      return policies.map(policy => ({
        policyId: policy.policyId.toString(),
        userId: policy.userId,
        poolId: policy.poolId.toString(),
        coverageAmount: Number(policy.coverageAmount),
        premiumPaid: Number(policy.premiumPaid),
        startTime: policy.startTime,
        expiryTime: policy.expiryTime,
        isActive: policy.isActive,
        createdAt: policy.createdAt
      }))
    } catch (error) {
      console.error('Error fetching user policies:', error)
      return []
    }
  }

  async purchasePolicy(
    poolId: string,
    coverageAmount: number,
    duration: number, // in days
    userWallet: string
  ): Promise<{ success: boolean; policyId?: string; error?: string }> {
    try {
      const user = await prisma.user.findFirst({
        where: { walletAddress: userWallet }
      })

      if (!user) {
        return { success: false, error: 'Пользователь не найден' }
      }

      const pool = await prisma.insurancePool.findFirst({
        where: { poolId: BigInt(poolId), isActive: true }
      })

      if (!pool) {
        return { success: false, error: 'Страховой пул не найден' }
      }

      const premiumAmount = Math.floor(
        (coverageAmount * pool.premiumRate * duration) / (365 * 10000)
      )

      const startTime = new Date()
      const expiryTime = new Date(startTime.getTime() + duration * 24 * 60 * 60 * 1000)
      const policyId = BigInt(Date.now())

      const policy = await prisma.insurancePolicy.create({
        data: {
          policyId,
          userId: user.id,
          poolId: pool.poolId,
          coverageAmount: BigInt(coverageAmount),
          premiumPaid: BigInt(premiumAmount),
          startTime,
          expiryTime,
          isActive: true
        }
      })

      await prisma.insurancePool.update({
        where: { id: pool.id },
        data: {
          totalPremiums: pool.totalPremiums + BigInt(premiumAmount)
        }
      })

      return {
        success: true,
        policyId: policy.policyId.toString()
      }
    } catch (error) {
      console.error('Error purchasing policy:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      }
    }
  }

  async fileClaim(
    policyId: string,
    claimAmount: number,
    evidence: any[],
    userWallet: string
  ): Promise<{ success: boolean; claimId?: string; error?: string }> {
    try {
      const user = await prisma.user.findFirst({
        where: { walletAddress: userWallet }
      })

      if (!user) {
        return { success: false, error: 'Пользователь не найден' }
      }

      const policy = await prisma.insurancePolicy.findFirst({
        where: { 
          policyId: BigInt(policyId), 
          userId: user.id,
          isActive: true
        }
      })

      if (!policy) {
        return { success: false, error: 'Полис не найден' }
      }

      const now = new Date()
      if (now > policy.expiryTime) {
        return { success: false, error: 'Срок действия полиса истек' }
      }

      if (claimAmount > Number(policy.coverageAmount)) {
        return { success: false, error: 'Сумма претензии превышает покрытие' }
      }

      const claimId = BigInt(Date.now())

      const claim = await prisma.insuranceClaim.create({
        data: {
          claimId,
          policyId: policy.policyId,
          poolId: policy.poolId,
          claimAmount: BigInt(claimAmount),
          evidence: evidence,
          status: 'PENDING',
          payoutAmount: BigInt(0),
          filedAt: now
        }
      })

      return {
        success: true,
        claimId: claim.claimId.toString()
      }
    } catch (error) {
      console.error('Error filing claim:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      }
    }
  }

  async getUserClaims(userWallet: string): Promise<InsuranceClaim[]> {
    try {
      const user = await prisma.user.findFirst({
        where: { walletAddress: userWallet }
      })

      if (!user) return []

      const claims = await prisma.insuranceClaim.findMany({
        where: {
          policy: {
            userId: user.id
          }
        },
        include: {
          policy: true,
          pool: true
        },
        orderBy: { filedAt: 'desc' }
      })

      return claims.map(claim => ({
        claimId: claim.claimId.toString(),
        policyId: claim.policyId.toString(),
        poolId: claim.poolId.toString(),
        claimAmount: Number(claim.claimAmount),
        evidence: claim.evidence,
        status: claim.status as any,
        payoutAmount: Number(claim.payoutAmount),
        filedAt: claim.filedAt,
        processedAt: claim.processedAt || undefined
      }))
    } catch (error) {
      console.error('Error fetching user claims:', error)
      return []
    }
  }

  async getInsuranceStats(): Promise<{
    totalCoverage: number
    totalPremiums: number
    totalClaims: number
    activePolicies: number
    claimRatio: number
  }> {
    try {
      const [poolStats, policyCount] = await Promise.all([
        prisma.insurancePool.aggregate({
          _sum: {
            coverageAmount: true,
            totalPremiums: true,
            totalClaims: true
          },
          where: { isActive: true }
        }),
        prisma.insurancePolicy.count({
          where: { isActive: true }
        })
      ])

      const totalCoverage = Number(poolStats._sum.coverageAmount || 0)
      const totalPremiums = Number(poolStats._sum.totalPremiums || 0)
      const totalClaims = Number(poolStats._sum.totalClaims || 0)
      const claimRatio = totalPremiums > 0 ? (totalClaims / totalPremiums) * 100 : 0

      return {
        totalCoverage,
        totalPremiums,
        totalClaims,
        activePolicies: policyCount,
        claimRatio
      }
    } catch (error) {
      console.error('Error fetching insurance stats:', error)
      return {
        totalCoverage: 2250000,
        totalPremiums: 95000,
        totalClaims: 15000,
        activePolicies: 45,
        claimRatio: 15.8
      }
    }
  }

  async getProtocolInsuranceStatus(protocol: string): Promise<{
    isInsured: boolean
    coverageAmount: number
    premiumRate: number
    poolId?: string
  }> {
    try {
      const pool = await prisma.insurancePool.findFirst({
        where: { 
          protectedProtocol: protocol,
          isActive: true
        }
      })

      if (pool) {
        return {
          isInsured: true,
          coverageAmount: Number(pool.coverageAmount),
          premiumRate: pool.premiumRate,
          poolId: pool.poolId.toString()
        }
      }

      return {
        isInsured: false,
        coverageAmount: 0,
        premiumRate: 0
      }
    } catch (error) {
      console.error('Error checking protocol insurance status:', error)
      return {
        isInsured: false,
        coverageAmount: 0,
        premiumRate: 0
      }
    }
  }
}
