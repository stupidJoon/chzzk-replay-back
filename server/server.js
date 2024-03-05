const path = require('path');
const express = require('express');
const cors = require('cors')
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

const app = express();

const port = 3000;

const VFRAG_MAP = '#EXT-X-MAP:URI="vfrag1080p_0_0_0.m4s"';
const AFRAG_MAP = '#EXT-X-MAP:URI="afrag1080p_0_0_0.m4s"';

const getPlaylist = (video, audio) => {
  const M3U8_PLAYLIST = ['#EXTM3U', '#EXT-X-VERSION:6', '#EXT-X-INDEPENDENT-SEGMENTS'];
  M3U8_PLAYLIST.push(`#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="afrag1080p",NAME="audio.stream",DEFAULT=YES,AUTOSELECT=YES,CHANNELS="2",URI="${audio}"`);
  M3U8_PLAYLIST.push('#EXT-X-STREAM-INF:BANDWIDTH=8192000,CODECS="avc1.64002A,mp4a.40.2",RESOLUTION=1920x1080,AUDIO="afrag1080p"');
  M3U8_PLAYLIST.push(video);
  return M3U8_PLAYLIST;
}
const getM3U8 = (fragments, map, extinf) => {
  const M3U8 = ['#EXTM3U', '#EXT-X-TARGETDURATION:2', '#EXT-X-VERSION:6', '#EXT-X-PLAYLIST-TYPE:VOD'];
  M3U8.push(map);
  fragments.forEach(({ url, program_datetime, extinf }) => {
    M3U8.push('#EXT-X-PROGRAM-DATE-TIME:' + program_datetime);

    M3U8.push(extinf, url);
  });
  M3U8.push('#EXT-X-ENDLIST');
  return M3U8;
}

app.use(cors());

app.get('/channels', async (req, res) => {
  const [channels] = await pool.query('SELECT id, name, profile from channel');
  res.json(channels);
});

app.get('/:channelID', (req, res) => {
  const { channelID } = req.params;
  res.contentType('application/vnd.apple.mpegurl');
  const playlist = getPlaylist(`${channelID}/vfrag.m3u8`, `${channelID}/afrag.m3u8`);
  res.send(playlist.join('\n'));
});

app.get('/:channelID/vfrag.m3u8', async (req, res) => {
  const { channelID } = req.params;
  res.contentType('application/vnd.apple.mpegurl');

   const [fragments] = await pool
     .query('SELECT url, program_datetime, extinf FROM fragment WHERE channel_id=? AND type="vfrag" AND created_at > (now() - interval 6 hour)', [channelID]);
  //const [fragments] = await pool.query('SELECT url, program_datetime, extinf FROM fragment WHERE channel_id=? AND type="vfrag"', [channelID]);
  const m3u8 = getM3U8(fragments, VFRAG_MAP);
  res.send(m3u8.join('\n'));
});
app.get('/:channelID/afrag.m3u8', async (req, res) => {
  const { channelID } = req.params;
  res.contentType('application/vnd.apple.mpegurl');

  const [fragments] = await pool.query('SELECT url, program_datetime, extinf FROM fragment WHERE channel_id=? AND type="afrag" AND created_at > (now() - interval 6 hour)', [channelID]);
  //const [fragments] = await pool.query('SELECT url, program_datetime, extinf FROM fragment WHERE channel_id=? AND type="afrag"', [channelID]);
  const m3u8 = getM3U8(fragments, AFRAG_MAP);
  res.send(m3u8.join('\n'));
});

app.get('/:channelID/vfrag1080p_0_0_0.m4s', (req, res) => {
  res.sendFile(path.join(__dirname, './vfrag1080p_0_0_0.m4s'));
});
app.get('/:channelID/afrag1080p_0_0_0.m4s', (req, res) => {
  res.sendFile(path.join(__dirname, './afrag1080p_0_0_0.m4s'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
});

