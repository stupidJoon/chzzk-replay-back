const axios = require('axios');
const pool = require('./db.js');

if (require.main === module) record(process.argv[2]);

const getBaseURL = url => url.split('hls_playlist.m3u8')[0]
const getQueryURL = url => url.split('/')[0];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function record(channelID) {
  const playlistURL = await getPlaylistURL(channelID);
  const { vChunklistURL, aChunklistURL } = await getPlaylist(playlistURL);

  const baseURL = getBaseURL(playlistURL);
  const queryURL = getQueryURL(vChunklistURL);

  const getVfragChunklist = getChunklistFP('vfrag', channelID, baseURL, queryURL);
  const getAfragChunklist = getChunklistFP('afrag', channelID, baseURL, queryURL);

  let abortFlag = false;
  await Promise.all([
    (async () => {
      while (!abortFlag) {
        const isOk = await getVfragChunklist(vChunklistURL);
        if (!isOk) abortFlag = true;
        await sleep(2000);
      }
    })(),
    (async () => {
      while (!abortFlag) {
        const isOk = await getAfragChunklist(aChunklistURL);
        if (!isOk) abortFlag = true;
        await sleep(2000);
      }
    })(),
  ]);
}

async function getPlaylistURL(channelID) {
  const liveDetail = await axios.get(
    `https://api.chzzk.naver.com/service/v2/channels/${channelID}/live-detail`,
    { headers: { 'User-Agent': 'Mozilla' } },
  ).then(res => res.data);
  const livePlaybackJson = liveDetail.content.livePlaybackJson;
  const livePlayback = JSON.parse(livePlaybackJson);
  const media = livePlayback.media.find(({ mediaId }) => mediaId === 'HLS');
  return media.path;
}

async function getPlaylist(playlistUrl) {
  const playlist = await axios.get(playlistUrl).then(res => res.data);
  const lines = playlist.split('\n');

  const vChunklistURLIndex = lines.findIndex(line => line.startsWith('#EXT-X-STREAM-INF:'));
  const vChunklistURL = lines[vChunklistURLIndex + 1];
  const aChunklistURL = vChunklistURL.replace('vfrag1080p', 'afrag1080p');
  return { vChunklistURL, aChunklistURL };
}



function getChunklistFP(type, channelID, baseURL, queryURL) {
  let fragments = [];

  return async (chunklistURL) => {
    const prevFragments = fragments;
    fragments = await getFragments(chunklistURL, baseURL);
    if (fragments === undefined) return false; // 404 check
    fragments = fragments.map(({ url, datetime, extinf }) => ({ url: baseURL + queryURL + '/' + url, datetime, extinf }));

    const newFragments = fragments.filter(({ url }) => prevFragments.every(({ url: prevURL }) => prevURL !== url ));

    if (newFragments.length > 0) {
      try {
        await pool.query(
          'INSERT INTO fragment (channel_id, url, type, program_datetime, extinf) VALUES ?',
          [newFragments.map(({ url, datetime, extinf }) => [channelID, url, type, datetime, extinf])],
        );
      } catch (err) {
        console.log(`INSERT ERROR!!-${new Date()}-${channelID}:${type}:${newFragments.length}:${prevFragments}`); // log
        console.log(err);
      }
    }

    console.log(`${new Date()}-${channelID}:${type}:${newFragments.length}`); // log

    return true;
  };
}


async function getFragments(url, baseURL) {
  const m3u8 = await axios
    .get(baseURL + url)
    .then(res => res.data)
    .catch(err => {
      console.log(err);
      return undefined;
    });
  if (m3u8 === undefined) return undefined;
  const lines = m3u8.split('\n');

  const fragments = lines
    .reduce((acc, line, i, arr) => {
      if (!line.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) return acc;
      const datetime = line.slice(25);
      const extinf = arr.slice(i).find(l => l.startsWith('#EXTINF:'))
      const url = arr.slice(i).find(l => !l.startsWith('#EXT'));
      return [...acc, { url, datetime, extinf }];
    }, []);

  return fragments;
}

module.exports = record;
