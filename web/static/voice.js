// =============================================================
// voice.js - 캐릭터 더빙 목소리
// -------------------------------------------------------------
// 브라우저에 들어 있는 "음성 합성(Web Speech API)"으로 대사를 읽어 준다.
//   - 설치·유료 API 필요 없음. 인터넷 공개 버전에서도 그대로 동작
//   - Edge 브라우저에는 자연스러운 한국어 음성(SunHi, InJoon 등)이 있어서 가장 잘 들린다
//   - 캐릭터마다 음높이(pitch)와 말 속도(rate)를 다르게 해서 목소리를 구분한다
//
// 직접 녹음한 목소리를 쓰고 싶으면 :
//   static/voice/<대사 번호>.mp3 같은 파일을 만들고 VOICE_FILES 에 연결하면
//   그 대사만 녹음 파일로 재생된다. (아래 speakLine 참고)
// =============================================================

const Voice = (() => {
  const synth = window.speechSynthesis;
  let voices = [];
  let enabled = true;
  let volume = 0.9;
  let current = null;           // 지금 읽고 있는 문장
  let audioEl = null;           // 녹음 파일 재생용

  // 캐릭터별 목소리 설정 : gender = 여성(f)/남성(m), pitch = 음높이(0.1~2), rate = 속도(0.5~2)
  const PROFILE = {
    student: { gender: "m", pitch: 1.05, rate: 1.05 },
    future:  { gender: "m", pitch: 0.82, rate: 0.95 },
    doyun:   { gender: "m", pitch: 1.2,  rate: 1.15 },
    kim:     { gender: "m", pitch: 0.7,  rate: 0.9 },
    han:     { gender: "f", pitch: 1.0,  rate: 0.95 },
    seorin:  { gender: "f", pitch: 0.92, rate: 0.95 },   // 차분하고 낮게
    yuri:    { gender: "f", pitch: 1.18, rate: 1.12 },   // 또랑또랑 빠르게
    bom:     { gender: "f", pitch: 1.4,  rate: 1.18 },   // 높고 통통 튀게
    hayul:   { gender: "f", pitch: 1.02, rate: 0.9 },    // 부드럽고 느긋하게
    sion:    { gender: "f", pitch: 1.25, rate: 0.85 },   // 가늘고 느리게
    narr:    { gender: "f", pitch: 1.0,  rate: 1.0 },
  };
  let narrate = false;          // 지문(나레이션)도 읽을지 (기본은 안 읽음)

  // 녹음 파일 연결표 { "대사 문장": "static/voice/파일.mp3" } - 비어 있으면 모두 음성 합성
  const VOICE_FILES = {};

  function load() {
    if (!synth) return;
    voices = synth.getVoices().filter((v) => /^ko/i.test(v.lang));
  }
  if (synth) {
    load();
    synth.onvoiceschanged = load;
  }

  // 성별에 맞는 목소리 고르기 (자연스러운 온라인 음성을 먼저)
  const FEMALE = /SunHi|Heami|Yuna|Seoyeon|JiMin|SoonBok|Female|여/i;
  const MALE = /InJoon|Hyunsu|BongJin|GookMin|Male|남/i;
  function pick(gender) {
    if (!voices.length) return null;
    const re = gender === "m" ? MALE : FEMALE;
    const natural = (v) => /Natural|Online/i.test(v.name);
    const matches = voices.filter((v) => re.test(v.name));
    return matches.find(natural) || matches[0] || voices.find(natural) || voices[0];
  }

  // 읽기 좋게 문장 다듬기 : 이모지·괄호 표시 지우고 "…" 은 쉼표로
  function clean(text) {
    return text
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/[()「」『』"“”]/g, "")
      .replace(/…+|\.{2,}/g, ", ")
      .replace(/~+/g, "")
      .trim();
  }

  // 대사 한 줄 읽기. 끝나면 onEnd 실행
  function speakLine(text, who, onEnd) {
    stop();
    if (!enabled || (who === "narr" && !narrate)) { if (onEnd) onEnd(); return; }

    if (VOICE_FILES[text]) {                       // 녹음 파일이 있으면 그걸 재생
      audioEl = new Audio(VOICE_FILES[text]);
      audioEl.volume = volume;
      const mine = { who };
      const done = () => { if (current !== mine) return; current = null; if (onEnd) onEnd(); };
      audioEl.onended = done;
      current = mine;
      audioEl.play().catch(done);
      return;
    }

    const say = clean(text);
    // 한국어 음성이 없는 브라우저면 (영어 목소리로 이상하게 읽지 않게) 읽지 않고 넘어감
    if (!synth || !say || !voices.length) { if (onEnd) onEnd(); return; }
    const key = who === "me" ? "student" : who;
    const p = PROFILE[key] || PROFILE.narr;
    const u = new SpeechSynthesisUtterance(say);
    u.lang = "ko-KR";
    const v = pick(p.gender);
    if (v) u.voice = v;
    // 남자 목소리가 없는 브라우저에서는 여자 목소리를 낮춰서 대신 씀
    const fakeMale = p.gender === "m" && v && !MALE.test(v.name);
    u.pitch = Math.max(0.1, Math.min(2, p.pitch * (fakeMale ? 0.62 : 1)));
    u.rate = p.rate;
    u.volume = volume;
    // 다음 대사로 넘어가며 취소된 문장의 "끝남" 신호는 무시 (오토 모드가 두 줄씩 넘어가지 않게)
    u.onend = u.onerror = () => { if (current !== u) return; current = null; if (onEnd) onEnd(); };
    current = u;
    synth.speak(u);
    // 안전장치 : 브라우저가 "끝남" 신호를 안 주면 글자 수에 맞춰 적당한 시간 뒤 끝난 것으로 처리
    setTimeout(() => u.onend(), (say.length * 0.22 / p.rate + 2.5) * 1000);
  }

  function stop() {
    current = null;
    if (synth) synth.cancel();
    if (audioEl) { audioEl.pause(); audioEl = null; }
  }

  return {
    speakLine,
    stop,
    speaking: () => !!current,
    available: () => !!synth,
    hasVoices: () => voices.length > 0,
    get enabled() { return enabled; },
    set enabled(on) { enabled = on; if (!on) stop(); },
    get narrate() { return narrate; },
    set narrate(on) { narrate = on; },
    get volume() { return volume; },
    set volume(v) { volume = v; },
    voiceName: (gender) => (pick(gender) || {}).name || "없음",
  };
})();
