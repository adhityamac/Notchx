const winMedia = require('win-media-control');
(async () => {
  if (winMedia) {
    try {
      const sessions = await winMedia.listSessions();
      console.log('Resolved Sessions:', sessions);
      console.log('Is Array?', Array.isArray(sessions));
      if (sessions && sessions.length) {
        console.log('First session keys:', Object.keys(sessions[0]));
        console.log('First session detail:', JSON.stringify(sessions[0], null, 2));
      }
    } catch (err) {
      console.error('Error listing sessions:', err);
    }
  }
})();
