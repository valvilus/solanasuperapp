/**
 * API Route: Add Liquidity to Farming Pool
 * Handles liquidity addition with proper ratio validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { tngFarmingContractService } from '@/lib/onchain/tng-farming-contract.service';
import { validateSlippage } from '@/lib/utils/pool-utils';

interface AddLiquidityRequest {
  userPublicKey: string;
  tokenAMint: string;
  tokenBMint: string;
  amountA: number; // In lamports
  amountB: number; // In lamports
  slippageBps?: number; // Basis points
  minimumLpTokens?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: AddLiquidityRequest = await request.json();
    
    const {
      userPublicKey,
      tokenAMint,
      tokenBMint,
      amountA,
      amountB,
      slippageBps = 50, // Default 0.5%
      minimumLpTokens = 0
    } = body;

    // Validate required fields
    if (!userPublicKey || !tokenAMint || !tokenBMint || !amountA || !amountB) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Validate public keys
    let userPubkey: PublicKey;
    let tokenAMintPubkey: PublicKey;
    let tokenBMintPubkey: PublicKey;
    
    try {
      userPubkey = new PublicKey(userPublicKey);
      tokenAMintPubkey = new PublicKey(tokenAMint);
      tokenBMintPubkey = new PublicKey(tokenBMint);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid public key addresses'
      }, { status: 400 });
    }

    // Validate amounts
    if (amountA <= 0 || amountB <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amounts must be greater than 0'
      }, { status: 400 });
    }

    // Validate slippage
    if (slippageBps < 0 || slippageBps > 2000) {
      return NextResponse.json({
        success: false,
        error: 'Slippage must be between 0 and 2000 basis points (20%)'
      }, { status: 400 });
    }

    console.log(' Adding liquidity to farming pool:', {
      user: userPubkey.toString(),
      tokenA: tokenAMintPubkey.toString(),
      tokenB: tokenBMintPubkey.toString(),
      amountA,
      amountB,
      slippageBps
    });

    // Get current pool data to validate ratios
    const poolData = await tngFarmingContractService.getFarmingPoolData(
      tokenAMintPubkey,
      tokenBMintPubkey
    );

    // If pool exists and has liquidity, validate ratios
    if (poolData && parseFloat(poolData.lpSupply) > 0) {
      const reserveA = parseFloat(poolData.tngReserve);
      const reserveB = parseFloat(poolData.otherReserve);
      
      // Calculate expected amounts
      const expectedAmountB = (amountA * reserveB) / reserveA;
      const expectedAmountA = (amountB * reserveA) / reserveB;
      
      // Validate slippage (convert from lamports for calculation)
      const amountADecimal = amountA / Math.pow(10, 9);
      const amountBDecimal = amountB / Math.pow(10, 9);
      const expectedADecimal = expectedAmountA / Math.pow(10, 9);
      const expectedBDecimal = expectedAmountB / Math.pow(10, 9);
      
      const slippagePercent = slippageBps / 100;
      const validation = validateSlippage(
        amountADecimal,
        amountBDecimal,
        expectedADecimal,
        expectedBDecimal,
        slippagePercent
      );

      if (!validation.isValid) {
        return NextResponse.json({
          success: false,
          error: `Ratio mismatch exceeds slippage tolerance. TNG deviation: ${validation.deviationA.toFixed(2)}%, Other deviation: ${validation.deviationB.toFixed(2)}%`,
          details: {
            providedAmountA: amountADecimal,
            providedAmountB: amountBDecimal,
            expectedAmountA: expectedADecimal,
            expectedAmountB: expectedBDecimal,
            deviationA: validation.deviationA,
            deviationB: validation.deviationB,
            maxSlippage: slippagePercent
          }
        }, { status: 400 });
      }
    }

    // Execute add liquidity transaction
    // Note: Converting PublicKey to Keypair is not secure for production
    // This is a temporary fix - proper implementation would require signed transaction
    // @ts-ignore - Temporary workaround for server-side demo
    const mockKeypair = { 
      publicKey: userPubkey,
      secretKey: new Uint8Array(64) // Mock secret key for demo
    } as any;
    
    const result = await tngFarmingContractService.addLiquidity(
      mockKeypair,
      tokenAMintPubkey,
      tokenBMintPubkey,
      amountA,
      amountB,
      minimumLpTokens
    );

    console.log(' Liquidity added successfully:', result.signature);

    return NextResponse.json({
      success: true,
      data: {
        signature: result.signature,
        message: 'Liquidity added successfully'
      }
    });

  } catch (error) {
    console.error(' Error adding liquidity:', error);
    
    // Parse Anchor errors for better user feedback
    let errorMessage = 'Failed to add liquidity';
    
    if (error instanceof Error) {
      if (error.message.includes('RatioMismatch')) {
        errorMessage = 'Token ratio does not match pool reserves within slippage tolerance';
      } else if (error.message.includes('SlippageExceeded')) {
        errorMessage = 'Slippage tolerance exceeded';
      } else if (error.message.includes('InsufficientFunds')) {
        errorMessage = 'Insufficient token balance';
      } else if (error.message.includes('PoolInactive')) {
        errorMessage = 'Farming pool is currently inactive';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
