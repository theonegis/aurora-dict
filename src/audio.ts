export async function playPronunciation(word: string, language: string, audioUrl = ""): Promise<void> {
  const spokenWord = word.trim();
  if (!spokenWord) return;
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    try { await audio.play(); return; } catch { /* Fall back to the system voice. */ }
  }
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(spokenWord);
  utterance.lang = language;
  utterance.voice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith(language.toLowerCase())) ?? null;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
