import dotenv from 'dotenv';
dotenv.config({
  path: './.env',
});

import { SOL_DECIMAL, bot } from './config/config';
import { User } from './models/user.model';
import { extractTokenAddress, isNumber, isValidWalletAddress, sendMessageToAllActiveUsers } from './utils/functions';
import { settingText, tokenText, twitterText } from './models/text.model';
import { returnMarkUp, settingMarkUp, tokenMarkUp } from './models/markup.model';
import { checkAction, checkUser } from './utils/middleware';
import { startCommand, helpCommand, setCommands, settingCommand, twitterCommand } from './commands/commands';
import {
  settingAction,
  closeAction,
  returnAction,
  helpAction,
  buyTokenAction,
  sellTokenAction,
  transferTokenAction,
} from './actions/general.action';
import {
  walletAction,
  onOffAction,
  snipeAmountAction,
  autoTradeAction,
  mevProtectAction,
} from './actions/setting.action';
import {
  buyToken,
  getBalanceOfWallet,
  getTokenBalanceOfWallet,
  getTokenInfo,
  isValidToken,
  sellToken,
  swapTokenForAllActiveUsers,
  transferSol,
  transferToken,
} from './utils/web3';
import { highSpeedSocket, normalSpeedSocket, addProfile, removeProfile } from './utils/twitter.monitor';
import { Event, MessageEvent } from 'ws';
import { PublicKey } from '@solana/web3.js';
import { addOrRemoveProfileAction, twitterAction } from './actions/twitter.action';

//-------------------------------------------------------------------------------------------------------------+
//                                             Set the commands                                                |
//-------------------------------------------------------------------------------------------------------------+

/**
 * The part to handle when 'start' command is inputted
 */
bot.command('start', startCommand);

/**
 * The part to handle when 'help' command is inputted
 */
bot.command('help', helpCommand);

/**
 * The part to handle when 'setting' command is inputted
 */
bot.command('setting', settingCommand);

/**
 * The part to handle when 'setting' command is inputted
 */
bot.command('twitter', twitterCommand);

//-------------------------------------------------------------------------------------------------------------+
//                                   The part to listen the messages from bot                                  |
//-------------------------------------------------------------------------------------------------------------+

