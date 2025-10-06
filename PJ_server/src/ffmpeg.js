const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const videoUrl = process.argv[2];
if (!videoUrl) {
  console.error('videoUrl argument required');
  process.exit(1);
}

// 기존 파일들을 스캔해서 다음 번호 찾기
function getNextAudioNumber() {
  const files = fs.readdirSync(__dirname);
  const audioFiles = files.filter(f => f.match(/^output_audio\((\d+)\)\.mp3$/));
  
  if (audioFiles.length === 0) {
    return 1;
  }
  
  const numbers = audioFiles.map(f => {
    const match = f.match(/^output_audio\((\d+)\)\.mp3$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  
  return Math.max(...numbers) + 1;
}

const nextNumber = getNextAudioNumber();
const audioFileName = `output_audio(${nextNumber}).mp3`;
const audioPath = path.join(__dirname, audioFileName);
const command = `yt-dlp -x --audio-format mp3 -o "${audioPath}" "${videoUrl}"`;

console.log(`[ffmpeg.js] 📝 생성할 파일: ${audioFileName}`);

exec(command, (error, stdout, stderr) => {
  console.log('[yt-dlp stdout]', stdout);
  console.log('[yt-dlp stderr]', stderr);
  if (error) {
    process.exit(1);
  } else {
    // 생성된 파일명을 stdout으로 출력 (server.js에서 받을 수 있도록)
    console.log(`AUDIO_FILE:${audioFileName}`);
    process.exit(0);
  }
});