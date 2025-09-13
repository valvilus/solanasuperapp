/**
 * TNG Farming Contract API
 * Direct smart contract interaction endpoint
 * Handles: Add/Remove Liquidity, Stake/Unstake LP tokens, Claim Rewards
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { tngFarmingContractService } from '@/lib/onchain/tng-farming-contract.service';

// Token mint constants
const TNG_MINT = new PublicKey("FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs");
const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // USDC devnet

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userAddress = searchParams.get('userAddress');
    const poolType = searchParams.get('poolType') || 'TNG_SOL';

    // Determine token mints based on pool type
    const [tokenAMint, tokenBMint] = poolType === 'TNG_USDC' 
      ? [TNG_MINT, USDC_MINT] 
      : [TNG_MINT, SOL_MINT];

    switch (action) {
      case 'pool_data':
        const poolData = await tngFarmingContractService.getFarmingPoolData(tokenAMint, tokenBMint);
        return NextResponse.json({
          success: true,
          data: {
            pool: poolData,
            poolType,
            tokenA: {
              mint: tokenAMint.toString(),
              symbol: 'TNG',
              decimals: 9
            },
            tokenB: {
              mint: tokenBMint.toString(),
              symbol: poolType === 'TNG_USDC' ? 'USDC' : 'SOL',
              decimals: poolType === 'TNG_USDC' ? 6 : 9
            }
          }
        });

      case 'user_farm':
        if (!userAddress) {
          return NextResponse.json(
            { success: false, error: 'User address is required' },
            { status: 400 }
          );
        }

        const userPublicKey = new PublicKey(userAddress);
        const userFarmData = await tngFarmingContractService.getUserFarmData(userPublicKey, tokenAMint, tokenBMint);
        const pendingRewards = await tngFarmingContractService.calculatePendingRewards(userPublicKey, tokenAMint, tokenBMint);

        return NextResponse.json({
          success: true,
          data: {
            userFarm: userFarmData,
            pendingRewards,
            poolType
          }
        });

      case 'all_pools':
        // Get data for both TNG/SOL and TNG/USDC pools
        const tngSolPool = await tngFarmingContractService.getFarmingPoolData(TNG_MINT, SOL_MINT);
        const tngUsdcPool = await tngFarmingContractService.getFarmingPoolData(TNG_MINT, USDC_MINT);

        return NextResponse.json({
          success: true,
          data: {
            pools: [
              {
                type: 'TNG_SOL',
                name: 'TNG/SOL',
                ...tngSolPool,
                tokenA: { symbol: 'TNG', decimals: 9 },
                tokenB: { symbol: 'SOL', decimals: 9 }
              },
              {
                type: 'TNG_USDC',
                name: 'TNG/USDC',
                ...tngUsdcPool,
                tokenA: { symbol: 'TNG', decimals: 9 },
                tokenB: { symbol: 'USDC', decimals: 6 }
              }
            ]
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Farming contract GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userAddress, poolType = 'TNG_SOL', ...params } = body;

    if (!userAddress) {
      return NextResponse.json(
        { success: false, error: 'User address is required' },
        { status: 400 }
      );
    }

    const userPublicKey = new PublicKey(userAddress);
    
    // Determine token mints based on pool type
    const [tokenAMint, tokenBMint] = poolType === 'TNG_USDC' 
      ? [TNG_MINT, USDC_MINT] 
      : [TNG_MINT, SOL_MINT];

    let result;

    switch (action) {
      case 'add_liquidity':
        const { tngAmount, otherAmount, minimumLpTokens = 0 } = params;
        
        if (!tngAmount || !otherAmount) {
          return NextResponse.json(
            { success: false, error: 'TNG amount and other token amount are required' },
            { status: 400 }
          );
        }

        result = await tngFarmingContractService.addLiquidity(
          userPublicKey as any,
          tokenAMint,
          tokenBMint,
          Math.floor(tngAmount * 1e9), // Convert to lamports
          Math.floor(otherAmount * (poolType === 'TNG_USDC' ? 1e6 : 1e9)), // USDC has 6 decimals
          minimumLpTokens
        );

        return NextResponse.json({
          success: true,
          data: {
            signature: result.signature,
            action: 'add_liquidity',
            poolType,
            amounts: {
              tng: tngAmount,
              other: otherAmount
            }
          }
        });

      case 'remove_liquidity':
        const { lpTokens, minTngAmount = 0, minOtherAmount = 0 } = params;
        
        if (!lpTokens) {
          return NextResponse.json(
            { success: false, error: 'LP token amount is required' },
            { status: 400 }
          );
        }

        result = await tngFarmingContractService.removeLiquidity(
          userPublicKey,
          tokenAMint,
          tokenBMint,
          Math.floor(lpTokens * 1e9),
          Math.floor(minTngAmount * 1e9),
          Math.floor(minOtherAmount * (poolType === 'TNG_USDC' ? 1e6 : 1e9))
        );

        return NextResponse.json({
          success: true,
          data: {
            signature: result.signature,
            action: 'remove_liquidity',
            poolType,
            lpTokens
          }
        });

      case 'stake':
        const { lpAmount } = params;
        
        if (!lpAmount) {
          return NextResponse.json(
            { success: false, error: 'LP amount is required' },
            { status: 400 }
          );
        }

        result = await tngFarmingContractService.stakeLpTokens(
          userPublicKey,
          tokenAMint,
          tokenBMint,
          Math.floor(lpAmount * 1e9)
        );

        return NextResponse.json({
          success: true,
          data: {
            signature: result.signature,
            action: 'stake',
            poolType,
            lpAmount
          }
        });

      case 'unstake':
        const { unstakeAmount } = params;
        
        if (!unstakeAmount) {
          return NextResponse.json(
            { success: false, error: 'Unstake amount is required' },
            { status: 400 }
          );
        }

        result = await tngFarmingContractService.unstakeLpTokens(
          userPublicKey,
          tokenAMint,
          tokenBMint,
          Math.floor(unstakeAmount * 1e9)
        );

        return NextResponse.json({
          success: true,
          data: {
            signature: result.signature,
            action: 'unstake',
            poolType,
            unstakeAmount
          }
        });

      case 'claim':
        result = await tngFarmingContractService.claimRewards(
          userPublicKey,
          tokenAMint,
          tokenBMint
        );

        return NextResponse.json({
          success: true,
          data: {
            signature: result.signature,
            action: 'claim_rewards',
            poolType
          }
        });

      case 'initialize':
        // Admin function - initialize pool
        const { tngReserve, otherReserve, rewardRate } = params;
        
        if (!tngReserve || !otherReserve || !rewardRate) {
          return NextResponse.json(
            { success: false, error: 'All initialization parameters are required' },
            { status: 400 }
          );
        }

        result = await tngFarmingContractService.initializePool(
          tokenAMint,
          tokenBMint,
          Math.floor(tngReserve * 1e9),
          Math.floor(otherReserve * (poolType === 'TNG_USDC' ? 1e6 : 1e9)),
          rewardRate
        );

        return NextResponse.json({
          success: true,
          data: {
            ...result,
            action: 'initialize_pool',
            poolType
          }
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('Farming contract POST error:', error);
    
    // Handle specific Solana/Anchor errors
    if (error.message?.includes('insufficient funds')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient funds for transaction' },
        { status: 400 }
      );
    }
    
    if (error.message?.includes('Account does not exist')) {
      return NextResponse.json(
        { success: false, error: 'Required account does not exist' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
