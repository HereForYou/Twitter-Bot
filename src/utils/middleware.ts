import { MyContext } from '../config/types';
import { User } from '../models/user.model';

/**
 * Skip the same action before completation of previous one
 */
export async function checkAction(ctx: MyContext, next: () => Promise<void>, action: string) {
  try {
    if (ctx.session.state === action && ctx.session.msgId === ctx.msgId) {
      await ctx.reply("I can't find you. Please enter /start and then try again.");
      return;
    }
    ctx.session.state = action;
    ctx.session.msgId = ctx.msgId;
    return next();
  } catch (error) {
    console.error('Error while checkAction:', error);
    return;
  }
}

/**
 * Check whether user exists in DB or not
 */
export async function checkUser(ctx: MyContext, next: () => Promise<void>) {
  try {
    const tgId = ctx.chat?.id;

    const user = await User.findOne({ tgId });
    if (!user) {
      ctx.session.state = '';
      return;
    }
    return next();
  } catch (error) {
    return;
  }
}
