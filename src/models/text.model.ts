import { SOL_DECIMAL } from '../config/config';
import { UserType } from './user.model';
import { roundToSpecificDecimal } from '../utils/functions';
import { TokenInfoType } from '../config/types';
import { getTokenBalanceOfWallet, getTokenInfo } from '../utils/web3';

/**
 * The text when start command is inputed
 */
export const startText = (user: UserType) => {
  return (
    `🎉 @${user?.username}, <b>Welcome to Smart Solana Trading Bot</b>\n\n` +
    `👍 The Unique Solana Trading Bot.\n` +
    `💨 Snipe asap, 💨 Trade as reasonable as possible`
  );
};

/**
 * The text to be sent when new user login
 * @param {} user
 */
export const newUserText = (user: UserType) => {
  try {
    return (
      `👋 Hello, <b>@${user?.username}</b>\n\n` +
      `⚠ Keep your <i>private keys</i> <b>safe</b>\n` +
      `💳 Public Key: <code>${user.wallet.publicKey}</code>\n` +
      `🔑 Private Key: <code>${user.wallet.privateKey}</code>\n`
    );
  } catch (error) {
    console.error('Error while getting newUserText:', error);
    throw new Error('Failed to create newUser text.');
  }
};

/**
 * The text when help command is inputed
 */
export const helpText =
  `🚀 <b>Smart 🦊 Solana Trading Bot</b> 🚀 \n\n` +
  `Supercharge your trading with our cutting-edge bot that tracks and capitalizes on Serum migrations from Pump.fun! 💎\n\n` +
  `Key Features:\n` +
  `✅ Lightning-fast transaction tracking\n` +
  `✅ Instant buy execution\n` +
  `✅ Smart auto-buy/sell based on MC\n` +
  `✅ Real-time Telegram alerts\n\n` +
  `How it works:\n\n` +
  `🔍 Monitors Pump.fun migrations to Serum\n` +
  `💨 Executes rapid buy orders upon detection\n` +
  `📊 Tracks market cap in real-time\n` +
  `💰 Triggers auto-sell when your conditions are met\n\n` +
  `Join the trading revolution today! 🌟`;

export const swapSuccessText = (tokenInfo: any, signature: string, solAmount: number, tokenAmount: number) => {
  return (
    `🟢 <b>Buying <b>${tokenInfo.symbol || tokenInfo.name}</b> is success</b>.\n` +
    `You bought <b>${roundToSpecificDecimal(tokenAmount / 10 ** tokenInfo.decimals, 4)}</b> ` +
    `${tokenInfo.symbol || tokenInfo.name} using <b>${solAmount / SOL_DECIMAL}</b> SOL.\n` +
    `📝<a href='https://solscan.io/tx/${signature}'>Transaction</a>`
  );
};

export const settingText =
  `🛠️ <b>Smart 🦊 Trading Bot Settings</b>\n\n` +
  `Welcome to the settings page for your Solana Trading Bot!\n\n` +
  `1. <b>Amount</b>: \n` +
  `   - Specify the amount of SOL (or tokens) you wish to trade.\n` +
  `2. <b>Priority Fee</b>: \n` +
  `   - Set the priority fee (in SOL) to ensure your transactions are processed quickly.\n` +
  `3. <b>Slippage BPS</b>: \n` +
  `   - Define the slippage in basis points (bps).\n` +
  `4. <b>Start Time</b>: \n` +
  `   - Choose the time when you want the bot to start trading.\n` +
  `5. <b>Stop Time</b>: \n` +
  `   - Set the time when you want the bot to stop trading.\n\n` +
  `🔧 <b>Please adjust these settings according to your trading strategy and preferences.</b>`;

export const buySuccessText = async (
  user: UserType,
  token: TokenInfoType,
  signature: string,
  solAmount: number,
  tokenAmount: number
) => {
  const { balanceNoLamp: balance } = await getTokenBalanceOfWallet(user.wallet.publicKey, token.address);
  return (
    `🟢 <b>Buying <b>${token.symbol || token.name}</b> is success! 🟢</b>\n` +
    `<code>${token.address}</code>\n` +
    `You bought <b>${roundToSpecificDecimal(tokenAmount, token.decimals)}</b>` +
    ` ${token.symbol || token.name} using <b>${solAmount}</b> SOL.\n` +
    `💵 Balance: ${balance}\n` +
    `📝<a href='https://solscan.io/tx/${signature}'>Transaction</a>`
  );
};

export const sellSuccessText = async (user: UserType, token: TokenInfoType, earn: number, signature: string) => {
  const { balanceNoLamp: balance } = await getTokenBalanceOfWallet(user.wallet.publicKey, token.address);
  return (
    `🔴 <b>Selling ${token.symbol || token.name} is success! 🟢</b>\n` +
    `<code>${token.address}</code>\n` +
    `💵 You got <b>${roundToSpecificDecimal(earn, 4)}</b> SOL\n` +
    `💵 Balance: ${balance}\n` +
    `📝 <a href='https://solscan.io/tx/${signature}'>Transaction</a>`
  );
};

export async function tokenText(mintAddress: string, pubKey: string) {
  const { balanceNoLamp: balance } = await getTokenBalanceOfWallet(pubKey, mintAddress);
  const token = await getTokenInfo(mintAddress);
  return (
    `<b>Name</b>: ${token?.name} (${token?.symbol})\n` +
    `<b>CA</b>: <code>${mintAddress}</code>\n` +
    `<b>Balance</b>: ${balance}`
  );
}
