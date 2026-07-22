// Audio synthesis and TTS Engine using Web Audio API and Speech Synthesis API

let audioCtx = null;
let voices = [];

// Initialize voices as soon as possible
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  voices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices();
  };
}

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 1. Play Synthesized Sound Effects
export function playBeep(freq = 800, duration = 0.1) {
  try {
    initAudioContext();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn("Web Audio failed:", e);
  }
}

export function playWhir(duration = 0.8) {
  try {
    initAudioContext();
    const now = audioCtx.currentTime;
    
    // Create oscillator modulated by a low-frequency oscillator for a mechanical 'whir' sound
    const osc = audioCtx.createOscillator();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    const gainNode = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(15, now); // 15 Hz vibration
    lfoGain.gain.setValueAtTime(10, now); // Amplitude modulation

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.linearRampToValueAtTime(0.08, now + duration - 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + duration);
    osc.stop(now + duration);
  } catch (e) {
    console.warn("Web Audio failed:", e);
  }
}

let puffBuffer = null;

if (typeof window !== 'undefined') {
  // Load and decode the custom air puff MP3
  fetch('assets/air%20puff.mp3')
    .then(res => res.arrayBuffer())
    .then(arrayBuffer => {
      const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
      return tempCtx.decodeAudioData(arrayBuffer);
    })
    .then(decodedBuffer => {
      puffBuffer = decodedBuffer;
    })
    .catch(err => {
      console.warn("Could not load assets/air puff.mp3. Falling back to synthesized white noise.", err);
    });
}

export function playPuff() {
  try {
    initAudioContext();
    const now = audioCtx.currentTime;
    
    if (puffBuffer) {
      const source = audioCtx.createBufferSource();
      source.buffer = puffBuffer;
      source.connect(audioCtx.destination);
      source.start(now);
    } else {
      const bufferSize = audioCtx.sampleRate * 0.35; // 0.35 seconds
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate white noise for the rush of air
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      // Filter to make it sound like a dull puff rather than bright static
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, now); // Low frequency thud
      filter.Q.setValueAtTime(1, now);

      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.4, now);
      // Exponential decay of the puff
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      noise.start(now);
      noise.stop(now + 0.35);
    }
    
    // Add a mechanical trigger click sound right at the start
    playBeep(300, 0.05);
  } catch (e) {
    console.warn("Web Audio failed:", e);
  }
}

// 2. Voice Line & TTS Engine Helper
let currentAudioElement = null;

function getAudioFileCandidates(audioKey, doctorGender) {
  if (!audioKey) return [];
  const prefix = doctorGender === 'male' ? 'male' : 'female';
  const folder = 'assets/voice%20lines/'; // URL-encoded space for pathing

  switch (audioKey) {
    case 'receptionist_greeting':
      return [`${folder}receptionist_greeting.mp3`];
    
    case 'doctor_intro':
      return [`${folder}${prefix}_doctor_intro.mp3`];
      
    case 'patient_greeting':
      return [`${folder}${prefix}_doctor_patient_greeting.mp3`];
      
    case 'patient_intro':
      return [`${folder}patient_intro.mp3`];
      
    case 'ar_intro':
      return [
        `${folder}${prefix}_autorefractor_intro.mp3`,
        `${folder}male_autorefracror_intro.mp3`
      ];
      
    case 'ar_eye_switch':
      return [
        `${folder}${prefix}_autorefractor_eye_switch.mp3`,
        `${folder}malw_autorefractor_eye_switch.mp3`
      ];
      
    case 'ar_finished':
      return [`${folder}${prefix}_autorefractor_finished.mp3`];
      
    case 'nct_intro':
      return [`${folder}${prefix}_nct_intro.mp3`];
      
    case 'nct_eye_switch':
      return [`${folder}${prefix}_nct_eye_switch.mp3`];
      
    case 'nct_finished':
      return [`${folder}${prefix}_nct_finished.mp3`];
      
    case 'history_question':
      return [`${folder}${prefix}_history_question.mp3`];
      
    case 'acuity_question':
      return [`${folder}${prefix}_visual_acuity_question.mp3`];
      
    case 'lens_choice_question':
      return [`${folder}${prefix}_lens_choice.mp3`];
      
    case 'patient_blur_line':
      return [`${folder}patient_blur_line.mp3`];

    default:
      // Direct file key match, e.g. 'patient_complaint_1', 'patient_20', 'patient_choice_1'
      return [`${folder}${audioKey}.mp3`];
  }
}

export function speakText(text, role = 'patient', doctorGender = 'male', onEndCallback = null, audioKey = null) {
  // Cancel any ongoing speech synthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  
  // Pause any currently playing voice line audio element
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }

  // Attempt MP3 audio file playback if audioKey is supplied
  const candidates = getAudioFileCandidates(audioKey, doctorGender);
  if (candidates.length > 0) {
    playFirstValidAudio(candidates, 0, () => {
      // Fallback to browser Web Speech TTS if file playback fails
      speakTextFallback(text, role, doctorGender, onEndCallback);
    }, onEndCallback);
  } else {
    speakTextFallback(text, role, doctorGender, onEndCallback);
  }
}

function playFirstValidAudio(candidates, index, fallbackCb, onEndCallback) {
  if (!candidates || index >= candidates.length) {
    fallbackCb();
    return;
  }

  const path = candidates[index];
  const audio = new Audio(path);
  let called = false;

  audio.oncanplaythrough = () => {
    if (called) return;
    called = true;
    currentAudioElement = audio;

    if (onEndCallback) {
      audio.onended = () => {
        currentAudioElement = null;
        onEndCallback();
      };
    }

    audio.play().catch(err => {
      console.warn(`Audio play failed for ${path}, falling back to TTS.`, err);
      currentAudioElement = null;
      fallbackCb();
    });
  };

  audio.onerror = () => {
    if (called) return;
    called = true;
    playFirstValidAudio(candidates, index + 1, fallbackCb, onEndCallback);
  };

  audio.load();
}

function speakTextFallback(text, role, doctorGender, onEndCallback) {
  if (!('speechSynthesis' in window)) {
    console.warn("TTS not supported in this browser.");
    if (onEndCallback) onEndCallback();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  
  if (voices.length === 0) {
    voices = window.speechSynthesis.getVoices();
  }

  let selectedVoice = null;

  if (role === 'doctor') {
    if (doctorGender === 'male') {
      selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('microsoft')));
    } else {
      selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('google us english')));
    }
    utterance.pitch = doctorGender === 'male' ? 0.9 : 1.15;
    utterance.rate = 0.95;
  } else if (role === 'receptionist') {
    selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('hazel') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('google us english')));
    utterance.pitch = 1.15;
    utterance.rate = 1.0;
  } else {
    selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('mark') || v.name.toLowerCase().includes('george')));
    utterance.pitch = 0.85;
    utterance.rate = 0.85;
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  if (onEndCallback) {
    utterance.onend = onEndCallback;
    setTimeout(() => {
      if (window.speechSynthesis.speaking) {
        onEndCallback();
      }
    }, 10000); 
  }

  window.speechSynthesis.speak(utterance);
}
