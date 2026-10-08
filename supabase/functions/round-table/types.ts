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

export interface RoundTableResult {
  id?: string;
  documentId?: string;
  problemCore: string;
  rootCauses?: string;
  recommendations: PersonaRecommendation[];
  narratorSynthesis?: NarratorSynthesis;
  crisisDetected: boolean;
  crisisMessage?: string;
  helplines?: HelplineInfo[];
  userDecision?: string;
}

export interface RoundTableRequestBody {
  document_id?: string;
  dilemma_text?: string;
  members?: string[];
  decision?: string; // opcjonalny zapis podjętej decyzji użytkownika
}

export interface UserContextFileRow {
  filename: string;
  content: string;
}

export interface IRoundTableDatabaseClient {
  getUserId(authHeader?: string): Promise<string | null>;
  getUserProfile(userId: string): Promise<{ aiPersonality: string | null; roundTableMembers: string[] } | null>;
  getDocument(
    userId: string,
    documentId: string,
  ): Promise<{ id: string; content: string; title: string; category?: string } | null>;
  getUserContextFiles(userId: string): Promise<UserContextFileRow[]>;
  saveAdvisory(
    userId: string,
    advisory: {
      documentId: string;
      problemCore: string;
      rootCauses?: string;
      recommendations: PersonaRecommendation[];
      narratorSynthesis?: NarratorSynthesis;
      crisisDetected: boolean;
      userDecision?: string;
    },
  ): Promise<string>;
  saveUserDecision(userId: string, documentId: string, decision: string): Promise<void>;
  appendDilemmaDecisionToContext(userId: string, dilemmaTitle: string, decision: string): Promise<void>;
}
