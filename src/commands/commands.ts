import { MyContext } from '../config/types';
import { User } from '../models/user.model';
import { bot } from '../config/config';
import { generateWallet } from '../utils/web3';
import { startMarkUp, settingMarkUp, twitterMarkUp } from '../models/markup.model';
import { helpText, settingText, startText, twitterText } from '../models/text.model';
import { Chat } from 'telegraf/typings/core/types/typegram';
import { getAllProfiles } from '../utils/twitter.monitor';

/**
 * The function to handle 'start' command
 * @param {MyContext} ctx
 */
export const startCommand = async (ctx: MyContext) => {
  ctx.session.state = '';
  try {
    const tgId = ctx.chat?.id;
    const username = (ctx?.chat as Chat.PrivateChat).username || '';
    let user = await User.findOne({ tgId });
    if (!user) {
      const wallet = await generateWallet();
      const newUser = new User({
        tgId,
        username,
        wallet: {
          publicKey: wallet.publicKey,
          privateKey: wallet.privateKey,
        },
      });
      user = await newUser.save();
    }
    await ctx.reply(startText(user), { parse_mode: 'HTML', reply_markup: startMarkUp() });
  } catch (error) {
    console.error('Error while starting the bot:', error);
    await ctx.reply('An error occured while starting. Please try again later.');
  }
};

/**
 * The function to handle 'help' command
 * @param {MyContext} ctx
 */
export const helpCommand = async (ctx: MyContext) => {
  try {
    ctx.reply(helpText, { parse_mode: 'HTML' });
  } catch (error) {
    console.error('Error while helpCommand:', error);
  }
};

/**
 * The function to handle 'setting' command
 * @param {MyContext} ctx
 */
export const settingCommand = async (ctx: MyContext) => {
  try {
    const tgId = ctx.chat?.id;
    const user = await User.findOne({ tgId });

    if (!user) {
      throw new Error('User not found!');
    }
    await ctx.reply(settingText, await settingMarkUp(user));
  } catch (error) {
    console.error('Error while settingCommand:', error);
    await ctx.reply('An error occurred while fetching your settings. Please try again later.');
  }
};

export const twitterCommand = async (ctx: MyContext) => {
  try {
    const tgId = ctx.chat?.id;
    const user = await User.findOne({ tgId });

    if (!user) {
      throw new Error('User not found!');
    }

    const profiles = await getAllProfiles();
    await ctx.reply(await twitterText(profiles.high, profiles.normal), twitterMarkUp);
  } catch (error) {
    console.error('Error while settingCommand:', error);
    await ctx.reply('An error occurred while fetching your settings. Please try again later.');
  }
};

/**
 * The function to set the menu button shows all commands
 */
export const setCommands = async () => {
  try {
    const commands = [
      { command: '/start', description: 'Start the bot' },
      { command: '/twitter', description: 'Get all profiles' },
      { command: '/setting', description: 'Setting' },
      { command: '/help', description: 'Help' },
    ];
    const result = await bot.telegram.setMyCommands(commands);
    if (!result) {
      throw new Error('Something went wrong while setting comands.');
    }
  } catch (error) {
    console.error('Error while setCommands:', error);
  }
};
