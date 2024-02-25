const path = require('path');
const mysql = require('mysql2/promise');
const record = require('./recorder.js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const getLives = () => fetch('https://api.chzzk.naver.com/service/v1/lives?sortType=POPULAR').then(res => res.json());
const getChannelID = (lives) => lives.content.data
  .filter(live => !live.adult)
  .map(live => live.channel.channelId);

main();

async function main() {
  test();
  setInterval(test, 1000 * 60);

  // channelIDs.slice(0).forEach(channelID => record(channelID));
}

async function test() {
  const json = await getLives();
  const lives = json.content.data;
  const availableLives = lives.filter(live => !live.adult);

  const [currentLives] = await pool.query('SELECT (id) FROM channel');

  const newLives = availableLives.filter(live => currentLives.every(currentLive => live.channel.channelId !== currentLive.id));

  console.log(newLives);

  for (const live of newLives) {
    const { liveTitle, liveImageUrl } = live;
    const { channelId, channelName, channelImageUrl } = live.channel;

    console.log([liveTitle, liveImageUrl, channelId, channelName, channelImageUrl])

    await pool.query(
      'INSERT INTO channel (id, name, profile, live_title, live_image) VALUES ?',
      [[[channelId, channelName, channelImageUrl, liveTitle, liveImageUrl]]],
    );


    record(channelId).then(() => {
      pool.query('DELETE FROM channel WHERE id=?', [channelId]);
    });
  }

  return newLives;
}
