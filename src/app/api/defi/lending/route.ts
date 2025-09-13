import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import TngLendingContractService from '@/lib/onchain/tng-lending-contract.service';
import { CustodialWalletService } from '@/lib/wallet';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Initialize services inside functions to avoid global state issues

// Known token mints
const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112', // Wrapped SOL
  TNG: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // USDC devnet
  USDT: 'EsPKhGTMf3bGoy4Qm7pCv2UCFd4tgudZNdQULS85wSsJ' // USDT devnet
};

/**
 * Get mock lending pools when smart contract is not available
 */
function getMockLendingPools() {
  const TOKEN_MINTS = {
    SOL: 'So11111111111111111111111111111111111111112',
    TNG: process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs',
    USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
  };

  return [
    {
      id: 'sol_pool',
      tokenMint: TOKEN_MINTS.SOL,
      symbol: 'SOL',
      name: 'SOL Lending Pool',
      totalSupply: 1250.5,
      totalBorrows: 875.3,
      supplyAPY: 4.5,
      borrowAPY: 6.8,
      utilization: 70.0,
      liquidationThreshold: 85.0,
      liquidationBonus: 5.0,
      reserveFactor: 10.0,
      isActive: true
    },
    {
      id: 'tng_pool', 
      tokenMint: TOKEN_MINTS.TNG,
      symbol: 'TNG',
      name: 'TNG Lending Pool',
      totalSupply: 45000.0,
      totalBorrows: 22500.0,
      supplyAPY: 8.2,
      borrowAPY: 12.5,
      utilization: 50.0,
      liquidationThreshold: 80.0,
      liquidationBonus: 8.0,
      reserveFactor: 15.0,
      isActive: true
    },
    {
      id: 'usdc_pool',
      tokenMint: TOKEN_MINTS.USDC,
      symbol: 'USDC',
      name: 'USDC Lending Pool', 
      totalSupply: 8750.0,
      totalBorrows: 5250.0,
      supplyAPY: 3.2,
      borrowAPY: 5.1,
      utilization: 60.0,
      liquidationThreshold: 90.0,
      liquidationBonus: 3.0,
      reserveFactor: 8.0,
      isActive: true
    }
  ];
}

/**
 * Calculate health factor for user position
 */
function calculateHealthFactor(userAccount: any, pool: any): number {
  const suppliedAmount = Number(userAccount.suppliedAmount) / 1e9;
  const borrowedAmount = Number(userAccount.borrowedAmount) / 1e9;
  
  if (borrowedAmount === 0) {
    return Number.MAX_SAFE_INTEGER; // No debt = perfect health
  }
  
  // Simple health factor: (supplied * collateral factor) / borrowed
  const collateralValue = suppliedAmount * (pool.liquidationThreshold / 100);
  return collateralValue / borrowedAmount;
}

/**
 * Auto-initialize lending pools if they don't exist
 */
// In-memory guards to avoid RPC spam and repeated inits
let initInProgress = false
let initFailCount = 0
let initBackoffUntil = 0
let poolsCache: { data: any; ts: number } | null = null
let poolsPromise: Promise<any> | null = null
const userPosCache = new Map<string, { data: any; ts: number }>()
const userPosPromise = new Map<string, Promise<any>>()
const POOLS_CACHE_TTL_MS = 15_000

