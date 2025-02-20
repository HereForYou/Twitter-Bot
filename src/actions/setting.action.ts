import { MyContext } from '../config/types';
import { User } from '../models/user.model';
import { newUserText, settingText } from '../models/text.model';
import { walletMarkUp, settingMarkUp } from '../models/markup.model';
import { CallbackQuery } from 'telegraf/typings/core/types/typegram';

/**
 * The function to handle 'Wallet' action
 * @param {MyContext} ctx
 */
export const walletAction = async (ctx: MyContext) => {
  try {
    const tgId = ctx.chat?.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      await ctx.reply("We can't find you. Please enter /start command and then try again.");
      return;
    }
    ctx.editMessageText(newUserText(user), { parse_mode: 'HTML', reply_markup: walletMarkUp.reply_markup });
  } catch (error) {
    console.error('Error while walletAction:', error);
  }
};

/**
 * The function to handle 'On Off' action
 * @param {MyContext} ctx
 */
export const onOffAction = async (ctx: MyContext) => {
  try {
    const tgId = ctx.chat?.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      await ctx.reply("We can't find you. Please enter /start command and then try again.");
      return;
    }
    user.botStatus = !user.botStatus;
    await user.save();
    ctx.editMessageText(settingText, await settingMarkUp(user));
  } catch (error) {
    console.error('Error while walletAction:', error);
  }
};

export const mevProtectAction = async (ctx: MyContext) => {
  try {
    const tgId = ctx.chat?.id;
    const user = await User.findOne({ tgId });
    if (!user) {
      await ctx.reply("We can't find you. Please enter /start command and then try again.");
      return;
    }
    user.mevProtect = !user.mevProtect;
    await user.save();
    ctx.editMessageText(settingText, await settingMarkUp(user));
  } catch (error) {
    console.error('Error while walletAction:', error);
  }
};

/**
 * The function to handle 'Snipe Amount || Jito Fee' action
 * @param {MyContext} ctx
 */
export const snipeAmountAction = async (ctx: MyContext) => {
  try {
    const action = (ctx.callbackQuery as CallbackQuery.DataQuery).data;
    let replyMessage = '';
    if (action === 'Snipe Amount') replyMessage = '✍ Input the *SOL* amount you want to consume for buy';
    else if (action === 'Slippage Bps') replyMessage = '✍ Input the slippageBps in percent.';
    else if (action === 'Priority Fee')
      replyMessage = '✍ Input the priority fee to prioritize your transaction in SOL.';
    else replyMessage = '✍ Input the Jito fee amount';
    await ctx.reply(replyMessage, { parse_mode: 'HTML' });
    ctx.session.state = action;
  } catch (error) {
    console.error('Error while snipeAmountAction:', error);
  }
};

/**
 * The function to handle 'Auto Trade' action
 * Change the status of Auto Trade according to users' action
 * @param {MyContext} ctx
 */
export const autoTradeAction = async (ctx: MyContext) => {
  const tgId = ctx.chat?.id;
  try {
    const user = await User.findOne({ tgId });
    if (!user) {
      await ctx.reply("We can't find you. Please enter /start command and then try again.");
      return;
    }
    user.autoTrade = !user.autoTrade;
    await user.save();
    await ctx.editMessageText(settingText, await settingMarkUp(user));
  } catch (error) {
    console.error('Error while autoTradeAction:', error);
  }
};
