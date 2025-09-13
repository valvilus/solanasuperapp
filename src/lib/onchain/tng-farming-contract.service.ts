/**
 * TNG Farming Contract Service
 * Direct interaction with TNG Farming Anchor program
 * Handles: Add/Remove Liquidity, Stake/Unstake LP tokens, Claim Rewards
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";

// Simple wallet wrapper for server-side usage
class SimpleWallet {
  constructor(public payer: Keypair) {}
  
  get publicKey() {
    return this.payer.publicKey;
  }
  
  async signTransaction(tx: any) {
    tx.partialSign(this.payer);
    return tx;
  }
  
  async signAllTransactions(txs: any[]) {
    return txs.map(tx => {
      tx.partialSign(this.payer);
      return tx;
    });
  }
}
import { 
  Connection, 
  PublicKey, 
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError
} from "@solana/spl-token";
import bs58 from 'bs58';
import fs from 'fs';
import path from 'path';

// Import IDL
import tngFarmingIdl from '@/lib/idl/tng_farming.json';

export class TngFarmingContractService {
  private connection: Connection;
  private program: Program | null = null;
  private sponsorKeypair: Keypair | null = null;
  private initialized = false;

  // Program and token addresses
  private readonly PROGRAM_ID = new PublicKey("12wefd8c4mZ1YzuYLAzVJWge5hZx2Ey96fdpVSxRTC9F");
  private readonly TNG_MINT = new PublicKey("FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs");
  private readonly SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

  constructor() {
    // Initialize connection
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
      "confirmed"
    );

    // Only skip initialization during Next.js build process
    if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
      console.log('🔧 TngFarmingContractService: Skipping initialization during build')
      return
    }

    // Initialize in all runtime cases (development, runtime production, etc.)
    this.initializeService();
  }

  private initializeService() {
    try {
      // Load sponsor keypair from environment, file, or generate for development
      this.sponsorKeypair = this.loadSponsorKeypair();

      // Initialize Anchor program
      this.initializeProgram();
      this.initialized = true;
    } catch (error) {
      console.warn('⚠️ TngFarmingContractService initialization failed:', error);
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      this.initializeService()
    }
    
    if (!this.program || !this.sponsorKeypair) {
      console.error('TngFarmingContractService initialization failed:', {
        hasProgram: !!this.program,
        hasSponsorKeypair: !!this.sponsorKeypair,
        initialized: this.initialized,
        nodeEnv: process.env.NODE_ENV
      })
      throw new Error('TngFarmingContractService not properly initialized - check SPONSOR_PRIVATE_KEY environment variable')
    }
  }

  private loadSponsorKeypair(): Keypair {
    // Try environment variable first
    const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY;
    
    if (sponsorPrivateKey && sponsorPrivateKey.trim()) {
      try {
        // Try to parse as JSON array first
        let privateKeyArray;
        if (sponsorPrivateKey.startsWith('[')) {
          privateKeyArray = JSON.parse(sponsorPrivateKey);
        } else if (sponsorPrivateKey.length >= 32) {
          // If it's a base58 string, decode it (only if it's long enough)
          const decoded = bs58.decode(sponsorPrivateKey);
          privateKeyArray = Array.from(decoded);
        } else {
          throw new Error("Private key too short");
        }
        
        console.log(" Sponsor keypair loaded from environment");
        return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
      } catch (error) {
        // Don't log the error if it's just a placeholder or invalid format
        if (!sponsorPrivateKey.includes('your_private_key') && !sponsorPrivateKey.includes('placeholder')) {
          console.warn(" Invalid SPONSOR_PRIVATE_KEY format in environment, trying file...");
        }
      }
    }

    // Try to load from file
    try {
      const keypairPath = path.join(process.cwd(), 'keys', 'mvp-sponsor-keypair.json');
      if (fs.existsSync(keypairPath)) {
        const keypairData = fs.readFileSync(keypairPath, 'utf8');
        const privateKeyArray = JSON.parse(keypairData);
        const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
        console.log(" Sponsor keypair loaded from file:", keypair.publicKey.toString());
        return keypair;
      } else {
        console.warn(" Sponsor keypair file not found at:", keypairPath);
      }
    } catch (error) {
      console.warn(" Failed to load sponsor keypair from file:", error);
    }

    // Generate a new keypair for development
    console.warn(" No sponsor keypair found, generating new development keypair");
    const newKeypair = Keypair.generate();
    console.log(" Development sponsor address:", newKeypair.publicKey.toString());
    console.log(" To use a persistent sponsor, set SPONSOR_PRIVATE_KEY environment variable or place mvp-sponsor-keypair.json in keys/ directory");
    return newKeypair;
  }

  private initializeProgram() {
    if (!this.sponsorKeypair) {
      throw new Error('Sponsor keypair not loaded');
    }

    try {
      // Create provider
      const provider = new AnchorProvider(
        this.connection,
        new SimpleWallet(this.sponsorKeypair) as any,
        { commitment: "confirmed" }
      );

      // Initialize program with local IDL
      this.program = new Program(
        tngFarmingIdl as any,
        provider
      );

      console.log("✅ TNG Farming Contract Service initialized");
      console.log(" Program ID:", this.PROGRAM_ID.toString());
    } catch (error) {
      console.error("Failed to initialize TNG Farming program:", error);
      throw error;
    }
  }

  /**
   * Get farming pool PDA for token pair
   */
  private getFarmingPoolPDA(tokenAMint: PublicKey, tokenBMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("farming_pool"), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
      this.PROGRAM_ID
    );
  }

  /**
   * Get user farm PDA
   */
  private getUserFarmPDA(user: PublicKey, farmingPool: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("user_farm"), user.toBuffer(), farmingPool.toBuffer()],
      this.PROGRAM_ID
    );
  }

  /**
   * Initialize farming pool (admin function)
   */
  async initializePool(
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    tngReserve: number,
    otherReserve: number,
    rewardRate: number
  ) {
    try {
      await this.ensureInitialized();
      const [farmingPoolPDA] = this.getFarmingPoolPDA(tokenAMint, tokenBMint);

      // Get associated token addresses
      const tngVault = await getAssociatedTokenAddress(tokenAMint, farmingPoolPDA, true);
      const otherVault = await getAssociatedTokenAddress(tokenBMint, farmingPoolPDA, true);
      const rewardVault = await getAssociatedTokenAddress(tokenAMint, farmingPoolPDA, true);
      
      // Create LP mint keypair
      const lpMintKeypair = Keypair.generate();

      const tx = await this.program.methods
        .initializePool(
          new BN(tngReserve),
          new BN(otherReserve),
          new BN(rewardRate)
        )
        .accounts({
          authority: this.sponsorKeypair.publicKey,
          payer: this.sponsorKeypair.publicKey,
          farmingPool: farmingPoolPDA,
          tngMint: tokenAMint,
          otherMint: tokenBMint,
          tngVault: tngVault,
          otherVault: otherVault,
          rewardVault: rewardVault,
          lpMint: lpMintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.sponsorKeypair, lpMintKeypair])
        .rpc();

      return {
        signature: tx,
        farmingPoolPDA: farmingPoolPDA.toString(),
        lpMint: lpMintKeypair.publicKey.toString(),
        tngVault: tngVault.toString(),
        otherVault: otherVault.toString(),
        rewardVault: rewardVault.toString()
      };
    } catch (error) {
      console.error("Initialize pool error:", error);
      throw error;
    }
  }

  /**
   * Add liquidity to farming pool
   */
  async addLiquidity(
    userKeypair: Keypair,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    tngAmount: number,
    otherAmount: number,
    minimumLpTokens: number = 0,
    slippageBps: number = 500 // Default 5% slippage
  ) {
    try {
      await this.ensureInitialized();
      const [farmingPoolPDA] = this.getFarmingPoolPDA(tokenAMint, tokenBMint);
      
      // Check if pool exists, if not - initialize it first
      let poolData;
      let lpMint: PublicKey;
      
      try {
        poolData = await (this.program.account as any).farmingPool.fetch(farmingPoolPDA);
        lpMint = new PublicKey(poolData.lpMint);
        console.log(' Farming pool exists, using existing pool');
      } catch (error) {
        console.log(' Farming pool not found, initializing automatically...');
        
        // Auto-initialize pool with EXACT initial liquidity amounts
        const isUSDCPool = tokenBMint.equals(new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'));
        const isSOLPool = tokenBMint.equals(new PublicKey('So11111111111111111111111111111111111111112'));
        
        let initialTngReserve, initialOtherReserve;
        
        if (isSOLPool) {
          // TNG-SOL pool: соотношение 1000 TNG = 1 SOL
          initialTngReserve = 1000 * 1e9;  // 1000 TNG
          initialOtherReserve = 1 * 1e9;   // 1 SOL
        } else if (isUSDCPool) {
          // TNG-USDC pool: соотношение 1 TNG = 1 USDC  
          initialTngReserve = 100 * 1e9;   // 100 TNG
          initialOtherReserve = 100 * 1e6; // 100 USDC
        } else {
          // Default fallback
          initialTngReserve = 1000 * 1e9;
          initialOtherReserve = 1 * 1e9;
        }
        
        console.log('🔧 Initializing pool with reserves:', {
          tngReserve: initialTngReserve,
          otherReserve: initialOtherReserve,
          tokenA: tokenAMint.toString(),
          tokenB: tokenBMint.toString()
        });
        
        const initResult = await this.initializePool(
          tokenAMint,
          tokenBMint,
          initialTngReserve,
          initialOtherReserve,
          1000000      // 0.001 TNG per second reward rate
        );
        
        console.log(' Pool auto-initialized:', initResult.farmingPoolPDA);
        
        // Now fetch the initialized pool data
        poolData = await (this.program.account as any).farmingPool.fetch(farmingPoolPDA);
        lpMint = new PublicKey(poolData.lpMint);
      }

      // Get or create user token accounts (they MUST exist for farming contract)
      const userTngAccountInfo = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.sponsorKeypair,
        tokenAMint,
        userKeypair.publicKey
      );
      
      const userOtherAccountInfo = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.sponsorKeypair,
        tokenBMint,
        userKeypair.publicKey
      );
      
      const userTngAccount = userTngAccountInfo.address;
      const userOtherAccount = userOtherAccountInfo.address;
      const userLpAccount = await getAssociatedTokenAddress(lpMint, userKeypair.publicKey);

      // Get vault addresses (from pool data, not calculated)
      const tngVault = new PublicKey(poolData.tngVault);
      const otherVault = new PublicKey(poolData.otherVault);
      
      console.log(' AddLiquidity account debug (V2 WITH MINT FIX):', {
        userTngAccount: userTngAccount.toBase58(),
        userOtherAccount: userOtherAccount.toBase58(),
        userLpAccount: userLpAccount.toBase58(),
        lpMint: lpMint.toBase58(),
        tngVault: tngVault.toBase58(),
        otherVault: otherVault.toBase58(),
        farmingPool: farmingPoolPDA.toBase58(),
        tokenAMint: tokenAMint.toBase58(),
        tokenBMint: tokenBMint.toBase58()
      });
      
      // Log user account creation/existence
      console.log(' User accounts prepared:', {
        userTngAccountCreated: userTngAccountInfo.amount === BigInt(0) ? 'NEW' : 'EXISTING',
        userTngAccountBalance: userTngAccountInfo.amount.toString(),
        userOtherAccountCreated: userOtherAccountInfo.amount === BigInt(0) ? 'NEW' : 'EXISTING', 
        userOtherAccountBalance: userOtherAccountInfo.amount.toString(),
        userTngAccount: userTngAccount.toBase58(),
        userOtherAccount: userOtherAccount.toBase58()
      });

      console.log(' Program info:', {
        programId: this.program.programId.toBase58(),
        provider: this.program.provider.publicKey?.toBase58() || 'NO_PROVIDER',
        connection: this.connection.rpcEndpoint
      });

      // CRITICAL: Ensure user account exists as system account
      const userAccountInfo = await this.connection.getAccountInfo(userKeypair.publicKey);
      console.log(' User account check:', {
        address: userKeypair.publicKey.toBase58(),
        exists: !!userAccountInfo,
        lamports: userAccountInfo?.lamports || 0
      });

      if (!userAccountInfo) {
        console.log(' User system account does not exist - this may cause init_if_needed to fail!');
        console.log(' Creating user system account...');
        
        // Create a simple transfer to user to create system account
        const createUserTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: this.sponsorKeypair.publicKey,
            toPubkey: userKeypair.publicKey,
            lamports: 1000000, // 0.001 SOL
          })
        );
        
        try {
          const createUserSig = await this.connection.sendTransaction(createUserTx, [this.sponsorKeypair]);
          console.log(' User system account created:', createUserSig);
        } catch (createError) {
          console.log(' Failed to create user system account:', createError.message);
        }
      }
      
      console.log(' ABOUT TO CALL ADDLIQUIDITY - FINAL ACCOUNTS CHECK:');
      console.log('  All accounts being passed:', Object.keys({
        user: userKeypair.publicKey,
        payer: this.sponsorKeypair.publicKey,
        farmingPool: farmingPoolPDA,
        userTngAccount: userTngAccount,
        userOtherAccount: userOtherAccount,
        userLpAccount: userLpAccount,
        lpMint: lpMint,
        tngMint: tokenAMint,
        otherMint: tokenBMint,
        tngVault: tngVault,
        otherVault: otherVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      }));

      // Проверяем состояние резервов пула
      const currentTngReserve = Number(poolData.tngReserve || 0);
      const currentOtherReserve = Number(poolData.otherReserve || 0);
      const isFirstLiquidity = currentTngReserve === 0 && currentOtherReserve === 0;
      
      // Добавляем диагностическое логгирование
      console.log('🔍 Pool reserves debug:', {
        currentTngReserve: currentTngReserve.toString(),
        currentOtherReserve: currentOtherReserve.toString(),
        inputAmountA: tngAmount.toString(),
        inputAmountB: otherAmount.toString(),
        calculatedRatio: (otherAmount / tngAmount).toFixed(6),
        poolRatio: !isFirstLiquidity ? 
          (currentOtherReserve / currentTngReserve).toFixed(6) : 'FIRST_LIQUIDITY',
        slippageBps,
        minimumLpTokens,
        isFirstLiquidity
      });
      
      // Для первого добавления ликвидности корректируем amounts 
      let finalTngAmount = tngAmount;
      let finalOtherAmount = otherAmount;
      
      if (isFirstLiquidity) {
        console.log('🎯 First liquidity detected - using safe initial ratio');
        // Для первой ликвидности используем 1:1 соотношение по стоимости
        // Например: 1000 TNG = 1 SOL (примерно равные по стоимости)
        const isSOLPool = tokenBMint.equals(new PublicKey('So11111111111111111111111111111111111111112'));
        
        if (isSOLPool) {
          // TNG-SOL: используем соотношение 1000:1 (1000 TNG = 1 SOL)
          finalTngAmount = Math.max(1000 * 1e9, tngAmount); // Минимум 1000 TNG
          finalOtherAmount = Math.max(1 * 1e9, Math.floor(finalTngAmount / 1000)); // 1 SOL на 1000 TNG
        } else {
          // TNG-USDC: используем соотношение 1:1 по стоимости (если TNG ≈ $1)
          finalTngAmount = Math.max(100 * 1e9, tngAmount); // Минимум 100 TNG  
          finalOtherAmount = Math.max(100 * 1e6, Math.floor(finalTngAmount / 1e3)); // 100 USDC
        }
        
        console.log('🔄 Adjusted amounts for first liquidity:', {
          originalTng: tngAmount,
          originalOther: otherAmount,
          finalTng: finalTngAmount,
          finalOther: finalOtherAmount
        });
      }
      
      // Проверяем балансы пользователя перед транзакцией
      const userTngBalance = await getAccount(this.connection, userTngAccount);
      const userOtherBalance = await getAccount(this.connection, userOtherAccount);
      
      console.log('💰 User balance check:', {
        tngBalance: userTngBalance.amount.toString(),
        otherBalance: userOtherBalance.amount.toString(),
        requiredTng: finalTngAmount.toString(),
        requiredOther: finalOtherAmount.toString(),
        hasSufficientTng: Number(userTngBalance.amount) >= finalTngAmount,
        hasSufficientOther: Number(userOtherBalance.amount) >= finalOtherAmount
      });
      
      // Автокорректируем amounts под доступные балансы
      const availableTng = Number(userTngBalance.amount);
      const availableOther = Number(userOtherBalance.amount);
      
      // Если балансов недостаточно, корректируем amounts пропорционально
      if (availableTng < finalTngAmount || availableOther < finalOtherAmount) {
        console.log('⚠️ Insufficient balance detected, auto-correcting amounts...');
        
        // Оставляем небольшой резерв для комиссий
        const tngReserve = Math.max(10 * 1e9, availableTng * 0.02); // 2% или 10 TNG
        const otherReserve = tokenBMint.equals(new PublicKey('So11111111111111111111111111111111111111112')) 
          ? Math.max(0.001 * 1e9, availableOther * 0.05) // 5% SOL или 0.001 SOL для комиссий
          : Math.max(0.1 * 1e6, availableOther * 0.02); // 2% USDC или 0.1 USDC
        
        const maxTng = Math.max(0, availableTng - tngReserve);
        const maxOther = Math.max(0, availableOther - otherReserve);
        
        console.log('💰 Balance calculation debug:', {
          availableTng,
          availableOther,
          tngReserve,
          otherReserve,
          maxTng,
          maxOther,
          requestedTng: finalTngAmount,
          requestedOther: finalOtherAmount
        });
        
        // Если балансы очень маленькие, используем минимальные amounts
        if (maxTng <= 0 || maxOther <= 0) {
          console.log('🔴 Very small balances detected, using minimal amounts...');
          
          // Используем минимально возможные amounts
          finalTngAmount = Math.max(1 * 1e9, Math.floor(availableTng * 0.8)); // 80% от TNG баланса, минимум 1 TNG
          finalOtherAmount = tokenBMint.equals(new PublicKey('So11111111111111111111111111111111111111112'))
            ? Math.max(0.0001 * 1e9, Math.floor(availableOther * 0.8)) // 80% от SOL баланса, минимум 0.0001 SOL
            : Math.max(0.01 * 1e6, Math.floor(availableOther * 0.8)); // 80% от USDC баланса, минимум 0.01 USDC
          
          // Финальная проверка минимальных amounts
          if (finalTngAmount <= 0 || finalOtherAmount <= 0 || availableTng < finalTngAmount || availableOther < finalOtherAmount) {
            const tokenSymbol = tokenBMint.equals(new PublicKey('So11111111111111111111111111111111111111112')) ? 'SOL' : 'USDC';
            throw new Error(`Insufficient balance for any liquidity provision. Need at least 1 TNG and 0.001 ${tokenSymbol}.`);
          }
          
          console.log('🔄 Using minimal amounts:', {
            finalTngAmount,
            finalOtherAmount,
            availableTng,
            availableOther
          });
          } else {
          // Для существующих пулов корректируем под правильное соотношение
          if (!isFirstLiquidity && currentTngReserve > 0 && currentOtherReserve > 0) {
            console.log('🔄 Adjusting amounts to match existing pool ratio...');
            
            // Вычисляем правильное соотношение пула
            const poolRatio = currentOtherReserve / currentTngReserve;
            
            // Определяем какой токен лимитирующий
            const maxTngByBalance = Math.min(maxTng, finalTngAmount);
            const maxOtherByBalance = Math.min(maxOther, finalOtherAmount);
            
            // Рассчитываем amounts основываясь на пропорции пула
            const tngAmountByOther = maxOtherByBalance / poolRatio;
            const otherAmountByTng = maxTngByBalance * poolRatio;
            
            if (tngAmountByOther <= maxTngByBalance) {
              // Other токен лимитирующий
              finalTngAmount = Math.floor(tngAmountByOther);
              finalOtherAmount = Math.floor(maxOtherByBalance);
            } else {
              // TNG токен лимитирующий
              finalTngAmount = Math.floor(maxTngByBalance);
              finalOtherAmount = Math.floor(otherAmountByTng);
            }
            
            console.log('✅ Amounts corrected to pool ratio:', {
              poolRatio: poolRatio.toFixed(6),
              correctedTng: finalTngAmount,
              correctedOther: finalOtherAmount,
              maxTng: maxTngByBalance,
              maxOther: maxOtherByBalance
            });
          } else {
            // Для первой ликвидности просто используем доступные балансы
            const tngLimitRatio = maxTng / finalTngAmount;
            const otherLimitRatio = maxOther / finalOtherAmount;
            const limitingRatio = Math.min(tngLimitRatio, otherLimitRatio, 1.0);
            
            if (limitingRatio > 0 && limitingRatio < 1.0) {
              finalTngAmount = Math.floor(finalTngAmount * limitingRatio);
              finalOtherAmount = Math.floor(finalOtherAmount * limitingRatio);
              
              console.log('✅ First liquidity amounts corrected:', {
                originalTng: tngAmount,
                originalOther: otherAmount,
                correctedTng: finalTngAmount,
                correctedOther: finalOtherAmount,
                limitingRatio: limitingRatio.toFixed(4)
              });
            }
          }
        }
      }
      
      // Финальная проверка после корректировки
      if (availableTng < finalTngAmount) {
        throw new Error(`Still insufficient TNG after correction. Required: ${finalTngAmount}, Available: ${availableTng}`);
      }
      
      if (availableOther < finalOtherAmount) {
        const tokenSymbol = tokenBMint.equals(new PublicKey('So11111111111111111111111111111111111111112')) ? 'SOL' : 'USDC';
        throw new Error(`Still insufficient ${tokenSymbol} after correction. Required: ${finalOtherAmount}, Available: ${availableOther}`);
      }

      const tx = await this.program.methods
        .addLiquidity(
          new BN(finalTngAmount),
          new BN(finalOtherAmount),
          new BN(minimumLpTokens)
        )
        .accounts({
          user: userKeypair.publicKey,
          payer: this.sponsorKeypair.publicKey, // Sponsor pays for ATA creation
          farmingPool: farmingPoolPDA,
          userTngAccount: userTngAccount,
          userOtherAccount: userOtherAccount,
          userLpAccount: userLpAccount,
          lpMint: lpMint,
          tngMint: tokenAMint,
          otherMint: tokenBMint,
          tngVault: tngVault,
          otherVault: otherVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair, this.sponsorKeypair]) // User signs transaction, sponsor pays fees
        .rpc();

      return { signature: tx };
    } catch (error) {
      console.error("Add liquidity error:", error);
      
      // Проверяем если это ошибка RatioMismatch и еще не было retry
      if (error.toString().includes('RatioMismatch') && slippageBps < 1000) {
        console.log('⚠️ Ratio mismatch detected, trying with adjusted parameters...');
        
        try {
          // Получаем свежие данные пула
          const [farmingPoolPDA] = this.getFarmingPoolPDA(tokenAMint, tokenBMint);
          const freshPoolData = await (this.program.account as any).farmingPool.fetch(farmingPoolPDA);
          
          // Рассчитываем правильное соотношение на основе текущих резервов
          const currentReserveA = Number(freshPoolData.tngReserve) / 1e9; // TNG
          const currentReserveB = Number(freshPoolData.otherReserve) / 1e9; // SOL/USDC
          
          if (currentReserveA > 0 && currentReserveB > 0) {
            const poolRatio = currentReserveB / currentReserveA;
            const adjustedOtherAmount = Math.floor((tngAmount / 1e9) * poolRatio * 1e9);
            
            console.log('🔄 Retrying with corrected amounts:', {
              originalTngAmount: tngAmount,
              originalOtherAmount: otherAmount,
              adjustedOtherAmount,
              poolRatio,
              newSlippage: Math.min(slippageBps * 2, 1000)
            });
            
            // Retry с скорректированными параметрами и увеличенным slippage
            return await this.addLiquidity(
              userKeypair,
              tokenAMint,
              tokenBMint,
              tngAmount,
              adjustedOtherAmount,
              minimumLpTokens,
              Math.min(slippageBps * 2, 1000) // Удваиваем slippage, но не больше 10%
            );
          }
        } catch (retryError) {
          console.error('⚠️ Retry also failed:', retryError);
          // Падаем с оригинальной ошибкой
        }
      }
      
      throw error;
    }
  }

  /**
   * Remove liquidity from farming pool
   */
  async removeLiquidity(
    userPublicKey: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    lpTokens: number,
    minTngAmount: number = 0,
    minOtherAmount: number = 0
  ) {
    try {
      const [farmingPoolPDA] = this.getFarmingPoolPDA(tokenAMint, tokenBMint);
      
      // Get pool data to find LP mint
      const poolData = await (this.program.account as any).farmingPool.fetch(farmingPoolPDA);
      const lpMint = new PublicKey(poolData.lpMint);

      // Get user token accounts
      const userTngAccount = await getAssociatedTokenAddress(tokenAMint, userPublicKey);
      const userOtherAccount = await getAssociatedTokenAddress(tokenBMint, userPublicKey);
      const userLpAccount = await getAssociatedTokenAddress(lpMint, userPublicKey);

      // Get vault addresses
      const tngVault = await getAssociatedTokenAddress(tokenAMint, farmingPoolPDA, true);
      const otherVault = await getAssociatedTokenAddress(tokenBMint, farmingPoolPDA, true);

      const tx = await this.program.methods
        .removeLiquidity(
          new BN(lpTokens),
          new BN(minTngAmount),
          new BN(minOtherAmount)
        )
        .accounts({
          user: userPublicKey,
          farmingPool: farmingPoolPDA,
          userTngAccount: userTngAccount,
          userOtherAccount: userOtherAccount,
          userLpAccount: userLpAccount,
          tngMint: tokenAMint,
          otherMint: tokenBMint,
          lpMint: lpMint,
          tngVault: tngVault,
          otherVault: otherVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([]) // User signs this transaction
        .rpc();

      return { signature: tx };
    } catch (error) {
      console.error("Remove liquidity error:", error);
      throw error;
    }
  }

  /**
   * Stake LP tokens for farming rewards
   */
  async stakeLpTokens(
    userPublicKey: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    lpAmount: number
  ) {
    try {
      const [farmingPoolPDA] = this.getFarmingPoolPDA(tokenAMint, tokenBMint);
      const [userFarmPDA] = this.getUserFarmPDA(userPublicKey, farmingPoolPDA);
      
      // Get pool data to find LP mint
      const poolData = await (this.program.account as any).farmingPool.fetch(farmingPoolPDA);
      const lpMint = new PublicKey(poolData.lpMint);

      // Get user LP account and farming vault
      const userLpAccount = await getAssociatedTokenAddress(lpMint, userPublicKey);
      const lpVault = await getAssociatedTokenAddress(lpMint, farmingPoolPDA, true);

      const tx = await this.program.methods
        .stakeLpTokens(new BN(lpAmount))
        .accounts({
          user: userPublicKey,
          payer: this.sponsorKeypair.publicKey, // Sponsor pays for PDA creation
          farmingPool: farmingPoolPDA,
          userFarm: userFarmPDA,
          userLpAccount: userLpAccount,
          lpVault: lpVault,
          lpMint: lpMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([this.sponsorKeypair]) // Only sponsor signs (pays fees)
        .rpc();

      return { signature: tx };
    } catch (error) {
      console.error("Stake LP tokens error:", error);
      throw error;
    }
  }

  /**
   * Unstake LP tokens
   */
  async unstakeLpTokens(
    userPublicKey: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    lpAmount: number
  ) {
    try {
      const [farmingPoolPDA] = this.getFarmingPoolPDA(tokenAMint, tokenBMint);
      const [userFarmPDA] = this.getUserFarmPDA(userPublicKey, farmingPoolPDA);
      
      // Get pool data to find LP mint
      const poolData = await (this.program.account as any).farmingPool.fetch(farmingPoolPDA);
      const lpMint = new PublicKey(poolData.lpMint);

      // Get user LP account and farming vault
      const userLpAccount = await getAssociatedTokenAddress(lpMint, userPublicKey);
      const lpVault = await getAssociatedTokenAddress(lpMint, farmingPoolPDA, true);

      const tx = await this.program.methods
        .unstakeLpTokens(new BN(lpAmount))
        .accounts({
          user: userPublicKey,
          farmingPool: farmingPoolPDA,
          userFarm: userFarmPDA,
          userLpAccount: userLpAccount,
          lpVault: lpVault,
          lpMint: lpMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([]) // User signs this transaction
        .rpc();

      return { signature: tx };
    } catch (error) {
      console.error("Unstake LP tokens error:", error);
      throw error;
    }
  }

  /**
   * Claim farming rewards
   */
  async claimRewards(
    userPublicKey: PublicKey,
    tokenAMint: PublicKey,
    tokenBMint: PublicKey
  ) {
    try {
      const [farmingPoolPDA] = this.getFarmingPoolPDA(tokenAMint, tokenBMint);
      const [userFarmPDA] = this.getUserFarmPDA(userPublicKey, farmingPoolPDA);
      
      // Get pool data
      const poolData = await (this.program.account as any).farmingPool.fetch(farmingPoolPDA);
      const rewardVault = new PublicKey(poolData.rewardVault);

      // Get user reward account (TNG)
      const userRewardAccount = await getAssociatedTokenAddress(tokenAMint, userPublicKey);

      const tx = await this.program.methods
        .claimRewards()
        .accounts({
          user: userPublicKey,
          farmingPool: farmingPoolPDA,
          userFarm: userFarmPDA,
          userRewardAccount: userRewardAccount,
          tngMint: tokenAMint,
          rewardVault: rewardVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([]) // User signs this transaction
        .rpc();

      return { signature: tx };
    } catch (error) {
      console.error("Claim rewards error:", error);
      throw error;
    }
  }

  /**
   * Get farming pool data
   */
  async getFarmingPoolData(tokenAMint: PublicKey, tokenBMint: PublicKey) {
    try {
      const [farmingPoolPDA] = this.getFarmingPoolPDA(tokenAMint, tokenBMint);
      
      try {
        const poolData = await (this.program.account as any).farmingPool.fetch(farmingPoolPDA);
        
        return {
          address: farmingPoolPDA.toString(),
          authority: poolData.authority.toString(),
          tngMint: poolData.tngMint.toString(),
          otherMint: poolData.otherMint.toString(),
          tngVault: poolData.tngVault.toString(),
          otherVault: poolData.otherVault.toString(),
          lpMint: poolData.lpMint.toString(),
          rewardVault: poolData.rewardVault.toString(),
          tngReserve: poolData.tngReserve.toString(),
          otherReserve: poolData.otherReserve.toString(),
          lpSupply: poolData.lpSupply.toString(),
          totalStaked: poolData.totalStaked.toString(),
          rewardRate: poolData.rewardRate.toString(),
          lastRewardTime: poolData.lastRewardTime.toString(),
          accumulatedRewardPerShare: poolData.accumulatedRewardPerShare.toString(),
          isActive: poolData.isActive,
          bump: poolData.bump
        };
      } catch (fetchError) {
        // Pool not initialized - return mock data for testing
        console.warn("Farming pool not initialized, returning mock data");
        console.log(" Tip: Pool will be auto-initialized on first addLiquidity operation");
        
        return {
          address: farmingPoolPDA.toString(),
          authority: this.sponsorKeypair.publicKey.toString(),
          tngMint: tokenAMint.toString(),
          otherMint: tokenBMint.toString(),
          tngVault: "6yeZKi7u5x9uGXwKnA8tz2rWqN8aGQdAUvdHRh6YVm8m",
          otherVault: "68N5exsNAHAWYTEWnDWhZib8of7NRyxuVTCVmydiNYjd",
          lpMint: "3U21D8nY13AJtg2RsRwqAV8dbC9EfSBEoXHwr85SXvc3",
          rewardVault: "6yeZKi7u5x9uGXwKnA8tz2rWqN8aGQdAUvdHRh6YVm8m",
          tngReserve: "1000000000000", // 1000 TNG
          otherReserve: "1000000000",   // 1 SOL
          lpSupply: "31622776601",      // sqrt(1000*1) * 1e9
          totalStaked: "0",
          rewardRate: "1000000",        // 0.001 TNG per second
          lastRewardTime: Math.floor(Date.now() / 1000).toString(),
          accumulatedRewardPerShare: "0",
          isActive: false, // Not initialized
          bump: 255
        };
      }
    } catch (error) {
      console.error("Get farming pool data error:", error);
      throw error;
    }
  }

  /**
   * Get user farm data
   */
  async getUserFarmData(userPublicKey: PublicKey, tokenAMint: PublicKey, tokenBMint: PublicKey) {
    try {
      const [farmingPoolPDA] = this.getFarmingPoolPDA(tokenAMint, tokenBMint);
      const [userFarmPDA] = this.getUserFarmPDA(userPublicKey, farmingPoolPDA);
      
      try {
        const userFarmData = await (this.program.account as any).userFarm.fetch(userFarmPDA);
        
        return {
          address: userFarmPDA.toString(),
          user: userFarmData.user.toString(),
          farmingPool: userFarmData.farmingPool.toString(),
          lpStaked: userFarmData.lpStaked.toString(),
          pendingRewards: userFarmData.pendingRewards.toString(),
          rewardDebt: userFarmData.rewardDebt.toString(),
          lastStakeTime: userFarmData.lastStakeTime.toString()
        };
      } catch (fetchError) {
        // User farm doesn't exist or pool not initialized
        return null;
      }
    } catch (error) {
      console.error("Get user farm data error:", error);
      return null;
    }
  }

  /**
   * Calculate pending rewards for user
   */
  async calculatePendingRewards(userPublicKey: PublicKey, tokenAMint: PublicKey, tokenBMint: PublicKey) {
    try {
      const poolData = await this.getFarmingPoolData(tokenAMint, tokenBMint);
      const userFarmData = await this.getUserFarmData(userPublicKey, tokenAMint, tokenBMint);
      
      if (!userFarmData || userFarmData.lpStaked === "0") {
        return "0";
      }

      // Simplified calculation (actual calculation would be done on-chain)
      const currentTime = Math.floor(Date.now() / 1000);
      const timeElapsed = currentTime - parseInt(poolData.lastRewardTime);
      const rewardAmount = timeElapsed * parseInt(poolData.rewardRate);
      
      if (parseInt(poolData.totalStaked) === 0) {
        return userFarmData.pendingRewards;
      }

      const rewardPerShare = (rewardAmount * 1e12) / parseInt(poolData.totalStaked);
      const newAccumulatedRewardPerShare = parseInt(poolData.accumulatedRewardPerShare) + rewardPerShare;
      
      const pending = (parseInt(userFarmData.lpStaked) * newAccumulatedRewardPerShare / 1e12) - parseInt(userFarmData.rewardDebt);
      const totalRewards = parseInt(userFarmData.pendingRewards) + pending;
      
      return totalRewards.toString();
    } catch (error) {
      console.error("Calculate pending rewards error:", error);
      return "0";
    }
  }
}

// Export singleton instance
export const tngFarmingContractService = new TngFarmingContractService();
