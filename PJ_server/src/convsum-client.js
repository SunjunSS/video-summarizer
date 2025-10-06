const axios = require('axios');
const fs = require('fs');
const path = require('path');

// URL 변경 필요
const convsumApiUrl = 'https://ceo-diffs-visits-municipality.trycloudflare.com/convsum';

// 명령행 인자로 파일명 받기 (없으면 가장 최신 파일 자동 선택)
let txtFileName = process.argv[2];

// 인자가 없으면 가장 최신 파일 찾기
if (!txtFileName) {
  const files = fs.readdirSync(__dirname);
  const textFiles = files.filter(f => /^output_text\((\d+)\)\.txt$/.test(f));
  
  let maxNumber = 0;
  textFiles.forEach(file => {
    const match = file.match(/^output_text\((\d+)\)\.txt$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });
  
  txtFileName = maxNumber > 0 ? `output_text(${maxNumber}).txt` : 'output_text(1).txt';
  console.error(`📋 자동 선택된 파일: ${txtFileName} (가장 최신)`);
}

const txtPath = path.join(__dirname, txtFileName);

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

// ✨ .txt 파일을 Convsum 형식으로 변환
function formatTextForConvsum(text, fileName) {
  // 파일명에서 닉네임 추출 (예: output_text(1).txt -> "화자1")
  const match = fileName.match(/output_text\((\d+)\)\.txt/);
  const speakerNumber = match ? match[1] : '1';
  const nickname = `화자${speakerNumber}`;
  
  // 텍스트를 문장 단위로 분리 (간단한 방식)
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  
  const srtItems = [];
  let currentTime = 0;
  
  sentences.forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) return;
    
    // 문장 길이 기반으로 시간 계산 (대략 1초당 5글자)
    const duration = Math.max(2, Math.ceil(trimmed.length / 5));
    
    const startH = Math.floor(currentTime / 3600);
    const startM = Math.floor((currentTime % 3600) / 60);
    const startS = currentTime % 60;
    const startTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:${String(startS).padStart(2, '0')},000`;
    
    currentTime += duration;
    
    const endH = Math.floor(currentTime / 3600);
    const endM = Math.floor((currentTime % 3600) / 60);
    const endS = currentTime % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:${String(endS).padStart(2, '0')},000`;
    
    srtItems.push({
      time: `${startTime} --> ${endTime}`,
      speaker: nickname,
      speech: trimmed
    });
    
    currentTime += 1; // 문장 간 1초 간격
  });
  
  return {
    speakerNames: [nickname],
    speakerSpeech: srtItems,
    isRealTime: false,
    nodeData: []
  };
}

