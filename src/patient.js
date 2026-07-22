// Patient profile generator and eye refraction physics logic

const PATIENT_NAMES = [
  "Arthur Pendelton", "Clarissa Evans", "Marcus Vance", "Elena Rostova", 
  "Geraldine Brooks", "Tobias Sterling", "Sonia Patel", "Harvey Jenkins"
];

const COMPLAINTS = [
  "My distance vision has gotten pretty blurry lately, especially when driving at night.",
  "I've been experiencing mild headaches when reading books or looking at my phone screen for too long.",
  "Road signs have been looking fuzzy until I get really close to them.",
  "Everything in the distance is slightly out of focus, and I keep squinting to make out details.",
  "I feel like my current prescription isn't quite as sharp as it used to be. Things feel slightly smeared."
];

// Snellen Lines letters definition
export const SNELLEN_CHART = {
  200: "E",
  100: "F P",
  70: "T O Z",
  50: "L P E D",
  40: "P E C F D",
  30: "E D F C Z P",
  25: "F E L O P Z D",
  20: "D E F P O T E C",
  15: "L E F O D P C T"
};

// Map of line sizes in order
export const SNELLEN_LINES = [200, 100, 70, 50, 40, 30, 25, 20, 15];

export class Patient {
  constructor() {
    this.name = PATIENT_NAMES[Math.floor(Math.random() * PATIENT_NAMES.length)];
    this.complaintIndex = Math.floor(Math.random() * COMPLAINTS.length) + 1; // 1 to 5
    this.complaint = COMPLAINTS[this.complaintIndex - 1];
    this.complaintAudioKey = `patient_complaint_${this.complaintIndex}`;
    
    // Generate true prescription (OD = Right Eye, OS = Left Eye)
    this.trueRx = {
      OD: this.generateRandomRx(),
      OS: this.generateRandomRx()
    };

    // Ensure Left and Right eyes are similar but slightly different (typical of humans)
    const diffSph = (Math.random() * 1.0 - 0.5); // +/- 0.50D difference
    this.trueRx.OS.sph = Math.max(-5.00, Math.min(2.00, Math.round((this.trueRx.OD.sph + diffSph) * 4) / 4));
    
    // Intraocular pressure (NCT Tonometer)
    this.iop = {
      OD: Math.floor(Math.random() * 8) + 12, // 12-19 mmHg (Normal)
      OS: Math.floor(Math.random() * 8) + 12
    };
    
    // Sometimes create a slight elevation (glaucoma suspect) to make gameplay interesting
    if (Math.random() > 0.75) {
      this.iop.OD += 6; // 18-25 mmHg
      this.iop.OS += 5;
    }
  }

  generateRandomRx() {
    const s = (Math.floor(Math.random() * 20) - 16) * 0.25; 
    const hasCyl = Math.random() > 0.3;
    const c = hasCyl ? -(Math.floor(Math.random() * 8) + 1) * 0.25 : 0.00;
    const a = hasCyl ? Math.floor(Math.random() * 18) * 10 : 180;
    return { sph: s, cyl: c, ax: a === 0 ? 180 : a };
  }

  // Calculate blur index based on Thibos vector model
  // S_p, C_p, A_p: current lens settings
  // S_t, C_t, A_t: true prescription of the eye
  calculateBlurIndex(sph_p, cyl_p, ax_p, eye = 'OD') {
    const rx = this.trueRx[eye];
    
    const M_rx = rx.sph + rx.cyl / 2;
    const rad_rx = (rx.ax * Math.PI) / 180;
    const J0_rx = -(rx.cyl / 2) * Math.cos(2 * rad_rx);
    const J45_rx = -(rx.cyl / 2) * Math.sin(2 * rad_rx);

    const M_p = sph_p + cyl_p / 2;
    const rad_p = (ax_p * Math.PI) / 180;
    const J0_p = -(cyl_p / 2) * Math.cos(2 * rad_p);
    const J45_p = -(cyl_p / 2) * Math.sin(2 * rad_p);

    const dM = M_rx - M_p;
    const dJ0 = J0_rx - J0_p;
    const dJ45 = J45_rx - J45_p;

    const blurVectorSq = Math.pow(dM, 2) + 2 * Math.pow(dJ0, 2) + 2 * Math.pow(dJ45, 2);
    return Math.sqrt(blurVectorSq);
  }