bot.on('text', async (ctx) => {
  const botState = ctx.session.state;
  const text = ctx.message.text;
  const tgId = ctx.chat.id;
  try {
    const user = await User.findOne({ tgId });
    if (!user) {
      throw new Error('User not found');
    }

    // The part to set initial setting
    if (
      botState === 'Snipe Amount' ||
      botState === 'Jito Fee' ||
      botState === 'Priority Fee' ||
      botState === 'Slippage Bps'
    ) {
      // Check the text is number or not
      if (!isNumber(text)) {
        await ctx.reply(`${botState} must be number.`);
        return;
      }

      // Update the setting of user
      if (botState === 'Snipe Amount') user.snipeAmount = Number(text);
      else if (botState === 'Priority Fee') user.priorityFee = Number(text);
      else if (botState === 'Slippage Bps') user.slippageBps = Number(text);
      else user.jitoFee = Number(text);

      await user.save();
      await ctx.reply(settingText, await settingMarkUp(user));
      ctx.session.state = '';

      // The part to buy token using X SOL
    } else if (botState === 'Buy X Amount') {
      if (!isNumber(text)) {
        ctx.reply('Please enter the number.');
        return;
      }

      if (!ctx.session.mint) {
        ctx.reply('Pease enter the token address at first.');
        return;
      }
      buyToken(user, ctx.session.mint, Number(text) * SOL_DECIMAL);
      ctx.session.state = '';

      // The part to control the event of entering token address or invalid command
    } else if (botState === 'Sell X %') {
      if (!isNumber(text)) {
        ctx.reply('Please enter the number.');
        return;
      }

      if (!ctx.session.mint) {
        ctx.reply('Pease enter the token address at first.');
        return;
      }

      const { balanceInLamp: balance } = await getTokenBalanceOfWallet(user.wallet.publicKey, ctx.session.mint.address);
      const amount = Math.floor((balance * Number(text)) / 100);

      sellToken(user, ctx.session.mint, amount);
      ctx.session.state = '';

      // The part to control the event of entering token address or invalid command
    } else if (botState === 'Sell X Tokens') {
      if (!isNumber(text)) {
        ctx.reply('Please enter the number.');
        return;
      }

      if (!ctx.session.mint) {
        ctx.reply('Pease enter the token address at first.');
        return;
      }

      const amount = Math.floor(Number(text) * 10 ** ctx.session.mint.decimals);

      sellToken(user, ctx.session.mint, amount);
      ctx.session.state = '';

      // The part to control the event of entering token address or invalid command
    } else if (botState === 'Transfer Token') {
      if (!isValidWalletAddress(text)) {
        ctx.reply('Invalid wallet address');
        return;
      }

      const mint = ctx.session.mint;
      if (!mint) {
        ctx.reply('Please enter the token address before withdraw');
        return;
      }

      const { balanceInLamp, balanceNoLamp } = await getTokenBalanceOfWallet(user.wallet.publicKey, mint.address);
      await transferToken(new PublicKey(mint), new PublicKey(text), balanceInLamp, balanceNoLamp, user);
      ctx.session.state = '';
    } else if (botState === 'Transfer SOL') {
      if (!isValidWalletAddress(text)) {
        ctx.reply('Invalid wallet address');
        return;
      }

      const lamports = await getBalanceOfWallet(user.wallet.publicKey);
      await transferSol(new PublicKey(text), lamports, user);
      ctx.session.state = '';
    } else if (botState === 'Adding Profile') {
      if (text.split(/\s+/).length !== 2) {
        await ctx.reply('Invalid format');
        return;
      }
      const [id, type] = text.split(/\s+/);
      if (!isNumber(type)) {
        await ctx.reply('Invalid format');
        return;
      }
      let data;
      if (isNumber(id)) {
        data = { id: id };
      } else {
        data = { handle: id };
      }
      const { success, data: profile, message } = await addProfile(data, Number(type));
      if (success) {
        user.twitterProfiles.push({
          id: profile?.id,
          handle: profile?.handle,
          type: profile?.type || 0,
        });
        await user.save();
        ctx.reply('New twitter profile is successfully added', returnMarkUp('Twitter'));
      } else {
        ctx.reply(message, returnMarkUp('Twitter'));
      }
    } else if (botState === 'Removing Profile') {
      if (text.split(/\s+/).length !== 2) {
        await ctx.reply('Invalid format');
        return;
      }
      const [id, type] = text.split(/\s+/);
      if (!isNumber(type)) {
        await ctx.reply('Invalid format');
        return;
      }
      const { success, message } = await removeProfile(id, Number(type));
      if (success) {
        ctx.reply(`<code>${id}</code>\nSuccessfully removed from ${type} api key.`, returnMarkUp('Twitter'));
      } else {
        ctx.reply(message, returnMarkUp('Twitter'));
      }
    } else {
      // If it is invalid command
      if (text.startsWith('/')) {
        ctx.reply('⚠️ Unrecognizable commands. Input /help to see the help.');
        return;
      }

      // Check whether it is valid token or not
      const isValid = await isValidToken(text);

      // If it is invalid
      if (!isValid) {
        await ctx.reply('Invalid token address. Confirm again and enter the valid one.');
        return;
      }

      const tokenInfo = await getTokenInfo(text);

      ctx.session.mint = tokenInfo;
      await ctx.reply(await tokenText(tokenInfo, user.wallet.publicKey), tokenMarkUp(user));
    }
  } catch (error) {
    console.error('Error while on text:', error);
  }
});

//-------------------------------------------------------------------------------------------------------------+
//                                             Set the actions                                                 |
//-------------------------------------------------------------------------------------------------------------+

//---------------------------------------------------------------------+
//                         General Actions                             |
//---------------------------------------------------------------------+

/**
 * Catch the action when user clicks the 'Close' callback button
 */
bot.action('Close', (ctx, next) => checkAction(ctx, next, 'Close'), closeAction);

bot.action(/^Buy (default|\d+(\.\d+)?|X) SOL$/, (ctx, next) => checkAction(ctx, next, 'Buy X SOL'), buyTokenAction);

bot.action(
  /^Sell (\d+|X) (%|Tokens)$/,
  (ctx, next) => checkAction(ctx, next, 'Sell X SOL'),
  checkUser,
  sellTokenAction
);

bot.action(
  ['Transfer Token', 'Transfer SOL'],
  (ctx, next) => checkAction(ctx, next, ctx.match[0]),
  checkUser,
  transferTokenAction
);

