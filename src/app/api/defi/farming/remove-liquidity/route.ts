/**
 * API Route: Remove Liquidity from Farming Pool
 * Handles liquidity removal with proper calculations
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { tngFarmingContractService } from '@/lib/onchain/tng-farming-contract.service';

interface RemoveLiquidityRequest {
  userPublicKey: string;
  tokenAMint: string;
  tokenBMint: string;
  lpTokens: number; // In lamports
  minAmountA?: number;
  minAmountB?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RemoveLiquidityRequest = await request.json();
    
    const {
      userPublicKey,
      tokenAMint,
      tokenBMint,
      lpTokens,
      minAmountA = 0,
      minAmountB = 0
    } = body;

    // Validate required fields
    if (!userPublicKey || !tokenAMint || !tokenBMint || !lpTokens) {
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
    if (lpTokens <= 0) {
      return NextResponse.json({
        success: false,
        error: 'LP tokens amount must be greater than 0'
      }, { status: 400 });
    }

    console.log(' Removing liquidity from farming pool:', {
      user: userPubkey.toString(),
      tokenA: tokenAMintPubkey.toString(),
      tokenB: tokenBMintPubkey.toString(),
      lpTokens,
      minAmountA,
      minAmountB
    });

    // Execute remove liquidity transaction
    const result = await tngFarmingContractService.removeLiquidity(
      userPubkey,
      tokenAMintPubkey,
      tokenBMintPubkey,
      lpTokens,
      minAmountA,
      minAmountB
    );

    console.log(' Liquidity removed successfully:', result.signature);

    return NextResponse.json({
      success: true,
      data: {
        signature: result.signature,
        message: 'Liquidity removed successfully'
      }
    });

  } catch (error) {
    console.error(' Error removing liquidity:', error);
    
    // Parse Anchor errors for better user feedback
    let errorMessage = 'Failed to remove liquidity';
    
    if (error instanceof Error) {
      if (error.message.includes('InsufficientLiquidity')) {
        errorMessage = 'Insufficient LP tokens or pool liquidity';
      } else if (error.message.includes('SlippageExceeded')) {
        errorMessage = 'Minimum amount requirements not met';
      } else if (error.message.includes('InsufficientFunds')) {
        errorMessage = 'Insufficient LP token balance';
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
