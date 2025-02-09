import { CallbackQuery } from 'telegraf/typings/core/types/typegram';
import { MyContext } from '../config/types';
import { twitterMarkUp } from '../models/markup.model';

export async function twitterAction(ctx: MyContext) {
  try {
    ctx.reply('Twitter', twitterMarkUp);
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
          `<code>profile_id or profile_handle api_key_type(0 or 1)</code>\n` +
          `i.e. <code>1158271757255630848 1</code> \n` +
          `i.e. <code>vako_dev 0</code> \n`,
        {
          parse_mode: 'HTML',
        }
      );
    } else {
      ctx.reply(`Please enter the id or handle of profile to ${type}.`);
    }
    ctx.session.state = callbackData;
  } catch (error) {
    console.error(error);
  }
}
