/**
 * TNG DAO Service - On-chain DAO operations
 * Handles real blockchain interactions with deployed DAO contract
 * Solana SuperApp
 */

import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js'
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount, AccountState } from '@solana/spl-token'
import { TngDao } from '../idl/tng_dao'
import daoIDL from '@/lib/idl/tng_dao.json'
import fs from 'fs'
import path from 'path'
import { CustodialWalletService } from '@/lib/wallet/custodial.service'
import { prisma } from '@/lib/prisma'

// IDL импортирован успешно

// Constants
export const DAO_PROGRAM_ID = new PublicKey('HbDYHpNrayUvx5z4m81QRaQR7iLapK5Co7eW27Zn2ZYh')
export const TNG_MINT = new PublicKey(process.env.TNG_MINT_ADDRESS || 'FMACx4PexHrMux1j2RLHW6fBc5PuCrzi2LV7bEqUKygs')

// Types
export interface ProposalAction {
  updateStakingApy?: { newApy: number }
  updateFarmingRewardRate?: { newRate: number }
  pausePool?: { poolType: 'Staking' | 'Farming' | 'Swap' | 'Lending' }
  treasuryTransfer?: { recipient: PublicKey; amount: number }
  updateDaoConfig?: { newConfig: DAOConfigUpdate }
}

export interface DAOConfigUpdate {
  votingDuration?: number
  executionDelay?: number
  quorumThreshold?: number
  proposalThreshold?: number
}

export interface ProposalData {
  id: string
  creator: PublicKey
  title: string
  description: string
  actions: ProposalAction[]
  status: 'Active' | 'Passed' | 'Rejected' | 'Executed' | 'Cancelled'
  votesFor: string
  votesAgainst: string
  votesAbstain: string
  votingPowerSnapshot: string
  createdAt: number
  votingEndsAt: number
  executionEta: number
  executedActions: boolean[]
}

export interface VoteRecord {
  voter: PublicKey
  proposal: PublicKey
  choice: 'For' | 'Against' | 'Abstain'
  weight: string
  timestamp: number
}

export interface DAOConfig {
  authority: PublicKey
  treasury: PublicKey
  tngMint: PublicKey
  votingDuration: string
  executionDelay: string
  quorumThreshold: string
  proposalThreshold: string
  totalProposals: string
  bump: number
}

export class DAOService {
  private connection: Connection
  private program: Program<TngDao> | null = null
  private sponsorKeypair: Keypair
  private custodialWalletService: CustodialWalletService

  constructor(connection: Connection, wallet?: Wallet) {
    this.connection = connection
    
    // Load sponsor keypair (following working pattern)
    this.sponsorKeypair = this.loadSponsorKeypair()
    
    // Initialize custodial wallet service
    this.custodialWalletService = new CustodialWalletService(prisma)
    
    // Initialize program following the working pattern
    this.initProgram()
  }

  private loadSponsorKeypair(): Keypair {
    // Проверяем, что мы на сервере
    if (typeof window !== 'undefined') {
      throw new Error('DAOService can only be used on the server side')
    }

    try {
      // Try environment variable first
      const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY
      
      if (sponsorPrivateKey && sponsorPrivateKey.trim()) {
        try {
          // Try to parse as JSON array first
          const privateKeyArray = JSON.parse(sponsorPrivateKey)
          console.log(" DAO sponsor keypair loaded from environment")
          return Keypair.fromSecretKey(new Uint8Array(privateKeyArray))
        } catch (parseError) {
          console.warn(" Invalid SPONSOR_PRIVATE_KEY format in environment, trying file...")
        }
      }

      // Try to load from file
      const keypairPath = path.join(process.cwd(), 'keys', 'mvp-sponsor-keypair.json')
      
      if (!fs.existsSync(keypairPath)) {
        throw new Error(`Sponsor keypair not found at: ${keypairPath}`)
      }

      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'))
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData))
      
