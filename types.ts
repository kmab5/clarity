export enum AppStep {
  INPUT = 'INPUT',
  ANALYZING = 'ANALYZING',
  QUESTIONS = 'QUESTIONS',
  CALCULATING = 'CALCULATING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

export type Answer = 'YES' | 'NO' | 'MAYBE';

export interface DecisionResult {
  recommendation: string;
  pros: string[];
  cons: string[];
  closingThought: string;
}

export interface QuestionSession {
  topic: string;
  questions: string[];
  answers: Answer[]; 
  currentQuestionIndex: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  topic: string;
  result: DecisionResult;
}