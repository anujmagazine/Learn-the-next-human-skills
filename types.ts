
export enum AppView {
  HUB = 'hub',
  TRAINER = 'trainer',
  LEARN = 'learn',
  DASHBOARD = 'dashboard',
  LANDING = 'landing',
  EVOLUTION = 'evolution'
}

export interface AgentStream {
  id: string;
  role: string;
  color: string;
  logs: string[];
  status: 'idle' | 'working' | 'awaiting_input' | 'completed';
  currentTask: string;
}

export interface DrillScenario {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Hard' | 'Extreme';
  description: string;
  agents: string[];
}
