export interface PersonaRecommendation {
  personaId: string;
  personaName: string;
  angle: string;
  recommendation: string;
  nextStep: string;
}

export interface NarratorSynthesis {
  consensus: string;
  divergence: string;
  keyQuestion: string;
  narratorAdvice: string;
}

export interface HelplineInfo {
  name: string;
  phone: string;
  description: string;
}

export interface DilemmaAdvisory {
  id?: string;
  documentId: string;
  problemCore: string;
  rootCauses?: string;
  recommendations: PersonaRecommendation[];
  narratorSynthesis?: NarratorSynthesis;
  crisisDetected: boolean;
  crisisMessage?: string;
  helplines?: HelplineInfo[];
  userDecision?: string;
  createdAt?: string;
}