async function initializeLendingPoolsIfNeeded(tngLendingContractService: TngLendingContractService | null) {
  try {
    if (!tngLendingContractService) {
      console.log('🔧 Skipping pool initialization - service not available');
      return;
    }

    if (process.env.AUTO_INIT_LENDING_POOLS === 'false') {
      return
    }

    const now = Date.now()
    if (initInProgress || now < initBackoffUntil) {
      return
    }

    console.log('🔍 Checking if lending pools need initialization...');
    
    // Check if pools already exist
    let existingPools
    try {
      existingPools = await tngLendingContractService.getAllLendingPools();
    } catch (err: any) {
      if (err?.code === 'RATE_LIMITED') {
        console.log('⏳ RPC rate-limited, skipping init');
        initFailCount = Math.min(initFailCount + 1, 5)
        initBackoffUntil = now + Math.min(2 ** initFailCount * 30_000, 10 * 60_000)
        return
      }
      throw err
    }
    
    if (existingPools.length > 0) {
      console.log(`✅ Found ${existingPools.length} existing lending pools`);
      return;
    }
    
    console.log('🔧 No lending pools found, initializing default pools...');
    
    // Initialize standard pools: SOL, TNG, USDC
    const poolsToInitialize = [
      { 
        token: 'SOL', 
        mint: TOKEN_MINTS.SOL,
        optimalUtilizationRate: 8000, // 80%
        maxBorrowRate: 2000, // 20%
        baseBorrowRate: 100, // 1%
        liquidationThreshold: 8500, // 85%
        liquidationBonus: 500, // 5%
        reserveFactor: 1000 // 10%
      },
      { 
        token: 'TNG', 
        mint: TOKEN_MINTS.TNG,
        optimalUtilizationRate: 7000, // 70%
        maxBorrowRate: 3000, // 30%
        baseBorrowRate: 200, // 2%
        liquidationThreshold: 8000, // 80%
        liquidationBonus: 800, // 8%
        reserveFactor: 1500 // 15%
      },
      { 
        token: 'USDC', 
        mint: TOKEN_MINTS.USDC,
        optimalUtilizationRate: 9000, // 90%
        maxBorrowRate: 1500, // 15%
        baseBorrowRate: 50, // 0.5%
        liquidationThreshold: 9000, // 90%
        liquidationBonus: 300, // 3%
        reserveFactor: 800 // 8%
      }
    ];
    
    initInProgress = true
    for (const poolConfig of poolsToInitialize) {
      try {
        console.log(`🔧 Initializing ${poolConfig.token} lending pool...`);
        
        const result = await tngLendingContractService.initializePool(
          new PublicKey(poolConfig.mint),
          poolConfig.optimalUtilizationRate,
          poolConfig.maxBorrowRate,
          poolConfig.baseBorrowRate,
          poolConfig.liquidationThreshold,
          poolConfig.liquidationBonus,
          poolConfig.reserveFactor
        );
        
        if (result.success) {
          console.log(`✅ ${poolConfig.token} pool initialized successfully:`, result.signature);
        } else {
          console.log(`❌ Failed to initialize ${poolConfig.token} pool:`, result.error);
        }
      } catch (error: any) {
        const msg = error?.message || String(error)
        if (msg.includes('429') || msg.toLowerCase().includes('too many requests')) {
          console.log('⏳ RPC rate-limited during init, stopping further init attempts')
          break
        }
        console.log(`❌ Error initializing ${poolConfig.token} pool:`, error);
        // Continue with other pools
      }
    }
    initInProgress = false
    initFailCount = 0
    initBackoffUntil = 0
    
    console.log('🎉 Lending pools initialization completed');
    
  } catch (error) {
    console.error('❌ Error during pools initialization:', error);
    // Don't throw - let the API continue with mock data
  }
}

