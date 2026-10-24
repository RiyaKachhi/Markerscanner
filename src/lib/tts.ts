class TextToSpeechService {
  private synth: SpeechSynthesis | null = null;
  private isSpeakingState = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return !!this.synth;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState || (this.synth ? this.synth.speaking : false);
  }

  public speak(text: string, lang: 'en' | 'hi' = 'en'): void {
    if (!this.synth) return;

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick best available voice for language
    const voices = this.synth.getVoices();
    const voice = voices.find((v) => v.lang.startsWith(lang));
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      this.isSpeakingState = true;
    };

    utterance.onend = () => {
      this.isSpeakingState = false;
    };

    utterance.onerror = () => {
      this.isSpeakingState = false;
    };

    this.synth.speak(utterance);
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeakingState = false;
    }
  }
}

export const ttsService = new TextToSpeechService();
