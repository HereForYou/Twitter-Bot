import Websocket from 'ws';

const apiKeys = [process.env.HIGH_SPEED_TWEETER_API_KEY || '', process.env.NORMAL_SPEED_TWEETER_API_KEY || ''];

const highSpeedEndpoint = `wss://twitter-api.axsys.us/v1/events?authorization=${apiKeys[0]}`;
const normalSpeedEndpoint = `wss://twitter-api.axsys.us/v1/events?authorization=${apiKeys[1]}`;

export const highSpeedSocket = new Websocket(highSpeedEndpoint);
export const normalSpeedSocket = new Websocket(normalSpeedEndpoint);

export async function addProfile(data: any, type: number) {
  try {
    const url = 'https://twitter-api.axsys.us/v1/watched';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: apiKeys[type],
      },
      body: JSON.stringify(data),
    });

    const res = await response.json();
    console.log('add profile', res);
    return true;
  } catch (error) {
    console.error(error);
    return false;
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
    console.log('remove profile', res);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
