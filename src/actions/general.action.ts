import { User } from '../models/user.model';
import { startText, helpText, settingText } from '../models/text.model';
import { settingMarkUp, startMarkUp, helpMarkup } from '../models/markup.model';
import { MyContext } from '../config/types';
import { CallbackQuery } from 'telegraf/typings/core/types/typegram';
import { buyToken } from '../utils/web3';
import { SOL_DECIMAL } from '../config/config';

/**
 * The function to handle 'Setting' action
 * @param {MyContext} ctx
 */
export const settingAction = async (ctx: MyContext) => {
  try {
    const tgId = ctx.chat?.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }
    await ctx.editMessageText(settingText, await settingMarkUp(user));
  } catch (error) {
    // ctx.session.state = '';
    console.error('Error while settingActioin:', error);
  }
};

/**
 * The function to handle 'Close' action
 * @param {MyContext} ctx
 */
export const closeAction = (ctx: MyContext) => {
  try {
    ctx.deleteMessage();
  } catch (error) {
    console.error('Error while closeAction:', error);
  }
};

/**
 * The function to handle 'Return' action
 * @param {MyContext} ctx
 */
export const returnAction = async (ctx: MyContext) => {
  try {
    const tgId = ctx.chat?.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found!');
    }
    await ctx.editMessageText(startText(user), { parse_mode: 'HTML', reply_markup: startMarkUp() });
  } catch (error) {
    console.error('Error while returnAction:', error);
  }
};

/**
 * The function to handle 'Help' action
 * @param {MyContext} ctx
 */
export const helpAction = async (ctx: MyContext) => {
  try {
    await ctx.editMessageText(helpText, { parse_mode: 'HTML', reply_markup: helpMarkup.reply_markup });
  } catch (error) {
    console.error('Error while helpAction:', error);
  }
};

/**
 * The function to handle 'Help' action
 * @param {MyContext} ctx
 */
export const buyTokenAction = async (ctx: MyContext) => {
  const callbackData = (ctx.callbackQuery as CallbackQuery.DataQuery).data;
  const amount = callbackData.split(' ')[1];
  let tradeAmount = 0;

  try {
    const tgId = ctx.chat?.id;
    const user = await User.findOne({ tgId });

    if (!user) {
      ctx.session.mint = undefined;
      ctx.session.state = '';
      ctx.reply("I can't find you. Please enter /start command and then try again.");
      return;
    }
    if (!ctx.session.mint) {
      ctx.session.state = '';
      ctx.reply('Please enter the token address and then try again.');
      return;
    }

    if (amount === 'default') {
      if (user.snipeAmount === 0) {
        ctx.reply(
          'You have not set the trade amount. Please change the trade amount on setting page or select the other option.'
        );
        ctx.session.state = '';
        return;
      }
      tradeAmount = user.snipeAmount * SOL_DECIMAL;
    } else if (amount === 'X') {
      await ctx.reply('Please enter the amount you want to buy in SOL.');
      ctx.session.state = 'Input X Amount';
      return;
    } else {
      tradeAmount = Number(amount) * SOL_DECIMAL;
    }

    ctx.reply(`Transaction is pending now ${tradeAmount / SOL_DECIMAL}`);
    buyToken(user, ctx.session.mint, tradeAmount);
    ctx.session.state = '';
  } catch (error) {
    console.error('Error while helpAction:', error);
  }
};
