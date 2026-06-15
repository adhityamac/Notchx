const winMedia = require('win-media-control');
console.log('winMedia loaded successfully:', !!winMedia);
if (winMedia) {
  console.log('winMedia keys:', Object.keys(winMedia));
  winMedia.on('media-update', (data) => {
    console.log('Media update received via win-media-control:', data);
  });
  console.log('Listening for media updates...');
  setTimeout(() => {
    console.log('Exiting...');
    process.exit(0);
  }, 5000);
}
