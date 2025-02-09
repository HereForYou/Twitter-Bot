import {
  Keypair,
  VersionedTransaction,
  PublicKey,
  TransactionMessage,
  ComputeBudgetProgram,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';
import { UserType } from '../models/user.model';
import { User } from '../models/user.model';
import {
  connection,
  bot,
  SOL_ADDRESS,
  SOL_DECIMAL,
  JUPITER_FEE_ACCOUNT,
} from '../config/config';
import { buySuccessText, sellSuccessText } from '../models/text.model';
import { getQuoteForSwap, getSerializedTransaction, getTokenPrice } from './jupiter';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { sellMarkUp, tokenMarkUp } from '../models/markup.model';

export async function getTokenInfo(mintAddress: string) {
  const metaplex = Metaplex.make(connection);

  const mint = new PublicKey(mintAddress);

  try {
    const tokenMetadata = await metaplex.nfts().findByMint({ mintAddress: mint });
    const price = await getTokenPrice(mintAddress);
    const risk = tokenMetadata.mint.freezeAuthorityAddress ? 100 : tokenMetadata.mint.mintAuthorityAddress ? 50 : 0;
    return {
      name: tokenMetadata.name,
      symbol: tokenMetadata.symbol,
      address: tokenMetadata.address.toString(),
      decimals: tokenMetadata.mint.decimals,
      risk,
      price,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Unexpected error while fetching token information');
  }
}

export async function getBalanceOfWallet(walletAddress: string) {
  try {
    const balance = await connection.getBalance(new PublicKey(walletAddress));
    return balance;
  } catch (error) {
    console.error('Error while getBalanceOfWallet', error);
    return 0;
  }
}

export async function getTokenBalanceOfWallet(walletAddr: string, tokenAddr: string) {
  try {
    const info = await connection.getParsedTokenAccountsByOwner(new PublicKey(walletAddr), {
      mint: new PublicKey(tokenAddr),
    });
    const tokenInfo = info?.value[0]?.account?.data.parsed.info.tokenAmount;
    // tokenInfo.decimals

    return { balanceInLamp: Number(tokenInfo?.amount), balanceNoLamp: Number(tokenInfo?.uiAmount) };
  } catch (error: any) {
    console.error('Error while getBalanceOfWallet', error);
    throw new Error(error.message || 'Unexpected error while fetching token balance');
  }
}

export const generateWallet = async () => {
  try {
    const keyPair = Keypair.generate(); // Generate new key pair of publicKey and privateKey
    return {
      publicKey: keyPair.publicKey.toString(),
      privateKey: bs58.encode(keyPair.secretKey),
    };
  } catch (error) {
    console.error('Error while generating wallet:', error);
    throw new Error('Failed to generate new Solana wallet.');
  }
};

export async function getTokenDiffFromTransaction(signature: string, tokenIn: string, tokenOut: string) {
  try {
    const transaction = await connection.getParsedTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    const postTokenBalance = transaction?.meta?.postTokenBalances;
    const preTokenBalance = transaction?.meta?.preTokenBalances;

    const diff = Math.abs(
      (postTokenBalance?.find((post) => post.mint === tokenIn && post.owner !== JUPITER_FEE_ACCOUNT)?.uiTokenAmount
        .uiAmount || 0) -
        (preTokenBalance?.find((pre) => pre.mint === tokenIn && pre.owner !== JUPITER_FEE_ACCOUNT)?.uiTokenAmount
          .uiAmount || 0)
    );

    const solDiff = Math.abs(
      (postTokenBalance?.find((post) => post.mint === tokenOut && post.owner !== JUPITER_FEE_ACCOUNT)?.uiTokenAmount
        .uiAmount || 0) -
        (preTokenBalance?.find((pre) => pre.mint === tokenOut && pre.owner !== JUPITER_FEE_ACCOUNT)?.uiTokenAmount
          .uiAmount || 0)
    );

    return { tokenInDiff: diff, tokenOutDiff: solDiff };
  } catch (error) {
    console.error(error);
    return { tokenInDiff: 0, tokenOutDiff: 0 };
  }
}

export async function getDeserialize(swapTransaction: string) {
  try {
    const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    return transaction;
  } catch (error) {
    console.error('Error while getDeserialize:', error);
    throw new Error('Error while getDeserialize');
  }
}

export async function signTransaction(transaction: VersionedTransaction, keyPair: Keypair) {
  try {
    transaction.sign([keyPair]);
    return transaction;
  } catch (error) {
    console.error('Error while signTransaction:', error);
    throw new Error('Error while signTransaction');
  }
}

export async function executeTransaction(transaction: VersionedTransaction) {
  try {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const rawTransaction = transaction.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 5,
    });

    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature,
    });
    return { success: true, signature: signature };
  } catch (error) {
    console.error('Error while executeTransaction:', error);
    return { success: false, signature: '' };
  }
}

