/**
 * API Route: Get User Farm Data
 * Returns user's farming position and pending rewards
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { tngFarmingContractService } from '@/lib/onchain/tng-farming-contract.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenA = searchParams.get('tokenA');
    const tokenB = searchParams.get('tokenB');
    const user = searchParams.get('user');

    if (!tokenA || !tokenB || !user) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: tokenA, tokenB, user'
      }, { status: 400 });
    }

    // Validate public keys
    let tokenAMint: PublicKey;
    let tokenBMint: PublicKey;
    let userPublicKey: PublicKey;
    
    try {
      tokenAMint = new PublicKey(tokenA);
      tokenBMint = new PublicKey(tokenB);
      userPublicKey = new PublicKey(user);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid public key addresses'
      }, { status: 400 });
    }

    console.log(' Fetching user farm data:', {
      tokenA: tokenAMint.toString(),
      tokenB: tokenBMint.toString(),
      user: userPublicKey.toString()
    });

    // Get user farm data from farming contract
    const userFarmData = await tngFarmingContractService.getUserFarmData(
      userPublicKey, 
      tokenAMint, 
      tokenBMint
    );

    if (!userFarmData) {
      return NextResponse.json({
        success: true,
        data: {
          userFarm: null,
          message: 'User has no farming position'
        }
      });
    }

    // Calculate pending rewards
    const pendingRewards = await tngFarmingContractService.calculatePendingRewards(
      userPublicKey,
      tokenAMint,
      tokenBMint
    );

    // Format data for frontend
    const lpStakedNum = parseFloat(userFarmData.lpStaked) / Math.pow(10, 9);
    const pendingRewardsNum = parseFloat(pendingRewards) / Math.pow(10, 9);

    const response = {
      userFarm: {
        ...userFarmData,
        // Add formatted values
        lpStakedFormatted: lpStakedNum,
        pendingRewardsFormatted: pendingRewardsNum,
        totalPendingRewards: pendingRewards
      }
    };

    console.log(' User farm data fetched successfully');

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error(' Error fetching user farm data:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
