import { SOL_DECIMAL } from '../config/config';
import { Markup, Types } from 'telegraf';
import { UserType } from './user.model';
import { getBalanceOfWallet } from '../utils/web3';
import { ParseMode } from 'telegraf/typings/core/types/typegram';

export const startMarkUp = () => {
  try {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🛠 Setting', 'Setting'), Markup.button.callback('📜 Help', 'Help')],
    ]).reply_markup;
  } catch (error) {
    console.error('Error while startMarkUp:', error);
    throw new Error('Failed to create markup for start command');
  }
};

export const settingMarkUp = async (user: UserType) => {
  const balance = await getBalanceOfWallet(user.wallet.publicKey);
  try {
    return {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback(`💳 Wallet (${balance / SOL_DECIMAL})`, 'Wallet')],
        [
          Markup.button.callback(`${user.botStatus ? '🆕 Tweet Alarm On 🟢' : '🆕 Tweet Alarm Off 🔴'}`, 'On Off'),
          Markup.button.callback(`${user.autoTrade ? '⚙ Auto Trade On 🟢' : '⚙ Auto Trade Off 🔴'}`, 'Auto Trade'),
        ],
        [Markup.button.callback(`💵 Trade Amount: ${user.snipeAmount} SOL`, 'Snipe Amount')],
        [
          Markup.button.callback(`💵 Priority Fee: ${user.priorityFee} SOL`, 'Priority Fee'),
          Markup.button.callback(`🆚 Slippage Bps: ${user.slippageBps}`, 'Slippage Bps'),
        ],
        [
          Markup.button.callback(`Mev Protect: ${user.mevProtect ? '🟢' : '🔴'}`, 'Mev Protect'),
          Markup.button.callback(`💰 Buy Tip: ${user.jitoFee} SOL`, 'Jito Fee'),
        ],
        [Markup.button.callback(`🦜 Twitter`, 'Twitter')],
        [
          Markup.button.callback('➕ Add Profile', 'Add Profile'),
          Markup.button.callback('➖ Remove Profile', 'Remove Profile'),
        ],
        [Markup.button.callback('🔙 Back', 'Return'), Markup.button.callback('✖ Close', 'Close')],
      ]).reply_markup,
      parse_mode: 'HTML' as ParseMode,
    };
  } catch (error) {
    console.error('Error while settingMarkUp:', error);
    throw new Error('Failed to create markup for user settings.');
  }
};

export const twitterMarkUp = {
  reply_markup: Markup.inlineKeyboard([
    [
      Markup.button.callback('➕ Add Profile', 'Add Profile'),
      Markup.button.callback('➖ Remove Profile', 'Remove Profile'),
    ],
  ]).reply_markup,
  parse_mode: 'HTML' as ParseMode,
};

export const closeMarkUp = Markup.inlineKeyboard([[Markup.button.callback('✖ Close', 'Close')]]);

export const walletMarkUp = Markup.inlineKeyboard([
  [Markup.button.callback('🔙 Back', 'Setting'), Markup.button.callback('✖ Close', 'Close')],
]);

export const helpMarkup = Markup.inlineKeyboard([
  [Markup.button.callback('🔙 Back', 'Return'), Markup.button.callback('✖ Close', 'Close')],
]);

export const tokenMarkUp = (user: UserType) => {
  return {
    reply_markup: Markup.inlineKeyboard([
      [
        Markup.button.callback(`Buy ${user.snipeAmount} SOL (You set)`, 'Buy default SOL'),
        Markup.button.callback(`Buy X SOL`, 'Buy X SOL'),
      ],
      [
        Markup.button.callback(`Buy 2 SOL`, 'Buy 2 SOL'),
        Markup.button.callback(`Buy 1 SOL`, 'Buy 1 SOL'),
        Markup.button.callback(`Buy 0.5 SOL`, 'Buy 0.5 SOL'),
        Markup.button.callback(`Buy 0.1 SOL`, 'Buy 0.1 SOL'),
      ],
      [
        Markup.button.callback('Transfer Token', 'Transfer Token'),
        Markup.button.callback('Transfer SOL', 'Transfer SOL'),
      ],
      ...sellPart,
      [Markup.button.callback('🔙 Back', 'Return'), Markup.button.callback('✖ Close', 'Close')],
    ]).reply_markup,
    parse_mode: 'HTML' as ParseMode,
  };
};

export const sellMarkUp = () => {
  return {
    reply_markup: Markup.inlineKeyboard([...sellPart]).reply_markup,
    parse_mode: 'HTML' as ParseMode,
  };
};

const sellPart = [
  [
    Markup.button.callback('25%', 'Sell 25 %'),
    Markup.button.callback('50%', 'Sell 50 %'),
    Markup.button.callback('75%', 'Sell 75 %'),
    Markup.button.callback('100%', 'Sell 100 %'),
  ],
  [
    // Markup.button.callback('Sell X SOL', 'Sell X SOL'),
    Markup.button.callback('Sell X Tokens', 'Sell X Tokens'),
    Markup.button.callback('Sell X %', 'Sell X %'),
  ],
];

export function returnMarkUp(to: string) {
  return {
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Return', to), Markup.button.callback('✖ Close', 'Close')],
    ]).reply_markup,
    parse_mode: 'HTML' as ParseMode,
  };
}
