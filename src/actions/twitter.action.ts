import { CallbackQuery } from 'telegraf/typings/core/types/typegram';
import { MyContext } from '../config/types';
import { twitterMarkUp } from '../models/markup.model';
import { getAllProfiles } from '../utils/twitter.monitor';
import { twitterText } from '../models/text.model';

export async function twitterAction(ctx: MyContext) {
  try {
    const profiles = await getAllProfiles();
    ctx.reply(await twitterText(profiles.high, profiles.normal), twitterMarkUp);
  } catch (error) {
    console.error(error);
  }
}

export async function addOrRemoveProfileAction(ctx: MyContext) {
  const callbackData = (ctx.callbackQuery as CallbackQuery.DataQuery).data;
  try {
    const type = callbackData.split(/\s+/)[0].toLocaleLowerCase();
    if (type === 'add') {
      ctx.reply(
        'Pease enter the below format.\n' +
          `profile_id or profile_handle and api_key_type(0 or 1)\n` +
          `<code>0: high speed api key, 1: normal speed api key</code>\n` +
          `i.e. <code>1158271757255630848 1</code> \n` +
          `i.e. <code>vako_dev 0</code> \n`,
        {
          parse_mode: 'HTML',
        }
      );
      ctx.session.state = 'Adding Profile';
    } else {
      ctx.reply(
        'Pease enter the below format.\n' +
          `<b>Only profile_id</b> and api_key_type(0 or 1)\n` +
          `<code>0: high speed api key, 1: normal speed api key</code>\n` +
          `i.e. <code>1158271757255630848 1</code> \n` +
          {
            parse_mode: 'HTML',
          }
      );
      ctx.session.state = 'Removing Profile';
    }
  } catch (error) {
    console.error(error);
  }
}