      console.log(' DAO sponsor keypair loaded from file:', keypair.publicKey.toBase58())
      return keypair

    } catch (error) {
      console.error(' Failed to load sponsor keypair for DAO:', error)
      throw new Error('DAO sponsor keypair loading failed. Ensure SPONSOR_PRIVATE_KEY env var is set or keys/mvp-sponsor-keypair.json exists')
    }
  }

  private async initProgram(): Promise<void> {
    if (!this.sponsorKeypair) {
      throw new Error('Sponsor keypair not loaded');
    }

    try {
      // Create wallet wrapper for sponsor keypair
      const wallet = {
        publicKey: this.sponsorKeypair.publicKey,
        signTransaction: async (tx: Transaction) => {
          tx.sign(this.sponsorKeypair!)
          return tx
        },
        signAllTransactions: async (txs: Transaction[]) => {
          return txs.map(tx => {
            tx.sign(this.sponsorKeypair!)
            return tx
          })
        }
      }

      // Create provider following working pattern
      const provider = new AnchorProvider(
        this.connection,
        wallet as any,
        { commitment: 'confirmed' }
      )
      
      // Initialize program with IDL (following working services pattern)
      this.program = new Program(daoIDL as any, provider)
      
      console.log('✅ DAO service initialized successfully')
      console.log(' Program ID:', this.program.programId.toString())
    } catch (error) {
      console.error(' Failed to initialize DAO program:', error)
      throw error
    }
  }

  private async ensureProgram(): Promise<void> {
    if (!this.program) {
      await this.initProgram()
    }
  }

  /**
   * Получает user keypair для custodial кошелька
   */
  private async getUserKeypair(userId: string): Promise<Keypair> {
    console.log(' DEBUG: Getting user keypair for userId:', userId)
    
    const keypairResult = await this.custodialWalletService.getUserKeypair(userId)
    
    if (!keypairResult.success || !keypairResult.data) {
      console.error(' DEBUG: Failed to get user keypair:', keypairResult.error)
      throw new Error(`Failed to get user keypair: ${keypairResult.error?.message || 'Unknown error'}`)
    }
    
    console.log(' DEBUG: User keypair loaded successfully:', keypairResult.data.publicKey.toBase58())
    return keypairResult.data
  }

  // ============================================================================
  // PDA Helpers
  // ============================================================================

  getDaoConfigPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('dao_config')],
      DAO_PROGRAM_ID
    )
  }

  getTreasuryPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('treasury')],
      DAO_PROGRAM_ID
    )
  }

  getProposalPDA(proposalId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('proposal'),
        new BN(proposalId).toArrayLike(Buffer, 'le', 8)
      ],
      DAO_PROGRAM_ID
    )
  }

  getVoteRecordPDA(voter: PublicKey, proposal: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('vote'),
        voter.toBuffer(),
        proposal.toBuffer()
      ],
      DAO_PROGRAM_ID
    )
  }

  // ============================================================================
  // Read Operations
  // ============================================================================

  async getDAOConfig(): Promise<DAOConfig | null> {
    try {
      await this.ensureProgram()
      
      const [daoConfigPDA] = this.getDaoConfigPDA()
      const daoConfig = await this.program!.account.daoConfig.fetch(daoConfigPDA)
      
      return {
        authority: daoConfig.authority,
        treasury: daoConfig.treasury,
        tngMint: daoConfig.tngMint,
        votingDuration: daoConfig.votingDuration.toString(),
        executionDelay: daoConfig.executionDelay.toString(),
        quorumThreshold: daoConfig.quorumThreshold.toString(),
        proposalThreshold: daoConfig.proposalThreshold.toString(),
        totalProposals: daoConfig.totalProposals.toString(),
        bump: daoConfig.bump
      }
    } catch (error) {
      console.error('Error fetching DAO config:', error)
      return null
    }
  }

  async getProposal(proposalId: number | PublicKey): Promise<ProposalData | null> {
    try {
      await this.ensureProgram()
      
      let proposalPDA: PublicKey
      if (typeof proposalId === 'number') {
        [proposalPDA] = this.getProposalPDA(proposalId)
      } else {
        // If it's already a PublicKey, use it directly
        proposalPDA = proposalId
      }
      
      const proposal = await this.program!.account.proposal.fetch(proposalPDA)
      
      return {
        id: proposal.id.toString(),
        creator: proposal.creator,
        title: proposal.title,
        description: proposal.description,
        actions: proposal.actions,
        status: Object.keys(proposal.status)[0] as any,
        votesFor: proposal.votesFor.toString(),
        votesAgainst: proposal.votesAgainst.toString(),
        votesAbstain: proposal.votesAbstain.toString(),
        votingPowerSnapshot: proposal.votingPowerSnapshot.toString(),
        createdAt: proposal.createdAt.toNumber(),
        votingEndsAt: proposal.votingEndsAt.toNumber(),
        executionEta: proposal.executionEta.toNumber(),
        executedActions: proposal.executedActions
      }
    } catch (error) {
      console.error(`Error fetching proposal ${proposalId}:`, error)
      return null
    }
  }

  async getAllProposals(): Promise<ProposalData[]> {
    try {
      const daoConfig = await this.getDAOConfig()
      if (!daoConfig) return []

      const totalProposals = parseInt(daoConfig.totalProposals)
      const proposals: ProposalData[] = []

      // Fetch all proposals in parallel
      const proposalPromises: any[] = []
      for (let i = 0; i < totalProposals; i++) {
        proposalPromises.push(this.getProposal(i))
      }

      const results = await Promise.allSettled(proposalPromises)
      
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          proposals.push(result.value)
        }
      }

      return proposals.sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0))
    } catch (error) {
      console.error('Error fetching all proposals:', error)
      return []
    }
  }

  async getVoteRecord(voter: PublicKey, proposal: PublicKey): Promise<VoteRecord | null> {
    try {
      const [voteRecordPDA] = this.getVoteRecordPDA(voter, proposal)
      const voteRecord = await this.program.account.voteRecord.fetch(voteRecordPDA)
      
      return {
        voter: voteRecord.voter,
        proposal: voteRecord.proposal,
        choice: Object.keys(voteRecord.choice)[0] as any,
        weight: voteRecord.weight.toString(),
        timestamp: voteRecord.timestamp.toNumber()
      }
    } catch (error) {
      // Vote record doesn't exist - user hasn't voted
      return null
    }
  }

  async getTreasuryBalance(): Promise<{ sol: string; tng: string }> {
    try {
      const [treasuryPDA] = this.getTreasuryPDA()
      
      // Get SOL balance
      const solBalance = await this.connection.getBalance(treasuryPDA)
      
      // Get TNG balance
      let tngBalance = '0'
      try {
        const treasuryTokenAccount = await getAssociatedTokenAddress(TNG_MINT, treasuryPDA, true)
        const accountInfo = await this.connection.getTokenAccountBalance(treasuryTokenAccount)
        tngBalance = accountInfo.value.amount
      } catch (error) {
        // Treasury token account doesn't exist yet
        console.log('Treasury TNG account not found, balance is 0')
      }

      return {
        sol: solBalance.toString(),
        tng: tngBalance
      }
    } catch (error) {
      console.error('Error fetching treasury balance:', error)
      return { sol: '0', tng: '0' }
    }
  }

  // ============================================================================
  // Transaction Builders (for frontend to sign)
  // ============================================================================

  async buildInitializeDAOTransaction(
    authority: PublicKey,
    payer: PublicKey,
    votingDuration: number,
    executionDelay: number,
    quorumThreshold: string,
    proposalThreshold: string
  ): Promise<Transaction> {
    const [daoConfigPDA] = this.getDaoConfigPDA()
    const [treasuryPDA] = this.getTreasuryPDA()

    const tx = await this.program.methods
      .initializeDao(
        new BN(votingDuration),
        new BN(executionDelay),
        new BN(quorumThreshold),
        new BN(proposalThreshold)
      )
      .accounts({
        authority,
        payer,
        // daoConfig: daoConfigPDA, // removed - property doesn't exist // @ts-ignore Anchor type issue
        // treasury: treasuryPDA, // removed - property doesn't exist
        tngMint: TNG_MINT,
        // tokenProgram: TOKEN_PROGRAM_ID, // removed
        // systemProgram: SystemProgram.programId, // removed
      })
      .transaction()

    return tx
  }

  async buildCreateProposalTransaction(
    creator: PublicKey,
    title: string,
    description: string,
    actions: ProposalAction[]
  ): Promise<Transaction> {
    const daoConfig = await this.getDAOConfig()
    if (!daoConfig) throw new Error('DAO not initialized')

    // Детальная проверка DAO конфигурации
    console.log(' DEBUG: DAO Configuration:')
    console.log('  - authority:', daoConfig.authority.toBase58())
    console.log('  - treasury:', daoConfig.treasury.toBase58())
    console.log('  - tngMint:', daoConfig.tngMint.toBase58())
    console.log('  - totalProposals:', daoConfig.totalProposals)
    
    // КРИТИЧЕСКИ ВАЖНО: Проверяем соответствие TNG_MINT
    console.log(' DEBUG: TNG Mint comparison:')
    console.log('  - Our TNG_MINT:', TNG_MINT.toBase58())
    console.log('  - DAO tngMint:', daoConfig.tngMint.toBase58())
    console.log('  - Mints match:', TNG_MINT.equals(daoConfig.tngMint))
    
    if (!TNG_MINT.equals(daoConfig.tngMint)) {
      console.log('  WARNING: TNG Mint mismatch detected!')
      console.log(`   DAO expects: ${daoConfig.tngMint.toBase58()}`)
      console.log(`   We use: ${TNG_MINT.toBase58()}`)
      console.log(' Using DAO mint for compatibility...')
      // Временно разрешаем работу с mint из DAO конфигурации
      // TODO: Переинициализировать DAO с правильным mint в будущем
    }

    const proposalId = parseInt(daoConfig.totalProposals)
    const [daoConfigPDA] = this.getDaoConfigPDA()
    const [proposalPDA] = this.getProposalPDA(proposalId)
    
    // Get creator's TNG token account with detailed logging
    console.log(' DEBUG: Building ATA for creator...')
    console.log(' DEBUG: Creator address:', creator.toBase58())
    console.log(' DEBUG: TNG_MINT address:', TNG_MINT.toBase58())
    
    // Используем tng_mint из DAO конфигурации вместо константы
    const correctTngMint = daoConfig.tngMint
    const creatorTngAccount = await getAssociatedTokenAddress(correctTngMint, creator)
    console.log(' DEBUG: Expected ATA address:', creatorTngAccount.toBase58())
    console.log(' DEBUG: Using mint from DAO config:', correctTngMint.toBase58())
    
    // Проверяем и исправляем ATA аккаунт
    let needsATACreation = false
    let ataInstructions: any[] = []
    
    try {
      const ataAccountInfo = await this.connection.getAccountInfo(creatorTngAccount)
      
      if (ataAccountInfo) {
        console.log(' DEBUG: ATA account exists:', {
          lamports: ataAccountInfo.lamports,
          owner: ataAccountInfo.owner.toBase58(),
          dataLength: ataAccountInfo.data.length,
          executable: ataAccountInfo.executable
        })
        
        // Пробуем получить детали токен аккаунта
        try {
          const tokenAccount = await getAccount(this.connection, creatorTngAccount)
          console.log(' DEBUG: Token account details:', {
            mint: tokenAccount.mint.toBase58(),
            owner: tokenAccount.owner.toBase58(),
            amount: tokenAccount.amount.toString(),
            state: (tokenAccount as any).state,
            delegate: tokenAccount.delegate?.toBase58() || 'None'
          })
          
          // Проверяем constraints
          console.log(' DEBUG: Constraint checks:')
          console.log('  - Mint matches DAO tngMint:', tokenAccount.mint.equals(correctTngMint))
          console.log('  - Mint matches TNG_MINT:', tokenAccount.mint.equals(TNG_MINT))
          console.log('  - Owner matches creator:', tokenAccount.owner.equals(creator))
          console.log('  - Account is initialized (state=1):', (tokenAccount as any).state === 1)
          console.log('  - Has balance:', tokenAccount.amount > 0n)
          
          // ПРОВЕРКА STATE: Используем существующий ATA даже если state неправильный
          if ((tokenAccount as any).state !== 1) {
            console.log(' DEBUG: ATA state is incorrect! Expected: 1 (Initialized), got:', (tokenAccount as any).state)
            console.log(' DEBUG: But ATA exists and has balance - will use it anyway for DAO operations')
            console.log(' DEBUG: Associated Token Program might have compatibility issues with state check')
            // НЕ устанавливаем needsATACreation = true
            console.log(' DEBUG: Proceeding with existing ATA despite state issue')
          } else {
            console.log(' DEBUG: ATA state is correct (Initialized)')
          }
          
        } catch (tokenError) {
          console.error(' DEBUG: Token account parsing error:', tokenError instanceof Error ? tokenError.message : String(tokenError))
          console.log(' DEBUG: ATA exists but cannot parse - this might be a format issue')
          console.log(' DEBUG: Will try to use raw account for DAO operations instead of recreating')
          // НЕ устанавливаем needsATACreation = true для parsing errors
          console.log(' DEBUG: Proceeding without ATA recreation to avoid ownership issues')
        }
      } else {
        console.log(' DEBUG: ATA account does not exist!')
        console.log(' DEBUG: Will create new ATA...')
        needsATACreation = true
        console.log(' DEBUG: This is the only case where we actually need to create ATA')
      }
    } catch (ataError) {
      console.error(' DEBUG: ATA check error:', ataError instanceof Error ? ataError.message : String(ataError))
      console.log(' DEBUG: Will create new ATA due to check error...')
      needsATACreation = true
    }
    
    // Создаем ATA инструкцию если нужно (только если аккаунт действительно не существует)
    if (needsATACreation) {
      console.log(' DEBUG: Creating ATA instruction...')
      console.log(' DEBUG: ATA Creation parameters:')
      console.log('  - payer (sponsor):', this.sponsorKeypair.publicKey.toBase58())
      console.log('  - ata address:', creatorTngAccount.toBase58())
      console.log('  - owner (creator):', creator.toBase58())
      console.log('  - mint:', correctTngMint.toBase58())
      
      try {
        const createATAIx = createAssociatedTokenAccountInstruction(
          this.sponsorKeypair.publicKey, // payer (sponsor pays)
          creatorTngAccount,             // ata
          creator,                       // owner
          correctTngMint,               // mint
          TOKEN_PROGRAM_ID,             // tokenProgram
          ASSOCIATED_TOKEN_PROGRAM_ID   // associatedTokenProgram
        )
        ataInstructions.push(createATAIx)
        console.log(' DEBUG: ATA creation instruction added successfully')
      } catch (ataInstructionError) {
        console.error(' DEBUG: Failed to create ATA instruction:', ataInstructionError instanceof Error ? ataInstructionError.message : String(ataInstructionError))
        console.log(' DEBUG: Proceeding without ATA creation - hoping existing account works')
      }
    } else {
      console.log(' DEBUG: Using existing ATA without recreation')
    }

    // Детальное логирование всех аккаунтов
    console.log(' DEBUG: Transaction accounts:')
    console.log('  - creator:', creator.toBase58())
    console.log('  - payer (sponsor):', this.sponsorKeypair.publicKey.toBase58())
    console.log('  - daoConfig:', daoConfigPDA.toBase58())
    console.log('  - proposal:', proposalPDA.toBase58())
    console.log('  - creatorTngAccount:', creatorTngAccount.toBase58())
    console.log('  - systemProgram:', SystemProgram.programId.toBase58())
    
    const tx = await this.program!.methods
      .createProposal(title, description, actions)
      .accounts({
        creator,
        payer: this.sponsorKeypair.publicKey, // Sponsor всегда платит
        // daoConfig: daoConfigPDA, // removed - property doesn't exist // @ts-ignore Anchor type issue
        // proposal: proposalPDA, // removed - property doesn't exist // @ts-ignore Anchor type issue
        creatorTngAccount,
        // systemProgram: SystemProgram.programId, // removed
      })
      .transaction()
      
    console.log(' DEBUG: DAO transaction built successfully')
    
    // Добавляем ATA инструкции в начало транзакции (если нужно)
    if (ataInstructions.length > 0) {
      console.log(' DEBUG: Adding ATA instructions to transaction...')
      
      // Создаем новую транзакцию с ATA инструкциями в начале
      const combinedTx = new Transaction()
      
      // Сначала добавляем ATA инструкции
      ataInstructions.forEach((ix, index) => {
        console.log(` DEBUG: Adding ATA instruction ${index + 1}`)
        combinedTx.add(ix)
      })
      
      // Затем добавляем DAO инструкции
      tx.instructions.forEach((ix, index) => {
        console.log(` DEBUG: Adding DAO instruction ${index + 1}`)
        combinedTx.add(ix)
      })
      
      console.log(' DEBUG: Combined transaction built with ATA + DAO instructions')
      return combinedTx
    }
    
    console.log(' DEBUG: Transaction built successfully (no ATA creation needed)')

    return tx
  }

  async buildVoteTransaction(
    voter: PublicKey,
    proposalId: number,
    choice: 'For' | 'Against' | 'Abstain',
    weight: string
  ): Promise<Transaction> {
    const [proposalPDA] = this.getProposalPDA(proposalId)
    const [voteRecordPDA] = this.getVoteRecordPDA(voter, proposalPDA)
    const [daoConfigPDA] = this.getDaoConfigPDA()
    
    // Get DAO config to use correct mint
    const daoConfig = await this.getDAOConfig()
    if (!daoConfig) throw new Error('DAO not initialized')
    
    const correctTngMint = daoConfig.tngMint
    console.log(' DEBUG: Using TNG mint from DAO config for vote:', correctTngMint.toBase58())
    
    // Get voter's TNG token account with correct mint
    const voterTngAccount = await getAssociatedTokenAddress(correctTngMint, voter)
    
    // Check if voter ATA needs creation/fixing
    let needsVoterATACreation = false
    let voterATAInstructions: any[] = []
    
    try {
      const voterTokenAccount = await getAccount(this.connection, voterTngAccount)
      console.log(' DEBUG: Voter ATA exists with state:', (voterTokenAccount as any).state)
      
      if ((voterTokenAccount as any).state !== 1) {
        console.log(' DEBUG: Voter ATA state incorrect, but will use existing ATA')
        console.log(' DEBUG: Avoiding recreation to prevent ownership issues')
        // НЕ устанавливаем needsVoterATACreation = true
      } else {
        console.log(' DEBUG: Voter ATA state is correct')
      }
    } catch (error) {
      console.log(' DEBUG: Voter ATA does not exist, will create')
      needsVoterATACreation = true
    }
    
    if (needsVoterATACreation) {
      const createVoterATAIx = createAssociatedTokenAccountInstruction(
        this.sponsorKeypair.publicKey,
        voterTngAccount,
        voter,
        correctTngMint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
      voterATAInstructions.push(createVoterATAIx)
      console.log(' DEBUG: Voter ATA creation instruction added')
    }

    const voteChoice = choice === 'For' ? { for: {} } : 
                      choice === 'Against' ? { against: {} } : 
                      { abstain: {} }

    const tx = await this.program!.methods
      .vote(voteChoice, new BN(weight))
      .accounts({
        voter,
        // proposal: proposalPDA, // removed - property doesn't exist // @ts-ignore Anchor type issue
        // voteRecord: voteRecordPDA, // removed
        voterTngAccount,
        // daoConfig: daoConfigPDA, // removed - property doesn't exist
        // systemProgram: SystemProgram.programId, // removed
      })
      .transaction()

    console.log(' DEBUG: Vote transaction built successfully')
    
    // Add voter ATA instructions if needed
    if (voterATAInstructions.length > 0) {
      console.log(' DEBUG: Adding voter ATA instructions to vote transaction...')
      
      const combinedTx = new Transaction()
      
      // First add ATA instructions
      voterATAInstructions.forEach((ix, index) => {
        console.log(` DEBUG: Adding voter ATA instruction ${index + 1}`)
        combinedTx.add(ix)
      })
      
      // Then add vote instructions
      tx.instructions.forEach((ix, index) => {
        console.log(` DEBUG: Adding vote instruction ${index + 1}`)
        combinedTx.add(ix)
      })
      
      console.log(' DEBUG: Combined vote transaction built with ATA + Vote instructions')
      return combinedTx
    }

    return tx
  }

  async buildFinalizeProposalTransaction(proposalId: number): Promise<Transaction> {
    const [proposalPDA] = this.getProposalPDA(proposalId)
    const [daoConfigPDA] = this.getDaoConfigPDA()

    const tx = await this.program.methods
      .finalizeProposal()
      .accounts({
        // proposal: proposalPDA, // removed - property doesn't exist
        // daoConfig: daoConfigPDA, // removed - property doesn't exist
      })
      .transaction()

    return tx
  }

  async buildExecuteActionTransaction(
    executor: PublicKey,
    proposalId: number,
    actionIndex: number
  ): Promise<Transaction> {
    const [proposalPDA] = this.getProposalPDA(proposalId)
    const [daoConfigPDA] = this.getDaoConfigPDA()
    const [treasuryPDA] = this.getTreasuryPDA()

    const tx = await this.program.methods
      .executeAction(actionIndex)
      .accounts({
        executor,
        // proposal: proposalPDA, // removed - property doesn't exist // @ts-ignore Anchor type issue
        // daoConfig: daoConfigPDA, // removed - property doesn't exist
        // treasury: treasuryPDA, // removed - property doesn't exist // @ts-ignore Anchor type issue
        // tokenProgram: TOKEN_PROGRAM_ID, // removed
      })
      .transaction()

    return tx
  }

  async buildFundTreasuryTransaction(
    funder: PublicKey,
    amount: string
  ): Promise<Transaction> {
    const [treasuryPDA] = this.getTreasuryPDA()
    
    // Get funder's TNG token account
    const funderTokenAccount = await getAssociatedTokenAddress(TNG_MINT, funder)

    const tx = await this.program.methods
      .fundTreasury(new BN(amount))
      .accounts({
        funder,
        // treasury: treasuryPDA, // removed - property doesn't exist // @ts-ignore Anchor type issue
        funderTokenAccount,
        // tokenProgram: TOKEN_PROGRAM_ID, // removed
      })
      .transaction()

    return tx
  }

  // ============================================================================
  // Execute Operations (Build + Sign + Send)
  // ============================================================================

  async createProposal(params: {
    creator: PublicKey
    title: string
    description: string
    actions: any[]
    walletType?: 'custodial' | 'external'
    userId?: string // Для custodial кошелька нужен userId
  }): Promise<string> {
    try {
      console.log(' Building create proposal transaction...')
      
      // Build transaction
      const transaction = await this.buildCreateProposalTransaction(
        params.creator,
        params.title,
        params.description,
        params.actions
      )
      
      // Set sponsor as feePayer (sponsor always pays fees)
      transaction.feePayer = this.sponsorKeypair.publicKey
      
      // Get recent blockhash (CRITICAL!)
      console.log(' Getting recent blockhash...')
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      console.log(' Recent blockhash set:', blockhash)

      // Dual signing like in working services (Staking, Swap)
      if (params.walletType === 'custodial') {
        if (!params.userId) {
          throw new Error('userId required for custodial wallet operations')
        }
        
        console.log(' Dual signing: user + sponsor (custodial mode)')
        
        // Get user keypair from custodial service
        const userKeypair = await this.getUserKeypair(params.userId)
        
        // Verify creator matches user keypair
        if (!userKeypair.publicKey.equals(params.creator)) {
          throw new Error(`Creator mismatch: expected ${userKeypair.publicKey.toBase58()}, got ${params.creator.toBase58()}`)
        }
        
        // Dual sign: user first, then sponsor (like in staking/swap)
        console.log(' Signing with user keypair...')
        transaction.partialSign(userKeypair)
        
        console.log(' Signing with sponsor keypair...')
        transaction.partialSign(this.sponsorKeypair)
        
      } else {
        console.log(' External wallet signing not implemented yet')
        throw new Error('External wallet signing not implemented yet. Use custodial wallet.')
      }
      
      console.log(' Sending create proposal transaction...')
      const signature = await this.connection.sendRawTransaction(transaction.serialize())
      
      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed')
      
      console.log(' Proposal created successfully:', signature)
      return signature
      
    } catch (error) {
      console.error(' Error creating proposal:', error)
      throw new Error(`Failed to create proposal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async vote(params: {
    proposalId: PublicKey
    voter: PublicKey
    vote: 'For' | 'Against' | 'Abstain'
    walletType?: 'custodial' | 'external'
    userId?: string // Для custodial кошелька нужен userId
  }): Promise<string> {
    try {
      console.log(' Building vote transaction...')
      
      // Build transaction
      // TODO: Calculate actual voting weight based on token balance
      const defaultWeight = "1"; // Temporary default weight
      const transaction = await this.buildVoteTransaction(
        params.voter,
        parseInt(params.proposalId.toString()), // Convert PublicKey to number
        params.vote,
        defaultWeight
      )
      
      // Set sponsor as feePayer (sponsor always pays fees)
      transaction.feePayer = this.sponsorKeypair.publicKey
      
      // Get recent blockhash (CRITICAL!)
      console.log(' Getting recent blockhash for vote...')
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      console.log(' Recent blockhash set for vote:', blockhash)

      // Dual signing for voting (like createProposal)
      if (params.walletType === 'custodial') {
        if (!params.userId) {
          throw new Error('userId required for custodial wallet voting')
        }
        
        console.log(' Dual signing vote: user + sponsor (custodial mode)')
        
        // Get user keypair from custodial service
        const userKeypair = await this.getUserKeypair(params.userId)
        
        // Verify voter matches user keypair
        if (!userKeypair.publicKey.equals(params.voter)) {
          throw new Error(`Voter mismatch: expected ${userKeypair.publicKey.toBase58()}, got ${params.voter.toBase58()}`)
        }
        
        // Dual sign: user first, then sponsor
        console.log(' Signing vote with user keypair...')
        transaction.partialSign(userKeypair)
        
        console.log(' Signing vote with sponsor keypair...')
        transaction.partialSign(this.sponsorKeypair)
        
      } else {
        console.log(' External wallet voting not implemented yet')
        throw new Error('External wallet voting not implemented yet. Use custodial wallet.')
      }
      
      console.log(' Sending vote transaction...')
      const signature = await this.connection.sendRawTransaction(transaction.serialize())
      
      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed')
      
      console.log(' Vote recorded successfully:', signature)
      return signature
      
    } catch (error) {
      console.error(' Error voting:', error)
      throw new Error(`Failed to vote: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async initializeDAO(params: {
    votingDuration: number
    executionDelay: number
    quorumThreshold: string
    proposalThreshold: string
  }): Promise<string> {
    try {
      console.log(' Building initialize DAO transaction...')
      
      // Build transaction
      const transaction = await this.buildInitializeDAOTransaction(
        this.sponsorKeypair.publicKey, // authority
        this.sponsorKeypair.publicKey, // payer
        params.votingDuration,
        params.executionDelay,
        params.quorumThreshold,
        params.proposalThreshold
      )
      
      // Set sponsor as feePayer
      transaction.feePayer = this.sponsorKeypair.publicKey
      
      // Get recent blockhash (CRITICAL!)
      console.log(' Getting recent blockhash for DAO initialization...')
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed')
      transaction.recentBlockhash = blockhash
      console.log(' Recent blockhash set for initialization:', blockhash)

      // Sponsor signs and pays for initialization
      console.log(' Using sponsor keypair for DAO initialization')
      transaction.sign(this.sponsorKeypair)
      
      console.log(' Sending initialize DAO transaction...')
      const signature = await this.connection.sendRawTransaction(transaction.serialize())
      
      // Confirm transaction
      await this.connection.confirmTransaction(signature, 'confirmed')
      
      console.log(' DAO initialized successfully:', signature)
      return signature
      
    } catch (error) {
      console.error(' Error initializing DAO:', error)
      throw new Error(`Failed to initialize DAO: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  async isDAOInitialized(): Promise<boolean> {
    try {
      const daoConfig = await this.getDAOConfig()
      return daoConfig !== null
    } catch (error) {
      console.warn(' DAO not initialized or error checking:', error)
      return false
    }
  }

  async getUserVotingPower(userWallet: PublicKey): Promise<string> {
    try {
      console.log(' DEBUG: Getting voting power for user:', userWallet.toBase58())
      
      // ИСПРАВЛЕНО: ВСЕГДА используем правильный TNG mint, игнорируем DAO конфигурацию
      // Потому что DAO контракт инициализирован с неправильным mint
      const correctMint = TNG_MINT
      console.log(' DEBUG: Using CORRECT TNG mint address:', correctMint.toBase58())
      
      // Проверим что это действительно правильный mint
      const daoConfig = await this.getDAOConfig()
      if (daoConfig && !correctMint.equals(daoConfig.tngMint)) {
        console.log(' WARNING: DAO mint mismatch detected!')
        console.log(`   DAO expects: ${daoConfig.tngMint.toBase58()}`)
        console.log(`   We use: ${correctMint.toBase58()}`)
        console.log(' Using correct mint for compatibility...')
      }
      
      const userTngAccount = await getAssociatedTokenAddress(correctMint, userWallet)
      console.log(' DEBUG: User TNG account address:', userTngAccount.toBase58())
      
      const accountInfo = await this.connection.getTokenAccountBalance(userTngAccount)
      console.log(' DEBUG: Token account balance info:', {
        amount: accountInfo.value.amount,
        decimals: accountInfo.value.decimals,
        uiAmount: accountInfo.value.uiAmount
      })
      
      const rawVotingPower = accountInfo.value.amount
      console.log(' DEBUG: Raw user voting power (lamports):', rawVotingPower)
      console.log(' DEBUG: User voting power in TNG:', parseInt(rawVotingPower) / 1e9)
      
      return rawVotingPower
    } catch (error) {
      console.error(' DEBUG: Error getting user voting power:', error)
      console.error(' DEBUG: Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        userWallet: userWallet.toBase58()
      })
      return '0'
    }
  }

  async hasUserVoted(proposalId: PublicKey, voter: PublicKey): Promise<boolean> {
    try {
      await this.ensureProgram()
      const [voteRecordPDA] = this.getVoteRecordPDA(voter, proposalId)
      await this.program!.account.voteRecord.fetch(voteRecordPDA)
      return true // If no error, vote record exists
    } catch (error) {
      return false // Vote record doesn't exist
    }
  }


  formatSOLAmount(lamports: string): string {
    const sol = parseFloat(lamports) / 1_000_000_000
    return sol.toLocaleString('en-US', { maximumFractionDigits: 4 })
  }
}
