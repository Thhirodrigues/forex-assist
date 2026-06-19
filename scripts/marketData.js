const axios = require("axios");
const {
  getApiKey,
} = require("./utils");
const API_KEYS = [
  process.env.API_KEY_1,
  process.env.API_KEY_2,
  process.env.API_KEY_3
];
const apiIndex = {
  value: 0
};

async function getCandles(symbol) {
const url =
    `https://api.twelvedata.com/time_series` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=5min` +
    `&outputsize=120` +
    `&apikey=${getApiKey(API_KEYS, apiIndex)}`;

  const res = await axios.get(url);

  if (!res.data.values)
    throw new Error("Sem candles");

  return res.data.values.reverse();
}
module.exports = {
    getCandles
};
