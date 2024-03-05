const axios = require('axios');
const record = require('./recorder.js');
const pool = require('./db.js');

const axiosInstance = axios.create();

const getLives = () => axiosInstance.get(
  'https://api.chzzk.naver.com/service/v1/lives?sortType=POPULAR',
  { headers: { 'User-Agent': 'Mozilla' } },
).then(res => res.data);

main();

async function main() {
  test();
  setInterval(test, 1000 * 60);
}

async function test() {
  const json = await getLives();
  const lives = json.content.data.slice(0, 20);
  const availableLives = lives.filter(live => !live.adult);

  const [currentLives] = await pool.query('SELECT (id) FROM channel');

  const newLives = availableLives.filter(live => currentLives.every(currentLive => live.channel.channelId !== currentLive.id));

  console.log(newLives);

  for (const live of newLives) {
    const { liveTitle, liveImageUrl } = live;
    const { channelId, channelName, channelImageUrl } = live.channel;

    await pool.query(
      'INSERT INTO channel (id, name, profile) VALUES ?',
      [[[channelId, channelName, channelImageUrl]]],
    );


    record(channelId).then(() => {
      console.log(channelId, 'Safe Stream Ended');
    }).catch(err => {
      console.log(channelId, err);
    }).finally(() => {
      pool.query('DELETE FROM channel WHERE id=?', [channelId]);
      console.log(channelId, 'Stream Ended');
    });
  }
}