// ✨ 요약 결과를 .json 파일로 저장
function saveSummaryToFile(summaryData) {
  try {
    const files = fs.readdirSync(__dirname);
    const summaryFiles = files.filter(f => /^output_summary\((\d+)\)\.json$/.test(f));
    
    let maxNumber = 0;
    summaryFiles.forEach(file => {
      const match = file.match(/^output_summary\((\d+)\)\.json$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    const nextNumber = maxNumber + 1;
    const summaryFileName = `output_summary(${nextNumber}).json`;
    const summaryPath = path.join(__dirname, summaryFileName);
    
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2), 'utf-8');
    
    console.error(`\n💾 요약 파일 저장 완료`);
    console.error(`   📁 파일명: ${summaryFileName}`);
    console.error(`   📁 파일 경로: ${summaryPath}`);
    console.error(`   📊 파일 크기: ${(fs.statSync(summaryPath).size / 1024).toFixed(2)} KB`);
    
    return summaryPath;
  } catch (error) {
    console.error(`❌ 요약 파일 저장 실패: ${error.message}`);
    return null;
  }
}

// ✨ 요약 결과를 .md 파일로 저장
function saveSummaryToMarkdown(summaryData) {
  try {
    const files = fs.readdirSync(__dirname);
    const mdFiles = files.filter(f => /^output_summary\((\d+)\)\.md$/.test(f));
    
    let maxNumber = 0;
    mdFiles.forEach(file => {
      const match = file.match(/^output_summary\((\d+)\)\.md$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    const nextNumber = maxNumber + 1;
    const mdFileName = `output_summary(${nextNumber}).md`;
    const mdPath = path.join(__dirname, mdFileName);
    
    const minutes = summaryData.minutes || {};
    
    let mdContent = `# 회의록 요약\n\n`;
    mdContent += `**생성 시간:** ${new Date().toLocaleString('ko-KR')}\n\n`;
    mdContent += `---\n\n`;
    
    mdContent += `## 🎯 회의 목적\n\n`;
    mdContent += `${minutes.purpose || 'N/A'}\n\n`;
    
    mdContent += `## 📌 주요 주제\n\n`;
    const topics = minutes.topics || [];
    if (topics.length > 0) {
      topics.forEach((topic, i) => {
        mdContent += `${i + 1}. ${topic}\n`;
      });
    } else {
      mdContent += `- (주제 없음)\n`;
    }
    mdContent += `\n`;
    
    mdContent += `## 📝 회의 요약\n\n`;
    mdContent += `${minutes.summary || 'N/A'}\n\n`;
    
    mdContent += `## ✅ 향후 조치사항\n\n`;
    const nextSteps = minutes.next_steps || [];
    if (nextSteps.length > 0) {
      nextSteps.forEach((step, i) => {
        mdContent += `${i + 1}. ${step}\n`;
      });
    } else {
      mdContent += `- (조치사항 없음)\n`;
    }
    mdContent += `\n`;
    
    mdContent += `---\n\n`;
    mdContent += `## 👥 참석자\n\n`;
    const speakers = summaryData.speakerNames || [];
    if (speakers.length > 0) {
      speakers.forEach(speaker => {
        mdContent += `- ${speaker}\n`;
      });
    } else {
      mdContent += `- (참석자 정보 없음)\n`;
    }
    
    fs.writeFileSync(mdPath, mdContent, 'utf-8');
    
    console.error(`   📁 마크다운: ${mdFileName}`);
    
    return mdPath;
  } catch (error) {
    console.error(`❌ 마크다운 파일 저장 실패: ${error.message}`);
    return null;
  }
}

async function main() {
  try {
    logSection('🚀 Convsum API 호출 시작');
    console.error(`📡 요청 URL: ${convsumApiUrl}`);
    console.error(`📁 텍스트 파일: ${txtPath}`);
    
    // 파일 존재 여부 확인
    if (!fs.existsSync(txtPath)) {
      throw new Error(`Text file not found: ${txtPath}`);
    }
    
    const fileStats = fs.statSync(txtPath);
    console.error(`✅ 파일 확인 완료`);
    console.error(`   📊 파일 크기: ${(fileStats.size / 1024).toFixed(2)} KB (${fileStats.size.toLocaleString()} bytes)`);
    
    // .txt 파일 읽기
    logSubSection('📖 텍스트 파일 읽기');
    const textContent = fs.readFileSync(txtPath, 'utf-8');
    console.error(`✅ 텍스트 읽기 완료`);
    console.error(`   📝 텍스트 길이: ${textContent.length.toLocaleString()} 문자`);
    
    // Convsum 형식으로 변환
    logSubSection('🔄 데이터 형식 변환');
    const convsumPayload = formatTextForConvsum(textContent, txtFileName);
    console.error(`✅ 형식 변환 완료`);
    console.error(`   👥 발화자: ${convsumPayload.speakerNames.join(', ')}`);
    console.error(`   📊 SRT 항목 수: ${convsumPayload.speakerSpeech.length}개`);
    
    // Convsum API 호출
    logSubSection('📤 Convsum 요약 요청');
    console.error(`🌐 최종 요청 URL: ${convsumApiUrl}`);
    console.error(`⏰ 요약 생성 시작 (시간이 걸릴 수 있습니다...)`);
    
    const startTime = Date.now();
    
    const res = await axios.post(convsumApiUrl, convsumPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Convsum-Client/1.0'
      },
      timeout: 120000, // 2분 타임아웃
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const endTime = Date.now();
    const processTime = (endTime - startTime) / 1000;
    
    logSection('✅ 요약 생성 완료');
    console.error(`⏱️  총 처리 시간: ${processTime.toFixed(2)}초`);
    console.error(`📊 응답 상태: ${res.status} ${res.statusText}`);
    
    // 응답 데이터 검증
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
    
    const minutes = res.data.minutes;
    
    if (minutes) {
      logSubSection('📋 요약 결과');
      
      console.error(`\n🎯 회의 목적:`);
      console.error(`   ${minutes.purpose || 'N/A'}`);
      
      console.error(`\n📌 주요 주제:`);
      if (minutes.topics && minutes.topics.length > 0) {
        minutes.topics.forEach((topic, i) => {
          console.error(`   ${i + 1}. ${topic}`);
        });
      } else {
        console.error(`   (주제 없음)`);
      }
      
      console.error(`\n📝 회의 요약:`);
      console.error(`   ${minutes.summary || 'N/A'}`);
      
      console.error(`\n✅ 향후 조치사항:`);
      if (minutes.next_steps && minutes.next_steps.length > 0) {
        minutes.next_steps.forEach((step, i) => {
          console.error(`   ${i + 1}. ${step}`);
        });
      } else {
        console.error(`   (조치사항 없음)`);
      }
    }
    
    // 결과 파일 저장
    logSubSection('💾 결과 파일 저장');
    const jsonPath = saveSummaryToFile(res.data);
    const mdPath = saveSummaryToMarkdown(res.data);
    
    // JSON 결과 stdout으로 출력
    logSubSection('🚚 결과 데이터 전송');
    const outputData = JSON.stringify(res.data);
    console.error(`📤 출력 데이터 크기: ${(outputData.length / 1024).toFixed(2)} KB`);
    
    console.log(outputData);
    
    logSection('✅ convsum-client.js 처리 완료');
    
  } catch (error) {
    logSection('❌ Convsum API 호출 에러');
    console.error(`🚨 에러 메시지: ${error.message}`);
    
    // 더 자세한 에러 정보
    if (error.response) {
      logSubSection('📊 HTTP 응답 에러 정보');
      console.error(`   📊 응답 상태: ${error.response.status} ${error.response.statusText}`);
      console.error(`   📊 응답 데이터: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      logSubSection('📡 네트워크 요청 에러');
      console.error(`   📡 요청이 만들어졌지만 응답을 받지 못했습니다`);
    } else {
      logSubSection('⚙️ 요청 설정 에러');
      console.error(`   ⚙️ ${error.message}`);
    }
    
    // 에러 타입별 안내
    logSubSection('🔧 에러 해결 방법');
    if (error.code === 'ECONNREFUSED') {
      console.error(`   🔌 연결 거부됨`);
      console.error(`   💡 Convsum 서버(convsum_inference.py)가 실행되고 있는지 확인하세요`);
    } else if (error.code === 'ETIMEDOUT') {
      console.error(`   ⏰ 타임아웃 발생`);
      console.error(`   💡 요약 생성 시간이 너무 오래 걸립니다 (2분 초과)`);
    } else if (error.code === 'ENOTFOUND') {
      console.error(`   🌐 DNS 해석 실패`);
      console.error(`   💡 URL을 확인하세요: ${convsumApiUrl}`);
    } else if (error.response && error.response.status >= 500) {
      console.error(`   🔧 서버 내부 에러`);
      console.error(`   💡 Convsum 서버에 문제가 있을 수 있습니다`);
    }
    
    console.error(`\n🔧 디버깅 정보:`);
    console.error(`   에러 코드: ${error.code || 'UNKNOWN'}`);
    console.error(`   에러 타입: ${error.constructor.name}`);
    
    process.exit(1);
  }
}

main();