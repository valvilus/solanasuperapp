/**
 * API Route: Get Farming Pool Data
 * Returns pool reserves, LP supply, and other pool information
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { tngFarmingContractService } from '@/lib/onchain/tng-farming-contract.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenA = searchParams.get('tokenA');
    const tokenB = searchParams.get('tokenB');

    if (!tokenA || !tokenB) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: tokenA, tokenB'
      }, { status: 400 });
    }

    // Validate public keys
    let tokenAMint: PublicKey;
    let tokenBMint: PublicKey;
    
    try {
      tokenAMint = new PublicKey(tokenA);
      tokenBMint = new PublicKey(tokenB);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid token mint addresses'
      }, { status: 400 });
    }

    console.log(' Fetching farming pool data:', {
      tokenA: tokenAMint.toString(),
      tokenB: tokenBMint.toString()
    });

    // Get pool data from farming contract
    const poolData = await tngFarmingContractService.getFarmingPoolData(tokenAMint, tokenBMint);

    if (!poolData) {
      return NextResponse.json({
        success: false,
        error: 'Pool not found'
      }, { status: 404 });
    }

    // Calculate additional metrics
    const tngReserveNum = parseFloat(poolData.tngReserve) / Math.pow(10, 9);
    const otherReserveNum = parseFloat(poolData.otherReserve) / Math.pow(10, 9);
    const lpSupplyNum = parseFloat(poolData.lpSupply) / Math.pow(10, 9);

    // Calculate current exchange rate
    // tngToOther = how much OTHER per 1 TNG
    // otherToTng = how much TNG per 1 OTHER
    const tngToOther = tngReserveNum > 0 ? otherReserveNum / tngReserveNum : 0;
    const otherToTng = otherReserveNum > 0 ? tngReserveNum / otherReserveNum : 0;

    // Calculate TVL (mock pricing for now)
    const tngPrice = 0.1; // $0.10 per TNG (mock)
    const solPrice = 100; // $100 per SOL (mock)
    const tvl = (tngReserveNum * tngPrice) + (otherReserveNum * solPrice);

    const response = {
      pool: {
        ...poolData,
        // Add calculated metrics
        exchangeRate: {
          tngToOther: tngToOther,
          otherToTng: otherToTng
        },
        tvl,
        reserves: {
          tng: tngReserveNum,
          other: otherReserveNum
        },
        lpSupplyFormatted: lpSupplyNum
      }
    };

    console.log(' Farming pool data fetched successfully');

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error(' Error fetching farming pool data:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