// GET /api/defi/lending - Get lending pools and user positions
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    
    console.log(' Getting lending data...', { action, userId, authUserId: auth.userId });

    // Initialize services
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const walletService = new CustodialWalletService(prisma);
    
    // Initialize lending contract service
    let tngLendingContractService: TngLendingContractService | null = null;
    try {
      const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY 
        ? (process.env.SPONSOR_PRIVATE_KEY.startsWith('[') 
            ? JSON.parse(process.env.SPONSOR_PRIVATE_KEY) 
            : Array.from(Buffer.from(process.env.SPONSOR_PRIVATE_KEY, 'base64')))
        : [];
      tngLendingContractService = new TngLendingContractService(connection, sponsorPrivateKey);
      
      // Auto init disabled for GET to prevent spamming; can be re-enabled via env flag
      if (process.env.AUTO_INIT_LENDING_POOLS === 'true') {
        await initializeLendingPoolsIfNeeded(tngLendingContractService)
      }
    } catch (error) {
      console.error('❌ Failed to initialize TngLendingContractService:', error);
      // Continue with null service - will use mock data
    }

    // Handle different actions
    if (action === 'get_pools') {
      // Return just pools without user data
      // Single-flight + short cache to avoid hammering RPC
      const now = Date.now()
      if (!poolsPromise) {
        if (poolsCache && now - poolsCache.ts < POOLS_CACHE_TTL_MS) {
          // use cache
        } else {
          poolsPromise = (async () => {
            try {
              if (tngLendingContractService) {
                const data = await tngLendingContractService.getLendingPools()
                poolsCache = { data, ts: Date.now() }
                return data
              }
              // ИСПОЛЬЗУЕМ mock данные для стабильной демо работы
              return getMockLendingPools()
            } catch (err: any) {
              const msg = err?.message || String(err)
              if (msg.includes('429') || msg.toLowerCase().includes('too many requests')) {
                console.log('⏳ RPC rate-limited, serving mock pools')
                const data = getMockLendingPools()
                poolsCache = { data, ts: Date.now() }
                return data
              }
              throw err
            } finally {
              setTimeout(() => { poolsPromise = null }, 0)
            }
          })()
        }
      }
      const pools = poolsCache && now - poolsCache.ts < POOLS_CACHE_TTL_MS
        ? poolsCache.data
        : await poolsPromise!
      return NextResponse.json({
        success: true,
        data: { pools }
      });
    }

    if (action === 'get_user_positions') {
      const cacheKey = auth.userId

      const now = Date.now()
      const cached = userPosCache.get(cacheKey)
      if (!userPosPromise.get(cacheKey)) {
        if (!cached || now - cached.ts >= POOLS_CACHE_TTL_MS) {
          userPosPromise.set(cacheKey, (async () => {
            try {
              // Return user positions for specific user
              const targetUserId = userId || auth.userId;
              
              // Get user wallet
              let userWalletResult;
              try {
                userWalletResult = await walletService.getOrCreateUserWallet(targetUserId);
              } catch (error) {
                console.error('Error getting user wallet:', error);
                userWalletResult = null;
              }
              
              if (!userWalletResult || !userWalletResult.success || !userWalletResult.data) {
                const data = { userPositions: [], summary: { totalSupplied: 0, totalBorrowed: 0, netAPY: 0, healthFactor: Number.MAX_SAFE_INTEGER } }
                userPosCache.set(cacheKey, { data, ts: Date.now() })
                return data
              }
              
              const userWallet = userWalletResult.data;
              const userPublicKey = new PublicKey(userWallet.publicKey);
              // ВРЕМЕННО: используем mock данные для стабильной демо работы
              const poolsNow = getMockLendingPools();
              const userPositions: any[] = [];

              for (const pool of poolsNow) {
                try {
                  const poolMint = new PublicKey(pool.tokenMint);
                  const userAccount = tngLendingContractService 
                    ? await tngLendingContractService.getUserAccount(userPublicKey, poolMint)
                    : null;
                  
                  if (userAccount) {
                    userPositions.push({
                      poolId: pool.tokenMint,
                      symbol: pool.symbol,
                      suppliedAmount: Number(userAccount.suppliedAmount) / 1e9,
                      borrowedAmount: Number(userAccount.borrowedAmount) / 1e9,
                      supplyAPY: pool.supplyAPY,
                      borrowAPY: pool.borrowAPY,
                      healthFactor: calculateHealthFactor(userAccount, pool)
                    });
                  } else {
                    userPositions.push({
                      poolId: pool.tokenMint,
                      symbol: pool.symbol,
                      suppliedAmount: 0,
                      borrowedAmount: 0,
                      supplyAPY: pool.supplyAPY,
                      borrowAPY: pool.borrowAPY,
                      healthFactor: Number.MAX_SAFE_INTEGER
                    });
                  }
                } catch (err) {
                  userPositions.push({
                    poolId: pool.tokenMint,
                    symbol: pool.symbol,
                    suppliedAmount: 0,
                    borrowedAmount: 0,
                    supplyAPY: pool.supplyAPY,
                    borrowAPY: pool.borrowAPY,
                    healthFactor: Number.MAX_SAFE_INTEGER
                  });
                }
              }

              const summary = {
                totalSupplied: userPositions.reduce((sum, pos) => sum + pos.suppliedAmount, 0),
                totalBorrowed: userPositions.reduce((sum, pos) => sum + pos.borrowedAmount, 0),
                netAPY: userPositions.length > 0 
                  ? userPositions.reduce((sum, pos) => sum + (pos.supplyAPY * pos.suppliedAmount - pos.borrowAPY * pos.borrowedAmount), 0) / 
                    userPositions.reduce((sum, pos) => sum + pos.suppliedAmount + pos.borrowedAmount, 1)
                  : 0,
                healthFactor: userPositions.length > 0
                  ? Math.min(...userPositions.map(pos => pos.healthFactor))
                  : Number.MAX_SAFE_INTEGER
              };

              const data = { userPositions, summary }
              userPosCache.set(cacheKey, { data, ts: Date.now() })
              return data
            } catch (err: any) {
              const data = { userPositions: [], summary: { totalSupplied: 0, totalBorrowed: 0, netAPY: 0, healthFactor: Number.MAX_SAFE_INTEGER } }
              userPosCache.set(cacheKey, { data, ts: Date.now() })
              return data
            } finally {
              setTimeout(() => { userPosPromise.delete(cacheKey) }, 0)
            }
          })())
        }
      }

      const cachedNow = userPosCache.get(cacheKey)
      const data = cachedNow && Date.now() - cachedNow.ts < POOLS_CACHE_TTL_MS
        ? cachedNow.data
        : await userPosPromise.get(cacheKey)!

      return NextResponse.json({ success: true, data })
    }

    // Default: return both pools and user data
    // Get user wallet
    let userWalletResult;
    try {
      userWalletResult = await (walletService as any).getUserCustodialWallet?.(auth.userId);
      if (!userWalletResult) {
        userWalletResult = await (walletService as any).getCustodialWallet?.(auth.userId);
      }
    } catch (error) {
      console.error('Error getting user wallet:', error);
      userWalletResult = null;
    }
    
    if (!userWalletResult || !userWalletResult.success || !userWalletResult.data) {
      return NextResponse.json({ error: 'User wallet not found' }, { status: 404 });
    }
    const userWallet = userWalletResult.data;

    const userPublicKey = new PublicKey(userWallet.publicKey);

    // Fetch lending pools and user positions
    console.log('🔍 Fetching lending pools for user:', auth.userId);
    // ВРЕМЕННО: используем mock данные для стабильной демо работы
    const pools = getMockLendingPools();
    console.log('🎯 Using mock pools for demo with real APY:', pools[0]?.supplyAPY, pools[1]?.supplyAPY);
    const userPositions = [];

    for (const pool of pools) {
      try {
        // Try to get user account for this pool
        const poolMint = new PublicKey(pool.tokenMint);
        const userAccount = tngLendingContractService 
          ? await tngLendingContractService.getUserAccount(userPublicKey, poolMint)
          : null;
        
        if (userAccount) {
          userPositions.push({
            poolId: pool.tokenMint,
            symbol: pool.symbol,
            suppliedAmount: Number(userAccount.suppliedAmount) / 1e9, // Convert from lamports
            borrowedAmount: Number(userAccount.borrowedAmount) / 1e9,
            supplyAPY: pool.supplyAPY,
            borrowAPY: pool.borrowAPY,
            healthFactor: calculateHealthFactor(userAccount, pool)
          });
        }
      } catch (err) {
        // User account doesn't exist for this pool, add empty position
        console.log(`No user account for pool ${pool.symbol}, adding empty position`);
        userPositions.push({
          poolId: pool.tokenMint,
          symbol: pool.symbol,
          suppliedAmount: 0,
          borrowedAmount: 0,
          supplyAPY: pool.supplyAPY,
          borrowAPY: pool.borrowAPY,
          healthFactor: Number.MAX_SAFE_INTEGER
        });
      }
    }

    // Calculate summary
    const summary = {
      totalSupplied: userPositions.reduce((sum, pos) => sum + pos.suppliedAmount, 0),
      totalBorrowed: userPositions.reduce((sum, pos) => sum + pos.borrowedAmount, 0),
      netAPY: userPositions.length > 0 
        ? userPositions.reduce((sum, pos) => sum + (pos.supplyAPY * pos.suppliedAmount - pos.borrowAPY * pos.borrowedAmount), 0) / 
          userPositions.reduce((sum, pos) => sum + pos.suppliedAmount + pos.borrowedAmount, 1)
        : 0,
      healthFactor: userPositions.length > 0
        ? Math.min(...userPositions.map(pos => pos.healthFactor))
        : Number.MAX_SAFE_INTEGER
    };

    return NextResponse.json({
      success: true,
      data: {
        pools: pools.map(pool => ({
          ...pool,
          userSupplied: userPositions.find(pos => pos.poolId === pool.tokenMint)?.suppliedAmount || 0,
          userBorrowed: userPositions.find(pos => pos.poolId === pool.tokenMint)?.borrowedAmount || 0
        })),
        userPositions,
        summary
      }
    });

  } catch (error: any) {
    console.error('Lending GET API error:', error);
    return NextResponse.json({
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    let body: any = {}
    try {
      body = await request.json();
    } catch (_) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const { action, token, amount, liquidityAmount, debtToCover, targetUser } = body;

    console.log('Lending API request:', { action, userId: auth.userId, token, amount });

    // Initialize services
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    const walletService = new CustodialWalletService(prisma);
    
    // Initialize lending contract service
    let tngLendingContractService: TngLendingContractService | null = null;
    try {
      const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY 
        ? (process.env.SPONSOR_PRIVATE_KEY.startsWith('[') 
            ? JSON.parse(process.env.SPONSOR_PRIVATE_KEY) 
            : Array.from(Buffer.from(process.env.SPONSOR_PRIVATE_KEY, 'base64')))
        : [];
      tngLendingContractService = new TngLendingContractService(connection, sponsorPrivateKey);
    } catch (error) {
      console.error('❌ Failed to initialize TngLendingContractService in POST:', error);
      // Continue with null service - will use mock responses
    }

    // Get user wallet
    const userWalletResult = await walletService.getOrCreateUserWallet(auth.userId);
    if (!userWalletResult.success || !userWalletResult.data) {
      return NextResponse.json({ error: 'User wallet not found' }, { status: 404 });
    }

    // Get user keypair
    const userKeypairResult = await walletService.getUserKeypair(auth.userId);
    if (!userKeypairResult.success || !userKeypairResult.data) {
      return NextResponse.json({ error: 'User keypair not found' }, { status: 404 });
    }
    
    const userKeypair = userKeypairResult.data;
    const tokenMintStr = TOKEN_MINTS[token as keyof typeof TOKEN_MINTS] || token
    const tokenMint = new PublicKey(tokenMintStr);

    let result;

    switch (action) {
      case 'initialize_pool':
        const {
          optimalUtilizationRate = 8000,
          maxBorrowRate = 3000,
          baseBorrowRate = 200,
          liquidationThreshold = 8500,
          liquidationBonus = 500,
          reserveFactor = 1000
        } = body;

        if (!tngLendingContractService) {
          result = {
            success: true,
            signature: 'mock_init_' + Date.now(),
            data: { poolAddress: 'mock_pool_' + token }
          };
        } else {
          result = await tngLendingContractService.initializePool(
            tokenMint,
            optimalUtilizationRate,
            maxBorrowRate,
            baseBorrowRate,
            liquidationThreshold,
            liquidationBonus,
            reserveFactor
          );
        }
        break;

      case 'supply':
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Invalid supply amount' }, { status: 400 });
        }

        // Validate wallet balance before supply
        try {
          if (tokenMintStr === TOKEN_MINTS.SOL) {
            const lamports = await connection.getBalance(userKeypair.publicKey)
            if (lamports < Math.floor(amount * 1e9)) {
              return NextResponse.json({ error: 'Insufficient SOL balance' }, { status: 400 })
            }
          } else {
            const ata = await (await import('@solana/spl-token')).getAssociatedTokenAddress(new PublicKey(tokenMintStr), userKeypair.publicKey)
            try {
              const acc = await (await import('@solana/spl-token')).getAccount(connection, ata)
              if (Number(acc.amount) < Math.floor(amount * 1e9)) {
                return NextResponse.json({ error: 'Insufficient token balance' }, { status: 400 })
              }
            } catch (_) {
              return NextResponse.json({ error: 'Token account not found' }, { status: 400 })
            }
          }
        } catch (e) {
          console.error('Balance validation error:', e)
        }

        // ВРЕМЕННО: используем mock режим для стабильной демо работы
        const mockSupplySignature = 'mock_supply_' + Date.now();
        result = {
          success: true,
          signature: mockSupplySignature,
          explorerUrl: `https://explorer.solana.com/tx/${mockSupplySignature}?cluster=devnet`,
          message: `Successfully supplied ${amount} ${token} tokens`
        };

        // Записываем в ledger для истории транзакций
        try {
          const asset = await prisma.asset.findFirst({
            where: { symbol: token }
          });
          
          if (asset) {
            await prisma.ledgerEntry.create({
              data: {
                userId: auth.userId,
                assetId: asset.id,
                direction: 'DEBIT', // DEBIT = деньги ушли из кошелька в lending
                amount: BigInt(Math.floor(amount * Math.pow(10, asset.decimals))),
                txType: 'LENDING_SUPPLY',
                txRef: mockSupplySignature,
                status: 'POSTED',
                idempotencyKey: `lending_supply_${auth.userId}_${token}_${Date.now()}`,
                description: `DeFi Lending: Supply ${amount} ${token}`,
                metadata: {
                  lendingOperation: 'supply',
                  poolToken: token,
                  explorerUrl: result.explorerUrl
                }
              }
            });
            console.log('✅ Created lending supply ledger entry for history');
          }
        } catch (ledgerError) {
          console.warn('⚠️ Failed to create ledger entry for supply:', ledgerError);
        }
        
        // if (!tngLendingContractService) {
        //   result = {
        //     success: true,
        //     signature: 'mock_supply_' + Date.now(),
        //     explorerUrl: `https://explorer.solana.com/tx/mock_supply_${Date.now()}?cluster=devnet`
        //   };
        // } else {
        //   result = await tngLendingContractService.supply(
        //     userKeypair,
        //     tokenMint,
        //     amount
        //   );
        // }
        break;

      case 'withdraw':
        if (!liquidityAmount || liquidityAmount <= 0) {
          return NextResponse.json({ error: 'Invalid liquidity amount' }, { status: 400 });
        }

        // Validate user has enough liquidity tokens
        if (tngLendingContractService) {
          const userData = await tngLendingContractService.getUserAccount(userKeypair.publicKey, tokenMint)
          if (!userData) {
            return NextResponse.json({ error: 'No position found for this pool' }, { status: 400 })
          }
          const liq = userData.liquidityTokens.toNumber() / 1e9
          if (liq < liquidityAmount) {
            return NextResponse.json({ error: 'Insufficient liquidity tokens' }, { status: 400 })
          }
        }

        // ВРЕМЕННО: используем mock режим для стабильной демо работы
        const mockWithdrawSignature = 'mock_withdraw_' + Date.now();
        result = {
          success: true,
          signature: mockWithdrawSignature,
          explorerUrl: `https://explorer.solana.com/tx/${mockWithdrawSignature}?cluster=devnet`,
          message: `Successfully withdrew ${liquidityAmount} ${token} tokens`
        };

        // Записываем в ledger для истории транзакций
        try {
          const asset = await prisma.asset.findFirst({
            where: { symbol: token }
          });
          
          if (asset) {
            await prisma.ledgerEntry.create({
              data: {
                userId: auth.userId,
                assetId: asset.id,
                direction: 'CREDIT', // CREDIT = деньги вернулись из lending в кошелек
                amount: BigInt(Math.floor(liquidityAmount * Math.pow(10, asset.decimals))),
                txType: 'LENDING_WITHDRAW',
                txRef: mockWithdrawSignature,
                status: 'POSTED',
                idempotencyKey: `lending_withdraw_${auth.userId}_${token}_${Date.now()}`,
                description: `DeFi Lending: Withdraw ${liquidityAmount} ${token}`,
                metadata: {
                  lendingOperation: 'withdraw',
                  poolToken: token,
                  explorerUrl: result.explorerUrl
                }
              }
            });
            console.log('✅ Created lending withdraw ledger entry for history');
          }
        } catch (ledgerError) {
          console.warn('⚠️ Failed to create ledger entry for withdraw:', ledgerError);
        }
        break;

      case 'borrow':
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Invalid borrow amount' }, { status: 400 });
        }

        // Health factor validation before borrow
        if (tngLendingContractService) {
          const userData = await tngLendingContractService.getUserAccount(userKeypair.publicKey, tokenMint)
          const poolInfo = await tngLendingContractService.getLendingPool(tokenMint)
          if (!poolInfo) {
            return NextResponse.json({ error: 'Pool not found' }, { status: 404 })
          }
          const currentSupplied = (userData?.suppliedAmount?.toNumber?.() || 0) / 1e9
          const currentBorrowed = (userData?.borrowedAmount?.toNumber?.() || 0) / 1e9
          const projectedBorrowed = currentBorrowed + amount
          const hf = tngLendingContractService.calculateHealthFactor(currentSupplied, projectedBorrowed, poolInfo.liquidationThreshold.toNumber())
          if (hf < 1.1) {
            return NextResponse.json({ error: 'Borrow would risk liquidation (low health factor)' }, { status: 400 })
          }
        }

        // ВРЕМЕННО: используем mock режим для стабильной демо работы
        const mockBorrowSignature = 'mock_borrow_' + Date.now();
        result = {
          success: true,
          signature: mockBorrowSignature,
          explorerUrl: `https://explorer.solana.com/tx/${mockBorrowSignature}?cluster=devnet`,
          message: `Successfully borrowed ${amount} ${token} tokens`
        };

        // Записываем в ledger для истории транзакций
        try {
          const asset = await prisma.asset.findFirst({
            where: { symbol: token }
          });
          
          if (asset) {
            await prisma.ledgerEntry.create({
              data: {
                userId: auth.userId,
                assetId: asset.id,
                direction: 'CREDIT', // CREDIT = деньги пришли в кошелек от lending
                amount: BigInt(Math.floor(amount * Math.pow(10, asset.decimals))),
                txType: 'LENDING_BORROW',
                txRef: mockBorrowSignature,
                status: 'POSTED',
                idempotencyKey: `lending_borrow_${auth.userId}_${token}_${Date.now()}`,
                description: `DeFi Lending: Borrow ${amount} ${token}`,
                metadata: {
                  lendingOperation: 'borrow',
                  poolToken: token,
                  explorerUrl: result.explorerUrl
                }
              }
            });
            console.log('✅ Created lending borrow ledger entry for history');
          }
        } catch (ledgerError) {
          console.warn('⚠️ Failed to create ledger entry for borrow:', ledgerError);
        }
        break;

      case 'repay':
        if (!amount || amount <= 0) {
          return NextResponse.json({ error: 'Invalid repay amount' }, { status: 400 });
        }

        // Validate wallet balance for repayment
        try {
          if (tokenMintStr === TOKEN_MINTS.SOL) {
            const lamports = await connection.getBalance(userKeypair.publicKey)
            if (lamports < Math.floor(amount * 1e9)) {
              return NextResponse.json({ error: 'Insufficient SOL balance to repay' }, { status: 400 })
            }
          } else {
            const ata = await (await import('@solana/spl-token')).getAssociatedTokenAddress(new PublicKey(tokenMintStr), userKeypair.publicKey)
            try {
              const acc = await (await import('@solana/spl-token')).getAccount(connection, ata)
              if (Number(acc.amount) < Math.floor(amount * 1e9)) {
                return NextResponse.json({ error: 'Insufficient token balance to repay' }, { status: 400 })
              }
            } catch (_) {
              return NextResponse.json({ error: 'Token account not found' }, { status: 400 })
            }
          }
        } catch (e) {
          console.error('Repay balance validation error:', e)
        }

        // ВРЕМЕННО: используем mock режим для стабильной демо работы
        const mockRepaySignature = 'mock_repay_' + Date.now();
        result = {
          success: true,
          signature: mockRepaySignature,
          explorerUrl: `https://explorer.solana.com/tx/${mockRepaySignature}?cluster=devnet`,
          message: `Successfully repaid ${amount} ${token} tokens`
        };

        // Записываем в ledger для истории транзакций
        try {
          const asset = await prisma.asset.findFirst({
            where: { symbol: token }
          });
          
          if (asset) {
            await prisma.ledgerEntry.create({
              data: {
                userId: auth.userId,
                assetId: asset.id,
                direction: 'DEBIT', // DEBIT = деньги ушли из кошелька для погашения долга
                amount: BigInt(Math.floor(amount * Math.pow(10, asset.decimals))),
                txType: 'LENDING_REPAY',
                txRef: mockRepaySignature,
                status: 'POSTED',
                idempotencyKey: `lending_repay_${auth.userId}_${token}_${Date.now()}`,
                description: `DeFi Lending: Repay ${amount} ${token}`,
                metadata: {
                  lendingOperation: 'repay',
                  poolToken: token,
                  explorerUrl: result.explorerUrl
                }
              }
            });
            console.log('✅ Created lending repay ledger entry for history');
          }
        } catch (ledgerError) {
          console.warn('⚠️ Failed to create ledger entry for repay:', ledgerError);
        }
        break;

      case 'liquidate':
        if (!debtToCover || debtToCover <= 0 || !targetUser) {
          return NextResponse.json({ error: 'Invalid liquidation parameters' }, { status: 400 });
        }

        // For liquidation, userKeypair is the liquidator
        const targetUserPublicKey = new PublicKey(targetUser);
        
        // Note: liquidate function would need to be implemented in the service
        // For now, return a placeholder
        result = {
          signature: '',
          success: false,
          error: 'Liquidation not implemented yet'
        };
        break;

      case 'get_pool':
        const poolData = await tngLendingContractService.getLendingPool(tokenMint);
        if (!poolData) {
          return NextResponse.json({ error: 'Pool not found' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: {
            address: tokenMint.toString(),
            asset: token,
            totalSupply: poolData.totalSupply.toNumber() / Math.pow(10, 9),
            totalBorrows: poolData.totalBorrows.toNumber() / Math.pow(10, 9),
            supplyRate: poolData.supplyRate.toNumber() / 100, // Convert from basis points
            borrowRate: poolData.borrowRate.toNumber() / 100,
            utilizationRate: poolData.totalSupply.toNumber() > 0 
              ? (poolData.totalBorrows.toNumber() / poolData.totalSupply.toNumber()) * 100
              : 0,
            liquidationThreshold: poolData.liquidationThreshold.toNumber() / 100,
            liquidationBonus: poolData.liquidationBonus.toNumber() / 100,
            lastUpdate: poolData.lastUpdateTimestamp.toNumber()
          }
        });

      case 'get_user_position':
        const userData = await tngLendingContractService.getUserAccount(userKeypair.publicKey, tokenMint);
        if (!userData) {
          return NextResponse.json({
            success: true,
            data: {
              suppliedAmount: 0,
              borrowedAmount: 0,
              liquidityTokens: 0,
              healthFactor: Number.MAX_SAFE_INTEGER
            }
          });
        }

        const poolInfo = await tngLendingContractService.getLendingPool(tokenMint);
        const healthFactor = poolInfo 
          ? tngLendingContractService.calculateHealthFactor(
              userData.suppliedAmount.toNumber() / Math.pow(10, 9),
              userData.borrowedAmount.toNumber() / Math.pow(10, 9),
              poolInfo.liquidationThreshold.toNumber()
            )
          : Number.MAX_SAFE_INTEGER;

        return NextResponse.json({
          success: true,
          data: {
            suppliedAmount: userData.suppliedAmount.toNumber() / Math.pow(10, 9),
            borrowedAmount: userData.borrowedAmount.toNumber() / Math.pow(10, 9),
            liquidityTokens: userData.liquidityTokens.toNumber() / Math.pow(10, 9),
            healthFactor: healthFactor,
            lastSupplyTimestamp: userData.lastSupplyTimestamp.toNumber(),
            lastBorrowTimestamp: userData.lastBorrowTimestamp.toNumber()
          }
        });

      case 'get_all_pools':
        const allPools = await tngLendingContractService.getAllLendingPools();
        const poolsData = allPools.map(pool => ({
          address: pool.address,
          asset: 'Unknown', // Would need to map from mint address
          totalSupply: pool.data.totalSupply.toNumber() / Math.pow(10, 9),
          totalBorrows: pool.data.totalBorrows.toNumber() / Math.pow(10, 9),
          supplyRate: pool.data.supplyRate.toNumber() / 100,
          borrowRate: pool.data.borrowRate.toNumber() / 100,
          utilizationRate: pool.data.totalSupply.toNumber() > 0 
            ? (pool.data.totalBorrows.toNumber() / pool.data.totalSupply.toNumber()) * 100
            : 0,
          liquidationThreshold: pool.data.liquidationThreshold.toNumber() / 100,
          liquidationBonus: pool.data.liquidationBonus.toNumber() / 100
        }));

        return NextResponse.json({
          success: true,
          data: poolsData
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Operation failed',
        signature: result.signature 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signature: result.signature,
      data: result.data,
      explorerUrl: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`
    });

  } catch (error: any) {
    console.error('Lending API error:', error);
    return NextResponse.json({
      error: error.message || 'Internal server error',
      details: error.toString()
    }, { status: 500 });
  }
})
