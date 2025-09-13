/**
 * On-Chain Transfers API
 * POST /api/onchain/transfers
 */

import { NextRequest, NextResponse } from 'next/server';
import { CustodialWalletService } from '@/lib/wallet';
import { SponsorOperation } from '@/lib/wallet/sponsor.service';
import { TransactionPriority } from '@/lib/wallet/types';
import { withAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OnchainPurpose } from '@prisma/client';

export const POST = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {

    const userId = auth.userId;

    // Парсим тело запроса
    const body = await request.json();
    const {
      toAddress,
      asset,
      amount,
      memo,
      priority = 'medium',
      idempotencyKey
    } = body;


    // Валидация входных данных
    if (!toAddress || typeof toAddress !== 'string') {
      return NextResponse.json(
        { error: 'Адрес получателя обязателен', code: 'INVALID_ADDRESS' },
        { status: 400 }
      );
    }

    if (!asset || !['SOL', 'TNG'].includes(asset)) {
      return NextResponse.json(
        { error: 'Поддерживаются только SOL и TNG переводы', code: 'INVALID_ASSET' },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== 'string') {
      return NextResponse.json(
        { error: 'Сумма обязательна', code: 'INVALID_AMOUNT' },
        { status: 400 }
      );
    }

    if (!['low', 'medium', 'high'].includes(priority)) {
      return NextResponse.json(
        { error: 'Неверный приоритет. Используйте: low, medium, high', code: 'INVALID_PRIORITY' },
        { status: 400 }
      );
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return NextResponse.json(
        { error: 'Ключ идемпотентности обязателен', code: 'MISSING_IDEMPOTENCY_KEY' },
        { status: 400 }
      );
    }

    // Конвертируем amount в BigInt
    let amountBigInt: bigint;
    try {
      amountBigInt = BigInt(amount);
      if (amountBigInt <= BigInt(0)) {
        throw new Error('Amount must be positive');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Неверный формат суммы', code: 'INVALID_AMOUNT_FORMAT' },
        { status: 400 }
      );
    }

    // Проверяем существование пользователя и его кошелька
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true }
    });

    if (!user?.walletAddress) {
      return NextResponse.json(
        { error: 'У пользователя нет custodial кошелька', code: 'NO_WALLET' },
        { status: 400 }
      );
    }

    // Проверяем дублирование по idempotencyKey
    const existingTx = await prisma.onchainTx.findFirst({
      where: {
        userId,
        idempotencyKey: idempotencyKey
      }
    });

    if (existingTx) {
      console.log(' Duplicate request detected, returning existing transaction');
      return NextResponse.json({
        success: true,
        data: {
          transaction: {
            id: existingTx.id,
            signature: existingTx.signature,
            amount: existingTx.amount?.toString() || amount,
            asset,
            toAddress: existingTx.toAddress,
            status: existingTx.status,
            createdAt: existingTx.createdAt,
            confirmedAt: existingTx.confirmedAt,
            fee: existingTx.fee?.toString()
          }
        },
        message: 'Транзакция уже существует (идемпотентность)'
      });
    }

    // Создаем сервис кошельков
    const walletService = new CustodialWalletService(prisma);

    // Проверяем доступность sponsor для этой операции
    const sponsorOperation = asset === 'SOL' ? SponsorOperation.SOL_TRANSFER : SponsorOperation.SPL_TRANSFER;
    const canSponsor = await walletService.canSponsorTransaction(userId, sponsorOperation);

    if (!canSponsor) {
      return NextResponse.json(
        { 
          error: 'Sponsor система недоступна. Превышены лимиты или недостаточно средств.', 
          code: 'SPONSOR_UNAVAILABLE' 
        },
        { status: 429 }
      );
    }

    // Маппим приоритет
    const txPriority = priority === 'low' ? TransactionPriority.LOW :
                     priority === 'high' ? TransactionPriority.HIGH :
                     TransactionPriority.MEDIUM;

    // Выполняем on-chain перевод
    let transferResult;
    if (asset === 'SOL') {
      transferResult = await walletService.transferSOL(
        userId,
        toAddress,
        amountBigInt,
        memo,
        txPriority
      );
    } else { // TNG
      transferResult = await walletService.transferTNG(
        userId,
        toAddress,
        amountBigInt,
        memo,
        txPriority
      );
    }

    if (!transferResult.success || !transferResult.data) {
      const statusCode = getStatusCodeFromOnchainError(transferResult.error?.code);
      return NextResponse.json(
        {
          error: transferResult.error?.message || 'Ошибка выполнения on-chain перевода',
          code: transferResult.error?.code || 'ONCHAIN_TRANSFER_FAILED',
          details: transferResult.error?.details,
          timestamp: new Date().toISOString()
        },
        { status: statusCode }
      );
    }

    const transaction = transferResult.data;

    // Сохраняем транзакцию в БД для отслеживания
    try {
      // Проверяем является ли получатель пользователем в системе
      const recipient = await prisma.user.findFirst({
        where: { walletAddress: toAddress },
        select: { id: true, username: true, firstName: true }
      });

      // Создаем запись для отправителя
      const senderTx = await prisma.onchainTx.create({
        data: {
          userId,
          signature: transaction.signature,
          amount: amountBigInt,
          toAddress,
          purpose: OnchainPurpose.WITHDRAW,
          status: transaction.status === 'confirmed' ? 'CONFIRMED' : 'PENDING',
          slot: transaction.slot ? BigInt(transaction.slot) : undefined,
          blockTime: transaction.blockTime,
          fee: transaction.fee,
          confirmedAt: transaction.status === 'confirmed' ? new Date() : undefined,
          idempotencyKey: idempotencyKey,
          metadata: {
            asset,
            memo,
            priority,
            sponsorEnabled: true,
            recipientUserId: recipient?.id // добавляем ID получателя если найден
          }
        }
      });

      console.log(' Sender on-chain transfer recorded:', {
        signature: transaction.signature,
        senderId: userId,
        amount: amount,
        asset,
        dbId: senderTx.id,
        recipientFound: !!recipient
      });

      // Если получатель найден в системе, создаем запись и для него
      if (recipient) {
        // Проверяем не создана ли уже DEPOSIT запись для этого получателя
        const existingDepositTx = await prisma.onchainTx.findFirst({
          where: {
            userId: recipient.id,
            signature: transaction.signature,
            purpose: OnchainPurpose.DEPOSIT
          }
        });

        if (existingDepositTx) {
          console.log(' DEPOSIT record already exists for recipient:', {
            signature: transaction.signature,
            recipientId: recipient.id,
            dbId: existingDepositTx.id
          });
        } else {
          try {
            const recipientTx = await prisma.onchainTx.create({
              data: {
                userId: recipient.id,
                signature: transaction.signature,
                amount: amountBigInt,
                fromAddress: user.walletAddress, // добавляем адрес отправителя
                purpose: OnchainPurpose.DEPOSIT,
                status: transaction.status === 'confirmed' ? 'CONFIRMED' : 'PENDING',
                slot: transaction.slot ? BigInt(transaction.slot) : undefined,
                blockTime: transaction.blockTime,
                fee: transaction.fee || null, // используем fee от транзакции или null
                confirmedAt: transaction.status === 'confirmed' ? new Date() : undefined,
                idempotencyKey: `${idempotencyKey}_recipient`,
                metadata: {
                  asset,
                  memo,
                  priority,
                  sponsorEnabled: true,
                  senderUserId: userId // добавляем ID отправителя
                }
              }
            });

            console.log(' Recipient on-chain transfer recorded:', {
              signature: transaction.signature,
              recipientId: recipient.id,
              amount: amount,
              asset,
              dbId: recipientTx.id
            });

            // Отправляем SSE уведомление получателю
            try {
              // SSE уведомления отключены для упрощения
            
              const notificationData = {
                id: `onchain_transfer_${transaction.signature}`,
                type: 'transfer_received',
                data: {
                  type: 'transfer_received' as const,
                  transferId: transaction.signature,
                  senderId: userId,
                  senderUsername: undefined, // можно добавить если нужно
                  recipientId: recipient.id,
                  token: asset,
                  amount: (Number(amountBigInt) / 1e9).toString(),
                  usdAmount: undefined, // можно рассчитать если нужно
                  memo,
                  isAnonymous: false,
                  timestamp: new Date().toISOString(),
                  isOnchain: true,
                  explorerUrl: `https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet`
                },
                timestamp: new Date().toISOString()
              };

              // sendSSENotification(recipient.id, notificationData); // Отключено
              console.log(' Notification prepared for recipient:', recipient.id);
            } catch (notificationError) {
              console.error(' Failed to send SSE notification to recipient:', notificationError);
            }

          } catch (recipientDbError) {
            console.error(' Failed to save recipient transaction to DB:', recipientDbError);
            // Не фейлим запрос, так как основная транзакция отправителя сохранена
          }
        }
      }

    } catch (dbError) {
      console.error(' Failed to save transaction to DB:', dbError);
      // Не фейлим запрос, так как blockchain транзакция прошла
    }

    // Возвращаем успешный результат
    return NextResponse.json({
      success: true,
      data: {
        transaction: {
          signature: transaction.signature,
          amount: amount,
          asset,
          toAddress,
          status: transaction.status,
          slot: transaction.slot,
          blockTime: transaction.blockTime,
          fee: transaction.fee?.toString(),
          confirmations: transaction.confirmations,
          priority: txPriority,
          sponsorEnabled: true,
          explorerUrl: `https://explorer.solana.com/tx/${transaction.signature}?cluster=devnet`
        }
      },
      message: `${asset} перевод выполнен успешно в blockchain`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error(' On-chain transfer API error:', error);
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        debug: process.env.NODE_ENV === 'development' 
          ? error instanceof Error ? error.message : String(error) 
          : undefined
      },
      { status: 500 }
    );
  }
})

