<template>
  <div class="main-home">
    <h1>동영상 요약/키워드 추출</h1>

    <form @submit.prevent="handleSubmit">
      <label for="videoUrl">동영상 URL:</label>
      <input
        type="text"
        id="videoUrl"
        v-model="videoUrl"
        placeholder="동영상 URL을 입력하세요"
        required
      />
      <button type="submit" :disabled="loading">분석하기</button>
    </form>

    <div v-if="loading" class="loading">분석 중입니다...</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result">
      <!-- 1. 전체 변환 텍스트 -->
      <h2>전체 변환 텍스트</h2>
      <pre class="full-text">{{ result.results && result.results[0] ? result.results[0].fullText : '' }}</pre>

      <!-- 2. 요약 (output_summary(N).md 형식) -->
      <div v-if="result.summary && result.summary.minutes">
        <h2>📋 회의록 요약</h2>
        <div class="summary-content">
          <div class="summary-section">
            <h3>🎯 회의 목적</h3>
            <p>{{ result.summary.minutes.purpose || 'N/A' }}</p>
          </div>

          <div class="summary-section">
            <h3>📌 주요 주제</h3>
            <ul v-if="result.summary.minutes.topics && result.summary.minutes.topics.length > 0">
              <li v-for="(topic, i) in result.summary.minutes.topics" :key="i">{{ topic }}</li>
            </ul>
            <p v-else>- (주제 없음)</p>
          </div>

          <div class="summary-section">
            <h3>📝 회의 요약</h3>
            <p>{{ result.summary.minutes.summary || 'N/A' }}</p>
          </div>

          <div class="summary-section">
            <h3>✅ 향후 조치사항</h3>
            <ul v-if="result.summary.minutes.next_steps && result.summary.minutes.next_steps.length > 0">
              <li v-for="(step, i) in result.summary.minutes.next_steps" :key="i">{{ step }}</li>
            </ul>
            <p v-else>- (조치사항 없음)</p>
          </div>

          <div class="summary-section">
            <h3>👥 참석자</h3>
            <ul v-if="result.summary.speakerNames && result.summary.speakerNames.length > 0">
              <li v-for="(speaker, i) in result.summary.speakerNames" :key="i">{{ speaker }}</li>
            </ul>
            <p v-else>- (참석자 정보 없음)</p>
          </div>
        </div>
      </div>

      <!-- 3. 오디오 파일 -->
      <div v-if="result.audioPath">
        <h2>🎵 오디오 파일 (mp3)</h2>
        <audio :src="result.audioPath" controls></audio>
      </div>

      <!-- 4. 기타 키워드 (있을 경우) -->
      <div v-if="result.keywords && result.keywords.length">
        <h2>🔑 키워드</h2>
        <ul>
          <li v-for="(keyword, i) in result.keywords" :key="i">{{ keyword }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "MainHomePage",
  data() {
    return {
      videoUrl: "",
      result: null,
      loading: false,
      error: "",
    };
  },
  methods: {
    async handleSubmit() {
      this.loading = true;
      this.error = "";
      this.result = null;
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoUrl: this.videoUrl }),
        });
        if (!response.ok) throw new Error("서버 에러: " + response.status);
        const data = await response.json();
        this.result = data;
      } catch (err) {
        this.error = err.message || "분석 중 오류가 발생했습니다.";
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.main-home {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: #f7f7fb;
  border-radius: 10px;
  box-shadow: 0 2px 8px #0001;
}
label {
  font-weight: bold;
}
input[type="text"] {
  width: 100%;
  padding: 0.5rem;
  margin: 0.5rem 0 1rem;
  border-radius: 5px;
  border: 1px solid #ddd;
}
button {
  padding: 0.5rem 1rem;
}
.loading {
  margin-top: 1rem;
  color: #666;
}
.error {
  color: red;
  margin-top: 1rem;
}

/* 전체 변환 텍스트 */
.full-text {
  white-space: pre-wrap;
  background: #fff;
  border-radius: 5px;
  padding: 1rem;
  margin: 1rem 0;
  font-size: 1rem;
  border: 1px solid #eee;
  color: #333;
}

/* 요약 스타일 (마크다운 스타일) */
.summary-content {
  background: #fff;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 1rem 0;
  border: 1px solid #e0e0e0;
}

.summary-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.summary-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.summary-section h3 {
  margin: 0 0 0.75rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.summary-section p {
  margin: 0.5rem 0;
  color: #555;
  line-height: 1.6;
}

.summary-section ul {
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #555;
}

.summary-section li {
  margin: 0.25rem 0;
  line-height: 1.5;
}

/* 오디오 */
audio {
  width: 100%;
  margin-top: 1rem;
}
</style>