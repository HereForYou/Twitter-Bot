import { ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import fetch from 'cross-fetch';
import { getTokenMintAddress } from './web3';
import { connection, SOL_ADDRESS, SOL_DECIMAL } from '../config/config';
import { roundToSpecificDecimal, sleep } from './functions';

const JUPITER_AGGREGATOR_V6 = new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');

/**
 *
 * @param {string} inputAddr
 * @param {string} outputAddr
 * @param {number} amount
 * @param {number} slippageBps
 * @returns
 */
export async function getQuoteForSwap(inputAddr: string, outputAddr: string, amount: number, slippageBps: number) {
  try {
    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?inputMint=${inputAddr}&outputMint=${outputAddr}&amount=${amount}&slippageBps=${slippageBps * 100}`
    );
    const quote = await response.json();
    return quote;
  } catch (error) {
    console.error('Error while getQuoteForSwap:', error);
    throw new Error('Error while getQuoteForSwap');
  }
}

/**
 *
 * @param {any} quote
 * @param {string} publicKey
 * @returns
 */
export async function getSerializedTransaction(quote: any, publicKey: string, priorityFee: number) {
  try {
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: publicKey,
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: priorityFee,
      }),
    });
    const { swapTransaction } = await response.json();
    return swapTransaction;
  } catch (error) {
    console.log('Error while getSerializedTransaction:', error);
    throw new Error('Error while getSerializedTransaction');
  }
}

/**
 * Get token price using its address using jupiter API
 * @param {string} token
 * @returns
 */
export async function getTokenPrice(token: string) {
  try {
    const response = await fetch(`https://api.jup.ag/price/v2?ids=${token}`, {
      method: 'get',
      redirect: 'follow',
    });
    const { data } = await response.json();
    return data[token]?.price;
  } catch (error) {
    console.error('Error while getTokenPrice:', error);
    throw new Error('Error while getTokenPrice');
  }
}

function getJupiterTransfers(transaction: ParsedTransactionWithMeta) {
  try {
    const instructions = transaction.transaction.message.instructions as PartiallyDecodedInstruction[];
    const swapIxIdx = instructions.findIndex((ix) => {
      return ix.programId.equals(JUPITER_AGGREGATOR_V6);
    });

    if (swapIxIdx === -1) {
      throw new Error('Non Jupiter Swap');
    }

    const transfers: any[] = [];
    transaction.meta?.innerInstructions?.forEach((instruction) => {
      if (instruction.index <= swapIxIdx) {
        (instruction.instructions as ParsedInstruction[]).forEach((ix) => {
          if (ix.parsed?.type === 'transfer' && ix.parsed.info.amount) {
            transfers.push({
              amount: ix.parsed.info.amount,
              source: ix.parsed.info.source,
              destination: ix.parsed.info.destination,
            });
          } else if (ix.parsed?.type === 'transferChecked' && ix.parsed.info.tokenAmount.amount) {
            transfers.push({
              amount: ix.parsed.info.tokenAmount.amount,
              source: ix.parsed.info.source,
              destination: ix.parsed.info.destination,
            });
          }
        });
      }
    });

    if (transfers.length < 2) {
      throw new Error('Invalid Jupiter Swap');
    }

    return [transfers[0], transfers[transfers.length - 1]];
  } catch (error: any) {
    throw new Error(error.message || 'Unexpected error while extracting transfers from jupiter dex.');
  }
}

export async function getTradeSize(signature: string) {
  await sleep(500)
  console.log('signature', signature)
  const transaction = await connection.getParsedTransaction(signature, {commitment: 'confirmed', maxSupportedTransactionVersion: 0})
  if (!transaction) {
    return { diffSol: 0, diffOther: 0 }
  }
  try {
    const transfers = getJupiterTransfers(transaction);
    const [tokenIn, tokenOut] = await Promise.all([
      getTokenMintAddress(transfers[0].source, transfers[0].destination),
      getTokenMintAddress(transfers[1].source, transfers[1].destination),
    ]);

    const diffSol =
      tokenIn?.mint === SOL_ADDRESS
        ? (transfers[0].amount as number) / SOL_DECIMAL
        : (transfers[1].amount as number) / SOL_DECIMAL;

    const diffOther =
      tokenIn?.mint === SOL_ADDRESS.toString()
        ? (transfers[1].amount as number) / 10 ** (tokenOut?.decimals || 0)
        : (transfers[0].amount as number) / 10 ** (tokenIn?.decimals || 0);

    return {
      diffSol: Math.abs(roundToSpecificDecimal(diffSol)),
      diffOther: Math.abs(roundToSpecificDecimal(diffOther)),
      isBuy: diffSol > 0 ? true : false,
    };
  } catch (error) {
    throw new Error('Error while caculating trade size.')
  }
}

