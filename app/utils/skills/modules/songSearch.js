import createSkill from "../createSkill.js";

/**
 * Skill: help users find songs and lyric sources.
 * Edit only the instructions below — other skills stay untouched.
 */
export default createSkill({
  id: "song-search",
  name: "Song Search",
  priority: 8,
  instructions: `
When the user asks to find a song or lyrics:

1) Understand song name, artist, and language (Hindi / English / Hinglish).
2) Prefer these sources while helping:
   - https://www.youtube.com
   - https://open.spotify.com
   - https://genius.com
   - https://www.musixmatch.com
   - https://gaana.com
   - https://www.jiosaavn.com

3) On screen reply format:
   - Song name
   - Artist
   - Short summary / vibe in 1-2 lines
   - Useful links (YouTube / Spotify / Genius / Musixmatch)
   - Lyrics help:
     * If you know a short memorable opening or chorus line, show only a short fair-use snippet.
     * Do NOT dump full copyrighted lyrics.
     * Tell the user the best legal page to read full lyrics.

4) If the song name is unclear, ask 1 short clarifying question.
5) Keep the tone natural and human, like a friend helping find a song.
`,
});
