/**
 * TNG Bridge Contract Service (on-chain helper)
 * Safe runtime loading with fallback when IDL or keys are missing.
 */

import { AnchorProvider, Program, BN } from '@coral-xyz/anchor'
import { Connection, PublicKey, Keypair, SystemProgram } from '@solana/web3.js'
import { getAccount, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'

const TNG_BRIDGE_PROGRAM_ID = new PublicKey('8xgG6u61Hat3rLyn6VnTFq1KCQ9oWSgGXgEqaCN6LqLm')

export type BridgeLockResult = {
  success: boolean
  signature?: string
  error?: string
}

export type BridgeUnlockResult = {
  success: boolean
  signature?: string
  error?: string
}

function tryLoadIdl(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const idl = require('@/lib/idl/tng_bridge.json')
    return idl
  } catch (_) {
    return null
  }
}

export class TngBridgeContractService {
  private readonly connection: Connection
  private readonly sponsor: Keypair
  private readonly idl: any | null
  private readonly program: Program | null

  constructor(connection: Connection, sponsorSecret: number[]) {
    this.connection = connection
    this.sponsor = Keypair.fromSecretKey(new Uint8Array(sponsorSecret))
    this.idl = tryLoadIdl()

    if (this.idl) {
      const provider = new AnchorProvider(
        this.connection,
        {
          publicKey: this.sponsor.publicKey,
          signTransaction: async (tx: any) => { tx.sign(this.sponsor); return tx },
          signAllTransactions: async (txs: any[]) => txs.map(tx => { tx.sign(this.sponsor); return tx }),
        } as any,
        { commitment: 'confirmed' }
      )
      this.program = new (Program as any)(this.idl as any, TNG_BRIDGE_PROGRAM_ID, provider as any)
    } else {
      this.program = null
    }
  }

  private async getBridgeConfigPDA(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from('bridge_config')],
      TNG_BRIDGE_PROGRAM_ID
    )
  }

  private async getBridgeTxPDA(user: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from('bridge_tx'), user.toBuffer()],
      TNG_BRIDGE_PROGRAM_ID
    )
  }

  /**
   * Lock SPL tokens into the bridge vault owned by BridgeConfig PDA
   */
  async lockTokens(params: {
    userKeypair: Keypair
    tokenMint: PublicKey
    amount: bigint
    targetChain: 'Solana' | 'Ethereum' | 'BSC' | 'Polygon' | 'Avalanche' | 'Arbitrum' | 'Optimism'
    recipient: string
  }): Promise<BridgeLockResult> {
    try {
      if (!this.program || !this.idl) {
        return { success: false, error: 'Bridge IDL not found. On-chain bridge disabled.' }
      }

      const { userKeypair, tokenMint, amount, targetChain, recipient } = params
      const [bridgeConfigPDA] = await this.getBridgeConfigPDA()
      const [bridgeTxPDA] = await this.getBridgeTxPDA(userKeypair.publicKey)

      // Ensure bridge vault ATA (owner = bridgeConfigPDA) exists
      const bridgeVault = await getAssociatedTokenAddress(tokenMint, bridgeConfigPDA, true)
      try {
        await getAccount(this.connection, bridgeVault)
      } catch (_) {
        const ix = createAssociatedTokenAccountInstruction(
          this.sponsor.publicKey,
          bridgeVault,
          bridgeConfigPDA,
          tokenMint
        )
        const { blockhash } = await this.connection.getLatestBlockhash('confirmed')
        const tx = new (require('@solana/web3.js').Transaction)({ feePayer: this.sponsor.publicKey, recentBlockhash: blockhash })
        tx.add(ix)
        tx.sign(this.sponsor)
        const sig = await this.connection.sendRawTransaction(tx.serialize())
        await this.connection.confirmTransaction(sig, 'confirmed')
      }

      // User token account
      const userTokenAccount = await getAssociatedTokenAddress(tokenMint, userKeypair.publicKey)

      // Map string to Anchor enum variant object
      const chainVariantMap: Record<string, any> = {
        Solana: { solana: {} },
        Ethereum: { ethereum: {} },
        BSC: { bsc: {} },
        Polygon: { polygon: {} },
        Avalanche: { avalanche: {} },
        Arbitrum: { arbitrum: {} },
        Optimism: { optimism: {} },
      }
      const chainArg = chainVariantMap[targetChain]

      const sig = await (this.program as any).methods
        // lock_tokens(target_chain, recipient, amount, token_mint)
        .lockTokens(chainArg, recipient, new BN(amount.toString()), tokenMint)
        .accounts({
          bridgeConfig: bridgeConfigPDA,
          bridgeTransaction: bridgeTxPDA,
          user: userKeypair.publicKey,
          userTokenAccount,
          bridgeVault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([userKeypair])
        .rpc()

      return { success: true, signature: sig }
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) }
    }
  }

  /**
   * Unlock SPL tokens from vault to recipient after validator confirmations
   */
  async unlockTokens(params: {
    sourceChain: 'Solana' | 'Ethereum' | 'BSC' | 'Polygon' | 'Avalanche' | 'Arbitrum' | 'Optimism'
    transactionHash: string
    recipient: PublicKey
    amount: bigint
    tokenMint: PublicKey
    validatorSignatures: Uint8Array[]
  }): Promise<BridgeUnlockResult> {
    try {
      if (!this.program || !this.idl) {
        return { success: false, error: 'Bridge IDL not found. On-chain bridge disabled.' }
      }

      const { sourceChain, transactionHash, recipient, amount, tokenMint, validatorSignatures } = params

      const [bridgeConfigPDA] = await this.getBridgeConfigPDA()
      // For MVP we assume bridge_transaction is already created and passed as PDA seeded by user; here we reuse recipient seed as placeholder
      const [bridgeTxPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('bridge_tx'), recipient.toBuffer()],
        TNG_BRIDGE_PROGRAM_ID
      )

      // Resolve vault and recipient ATA
      const bridgeVault = await getAssociatedTokenAddress(tokenMint, bridgeConfigPDA, true)
      const recipientTokenAccount = await getAssociatedTokenAddress(tokenMint, recipient)

      const chainVariantMap: Record<string, any> = {
        Solana: { solana: {} },
        Ethereum: { ethereum: {} },
        BSC: { bsc: {} },
        Polygon: { polygon: {} },
        Avalanche: { avalanche: {} },
        Arbitrum: { arbitrum: {} },
        Optimism: { optimism: {} },
      }
      const chainArg = chainVariantMap[sourceChain]

      // Convert signatures into fixed arrays
      const sigs = validatorSignatures.map((s) => Array.from(s))

      const sig = await (this.program as any).methods
        .unlockTokens(chainArg, transactionHash, recipient, new BN(amount.toString()), tokenMint, sigs)
        .accounts({
          bridgeConfig: bridgeConfigPDA,
          bridgeTransaction: bridgeTxPDA,
          bridgeVault,
          recipientTokenAccount,
          vaultAuthority: bridgeConfigPDA, // PDA authority placeholder for MVP
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()

      return { success: true, signature: sig }
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) }
    }
  }
}


