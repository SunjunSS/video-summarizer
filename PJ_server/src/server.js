const express = require('express');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
app.use(express.json());

// [추가] output_audio.mp3를 static으로 서비스
app.use('/audio', express.static(__dirname));

// ffmpeg.js와 whisper-client.js 경로 지정
const ffmpegJsPath = path.join(__dirname, 'ffmpeg.js');
const whisperClientJsPath = path.join(__dirname, 'whisper-client.js');

app.post('/api/analyze', async (req, res) => {
  const { videoUrl } = req.body;
  if (!videoUrl) return res.status(400).json({ error: 'videoUrl required' });

  let audioFileName = null;

  try {
    // 1. ffmpeg.js 실행 (유튜브 → mp3 추출)
    console.log('[SERVER] 🎥 ffmpeg.js 실행 시작');
    audioFileName = await new Promise((resolve, reject) => {
      execFile('node', [ffmpegJsPath, videoUrl], (error, stdout, stderr) => {
        console.log('[ffmpeg.js stdout]', stdout);
        console.log('[ffmpeg.js stderr]', stderr);
        
        if (error) {
          console.error('[SERVER] ❌ ffmpeg.js 실행 중 에러 발생:', error);
          reject(error);
        } else {
          // stdout에서 파일명 추출
          const match = stdout.match(/AUDIO_FILE:(.+)/);
          if (match && match[1]) {
            const fileName = match[1].trim();
            console.log('[SERVER] ✅ ffmpeg.js 실행 완료, 생성된 파일:', fileName);
            resolve(fileName);
          } else {
            console.log('[SERVER] ✅ ffmpeg.js 실행 완료 (기본 파일명 사용)');
            resolve('output_audio.mp3');
          }
        }
      });
    });

    // 2. whisper-client.js 실행 (mp3 → STT 변환)
    console.log('[SERVER] 🎤 whisper-client.js 실행 시작, 파일:', audioFileName);
    const whisperResult = await new Promise((resolve, reject) => {
      const childProcess = execFile('node', [whisperClientJsPath, audioFileName], (error, stdout, stderr) => {
        // stderr는 로그용으로 출력
        if (stderr) {
          console.log('[whisper-client.js logs]', stderr);
        }
        
        if (error) {
          console.error('[SERVER] ❌ whisper-client.js 실행 중 에러 발생:', error);
          reject(error);
        } else {
          try {
            // stdout에서 JSON만 파싱
            console.log('[SERVER] 📤 whisper-client.js raw stdout:', stdout);
            const result = JSON.parse(stdout.trim());
            console.log('[SERVER] ✅ whisper-client.js 결과 수신 및 파싱 완료');
            
            // 주요 결과 로그
            if (result && result.results && result.results.length > 0) {
              console.log("🚚 서버에서 텍스트 응답을 받았다!");
            }
            resolve(result);
          } catch (e) {
            console.error('[SERVER] ❌ whisper-client.js 결과 파싱 에러:', e);
            console.error('[SERVER] 원본 stdout:', stdout);
            reject(e);
          }
        }
      });

      // 타임아웃 설정 (5분)
      setTimeout(() => {
        childProcess.kill();
        reject(new Error('whisper-client.js 실행 타임아웃'));
      }, 300000);
    });
    console.log('[SERVER] ✅ whisper-client.js 실행 완료');

    // 3. 결과 반환
    res.json({
      ...whisperResult,
      audioPath: `/audio/${audioFileName}` // 동적 파일명 사용
    });

  } catch (err) {
    console.error('[FATAL] ❌ 전체 처리 과정에서 에러 발생:', err);
    res.status(500).json({ error: '오디오 추출 또는 STT 실패', details: err.message });
  }
});

app.listen(3000, () => console.log('🚀 Server running on port 3000'));