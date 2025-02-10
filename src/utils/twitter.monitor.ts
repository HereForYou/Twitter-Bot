import Websocket from 'ws';
import { extractProfiles } from './functions';

const apiKeys = [process.env.HIGH_SPEED_TWEETER_API_KEY || '', process.env.NORMAL_SPEED_TWEETER_API_KEY || ''];

export const highSpeedSocket = new Websocket(`wss://twitter-api.axsys.us/v1/events?authorization=${apiKeys[0]}`);
export const normalSpeedSocket = new Websocket(`wss://twitter-api.axsys.us/v1/events?authorization=${apiKeys[1]}`);

export async function addProfile(data: any, type: number) {
  try {
    const url = 'https://twitter-api.axsys.us/v1/watched';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: apiKeys[type],
      },
      body: JSON.stringify(data),
    });

    const res = await response.json();
    console.log('add profile', res);

    if (res.code) {
      return { success: false, message: res.message, data: undefined };
    }
    return { success: true, data: { id: res.user.id, handle: res.user.handle, type }, message: undefined };
  } catch (error: any) {
    console.error(error);
    return { success: false, message: error.message || 'Unexpected error', data: undefined };
  }
}

export async function removeProfile(id: string, type: number) {
  try {
    const url = `https://twitter-api.axsys.us/v1/watched/${id}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: apiKeys[type],
      },
    });

    const res = await response.json();
    if (res.code) {
      return { success: false, message: res.message };
    }
    return { success: true, message: '' };
  } catch (error: any) {
    console.error(error);
    return { success: false, message: error.message || 'Unexpected error while removing profile' };
  }
}

export async function getAllProfiles() {
  try {
    const highRes = await fetch('https://twitter-api.axsys.us/v1/watched', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKeys[0],
      },
    });
    const highData = await highRes.json();

    const normalRes = await fetch('https://twitter-api.axsys.us/v1/watched', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKeys[1],
      },
    });
    const normalData = await normalRes.json();

    return {
      high: { apiKey: apiKeys[0], data: extractProfiles(highData.watched) },
      normal: { apiKey: apiKeys[1], data: extractProfiles(normalData.watched) },
    };
  } catch (error: any) {
    console.error(error);
    throw new Error(error.message || 'Unexpected error while fetching all twitter profiles.');
  }
}
