import Websocket from 'ws';
import dotenv from 'dotenv';
dotenv.config({
  path: './.env',
});

const apiKey = process.env.API_KEY_HERE || '';
const url = `wss://twitter-api.axsys.us/v1/events?authorization=${apiKey}`;

const socket = new WebSocket(url);

socket.addEventListener('open', (event) => {
  console.log('Websocket connection is established:', event);
});

socket.addEventListener('message', (message) => {
  console.log('Message from Websocket connection:', message);
});
