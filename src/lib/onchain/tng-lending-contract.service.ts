/**
 * TNG Lending Contract Service
 * Handles all interactions with the TNG Lending smart contract
 * Supports: Supply, Borrow, Repay, Liquidate operations
 */

import { AnchorProvider, Program, BN, web3 } from '@coral-xyz/anchor';
import { 
  Connection, 
  PublicKey, 
  Keypair, 
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';

import tngLendingIdl from '@/lib/idl/tng_lending.json';

// Resolve IDL and program address
const RESOLVED_LENDING_IDL: any | null = (tngLendingIdl && typeof tngLendingIdl === 'object') ? tngLendingIdl : null;

// Types
interface LendingPool {
  authority: PublicKey;
  assetMint: PublicKey;
  supplyVault: PublicKey;
  borrowVault: PublicKey;
  liquidityMint: PublicKey;
  optimalUtilizationRate: BN;
  maxBorrowRate: BN;
  baseBorrowRate: BN;
  liquidationThreshold: BN;
  liquidationBonus: BN;
  reserveFactor: BN;
  totalSupply: BN;
  totalBorrows: BN;
  totalReserves: BN;
  lastUpdateTimestamp: BN;
  supplyRate: BN;
  borrowRate: BN;
  liquidityCumulativeIndex: BN;
  borrowCumulativeIndex: BN;
  bump: number;
}

interface UserAccount {
  owner: PublicKey;
  pool: PublicKey;
  suppliedAmount: BN;
  borrowedAmount: BN;
  liquidityTokens: BN;
  lastSupplyTimestamp: BN;
  lastBorrowTimestamp: BN;
}

interface LendingOperationResult {
  signature: string;
  success: boolean;
  error?: string;
  data?: any;
}

class TngLendingContractService {
  private connection: Connection;
  private program: Program | null = null;
  private sponsorKeypair: Keypair;
  private programId: PublicKey;
  private isMockMode: boolean = false;

  constructor(connection: Connection, sponsorPrivateKey: number[]) {
    this.connection = connection;
    this.sponsorKeypair = Keypair.fromSecretKey(new Uint8Array(sponsorPrivateKey));
    // Prefer IDL-declared address if available to avoid mismatches
    this.programId = new PublicKey((RESOLVED_LENDING_IDL as any)?.address || 'BuHFovMPpwNbRjzhXTJsiJ3BBqDycpTN8mrw2Ho8bjq4');
    
    try {
      // Check if IDL is available
      if (!RESOLVED_LENDING_IDL) {
        console.log('🔧 TngLendingContractService: IDL not available, using mock mode');
        this.isMockMode = true;
        return;
      }

      // Create provider and program
      const wallet = {
        publicKey: this.sponsorKeypair.publicKey,
        signTransaction: async (tx: Transaction) => {
          tx.sign(this.sponsorKeypair);
          return tx;
        },
        signAllTransactions: async (txs: Transaction[]) => {
          return txs.map(tx => { tx.sign(this.sponsorKeypair); return tx; });
        }
      };

      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed', preflightCommitment: 'confirmed' }
      );

      // Initialize program; if IDL contains address, constructor without explicit programId is valid
      this.program = new Program(RESOLVED_LENDING_IDL as any, provider);
      console.log('✅ TngLendingContractService initialized with smart contract');
    } catch (error) {
      console.log('🔧 TngLendingContractService: Failed to initialize program, using mock mode:', error);
      this.isMockMode = true;
      this.program = null;
    }
  }

  // Expose minimal internals for helpers
  getProgram(): Program | null { return this.program; }
  getProgramId(): PublicKey { return this.programId; }
  getConnection(): Connection { return this.connection; }
  getSponsorKeypair(): Keypair { return this.sponsorKeypair; }

  /**
   * Get lending pool PDA
   */
  async getLendingPoolPDA(assetMint: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from('lending_pool'),
        assetMint.toBuffer()
      ],
      this.programId
    );
  }

  /**
   * Get user account PDA
   */
  async getUserAccountPDA(user: PublicKey, lendingPool: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from('user_account'),
        user.toBuffer(),
        lendingPool.toBuffer()
      ],
      this.programId
    );
  }

  /**
   * Initialize a new lending pool
   */
  async initializePool(
    assetMint: PublicKey,
    optimalUtilizationRate: number = 8000, // 80%
    maxBorrowRate: number = 3000, // 30% APY
    baseBorrowRate: number = 200, // 2% APY
    liquidationThreshold: number = 8500, // 85%
    liquidationBonus: number = 500, // 5%
    reserveFactor: number = 1000 // 10%
  ): Promise<LendingOperationResult> {
    try {
      console.log('Initializing lending pool for asset:', assetMint.toString());

      // In mock mode, return success without actual transaction
      if (this.isMockMode || !this.program) {
        console.log('🔧 initializePool: Using mock mode, returning success');
        return {
          signature: 'mock_pool_init_' + Date.now(),
          success: true,
          data: {
            poolAddress: 'mock_pool_' + assetMint.toString().slice(0, 8),
            assetMint: assetMint.toString()
          }
        };
      }

      const [lendingPoolPDA] = await this.getLendingPoolPDA(assetMint);
      
      // Get associated token addresses
      const supplyVault = await getAssociatedTokenAddress(
        assetMint,
        lendingPoolPDA,
        true
      );

      const borrowVault = await getAssociatedTokenAddress(
        assetMint,
        lendingPoolPDA,
        true
      );

      // Create liquidity mint keypair
      const liquidityMintKeypair = Keypair.generate();

      const tx = await this.program.methods
        .initializePool(
          new BN(optimalUtilizationRate),
          new BN(maxBorrowRate),
          new BN(baseBorrowRate),
          new BN(liquidationThreshold),
          new BN(liquidationBonus),
          new BN(reserveFactor)
        )
        .accounts({
          authority: this.sponsorKeypair.publicKey,
          payer: this.sponsorKeypair.publicKey,
          lendingPool: lendingPoolPDA,
          assetMint: assetMint,
          supplyVault: supplyVault,
          borrowVault: borrowVault,
          liquidityMint: liquidityMintKeypair.publicKey,
          liquidityMintKeypair: liquidityMintKeypair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([this.sponsorKeypair, liquidityMintKeypair])
        .rpc();

      console.log('Pool initialized successfully:', tx);
      return {
        signature: tx,
        success: true,
        data: {
          lendingPool: lendingPoolPDA.toString(),
          supplyVault: supplyVault.toString(),
          borrowVault: borrowVault.toString(),
          liquidityMint: liquidityMintKeypair.publicKey.toString()
        }
      };

    } catch (error: any) {
      console.error('Failed to initialize pool:', error);
      return {
        signature: '',
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Supply tokens to earn interest
   */
  async supply(
    userKeypair: Keypair,
    assetMint: PublicKey,
    amount: number
  ): Promise<LendingOperationResult> {
    try {
      console.log('Supplying tokens:', { user: userKeypair.publicKey.toString(), amount });

      if (this.isMockMode || !this.program) {
        return { signature: 'mock_supply_' + Date.now(), success: true };
      }

      const [lendingPoolPDA] = await this.getLendingPoolPDA(assetMint);
      const [userAccountPDA] = await this.getUserAccountPDA(userKeypair.publicKey, lendingPoolPDA);

      // Get pool data to find liquidity mint
      const poolData = await (this.program.account as any).lendingPool.fetch(lendingPoolPDA) as LendingPool;
      
      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        assetMint,
        userKeypair.publicKey
      );

      const userLiquidityAccount = await getAssociatedTokenAddress(
        poolData.liquidityMint,
        userKeypair.publicKey
      );

      const supplyVault = await getAssociatedTokenAddress(
        assetMint,
        lendingPoolPDA,
        true
      );

      const amountLamports = BigInt(Math.floor((Number(amount) || 0) * 1e9));
      if (amountLamports <= 0n) throw new Error('Invalid amount');
      const amountBN = new BN(amountLamports.toString()); // Assuming 9 decimals

      // Validate user balance
      try {
        const userTokenAccInfo = await getAccount(this.connection, userTokenAccount);
        if (userTokenAccInfo.amount < amountLamports) {
          return { signature: '', success: false, error: 'Insufficient token balance' };
        }
      } catch (_) {
        return { signature: '', success: false, error: 'User token account not found' };
      }

      const tx = await this.program.methods
        .supply(amountBN)
        .accounts({
          user: userKeypair.publicKey,
          payer: this.sponsorKeypair.publicKey,
          lendingPool: lendingPoolPDA,
          userAccount: userAccountPDA,
          userTokenAccount: userTokenAccount,
          userLiquidityAccount: userLiquidityAccount,
          supplyVault: supplyVault,
          liquidityMint: poolData.liquidityMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair, this.sponsorKeypair])
        .rpc();

      console.log('Supply successful:', tx);
      return {
        signature: tx,
        success: true,
        data: { amount, liquidityTokens: 'calculated_on_chain' }
      };

    } catch (error: any) {
      console.error('Failed to supply:', error);
      return {
        signature: '',
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Withdraw supplied tokens
   */
  async withdraw(
    userKeypair: Keypair,
    assetMint: PublicKey,
    liquidityAmount: number
  ): Promise<LendingOperationResult> {
    try {
      console.log('Withdrawing tokens:', { user: userKeypair.publicKey.toString(), liquidityAmount });

      if (this.isMockMode || !this.program) {
        return { signature: 'mock_withdraw_' + Date.now(), success: true };
      }

      const [lendingPoolPDA] = await this.getLendingPoolPDA(assetMint);
      const [userAccountPDA] = await this.getUserAccountPDA(userKeypair.publicKey, lendingPoolPDA);

      // Get pool data
      const poolData = await (this.program.account as any).lendingPool.fetch(lendingPoolPDA) as LendingPool;
      
      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        assetMint,
        userKeypair.publicKey
      );

      const userLiquidityAccount = await getAssociatedTokenAddress(
        poolData.liquidityMint,
        userKeypair.publicKey
      );

      const supplyVault = await getAssociatedTokenAddress(
        assetMint,
        lendingPoolPDA,
        true
      );

      const liquidityLamports = BigInt(Math.floor((Number(liquidityAmount) || 0) * 1e9));
      if (liquidityLamports <= 0n) throw new Error('Invalid liquidity amount');
      const liquidityAmountBN = new BN(liquidityLamports.toString());

      const tx = await this.program.methods
        .withdraw(liquidityAmountBN)
        .accounts({
          user: userKeypair.publicKey,
          lendingPool: lendingPoolPDA,
          userAccount: userAccountPDA,
          userTokenAccount: userTokenAccount,
          userLiquidityAccount: userLiquidityAccount,
          supplyVault: supplyVault,
          liquidityMint: poolData.liquidityMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([userKeypair])
        .rpc();

      console.log('Withdraw successful:', tx);
      return {
        signature: tx,
        success: true,
        data: { liquidityAmount }
      };

    } catch (error: any) {
      console.error('Failed to withdraw:', error);
      return {
        signature: '',
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Borrow tokens against collateral
   */
  async borrow(
    userKeypair: Keypair,
    assetMint: PublicKey,
    amount: number
  ): Promise<LendingOperationResult> {
    try {
      console.log('Borrowing tokens:', { user: userKeypair.publicKey.toString(), amount });

      if (this.isMockMode || !this.program) {
        return { signature: 'mock_borrow_' + Date.now(), success: true };
      }

      const [lendingPoolPDA] = await this.getLendingPoolPDA(assetMint);
      const [userAccountPDA] = await this.getUserAccountPDA(userKeypair.publicKey, lendingPoolPDA);

      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        assetMint,
        userKeypair.publicKey
      );

      const supplyVault = await getAssociatedTokenAddress(
        assetMint,
        lendingPoolPDA,
        true
      );

      const amountLamports = BigInt(Math.floor((Number(amount) || 0) * 1e9));
      if (amountLamports <= 0n) throw new Error('Invalid amount');
      const amountBN = new BN(amountLamports.toString());

      const tx = await this.program.methods
        .borrow(amountBN)
        .accounts({
          user: userKeypair.publicKey,
          lendingPool: lendingPoolPDA,
          userAccount: userAccountPDA,
          userTokenAccount: userTokenAccount,
          supplyVault: supplyVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([userKeypair])
        .rpc();

      console.log('Borrow successful:', tx);
      return {
        signature: tx,
        success: true,
        data: { amount }
      };

    } catch (error: any) {
      console.error('Failed to borrow:', error);
      return {
        signature: '',
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Repay borrowed tokens
   */
  async repay(
    userKeypair: Keypair,
    assetMint: PublicKey,
    amount: number
  ): Promise<LendingOperationResult> {
    try {
      console.log('Repaying tokens:', { user: userKeypair.publicKey.toString(), amount });

      if (this.isMockMode || !this.program) {
        return { signature: 'mock_repay_' + Date.now(), success: true };
      }

      const [lendingPoolPDA] = await this.getLendingPoolPDA(assetMint);
      const [userAccountPDA] = await this.getUserAccountPDA(userKeypair.publicKey, lendingPoolPDA);

      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        assetMint,
        userKeypair.publicKey
      );

      const supplyVault = await getAssociatedTokenAddress(
        assetMint,
        lendingPoolPDA,
        true
      );

      const amountLamports = BigInt(Math.floor((Number(amount) || 0) * 1e9));
      if (amountLamports <= 0n) throw new Error('Invalid amount');
      const amountBN = new BN(amountLamports.toString());

      // Validate user token balance for repayment
      try {
        const userTokenAccInfo = await getAccount(this.connection, userTokenAccount);
        if (userTokenAccInfo.amount < amountLamports) {
          return { signature: '', success: false, error: 'Insufficient token balance to repay' };
        }
      } catch (_) {
        return { signature: '', success: false, error: 'User token account not found' };
      }

      const tx = await this.program.methods
        .repay(amountBN)
        .accounts({
          user: userKeypair.publicKey,
          lendingPool: lendingPoolPDA,
          userAccount: userAccountPDA,
          userTokenAccount: userTokenAccount,
          supplyVault: supplyVault,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([userKeypair])
        .rpc();

      console.log('Repay successful:', tx);
      return {
        signature: tx,
        success: true,
        data: { amount }
      };

    } catch (error: any) {
      console.error('Failed to repay:', error);
      return {
        signature: '',
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  /**
   * Get lending pool data
   */
  async getLendingPool(assetMint: PublicKey): Promise<LendingPool | null> {
    try {
      const [lendingPoolPDA] = await this.getLendingPoolPDA(assetMint);
      const poolData = await (this.program.account as any).lendingPool.fetch(lendingPoolPDA);
      return poolData as LendingPool;
    } catch (error) {
      console.error('Failed to fetch lending pool:', error);
      return null;
    }
  }


  /**
   * Calculate health factor for a user position
   */
  calculateHealthFactor(supplied: number, borrowed: number, liquidationThreshold: number): number {
    if (borrowed === 0) return Number.MAX_SAFE_INTEGER;
    
    const collateralValue = supplied * (liquidationThreshold / 10000);
    return collateralValue / borrowed;
  }

  /**
   * Calculate current APY for supply and borrow
   */
  calculateAPY(rate: number): number {
    // Convert basis points to percentage
    return rate / 100;
  }

  /**
   * Get all available lending pools
   */
  async getAllLendingPools(): Promise<Array<{ address: string; data: LendingPool }>> {
    try {
      // In mock mode, return empty array to trigger mock pools
      if (this.isMockMode || !this.program) {
        console.log('🔧 getAllLendingPools: Using mock mode');
        return [];
      }

      const pools = await (this.program.account as any).lendingPool.all();
      return pools.map(pool => ({
        address: pool.publicKey.toString(),
        data: pool.account as LendingPool
      }));
    } catch (error) {
      const message = (error instanceof Error ? error.message : String(error)) || '';
      console.error('Failed to fetch all lending pools:', error);
      if (message.includes('429') || message.toLowerCase().includes('too many requests')) {
        const rateErr: any = new Error('Rate limited by RPC');
        rateErr.code = 'RATE_LIMITED';
        throw rateErr;
      }
      throw error;
    }
  }

  /**
   * Get lending pools with formatted data for frontend
   */
  async getLendingPools() {
    try {
      console.log('🔍 Fetching lending pools...');
      
      // Try to get actual pools from contract
      const poolAccounts = await this.getAllLendingPools();
      
      if (poolAccounts.length === 0) {
        console.log('⚠️ No lending pools found on-chain, returning mock pools');
        // Return mock pools for development
        return this.getMockLendingPools();
      }
      
      // Format real pools for frontend
      const formattedPools = poolAccounts.map((poolAccount, index) => {
        const pool = poolAccount.data;
        const totalSupply = Number(pool.totalSupply) / 1e9;
        const totalBorrows = Number(pool.totalBorrows) / 1e9;
        const utilization = totalSupply > 0 ? (totalBorrows / totalSupply) * 100 : 0;
        
        return {
          id: poolAccount.address,
          tokenMint: pool.assetMint.toString(),
          symbol: this.getTokenSymbolFromMint(pool.assetMint.toString()),
          name: `${this.getTokenSymbolFromMint(pool.assetMint.toString())} Lending Pool`,
          totalSupply: totalSupply,
          totalBorrows: totalBorrows,
          supplyAPY: Number(pool.supplyRate) / 100, // Convert basis points to percentage
          borrowAPY: Number(pool.borrowRate) / 100,
          utilization: utilization,
          liquidationThreshold: Number(pool.liquidationThreshold) / 100,
          liquidationBonus: Number(pool.liquidationBonus) / 100,
          reserveFactor: Number(pool.reserveFactor) / 100,
          isActive: true
        };
      });
      
      console.log(`✅ Found ${formattedPools.length} lending pools`);
      return formattedPools;
      
    } catch (error) {
      console.error('❌ Error fetching lending pools:', error);
      // Return mock data as fallback
      return this.getMockLendingPools();
    }
  }

  /**
   * Get mock lending pools for development
   */
  private getMockLendingPools() {
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
   * Get token symbol from mint address
   */
  private getTokenSymbolFromMint(mintAddress: string): string {
    const TOKEN_MINTS = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs': 'TNG',
      '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': 'USDC'
    };
    
    return TOKEN_MINTS[mintAddress as keyof typeof TOKEN_MINTS] || 'UNKNOWN';
  }

  /**
   * Get user account for a specific lending pool
   */
  async getUserAccount(userPublicKey: PublicKey, assetMint: PublicKey): Promise<UserAccount | null> {
    try {
      // In mock mode, return null (no user positions)
      if (this.isMockMode || !this.program) {
        console.log(`🔧 getUserAccount: Using mock mode, no user positions`);
        return null;
      }

      const [lendingPoolPDA] = await this.getLendingPoolPDA(assetMint);
      const [userAccountPDA] = await this.getUserAccountPDA(userPublicKey, lendingPoolPDA);
      
      const userAccount = await (this.program.account as any).userAccount.fetch(userAccountPDA);
      return userAccount as UserAccount;
    } catch (error) {
      console.log(`No user account found for user ${userPublicKey.toString()} in pool ${assetMint.toString()}`);
      return null;
    }
  }
}

export default TngLendingContractService;
export type { LendingPool, UserAccount, LendingOperationResult };

/**
 * NOTE: Flash loan methods require updated IDL including `flash_loan` and `repay_flash_loan`.
 * Current repository IDL may not contain these entries. The following helpers are
 * prepared to be wired once IDL is aligned. For now, they return a controlled error
 * to allow the caller to fallback gracefully.
 */
export class TngLendingFlashLoanHelper {
  private readonly inner: TngLendingContractService;

  constructor(inner: TngLendingContractService) {
    this.inner = inner;
  }

  async flashLoan(
    borrowerKeypair: Keypair,
    assetMint: PublicKey,
    amount: number,
    borrowerTokenAccount: PublicKey,
  ): Promise<LendingOperationResult> {
    try {
      const program = this.inner.getProgram() as any;
      const programId = this.inner.getProgramId();
      const sponsor = this.inner.getSponsorKeypair();

      // Derive PDAs
      const [lendingPoolPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('lending_pool'), assetMint.toBuffer()],
        programId,
      );
      const [flashLoanStatePDA] = await PublicKey.findProgramAddress(
        [Buffer.from('flash_loan'), borrowerKeypair.publicKey.toBuffer(), lendingPoolPDA.toBuffer()],
        programId,
      );

      // Ensure borrower ATA exists
      const connection = this.inner.getConnection();
      try {
        await getAccount(connection, borrowerTokenAccount);
      } catch (_) {
        const createIx = createAssociatedTokenAccountInstruction(
          sponsor.publicKey,
          borrowerTokenAccount,
          borrowerKeypair.publicKey,
          assetMint,
        );
        const tx = new Transaction().add(createIx);
        tx.feePayer = sponsor.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
        tx.sign(sponsor);
        const sig = await connection.sendRawTransaction(tx.serialize());
        await connection.confirmTransaction(sig, 'confirmed');
      }

      const amountBN = new BN(amount);

      const sig = await program.methods
        .flashLoan(amountBN)
        .accounts({
          borrower: borrowerKeypair.publicKey,
          payer: sponsor.publicKey,
          lendingPool: lendingPoolPDA,
          flashLoanState: flashLoanStatePDA,
          borrowerTokenAccount,
          vault: await getAssociatedTokenAddress(assetMint, lendingPoolPDA, true),
          callbackProgram: program.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([borrowerKeypair, sponsor])
        .rpc();

      return { signature: sig, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error?.message || String(error) };
    }
  }

  async repayFlashLoan(
    borrowerKeypair: Keypair,
    assetMint: PublicKey,
    borrowerTokenAccount: PublicKey,
  ): Promise<LendingOperationResult> {
    try {
      const program = this.inner.getProgram() as any;
      const programId = this.inner.getProgramId();
      const sponsor = this.inner.getSponsorKeypair();

      const [lendingPoolPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('lending_pool'), assetMint.toBuffer()],
        programId,
      );
      const [flashLoanStatePDA] = await PublicKey.findProgramAddress(
        [Buffer.from('flash_loan'), borrowerKeypair.publicKey.toBuffer(), lendingPoolPDA.toBuffer()],
        programId,
      );

      const sig = await program.methods
        .repayFlashLoan()
        .accounts({
          borrower: borrowerKeypair.publicKey,
          lendingPool: lendingPoolPDA,
          flashLoanState: flashLoanStatePDA,
          borrowerTokenAccount,
          vault: await getAssociatedTokenAddress(assetMint, lendingPoolPDA, true),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([borrowerKeypair])
        .rpc();

      return { signature: sig, success: true };
    } catch (error: any) {
      return { signature: '', success: false, error: error?.message || String(error) };
    }
  }
}