import Websocket from 'ws';

const highSpeedApiKey = process.env.HIGH_SPEED_TWEETER_API_KEY || '';
const normalSpeedApiKey = process.env.NORMAL_SPEED_TWEETER_API_KEY || '';
const highSpeedEndpoint = `wss://twitter-api.axsys.us/v1/events?authorization=${highSpeedApiKey}`;
const normalSpeedEndpoint = `wss://twitter-api.axsys.us/v1/events?authorization=${highSpeedApiKey}`;

export const socket = new Websocket(highSpeedEndpoint);
