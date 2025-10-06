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
      <h2>전체 변환 텍스트</h2>
      <pre class="full-text">{{ result.results && result.results[0] ? result.results[0].fullText : '' }}</pre>
      <div v-if="result.audioPath">
        <h2>오디오 파일 (mp3)</h2>
        <!-- 오디오 파일 경로를 서버가 static으로 서빙하는 "/audio/output_audio.mp3"로 받아 사용합니다 -->
        <audio :src="result.audioPath" controls></audio>
      </div>
      <div v-if="result.summary">
        <h2>요약</h2>
        <p>{{ result.summary }}</p>
      </div>
      <div v-if="result.keywords && result.keywords.length">
        <h2>키워드</h2>
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
  max-width: 500px;
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
audio {
  width: 100%;
  margin-top: 1rem;
}
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
</style>