const axios = require("axios");


const url =
    `https://api.twelvedata.com/time_series` +
    `?symbol=${encodeURIComponent(symbol)}` +
    `&interval=5min` +
    `&outputsize=120` +
    '&apikey=${getApiKey(API_KEYS, apiIndex)}'

  const res = await axios.get(url);

  if (!res.data.values)
    throw new Error("Sem candles");

  return res.data.values.reverse();
}