  // Get max readable Snellen line based on blur index
  getVisualAcuityLine(blur) {
    if (blur <= 0.15) return 15;  // 20/15
    if (blur <= 0.35) return 20;  // 20/20
    if (blur <= 0.60) return 25;  // 20/25
    if (blur <= 0.85) return 30;  // 20/30
    if (blur <= 1.15) return 40;  // 20/40
    if (blur <= 1.45) return 50;  // 20/50
    if (blur <= 1.85) return 70;  // 20/70
    if (blur <= 2.35) return 100; // 20/100
    return 200;                   // 20/200 or worse
  }

  // Simulates reading a specific Snellen line size
  // Returns { text: string, success: boolean, audioKey: string }
  readSnellenLine(lineSize, sph_p, cyl_p, ax_p, eye = 'OD') {
    const blur = this.calculateBlurIndex(sph_p, cyl_p, ax_p, eye);
    const limitLine = this.getVisualAcuityLine(blur);
    
    const targetIdx = SNELLEN_LINES.indexOf(lineSize);
    const limitIdx = SNELLEN_LINES.indexOf(limitLine);

    const correctLetters = SNELLEN_CHART[lineSize];
    if (!correctLetters) return { text: "...", success: false, audioKey: null };

    // Case 1: Defocus is too extreme, cannot see even the giant E
    if (blur > 4.5 && lineSize === 200) {
      return { 
        text: "I can't see the chart at all, it's just a black screen.", 
        success: false,
        audioKey: 'patient_blur_line'
      };
    }

    // Case 2: Target line is larger or equal to their acuity limit (they can read it clearly)
    if (targetIdx <= limitIdx) {
      return { 
        text: `"${correctLetters}"`, 
        success: true,
        audioKey: `patient_${lineSize}`
      };
    }

    // Case 3: Target line is just 1 step smaller than their limit (they can read it with struggle)
    if (targetIdx === limitIdx + 1) {
      const letters = correctLetters.split(" ");
      const readLetters = letters.map(char => {
        if (Math.random() > 0.40) return char;
        const mistakes = {
          'E': 'B', 'F': 'P', 'P': 'F', 'T': 'Y', 'O': 'D', 
          'Z': 'S', 'L': 'I', 'D': 'O', 'C': 'O'
        };
        return mistakes[char] || '?';
      });
      return { 
        text: `"...I think it's ${readLetters.join(' ')}?"`, 
        success: false,
        audioKey: `patient_${lineSize}`
      };
    }

    // Case 4: Target line is much smaller than their limit (it is just a blur)
    return { 
      text: `"It's too small and blurry. I can't read that line."`, 
      success: false,
      audioKey: 'patient_blur_line'
    };
  }

  // Returns feedback on Lens 1 vs Lens 2
  compareLenses(lens1, lens2, eye = 'OD') {
    const blur1 = this.calculateBlurIndex(lens1.sph, lens1.cyl, lens1.ax, eye);
    const blur2 = this.calculateBlurIndex(lens2.sph, lens2.cyl, lens2.ax, eye);

    const diff = blur1 - blur2; // negative means lens1 is sharper
    
    if (Math.abs(diff) < 0.15) {
      return { text: "They look about the same to me.", audioKey: 'patient_choice_3' };
    } else if (diff < 0) {
      return { text: "Choice 1 is noticeably sharper.", audioKey: 'patient_choice_1' };
    } else {
      return { text: "Choice 2 is noticeably sharper.", audioKey: 'patient_choice_2' };
    }
  }
}
