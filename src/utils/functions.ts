import { bot } from '../config/config';
import { TweetProfile } from '../config/types';
import { User } from '../models/user.model';

export function uint8ArrayToHex(uint8Array: Uint8Array) {
  try {
    return Array.from(uint8Array)
      .map((byte) => byte.toString(16).padStart(2, '0')) // Convert each byte to hex and pad with zeros
      .join(''); // Join all hex strings together
  } catch (error) {
    console.error('Error while uint8ArrayToHex function:', error);
    throw new Error('Failed to convert uint8Array to hexadecimal string.');
  }
}

export async function sendMessageToAllActiveUsers(mintAddress: string) {
  try {
    const users = await User.find({ botStatus: true });
    await Promise.all(
      users.map(async (user) => {
        await bot.telegram.sendMessage(
          user.tgId,
          `🔔 Tweet 🔔\n` +
            `💶 <code>${mintAddress}</code>\n` +
            `📊 <a href="https://solscan.io/token/${mintAddress}">Contract</a> • ` +
            `<a href="https://birdeye.so/token/${mintAddress}?chain=solana">Birdeye</a> • ` +
            `<a href="https://dexscreener.com/solana/${mintAddress}">Dexscreener</a>`,
          { parse_mode: 'HTML', link_preview_options: { is_disabled: true } }
        );
      })
    );
  } catch (error) {
    console.error('Error while sendMessageToAllActiveUsers:', error);
  }
}

// Round up the number to specific decimal
export function roundToSpecificDecimal(num: number, decimal = 9) {
  const decimals = 10 ** decimal;
  return Math.floor(num * decimals) / decimals;
}

// Check if the number is valid or not
export function isNumber(str: string) {
  return !isNaN(Number(str)) && str != 'Infinity' && str?.toString()?.trim() !== '';
}

// Add item to array
// The max size of array is 10
export function addItemToArray(item: string, array: string[]) {
  array.push(item);
  if (array.length > 10) {
    array.splice(0, 1);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function extractTokenAddress(text: string) {
  // Regular expression to match Solana token addresses (Base58 encoded, 32-44 chars)
  const solanaAddressRegex = /\b[1-9A-HJ-NP-Za-km-z]{43,44}\b/g;

  // Find all matches in the text
  const matches = text.match(solanaAddressRegex);

  // Return the first match or null if no match is found
  return matches ? matches[0] : null;
}

export function isValidWalletAddress(text: string) {
  // Regular expression to match Solana token addresses (Base58 encoded, 32-44 chars)
  const solanaAddressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

  return solanaAddressRegex.test(text);
}

export function extractProfiles(data: any) {
  let returnData = [];
  for (const [key, value] of Object.entries(data)) {
    returnData.push({ id: key, handle: value as string } as TweetProfile);
  }
  return returnData;
}