export async function swapTokens(
  inputAddr: string,
  outputAddr: string,
  amount: number,
  secretKey: string,
  priorityFee: number,
  slippageBps: number
) {
  try {
    const keyPair = Keypair.fromSecretKey(bs58.decode(secretKey));

    const quote = await getQuoteForSwap(inputAddr, outputAddr, amount, slippageBps);
    console.log('quote:', quote);
    if (quote.error) {
      throw new Error(quote.error || quote.errorCode);
    }

    const swapTransaction = await getSerializedTransaction(quote, keyPair.publicKey.toString(), priorityFee);
    console.log('Passed swapTransaction function');

    const transaction = await getDeserialize(swapTransaction);
    console.log('Passed getDeserialize function');

    const signedTransaction = await signTransaction(transaction, keyPair);
    console.log('Passed signTransaction function');

    const result = await executeTransaction(signedTransaction);
    console.log(
      'Passed signTransaction function',
      result.signature,
      '============================================= END =============='
    );

    if (result.success === true) {
      const { tokenInDiff, tokenOutDiff } = await getTokenDiffFromTransaction(result.signature, inputAddr, outputAddr);
      console.log('tokenOutDiff', tokenOutDiff);
      return {
        success: true,
        signature: result.signature,
        message: '',
        tokenInDiff,
        tokenOutDiff,
      };
    } else {
      return { success: false, message: 'Transaction is expired.', signature: '' };
    }
  } catch (error: any) {
    console.error('Error while swapTransaction:', error);
    if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error('Something went wrong! Please contact with @QualityAtTheFirst');
    }
  }
}

export async function buyToken(user: UserType, mintAddress: string, amount: number) {
  try {
    const balance = await getBalanceOfWallet(user.wallet.publicKey); // Fetch the balance of wallet

    // If balance is lower than amount
    if (balance === 0 || balance < amount) {
      await bot.telegram.sendMessage(user.tgId, '🙅‍♀ Insufficient balance. Please top up your wallet.');
      return;
    }
    bot.telegram.sendMessage(user.tgId, `Transaction is pending now ${amount / SOL_DECIMAL}`);

    // Buy the token with SOL
    const result = await swapTokens(
      SOL_ADDRESS,
      mintAddress,
      amount,
      user.wallet.privateKey,
      Math.floor(user.priorityFee * SOL_DECIMAL),
      user.slippageBps
    );

    // If purchase failed
    if (result.success === false || !result.tokenOutDiff) {
      throw new Error(result.message || 'Transaction is expired.');
    }

    const tokenInfo = await getTokenInfo(mintAddress);

    const tokenAmount = result.tokenOutDiff;

    await bot.telegram.sendMessage(
      user.tgId,
      await buySuccessText(user, tokenInfo, result.signature, amount / SOL_DECIMAL, tokenAmount),
      tokenMarkUp(user)
    );

    console.log('========================= END ============================ for', user.tgId);
  } catch (error: any) {
    if (!error.message) console.error('Error while swapTokenForAllActiveUsers:', error);
    bot.telegram.sendMessage(
      user.tgId,
      `${error.message || '🔴 Sell failed\nUnexpected error while selling the token'}`
    );
  }
}

export async function sellToken(user: UserType, mintAddress: string, amount: number) {
  try {
    const { balanceInLamp: balance } = await getTokenBalanceOfWallet(user.wallet.publicKey, mintAddress); // Fetch the token balance of wallet
    const tokenInfo = await getTokenInfo(mintAddress);

    // If balance is lower than amount
    if (balance === 0 || balance < amount) {
      throw new Error('🙅‍♀ Insufficient token balance.');
    }
    bot.telegram.sendMessage(user.tgId, `Transaction is pending ${amount / 10 ** tokenInfo.decimals}`);

    // Buy the token with SOL
    const result = await swapTokens(
      mintAddress,
      SOL_ADDRESS,
      amount,
      user.wallet.privateKey,
      Math.floor(user.priorityFee * SOL_DECIMAL),
      user.slippageBps
    );

    // If purchase failed
    if (result.success === false || !result.tokenOutDiff) {
      throw new Error(result.message || 'Transaction is expired.');
    }

    await bot.telegram.sendMessage(
      user.tgId,
      await sellSuccessText(user, tokenInfo, result.tokenOutDiff, result.signature),
      tokenMarkUp(user)
    );
    console.log('========================= END ============================ for', user.tgId);
  } catch (error: any) {
    if (!error.message) console.error('Error while swapTokenForAllActiveUsers:', error);
    bot.telegram.sendMessage(
      user.tgId,
      `${error.message || '🔴 Sell failed\nUnexpected error while selling the token'}`
    );
  }
}

export async function swapTokenForAllActiveUsers(mintAddress: string) {
  try {
    const users = await User.find({ botStatus: true, autoTrade: true, snipeAmount: { $gt: 0 } });

    await Promise.all(
      users.map(async (user) => {
        bot.telegram.sendMessage(user.tgId, `Transaction is pending now ${user.snipeAmount}`);
        await buyToken(user, mintAddress, user.snipeAmount * SOL_DECIMAL);
      })
    );
  } catch (error) {
    console.error(error);
  }
}