//---------------------------------------------------------------------+
//                      Actions on Start page                          |
//---------------------------------------------------------------------+

/**
 * Catch the action when user clicks the 'Start' callback button
 */
bot.action('Help', (ctx, next) => checkAction(ctx, next, 'Help'), helpAction);

/**
 * Catch the action when user clicks the 'Setting' callback button
 */
bot.action('Setting', (ctx, next) => checkAction(ctx, next, 'Setting'), settingAction);

//---------------------------------------------------------------------+
//                       Actions For Twitter                           |
//---------------------------------------------------------------------+

bot.action('Twitter', (ctx, next) => checkAction(ctx, next, 'Twitter'), checkUser, twitterAction);

bot.action(
  ['Add Profile', 'Remove Profile'],
  (ctx, next) => checkAction(ctx, next, ctx.match[0]),
  checkUser,
  addOrRemoveProfileAction
);

//---------------------------------------------------------------------+
//                       Actions on Setting page                       |
//---------------------------------------------------------------------+

/**
 * Catch the action when user clicks the '💳 Wallet' callback button
 */
bot.action('Wallet', (ctx, next) => checkAction(ctx, next, 'Wallet'), walletAction);

/**
 * Catch the action when user clicks the 'Bot On 🟢 || Bot Off 🔴' callback button
 */
bot.action('On Off', onOffAction);

bot.action('Mev Protect', mevProtectAction);

/**
 * Catch the action when user clicks the '💵 Snipe Amount: * SOL' callback button
 */
bot.action(['Snipe Amount', 'Slippage Bps', 'Priority Fee', 'Jito Fee'], snipeAmountAction);

/**
 * Catch the action when user clicks the 'Start' callback button
 */
bot.action('Return', (ctx, next) => checkAction(ctx, next, 'Return'), returnAction);

/**
 * Catch the action when user clicks the 'Auto Trade On 🟢 || Auto Trade Off 🔴' callback button
 */
bot.action('Auto Trade', autoTradeAction);

//---------------------------------------------------------------------+
//                        Actions on Wallet page                       |
//---------------------------------------------------------------------+

// bot.action('Create Wallet')

//-------------------------------------------------------------------------------------------------------------+
//                                    Set menu button to see all commands                                      |
//-------------------------------------------------------------------------------------------------------------+

/**
 * Set menu button representing all available commands
 */
setCommands();

/**
 * Launch the bot
 */
bot
  .launch(() => {
    console.log('Bot is running...');
  })
  .catch(console.error);

// Listening using high speed api key
highSpeedSocket.addEventListener('open', (event: Event) => {
  console.log('High speed Websocket connection is established', event.type);
});

highSpeedSocket.addEventListener('message', async (message: MessageEvent) => {
  highSpeedSocket.send('PONG');
  if (message.data !== 'PING') {
    const data = JSON.parse(message?.data.toString());
    console.log('high', data);
    const mintAddress = extractTokenAddress(data?.tweet?.body?.text as string);
    console.log('High mintAddress:', mintAddress);

    if (data.type !== 'tweet.update' || !mintAddress || !(await isValidToken(mintAddress))) {
      return;
    }

    sendMessageToAllActiveUsers(mintAddress);
    swapTokenForAllActiveUsers(mintAddress);
  }
});

highSpeedSocket.addEventListener('close', () => {
  console.log('highSpeedSocket connection is closed');
});

// Listening using normal speed api key
normalSpeedSocket.addEventListener('open', (event: Event) => {
  console.log('Normal speed Websocket connection is established', event.type);
});

normalSpeedSocket.addEventListener('message', async (message: MessageEvent) => {
  normalSpeedSocket.send('PONG');
  if (message.data !== 'PING') {
    const data = JSON.parse(message?.data.toString());
    console.log('normal', data);
    if (data.type !== 'tweet.update') {
      return;
    }
    const mintAddress = extractTokenAddress(data?.tweet?.body?.text as string);
    console.log('Normal mintAddress:', mintAddress);

    if (data.type !== 'tweet.update' || !mintAddress || !(await isValidToken(mintAddress))) {
      return;
    }

    sendMessageToAllActiveUsers(mintAddress);
    swapTokenForAllActiveUsers(mintAddress);
  }
});

normalSpeedSocket.addEventListener('close', () => {
  console.log('Normal speed socket connection is closed');
});

process.on('SIGINT', () => {
  bot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  bot.stop();
  process.exit(0);
});
