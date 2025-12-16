export interface BugPrediction {
  description: string;
  severity: 'Critical' | 'Major' | 'Minor';
  affectedSystem: string;
}

export interface QAPlan {
  summary: string;
  risks: RiskItem[];
  checklist: ChecklistItem[];
  bugs: BugPrediction[];
  groundingUrls?: string[];
  discardedUrls?: string[];
}

export interface RiskItem {
  area: string;
  level: 'High' | 'Medium' | 'Low';
  reason: string;
}

export interface ChecklistItem {
  id: string;
  category: string;
  task: string;
  isCompleted: boolean;
  source: 'Logic' | 'Community' | 'History';
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type InputMode = 'TEXT' | 'URL';