export async function isValidToken(mintAddress: string) {
  try {
    const mint = new PublicKey(mintAddress);
    const accountInfo = await connection.getAccountInfo(mint);
    if (!accountInfo) {
      return false;
    }
    if (accountInfo.owner.equals(TOKEN_PROGRAM_ID) || accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      return true;
    }
    return false;
  } catch (error) {
    console.error(error);
  }
}

async function getSignedVersionedTransaction(
  payer: Keypair,
  instructions: TransactionInstruction[],
  blockhash: string
) {
  try {
    const messageV0 = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();
    const versionedTransaction = new VersionedTransaction(messageV0);
    versionedTransaction.sign([payer]);
    return versionedTransaction;
  } catch (error: any) {
    throw new Error(error.message || 'Unexpected error while fetching signed and versioned transaction');
  }
}

function calculateMicroLamports(user: UserType, lenOfInstructions: number) {
  return (user.priorityFee * SOL_DECIMAL) / (lenOfInstructions * 200000 * 2);
}

export async function transferToken(
  mint: PublicKey,
  destination: PublicKey,
  _balInLamp: number,
  balNoLamp: number,
  user: UserType
) {
  try {
    bot.telegram.sendMessage(user.tgId, 'Transfer transaction is pending');
    const payer = Keypair.fromSecretKey(bs58.decode(user.wallet.privateKey));
    const instructions = [];

    const sourceATA = getAssociatedTokenAddressSync(mint, payer.publicKey);

    const destinationATA = getAssociatedTokenAddressSync(mint, destination);
    const destinationATAInfo = await connection.getAccountInfo(destinationATA);
    if (!destinationATAInfo) {
      instructions.push(createAssociatedTokenAccountInstruction(payer.publicKey, destinationATA, destination, mint));
    }

    instructions.push(createTransferInstruction(sourceATA, destinationATA, payer.publicKey, _balInLamp));

    const microLamports = calculateMicroLamports(user, instructions.length);
    instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: Math.floor(microLamports * 1e6) }));

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const versionedTransaction = await getSignedVersionedTransaction(payer, instructions, blockhash);

    // Attempts to send the transaction to the network, handling success or failure.
    const { signature } = await executeVersionedTransaction(versionedTransaction, blockhash, lastValidBlockHeight);

    bot.telegram.sendMessage(
      user.tgId,
      `🎉 <b>${balNoLamp}</b> Successfully transferred to <code>${destination.toString()}</code>\n` +
        `<a href='https://solscan.io/tx/${signature}'>View on SolScan</a>`,
      { parse_mode: 'HTML' }
    );
  } catch (error: any) {
    console.error(error);
    bot.telegram.sendMessage(user.tgId, error.message || 'Unexpected error');
  }
}

async function executeVersionedTransaction(
  versionedTransaction: VersionedTransaction,
  blockhash: string,
  lastValidBlockHeight: number
) {
  try {
    const txid = await connection.sendTransaction(versionedTransaction, {
      maxRetries: 5,
    });

    const confirmation = await connection.confirmTransaction(
      {
        signature: txid,
        blockhash: blockhash,
        lastValidBlockHeight: lastValidBlockHeight,
      },
      'confirmed'
    );
    if (confirmation.value.err) {
      throw new Error('🚨Transaction not confirmed.');
    }
    return { success: true, signature: txid };
  } catch (error) {
    console.error('Transaction failed', error);
    throw new Error('🚨Transaction not confirmed.');
  }
}

export async function transferSol(toPubkey: PublicKey, _balInLamp: number, user: UserType) {
  try {
    bot.telegram.sendMessage(user.tgId, 'Transfer transaction is pending');
    const payer = Keypair.fromSecretKey(bs58.decode(user.wallet.privateKey));

    const instructions: TransactionInstruction[] = [];

    const lamports = _balInLamp - 155000;

    instructions.push(ComputeBudgetProgram.setComputeUnitLimit({ units: 500 }));
    instructions.push(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 300000000 }));
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey,
        lamports,
      })
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const versionedTransaction = await getSignedVersionedTransaction(payer, instructions, blockhash);

    // Attempts to send the transaction to the network, handling success or failure.
    const { signature } = await executeVersionedTransaction(versionedTransaction, blockhash, lastValidBlockHeight);

    bot.telegram.sendMessage(
      user.tgId,
      `🎉 <b>${lamports / SOL_DECIMAL}</b> SOL successfully transferred to <code>${toPubkey.toString()}</code>\n` +
        `<a href='https://solscan.io/tx/${signature}'>View on SolScan</a>`,
      { parse_mode: 'HTML' }
    );
  } catch (error) {
    console.error(error);
  }
}
