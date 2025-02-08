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
          Markup.button.callback(
            `${user.botStatus ? '🆕 Tweet Alarm On 🟢' : '🆕 Tweet Alarm Off 🔴'}`,
            'On Off'
          ),
          Markup.button.callback(`${user.autoTrade ? '⚙ Auto Trade On 🟢' : '⚙ Auto Trade Off 🔴'}`, 'Auto Trade'),
        ],
        [
          Markup.button.callback(`💵 Amount: ${user.snipeAmount} SOL`, 'Snipe Amount'),
          Markup.button.callback(`💵 Priority Fee: ${user.priorityFee}`, 'Priority Fee'),
          Markup.button.callback(`🆚 Slippage Bps: ${user.slippageBps}`, 'Slippage Bps'),
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
      [Markup.button.callback('🔙 Back', 'Return'), Markup.button.callback('✖ Close', 'Close')],
    ]).reply_markup,
    parse_mode: 'HTML' as ParseMode,
  };
};
