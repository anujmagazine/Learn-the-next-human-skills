export enum AppView {
  HUB = 'hub',
  TRAINER = 'trainer',
  LEARN = 'learn',
  DASHBOARD = 'dashboard',
  LANDING = 'landing',
  EVOLUTION = 'evolution',
  VERIFICATION = 'verification',
  VERIFICATION_GATEWAY = 'verification_gateway',
  VERIFICATION_INSTINCT = 'verification_instinct',
  VERIFICATION_FATIGUE = 'verification_fatigue',
  VERIFICATION_FATIGUE_ENDURANCE = 'verification_fatigue_endurance',
  TASTE = 'taste',
  DEFINE_THE_WHAT = 'define_the_what'
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
  disabled?: boolean;
}

export interface SimNotification {
  id: string;
  agentName: string;
  message: string;
  type: 'approval' | 'regression' | 'ready';
}

export interface Worktree {
  id: string;
  name: string;
  branch: string;
  progress: number;
  status: 'working' | 'completed';
  agent: string;
}

export interface TraditionalStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  progress: number;
}
