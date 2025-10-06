const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// URL 변경 필요
const whisperApiUrl = 'https://mercury-drivers-cos-photographer.trycloudflare.com/stt_multi';

// 명령행 인자로 파일명 받기
const audioFileName = process.argv[2] || 'output_audio.mp3';
const audioPath = path.join(__dirname, audioFileName);

// 로그 섹션 구분선 출력
function logSection(title) {
  console.error('\n' + '='.repeat(50));
  console.error(`  ${title}`);
  console.error('='.repeat(50));
}

// 로그 서브섹션 출력
function logSubSection(title) {
  console.error('\n' + '-'.repeat(30));
  console.error(`  ${title}`);
  console.error('-'.repeat(30));
}

async function main() {
  try {
    logSection('🚀 STT API 호출 시작');
    console.error(`📡 요청 URL: ${whisperApiUrl}`);
    console.error(`📁 오디오 파일: ${audioPath}`);
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }
    
    const fileStats = fs.statSync(audioPath);
    console.error(`✅ 파일 확인 완료`);
    console.error(`   📊 파일 크기: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB (${fileStats.size.toLocaleString()} bytes)`);
    
    // 건강 체크로 서버 상태 확인
    logSubSection('🔍 서버 상태 확인');
    try {
      const healthRes = await axios.get('https://mind-road3.loca.lt/health', { 
        timeout: 10000,
        headers: {
          'User-Agent': 'STT-Client/1.0'
        }
      });
      console.error(`✅ 서버 상태: 정상`);
      console.error(`   📊 서버 정보: ${JSON.stringify(healthRes.data)}`);
    } catch (healthError) {
      console.error(`❌ 서버 상태 확인 실패: ${healthError.message}`);
      console.error(`   ⚠️  건강 체크 실패해도 계속 진행합니다...`);
    }
    
    const form = new FormData();
    form.append('files', fs.createReadStream(audioPath), audioFileName);
    
    logSubSection('📤 STT 변환 요청');
    console.error(`🌐 최종 요청 URL: ${whisperApiUrl}`);
    console.error(`⏰ STT 변환 시작 (시간이 걸릴 수 있습니다...)`);
    
    // 요청 시작 시간 기록
    const startTime = Date.now();
    
    // 타임아웃을 더 길게 설정
    const res = await axios.post(whisperApiUrl, form, { 
      headers: {
        ...form.getHeaders(),
        'Connection': 'keep-alive',
        'Accept': 'application/json',
        'User-Agent': 'STT-Client/1.0'
      },
      timeout: 600000, // 10분 타임아웃
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      // 요청 진행 상황 로깅
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.error(`   📈 업로드 진행률: ${percentCompleted}%`);
        }
      }
    });

    const endTime = Date.now();
    const processTime = (endTime - startTime) / 1000;

    logSection('✅ STT 변환 완료');
    console.error(`⏱️  총 처리 시간: ${processTime.toFixed(2)}초`);
    console.error(`📊 응답 상태: ${res.status} ${res.statusText}`);
    console.error(`📊 응답 헤더: Content-Type: ${res.headers['content-type']}`);
    
    // 응답 데이터 상세 검증
    logSubSection('🔍 응답 데이터 분석');
    
    if (!res.data) {
      throw new Error('응답 데이터가 없습니다');
    }
    
    console.error(`📦 응답 데이터 타입: ${typeof res.data}`);
    console.error(`📦 응답 데이터 키: [${Object.keys(res.data).join(', ')}]`);
    
    // 에러 체크
    if (res.data.error) {
      console.error(`❌ 서버 에러: ${res.data.error}`);
      throw new Error(`서버 에러: ${res.data.error}`);
    }

    // 전체 응답 구조: results[0].fullText만 사용
    const results = res.data.results;
    
    logSubSection('📊 변환 결과 분석');
    console.error(`🔍 결과 존재 여부: ${!!results ? '✅ 있음' : '❌ 없음'}`);
    console.error(`🔍 결과 타입: ${typeof results}`);
    console.error(`🔍 결과 개수: ${Array.isArray(results) ? results.length : 'N/A'}`);
    
    if (results && Array.isArray(results) && results.length > 0) {
      const firstResult = results[0];
      
      console.error(`\n📋 첫 번째 결과 상세 정보:`);
      console.error(`   🏷️  파일명: ${firstResult.fileName}`);
      console.error(`   👤 닉네임: ${firstResult.nickname}`);
      console.error(`   📝 텍스트 존재: ${!!firstResult.fullText ? '✅ 있음' : '❌ 없음'}`);
      console.error(`   📏 텍스트 길이: ${firstResult.fullText ? firstResult.fullText.length.toLocaleString() : 0} 문자`);
      
      const fullText = firstResult.fullText;

      // 전체 변환 텍스트 출력 - 줄바꿈 없이 원본 그대로 출력
      if (fullText && fullText.length > 0) {
        logSection('📝 전체 변환 텍스트');
        console.error(fullText);
        console.error(`\n📊 총 1개 블록, ${fullText.length}자`);
      } else {
        console.error(`❌ 전체 변환 텍스트가 없거나 비어있습니다.`);
      }
    } else {
      console.error(`❌ 변환 결과를 찾을 수 없습니다.`);
      console.error(`📊 전체 응답 구조:`);
      console.error(JSON.stringify(res.data, null, 2));
    }

    logSubSection('🚚 결과 데이터 전송');
    
    // JSON 결과만 stdout으로 출력 (server.js에서 파싱용)
    const outputData = JSON.stringify({
      ...res.data,
      audioFileName: audioFileName  // 파일명 추가
    });
    console.error(`📤 출력 데이터 크기: ${(outputData.length / 1024).toFixed(2)} KB (${outputData.length.toLocaleString()} 문자)`);
    console.error(`📡 server.js로 결과 전송 중...`);
    
    console.log(outputData);
    
    logSection('✅ whisper-client.js 처리 완료');
    
  } catch (error) {
    logSection('❌ STT API 호출 에러');
    console.error(`🚨 에러 메시지: ${error.message}`);
    
    // 더 자세한 에러 정보
    if (error.response) {
      logSubSection('📊 HTTP 응답 에러 정보');
      console.error(`   📊 응답 상태: ${error.response.status} ${error.response.statusText}`);
      console.error(`   📊 응답 헤더: ${JSON.stringify(error.response.headers, null, 2)}`);
      console.error(`   📊 응답 데이터: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      logSubSection('📡 네트워크 요청 에러');
      console.error(`   📡 요청이 만들어졌지만 응답을 받지 못했습니다`);
      console.error(`   📡 요청 메서드: ${error.request.method || 'POST'}`);
      console.error(`   📡 요청 경로: ${error.request.path || '/stt_multi'}`);
      console.error(`   📡 요청 호스트: ${error.request.host || 'mind-road3.loca.lt'}`);
    } else {
      logSubSection('⚙️ 요청 설정 에러');
      console.error(`   ⚙️ 요청 설정 중 에러 발생: ${error.message}`);
    }
    
    // 에러 타입별 안내
    logSubSection('🔧 에러 해결 방법');
    if (error.code === 'ECONNREFUSED') {
      console.error(`   🔌 연결 거부됨`);
      console.error(`   💡 STT 서버(stt.py)가 실행되고 있는지 확인하세요`);
    } else if (error.code === 'ETIMEDOUT') {
      console.error(`   ⏰ 타임아웃 발생`);
      console.error(`   💡 STT 변환 시간이 너무 오래 걸립니다 (10분 초과)`);
    } else if (error.code === 'ENOTFOUND') {
      console.error(`   🌐 DNS 해석 실패`);
      console.error(`   💡 URL을 확인하세요: ${whisperApiUrl}`);
    } else if (error.response && error.response.status === 405) {
      console.error(`   🚫 허용되지 않는 메서드`);
      console.error(`   💡 API 엔드포인트를 확인하세요`);
    } else if (error.response && error.response.status >= 500) {
      console.error(`   🔧 서버 내부 에러`);
      console.error(`   💡 STT 서버에 문제가 있을 수 있습니다`);
    } else {
      console.error(`   🔧 기타 에러`);
      console.error(`   💡 에러 코드: ${error.code || 'UNKNOWN'}`);
    }
    
    console.error(`\n🔧 디버깅 정보:`);
    console.error(`   에러 코드: ${error.code || 'UNKNOWN'}`);
    console.error(`   에러 타입: ${error.constructor.name}`);
    
    // 스택 트레이스는 개발 환경에서만 출력
    if (process.env.NODE_ENV === 'development') {
      console.error(`\n🔧 에러 스택:`);
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

main();