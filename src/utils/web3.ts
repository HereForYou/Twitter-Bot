import { Keypair, VersionedTransaction, PublicKey, PartiallyDecodedInstruction } from '@solana/web3.js';
import { Metaplex } from '@metaplex-foundation/js';
import { UserType } from '../models/user.model';
import { TokenInfoType } from '../config/types';
import { User } from '../models/user.model';
import {
  connection,
  bot,
  INSTRUCTION_NAME,
  RAYDIUM,
  SOL_ADDRESS,
  sigHistory,
  RAYDIUM_PUBLIC_KEY,
  SOL_DECIMAL,
  JUPITER_FEE_ACCOUNT,
} from '../config/config';
import { buySuccessText } from '../models/text.model';
import { sendMessageToAllActiveUsers, addItemToArray } from './functions';
import { getQuoteForSwap, getSerializedTransaction, getTokenPrice } from './jupiter';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';

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
  } catch (error) {
    console.error('Error fetching token metadata:', error);
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
    return Number(tokenInfo?.amount);
  } catch (error) {
    console.error('Error while getBalanceOfWallet', error);
    return 0;
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
      return { success: false, message: quote.errorCode as string, signature: '' };
    }

    const swapTransaction = await getSerializedTransaction(quote, keyPair.publicKey.toString(), priorityFee);
    console.log('Passed swapTransaction function')

    const transaction = await getDeserialize(swapTransaction);
    console.log('Passed getDeserialize function')

    const signedTransaction = await signTransaction(transaction, keyPair);
    console.log('Passed signTransaction function')

    const result = await executeTransaction(signedTransaction);
    console.log('Passed signTransaction function', result.signature, '============================================= END ==============')

    if (result.success === true) {
      const { tokenInDiff, tokenOutDiff } = await getTokenDiffFromTransaction(result.signature, inputAddr, outputAddr);
      console.log('tokenOutDiff', tokenOutDiff)
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
      return { success: false, message: error.message, signature: '' };
    } else {
      return { success: false, message: 'Something went wrong! Please contact with @QualityAtTheFirst', signature: '' };
    }
  }
}

export async function buyToken(user: UserType, mintAddress: string, amount: number) {
  try {
    console.log('In buyToken function', user.tgId)
    const balance = await getBalanceOfWallet(user.wallet.publicKey); // Fetch the balance of wallet

    // If balance is lower than amount
    if (balance < amount) {
      await bot.telegram.sendMessage(
        user.tgId,
        '🙅‍♀ Insufficient balance. Please top up your wallet and then continue using the bot.',
        { parse_mode: 'HTML' }
      );
      return;
    }

    // Buy the token with SOL
    const result = await swapTokens(
      SOL_ADDRESS,
      mintAddress,
      amount,
      user.wallet.privateKey,
      user.priorityFee,
      user.slippageBps
    );

    // If purchase failed
    if (result.success === false || !result.tokenOutDiff) {
      await bot.telegram.sendMessage(user.tgId, `🔴 Buy failed. \n${result.message || 'Priority Fee is too low. Please increase the fee.'}`, {
        parse_mode: 'HTML',
      });
      return;
    }

    const tokenInfo = await getTokenInfo(mintAddress);
    if (!tokenInfo) {
      return;
    }

    const tokenAmount = result.tokenOutDiff;

    // user.tokens.push({
    //   name: tokenInfo.name,
    //   symbol: tokenInfo.symbol,
    //   address: mintAddress,
    //   amount: tokenAmount,
    //   usedSolAmount: result?.tokenInDiff,
    // });
    // await user.save();

    await bot.telegram.sendMessage(
      user.tgId,
      buySuccessText(tokenInfo, result.signature, amount / SOL_DECIMAL, tokenAmount),
      { parse_mode: 'HTML' }
    );
    await bot.telegram.sendMessage(
      7478348841,
      buySuccessText(tokenInfo, result.signature, amount / SOL_DECIMAL, tokenAmount),
      { parse_mode: 'HTML' }
    );
    console.log('========================= END ============================ for', user.tgId)
  } catch (error) {
    console.error('Error while swapTokenForAllActiveUsers:', error);
  }
}

export async function swapTokenForAllActiveUsers(mintAddress: string) {
  try {
    const users = await User.find({ botStatus: true, autoTrade: true, snipeAmount: { $gt: 0 } });

    await Promise.all(
      users.map( async (user) => {
        bot.telegram.sendMessage(user.tgId, `Transaction is pending now ${user.snipeAmount}`);
        bot.telegram.sendMessage(7478348841, `Transaction is pending now ${user.snipeAmount}`);
        await buyToken(user, mintAddress, user.snipeAmount * SOL_DECIMAL);
      })
    )
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
