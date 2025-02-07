import Websocket from 'ws';

const apiKey = process.env.API_KEY_HERE || '';
const url = `wss://twitter-api.axsys.us/v1/events?authorization=${apiKey}`;

export const socket = new Websocket(url);