// GET /api/onchain/transfers - получить историю on-chain переводов
export const GET = withAuth(async (request: NextRequest, auth: { userId: string; telegramId: string }) => {
  try {
    console.log(' Getting on-chain transfer history...');

    const userId = auth.userId;

    // Парсим query параметры
    const { searchParams } = new URL(request.url);
    const asset = searchParams.get('asset'); // SOL, TNG или null для всех
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    console.log(' History request:', { userId, asset, limit, page });

    // Формируем фильтры - включаем WITHDRAW, DEPOSIT и FAUCET операции
    const where: any = {
      userId,
      purpose: {
        in: [OnchainPurpose.WITHDRAW, OnchainPurpose.DEPOSIT, OnchainPurpose.FAUCET]
      }
    };

    if (asset) {
      where.metadata = {
        path: ['asset'],
        equals: asset
      };
    }

    // Получаем транзакции из БД
    const [transfers, total] = await Promise.all([
      prisma.onchainTx.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.onchainTx.count({ where })
    ]);

    const transferData = transfers.map(transfer => ({
      id: transfer.id,
      signature: transfer.signature,
      amount: transfer.amount?.toString() || '0',
      asset: (transfer.metadata as any)?.asset || (transfer.purpose === 'FAUCET' ? 'TNG' : 'SOL'),
      fromAddress: transfer.fromAddress, // адрес отправителя (для DEPOSIT)
      toAddress: transfer.toAddress, // адрес получателя (для WITHDRAW)
      status: transfer.status,
      slot: transfer.slot?.toString(),
      blockTime: transfer.blockTime,
      fee: transfer.fee?.toString(),
      purpose: transfer.purpose, // WITHDRAW (отправлено) или DEPOSIT (получено) или FAUCET
      createdAt: transfer.createdAt,
      confirmedAt: transfer.confirmedAt,
      memo: (transfer.metadata as any)?.memo,
      priority: (transfer.metadata as any)?.priority,
      sponsorEnabled: (transfer.metadata as any)?.sponsorEnabled || false,
      senderUserId: (transfer.metadata as any)?.senderUserId, // ID отправителя (для DEPOSIT)
      recipientUserId: (transfer.metadata as any)?.recipientUserId, // ID получателя (для WITHDRAW)
      explorerUrl: transfer.signature 
        ? `https://explorer.solana.com/tx/${transfer.signature}?cluster=devnet`
        : undefined
    }));

    return NextResponse.json({
      success: true,
      data: {
        transfers: transferData,
        pagination: {
          total,
          page,
          limit,
          hasMore: offset + transfers.length < total,
          totalPages: Math.ceil(total / limit)
        }
      },
      message: 'История on-chain переводов получена успешно'
    });

  } catch (error) {
    console.error(' On-chain transfer history API error:', error);
    
    return NextResponse.json(
      {
        error: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
})

/**
 * Определяет HTTP статус по коду ошибки on-chain операций
 */
function getStatusCodeFromOnchainError(errorCode?: string): number {
  switch (errorCode) {
    case 'INVALID_ADDRESS':
    case 'INVALID_AMOUNT':
    case 'INVALID_TOKEN_MINT':
    case 'INSUFFICIENT_SOL_BALANCE':
      return 400;

    case 'WALLET_NOT_FOUND':
    case 'KMS_KEY_NOT_FOUND':
      return 404;

    case 'KMS_ACCESS_DENIED':
    case 'WALLET_INACTIVE':
    case 'WALLET_FROZEN':
      return 403;

    case 'SPONSOR_UNAVAILABLE':
      return 429;

    case 'RPC_CONNECTION_FAILED':
    case 'TRANSACTION_SIMULATION_FAILED':
    case 'TRANSACTION_SEND_FAILED':
    case 'KMS_SIGN_FAILED':
    case 'INTERNAL_ERROR':
    case 'DATABASE_ERROR':
    default:
      return 500;
  }
}