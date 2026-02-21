import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { AppView, AgentStream, DrillScenario, SimNotification, Worktree, TraditionalStep } from './types';
import { orchestrationService } from './services/gemini';
import Visualizer from './components/Visualizer';

const DRILLS: DrillScenario[] = [
  {
    id: 'swarm-1',
    title: 'The "Claude Engineer" Challenge',
    difficulty: 'Extreme',
    description: 'Build a fully autonomous coding agent in a single afternoon. Manage 10 concurrent AI agents to architect, integrate, and ship a complex CLI tool at 25x speed. Inspired by the legendary 12-hour build of Claude Engineer.',
    agents: ['Terminal-1 (Core)', 'Terminal-2 (FS)', 'Terminal-3 (API)', 'Terminal-4 (Context)', 'Web-A (UI)', 'Web-B (Docs)', 'Web-C (Tests)', 'Mobile-Review']
  },
  {
    id: 'crisis-1',
    title: 'The Global Launch Pivot',
    difficulty: 'Hard',
    description: 'A major competitor just released a similar product 2 hours before your launch. Manage 4 agents to pivot the entire strategy in real-time.',
    agents: ['Marketing Strategist', 'Technical Lead', 'Legal Counsel', 'PR Spokesperson'],
    disabled: true
  },
  {
    id: 'crisis-2',
    title: 'Cyber-Security Breach',
    difficulty: 'Extreme',
    description: 'Active data exfiltration in progress. Coordinate Defense, PR, Customer Support, and Forensic teams simultaneously.',
    agents: ['Infra Security', 'PR Manager', 'Support Lead', 'Legal'],
    disabled: true
  }
];

const SIM_TASKS = [
  { id: 1, name: 'System Architecture & CLI Core', duration: 40, deps: [] },
  { id: 2, name: 'File System & Shell Integration', duration: 24, deps: [1] },
  { id: 3, name: 'Claude API Orchestration Layer', duration: 32, deps: [1] },
  { id: 4, name: 'Context Window Management', duration: 24, deps: [3] },
  { id: 5, name: 'Multi-file Refactoring Engine', duration: 40, deps: [2, 3] },
  { id: 6, name: 'Autonomous Debugging Loop', duration: 32, deps: [5] },
  { id: 7, name: 'Interactive UI (Artifacts Style)', duration: 48, deps: [1] },
  { id: 8, name: 'Tool Use (Search & Execute)', duration: 24, deps: [2] },
  { id: 9, name: 'Safety & Guardrail Implementation', duration: 16, deps: [3] },
  { id: 10, name: 'Documentation & Test Suite', duration: 20, deps: [6, 7] },
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HUB);
  const [activeDrill, setActiveDrill] = useState<DrillScenario | null>(null);
  const [agents, setAgents] = useState<AgentStream[]>([]);
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [intervention, setIntervention] = useState<{ agentId: string, prompt: string } | null>(null);
  const [stats, setStats] = useState({ switches: 0, interventions: 0 });
  const logContainerRef = useRef<Record<string, HTMLDivElement | null>>({});

  // New Simulation States
  const [simActive, setSimActive] = useState(false);
  const [showInfrastructure, setShowInfrastructure] = useState(false);
  
  const [tradSim, setTradSim] = useState({
    elapsed: 0,
    activeStepIndex: 0,
    steps: [
      { id: 'code', label: 'Code', status: 'pending', progress: 0 },
      { id: 'test', label: 'Test', status: 'pending', progress: 0 },
      { id: 'fix', label: 'Fix', status: 'pending', progress: 0 },
      { id: 'integrate', label: 'Integrate', status: 'pending', progress: 0 },
      { id: 'deploy', label: 'Deploy', status: 'pending', progress: 0 },
    ] as TraditionalStep[],
    isSwitchingBranch: false,
    completedCycles: 0
  });

  const [agenticSim, setAgenticSim] = useState({
    elapsed: 0,
    worktrees: [
      { id: 'wt-1', name: '/wt-feature-login', branch: 'feature-login', progress: 0, status: 'working', agent: 'Feature Agent' },
      { id: 'wt-2', name: '/wt-refactor-auth', branch: 'refactor-auth', progress: 0, status: 'working', agent: 'Refactor Agent' },
      { id: 'wt-3', name: '/wt-docs-update', branch: 'docs-update', progress: 0, status: 'working', agent: 'Docs Agent' },
      { id: 'wt-4', name: '/wt-verification', branch: 'verification', progress: 0, status: 'working', agent: 'Verification Agent' },
      { id: 'wt-5', name: '/wt-tests', branch: 'tests', progress: 0, status: 'working', agent: 'Test Agent' },
    ] as Worktree[],
    notifications: [] as SimNotification[],
    teleportAgentId: null as string | null,
    teleportTarget: 'terminal' as 'terminal' | 'browser' | 'mobile' | 'desktop',
    humanActions: 0
  });

  const startDrill = (drill: DrillScenario) => {
    if (drill.disabled) return;
    const initialAgents: AgentStream[] = drill.agents.map((role, i) => ({
      id: `agent-${i}`,
      role,
      color: i < 4 ? '#94c840' : i < 7 ? '#e5e6e6' : '#80a836',
      logs: [`System: Agent ${role} initialized. Connection secure.`],
      status: 'working',
      currentTask: 'Awaiting first synchronization directive...'
    }));
    setAgents(initialAgents);
    setActiveDrill(drill);
    
    if (drill.id === 'swarm-1') {
      setView(AppView.EVOLUTION);
      resetSimulations();
    } else {
      setView(AppView.TRAINER);
      setIsDrillRunning(true);
    }
    setStats({ switches: 0, interventions: 0 });
  };

  const resetSimulations = () => {
    setSimActive(false);
    setTradSim({
      elapsed: 0,
      activeStepIndex: 0,
      steps: [
        { id: 'code', label: 'Code', status: 'pending', progress: 0 },
        { id: 'test', label: 'Test', status: 'pending', progress: 0 },
        { id: 'fix', label: 'Fix', status: 'pending', progress: 0 },
        { id: 'integrate', label: 'Integrate', status: 'pending', progress: 0 },
        { id: 'deploy', label: 'Deploy', status: 'pending', progress: 0 },
      ] as TraditionalStep[],
      isSwitchingBranch: false,
      completedCycles: 0
    });
    setAgenticSim({
      elapsed: 0,
      worktrees: [
        { id: 'wt-1', name: '/wt-feature-login', branch: 'feature-login', progress: 0, status: 'working', agent: 'Feature Agent' },
        { id: 'wt-2', name: '/wt-refactor-auth', branch: 'refactor-auth', progress: 0, status: 'working', agent: 'Refactor Agent' },
        { id: 'wt-3', name: '/wt-docs-update', branch: 'docs-update', progress: 0, status: 'working', agent: 'Docs Agent' },
        { id: 'wt-4', name: '/wt-verification', branch: 'verification', progress: 0, status: 'working', agent: 'Verification Agent' },
        { id: 'wt-5', name: '/wt-tests', branch: 'tests', progress: 0, status: 'working', agent: 'Test Agent' },
      ] as Worktree[],
      notifications: [],
      teleportAgentId: null,
      teleportTarget: 'terminal',
      humanActions: 0
    });
  };

  useEffect(() => {
    if (!simActive || view !== AppView.EVOLUTION) return;
    
    const interval = setInterval(() => {
      const tick = 0.1;

      // Traditional Simulation Logic
      setTradSim(prev => {
        if (prev.completedCycles >= 1) return prev; // Stop after one full cycle for demo

        const nextSteps = [...prev.steps];
        let nextActiveIndex = prev.activeStepIndex;
        let nextIsSwitching = prev.isSwitchingBranch;
        let nextCycles = prev.completedCycles;

        if (nextIsSwitching) {
          // Branch switching delay simulation
          if (Math.random() > 0.95) {
            nextIsSwitching = false;
          }
        } else {
          const currentStep = nextSteps[nextActiveIndex];
          currentStep.status = 'active';
          currentStep.progress += 2; // Linear progress

          if (currentStep.progress >= 100) {
            currentStep.status = 'completed';
            currentStep.progress = 100;
            if (nextActiveIndex < nextSteps.length - 1) {
              nextActiveIndex++;
              // Simulate context switch delay between major steps
              if (nextActiveIndex === 3) nextIsSwitching = true; 
            } else {
              nextCycles++;
            }
          }
        }

        return {
          ...prev,
          elapsed: prev.elapsed + tick,
          activeStepIndex: nextActiveIndex,
          steps: nextSteps,
          isSwitchingBranch: nextIsSwitching,
          completedCycles: nextCycles
        };
      });

      // Agentic Simulation Logic
      setAgenticSim(prev => {
        const allDone = prev.worktrees.every(wt => wt.status === 'completed');
        if (allDone) return prev;

        const nextWorktrees = prev.worktrees.map(wt => {
          if (wt.status === 'completed') return wt;
          const nextProgress = wt.progress + (Math.random() * 5);
          return {
            ...wt,
            progress: nextProgress >= 100 ? 100 : nextProgress,
            status: nextProgress >= 100 ? 'completed' : 'working'
          };
        });

        // Random Notifications
        let nextNotifications = [...prev.notifications];
        if (Math.random() > 0.97 && nextNotifications.length < 3) {
          const agents = ['Feature Agent', 'Refactor Agent', 'Docs Agent', 'Verification Agent', 'Test Agent'];
          const types: ('approval' | 'regression' | 'ready')[] = ['approval', 'regression', 'ready'];
          const type = types[Math.floor(Math.random() * types.length)];
          const agent = agents[Math.floor(Math.random() * agents.length)];
          
          const messages = {
            approval: "needs approval for major refactor",
            regression: "flagged a potential regression in core",
            ready: "ready to merge into main"
          };

          nextNotifications.push({
            id: Math.random().toString(36).substr(2, 9),
            agentName: agent,
            message: messages[type],
            type
          });
        }

        return {
          ...prev,
          elapsed: prev.elapsed + tick,
          worktrees: nextWorktrees,
          notifications: nextNotifications
        };
      });

    }, 100);

    return () => clearInterval(interval);
  }, [simActive, view]);

  useEffect(() => {
    if (simActive && tradSim.completedCycles >= 1 && agenticSim.worktrees.every(wt => wt.status === 'completed')) {
      setSimActive(false);
    }
  }, [simActive, tradSim.completedCycles, agenticSim.worktrees]);

  useEffect(() => {
    if (!isDrillRunning || !activeDrill || intervention) return;
    const tickRate = activeDrill.id === 'swarm-1' ? 1500 : 4000;
    const interval = setInterval(async () => {
      const randomIndex = Math.floor(Math.random() * agents.length);
      const agent = agents[randomIndex];
      const otherContext = agents.filter(a => a.id !== agent.id).map(a => `${a.role}: ${a.logs[a.logs.length-1]}`).join(' | ');
      try {
        const update = await orchestrationService.generateAgentUpdate(
          agent.role, 
          activeDrill.description, 
          agent.logs.slice(-3), 
          otherContext,
          randomIndex // Pass the index so Gemini knows if it's a Heavy Lifter or Swarm
        );
        setAgents(prev => prev.map(a => {
          if (a.id === agent.id) {
            const newLogs = [...a.logs, update.text];
            if (update.needsInput) {
              setIntervention({ agentId: a.id, prompt: update.prompt || "Decision required for next commit." });
              return { ...a, logs: newLogs, status: 'awaiting_input' };
            }
            return { ...a, logs: newLogs, status: 'working' };
          }
          return a;
        }));
      } catch (e) {
        console.error("Agent update failed", e);
      }
    }, tickRate);
    return () => clearInterval(interval);
  }, [isDrillRunning, activeDrill, agents, intervention]);

  const handleInterventionResponse = (response: string) => {
    if (!intervention) return;
    setAgents(prev => prev.map(a => {
      if (a.id === intervention.agentId) {
        return { ...a, logs: [...a.logs, `Human Approval: ${response}`], status: 'working' };
      }
      return a;
    }));
    setStats(prev => ({ ...prev, interventions: prev.interventions + 1 }));
    setIntervention(null);
  };

  const renderHub = () => (
    <div className="max-w-7xl mx-auto py-16 animate-in fade-in duration-700">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-brand-platinum uppercase leading-tight">
          Master the Next <span className="gradient-text">Human Skills</span>
        </h1>
        <p className="text-xl text-brand-platinum/60 max-w-3xl mx-auto leading-relaxed">
          In a world where AI agents produce at infinite scale, the bottleneck is human judgment. 
          Build the cognitive infrastructure to thrive in the age of intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        <div 
          onClick={() => setView(AppView.LANDING)}
          className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-green/20 group-hover:scale-110 transition-transform">
              <span className="text-3xl">⚡</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum group-hover:text-brand-green transition-colors">Parallelism</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              The "Orchestration Gym." Learn to maintain a unified vision while multiple agents bombard you with conflicting logs and critical decisions.
            </p>
          </div>
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
            Launch Skill Trainer <span className="group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </div>

        <div className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-platinum">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-platinum/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-platinum/20">
              <span className="text-3xl">👁️</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum">Verification Fatigue</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              Master high-speed auditing. Train your ability to spot hallucinations and logic errors without succumbing to cognitive exhaustion.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>

        <div className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-platinum">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M11.5 3C7.36 3 4 6.36 4 10.5S7.36 18 11.5 18c1.71 0 3.29-.58 4.55-1.56l4.74 4.74 1.41-1.41-4.74-4.74c.98-1.26 1.56-2.84 1.56-4.55C19 6.36 15.64 3 11.5 3zm0 2C14.54 5 17 7.46 17 10.5S14.54 16 11.5 16 6 13.54 6 10.5 8.46 5 11.5 5z"/></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-platinum/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-platinum/20">
              <span className="text-3xl">🤝</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum">Interview AI Models</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              Learn the art of "Agent Onboarding." Protocols to stress-test and validate an AI's logic and personality before delegating tasks.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>

        <div className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-platinum">
            <svg className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-platinum/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-platinum/20">
              <span className="text-3xl">🛡️</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum">Resist Intellectual Laziness</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              Use AI without switching off your own thinking. Build habits that keep your reasoning, judgment, and creativity sharp.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDrillSelector = () => (
    <div className="max-w-6xl mx-auto py-12 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-12">
        <button onClick={() => setView(AppView.HUB)} className="text-brand-platinum/50 hover:text-brand-green transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-widest">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Skill Hub
        </button>
      </div>
      <div className="mb-12">
        <h1 className="text-5xl font-black mb-6 tracking-tighter text-brand-platinum uppercase">
          Parallelism <span className="gradient-text">Command</span>
        </h1>
        <p className="text-xl text-brand-platinum/60 max-w-2xl leading-relaxed">
          Select a mission to test your ability to manage multiple AI agents simultaneously. High bandwidth is the only way to scale in the agentic era.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {DRILLS.map(drill => (
          <div 
            key={drill.id} 
            className={`glass p-8 rounded-[32px] border-brand-platinum/5 flex flex-col group transition-all ${
              drill.disabled ? 'opacity-60 grayscale cursor-not-allowed' : 'hover:border-brand-green/20'
            }`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                drill.difficulty === 'Extreme' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-brand-green/10 text-brand-green border-brand-green/20'
              }`}>
                {drill.difficulty}
              </div>
              {!drill.disabled && <div className="text-xs font-mono text-brand-platinum/20">{drill.agents.length} AGENTS</div>}
            </div>
            <h3 className={`text-xl font-bold text-brand-platinum mb-4 ${!drill.disabled && 'group-hover:text-brand-green'} transition-colors`}>
              {drill.title}
            </h3>
            <p className="text-xs text-brand-platinum/60 mb-8 leading-relaxed flex-1">
              {drill.description}
            </p>
            {drill.disabled ? (
              <div className="w-full text-center">
                <div className="inline-block px-4 py-2 rounded-full bg-brand-navy text-brand-platinum/40 text-[10px] font-bold uppercase tracking-widest border border-brand-platinum/5">
                  Coming Soon
                </div>
              </div>
            ) : (
              <button 
                onClick={() => startDrill(drill)}
                className="w-full bg-brand-platinum/5 group-hover:bg-brand-green group-hover:text-brand-black transition-all py-4 rounded-xl font-bold uppercase tracking-widest text-[10px]"
              >
                Start Simulation
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderEvolution = () => {
    const codeSnippet = `function authenticateUser(credentials) {
  // Manual authentication logic
  const user = db.findUser(credentials.email);
  if (user && verifyPassword(credentials.password, user.hash)) {
    return generateToken(user.id);
  }
  throw new Error("Invalid credentials");
}

async function createDatabaseSchema() {
  // Manual SQL implementation...
  const schema = await db.executeRaw(\`
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      email VARCHAR(255) UNIQUE...
  \`);
}`;

    const modernPrompt = `ACT as an Agentic Fleet Commander. 
DEPLOY 10 specialized autonomous agents to build "Claude Engineer"—a high-velocity coding agent.
COORDINATE tasks from CLI core to autonomous debugging concurrently.
ENSURE context sharing between Terminal-1 (Core) and Terminal-3 (API).
GOAL: Ship a production-ready agentic tool in < 12 hours.`;

    const isDone = tradSim.completedCycles >= 1 && agenticSim.worktrees.every(wt => wt.status === 'completed');

    return (
      <div className="max-w-7xl mx-auto py-12 px-4 md:px-8 animate-in fade-in duration-700">
        <div className="flex items-center justify-between mb-12">
          <button 
            onClick={() => setView(AppView.LANDING)} 
            className="text-brand-platinum/50 hover:text-brand-green transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Missions
          </button>

          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-brand-platinum/40 uppercase tracking-widest">Infrastructure View</span>
            <button 
              onClick={() => setShowInfrastructure(!showInfrastructure)}
              className={`w-12 h-6 rounded-full transition-all relative ${showInfrastructure ? 'bg-brand-green' : 'bg-brand-platinum/10'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${showInfrastructure ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter text-brand-platinum uppercase">
            The <span className="gradient-text">Cognitive Shift</span>
          </h1>
          <p className="text-brand-platinum/60 text-lg max-w-2xl mx-auto">
            Traditional execution vs. Agentic orchestration.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          
          {/* LEFT PANEL: TRADITIONAL */}
          <div className="glass rounded-[32px] border-brand-platinum/10 p-8 flex flex-col min-h-[600px] relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-brand-platinum uppercase tracking-tighter">Sequential Execution</h2>
                <p className="text-[10px] font-bold text-brand-platinum/40 uppercase tracking-widest mt-1">Manual Context Switching | One Cognitive Thread</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-brand-platinum/30 uppercase tracking-widest">Efficiency</div>
                <div className="text-xl font-mono text-brand-platinum">Linear</div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-12">
              {(!simActive && tradSim.elapsed === 0) ? (
                <div className="glass rounded-xl overflow-hidden border border-brand-platinum/10 shadow-2xl w-full h-full flex flex-col relative">
                  <div className="bg-brand-navy/60 px-4 py-2 flex items-center justify-between border-b border-brand-platinum/5">
                    <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500/50"></div><div className="w-2 h-2 rounded-full bg-yellow-500/50"></div><div className="w-2 h-2 rounded-full bg-brand-green/50"></div></div>
                    <div className="text-[8px] font-mono text-brand-platinum/40 uppercase tracking-widest">auth-engine.ts</div>
                  </div>
                  <div className="p-4 font-mono text-[11px] leading-relaxed overflow-hidden flex-1 opacity-50">
                    <pre className="text-brand-platinum/80 whitespace-pre-wrap">
                      {codeSnippet.split('\n').map((line, i) => (
                        <div key={i} className="flex gap-3"><span className="text-brand-platinum/20 w-3 text-right">{i+1}</span><span>{line}</span></div>
                      ))}
                    </pre>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-navy to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-handwritten text-brand-platinum/90 text-xl rotate-[-2deg] whitespace-nowrap">
                    Manual code as an input
                  </div>
                </div>
              ) : (
                <>
                  {/* Developer Avatar */}
                  <div className="relative">
                    <div className={`w-20 h-20 rounded-full bg-brand-platinum/10 flex items-center justify-center text-3xl border-2 border-brand-platinum/20 ${simActive && !tradSim.isSwitchingBranch ? 'animate-pulse ring-4 ring-brand-platinum/10' : ''}`}>
                      🧑‍💻
                    </div>
                    {tradSim.isSwitchingBranch && (
                      <div className="absolute -top-4 -right-4 bg-brand-navy border border-brand-platinum/20 px-3 py-1 rounded-lg text-[8px] font-bold text-brand-platinum animate-bounce">
                        Switching branch...
                      </div>
                    )}
                  </div>

                  {/* Activity Pipeline */}
                  <div className="w-full max-w-xs space-y-4">
                    {tradSim.steps.map((step, idx) => (
                      <div key={step.id} className={`relative p-4 rounded-xl border transition-all duration-500 ${step.status === 'active' ? 'bg-brand-platinum/10 border-brand-platinum/40 shadow-lg' : step.status === 'completed' ? 'bg-brand-green/5 border-brand-green/20 opacity-50' : 'bg-white/5 border-white/5 opacity-30'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-platinum">{step.label}</span>
                          {step.status === 'active' && <span className="text-[8px] font-mono text-brand-platinum/40">{Math.round(step.progress)}%</span>}
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-platinum transition-all duration-100" style={{ width: `${step.progress}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {showInfrastructure && (
                <div className="w-full p-4 bg-brand-navy/40 rounded-2xl border border-brand-platinum/5 animate-in fade-in zoom-in duration-300">
                  <div className="text-[8px] font-bold text-brand-platinum/30 uppercase mb-2">Infrastructure View</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-brand-platinum/20 rounded-sm"></div>
                    <span className="text-[10px] font-mono text-brand-platinum/60">/project-main (branch: feature-login)</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-brand-platinum/5 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-brand-platinum/30 uppercase tracking-widest">Time Elapsed</div>
                <div className="text-lg font-mono text-brand-platinum">{(tradSim.elapsed * 10).toFixed(1)}h</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-brand-platinum/30 uppercase tracking-widest">Cognitive Load</div>
                <div className="text-lg font-mono text-red-400">High</div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: AGENTIC */}
          <div className="glass rounded-[32px] border-brand-green/20 p-8 flex flex-col min-h-[600px] relative overflow-hidden bg-brand-green/[0.02]">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-brand-platinum uppercase tracking-tighter">Orchestrated Parallelism</h2>
                <p className="text-[10px] font-bold text-brand-green/60 uppercase tracking-widest mt-1">Persistent Agent Swarm | Hybrid Swarm Orchestration</p>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-brand-green/30 uppercase tracking-widest">Efficiency</div>
                <div className="text-xl font-mono text-brand-green">Exponential</div>
              </div>
            </div>

            <div className="flex-1 relative flex flex-col gap-8">
              {(!simActive && agenticSim.elapsed === 0) ? (
                <div className="glass rounded-xl overflow-hidden border border-brand-green/30 shadow-2xl w-full h-full flex flex-col relative">
                  <div className="bg-brand-green/10 px-4 py-2 flex items-center justify-between border-b border-brand-green/20">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-brand-green shadow-glow"></div><span className="text-[9px] font-black text-brand-green uppercase tracking-widest">Fleet Orchestrator</span></div>
                  </div>
                  <div className="p-6 font-mono text-[13px] leading-relaxed italic text-brand-platinum/60 overflow-hidden flex-1">
                    {modernPrompt.split('\n').map((line, i) => (
                      <div key={i} className="mb-1"><span className="text-brand-green mr-2">›</span>{line}</div>
                    ))}
                    <div className="mt-4 animate-pulse text-[10px] text-brand-green/40 uppercase tracking-widest">Awaiting Command...</div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-navy to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-handwritten text-brand-green/90 text-xl rotate-[2deg] whitespace-nowrap">
                    Prompt as an input
                  </div>
                </div>
              ) : (
                <>
                  {/* Worktrees & Agents */}
                  <div className="grid grid-cols-1 gap-3">
                    {agenticSim.worktrees.map((wt) => (
                      <div key={wt.id} className={`p-3 rounded-xl border transition-all duration-500 flex items-center gap-4 ${wt.status === 'completed' ? 'bg-brand-green/10 border-brand-green/30' : 'bg-brand-platinum/5 border-brand-platinum/10'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border border-brand-green/20 ${wt.status === 'working' ? 'animate-pulse bg-brand-green/10' : 'bg-brand-green/20'}`}>
                          🤖
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-brand-platinum">{wt.agent}</span>
                              <button 
                                onClick={() => {
                                  const targets: ('terminal' | 'browser' | 'mobile' | 'desktop')[] = ['terminal', 'browser', 'mobile', 'desktop'];
                                  const currentIdx = targets.indexOf(agenticSim.teleportTarget);
                                  const nextTarget = targets[(currentIdx + 1) % targets.length];
                                  setAgenticSim(prev => ({ ...prev, teleportAgentId: wt.id, teleportTarget: nextTarget }));
                                  setTimeout(() => setAgenticSim(prev => ({ ...prev, teleportAgentId: null })), 2000);
                                }}
                                className="text-[8px] bg-brand-green/10 hover:bg-brand-green/20 text-brand-green px-1 rounded uppercase tracking-tighter transition-all"
                              >
                                Teleport
                              </button>
                            </div>
                            <span className="text-[8px] font-mono text-brand-platinum/40">{wt.branch}</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden relative">
                            <div className="h-full bg-brand-green shadow-glow transition-all duration-100" style={{ width: `${wt.progress}%` }}></div>
                            {agenticSim.teleportAgentId === wt.id && (
                              <div className="absolute inset-0 bg-brand-green/40 animate-pulse flex items-center justify-center">
                                <span className="text-[8px] font-bold text-white uppercase tracking-widest">
                                  Session Teleport: {agenticSim.teleportTarget}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Notifications / Human Actions */}
                  <div className="absolute bottom-0 right-0 w-64 space-y-2 z-20">
                    {agenticSim.notifications.map((n) => (
                      <div key={n.id} className="glass p-3 rounded-xl border-brand-green/30 shadow-2xl animate-in slide-in-from-right-4 duration-300">
                        <div className="text-[8px] font-bold text-brand-green uppercase mb-1">{n.agentName}</div>
                        <div className="text-[10px] text-brand-platinum mb-2">{n.message}</div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setAgenticSim(prev => ({ ...prev, notifications: prev.notifications.filter(x => x.id !== n.id), humanActions: prev.humanActions + 1 }))}
                            className="flex-1 bg-brand-green/20 hover:bg-brand-green/40 text-brand-green text-[8px] font-bold py-1 rounded uppercase tracking-widest transition-all"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => setAgenticSim(prev => ({ ...prev, notifications: prev.notifications.filter(x => x.id !== n.id), humanActions: prev.humanActions + 1 }))}
                            className="flex-1 bg-brand-platinum/10 hover:bg-brand-platinum/20 text-brand-platinum text-[8px] font-bold py-1 rounded uppercase tracking-widest transition-all"
                          >
                            Redirect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Merge Flow */}
                  <div className="mt-8 p-4 border border-brand-green/10 rounded-2xl bg-brand-green/[0.02] relative overflow-hidden">
                    <div className="text-[8px] font-bold text-brand-green/40 uppercase mb-4 tracking-widest">Merge Flow: Parallel Worktrees → MAIN</div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-2">
                        {agenticSim.worktrees.map(wt => (
                          <div key={wt.id} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${wt.status === 'completed' ? 'bg-brand-green shadow-glow' : 'bg-brand-platinum/10'}`}></div>
                            <div className={`h-[1px] w-8 transition-all duration-500 ${wt.status === 'completed' ? 'bg-brand-green' : 'bg-brand-platinum/10'}`}></div>
                          </div>
                        ))}
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border-2 border-brand-green/20 flex items-center justify-center relative">
                          <div className={`absolute inset-0 rounded-full bg-brand-green/10 transition-all duration-1000 ${agenticSim.worktrees.every(wt => wt.status === 'completed') ? 'scale-110 opacity-100' : 'scale-0 opacity-0'}`}></div>
                          <span className="text-[10px] font-black text-brand-green">MAIN</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {showInfrastructure && (
                <div className="mt-auto p-4 bg-brand-navy/40 rounded-2xl border border-brand-green/10 animate-in fade-in zoom-in duration-300">
                  <div className="text-[8px] font-bold text-brand-green/30 uppercase mb-2">Infrastructure View</div>
                  <div className="grid grid-cols-2 gap-2">
                    {agenticSim.worktrees.map(wt => (
                      <div key={wt.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-brand-green/20 rounded-sm"></div>
                        <span className="text-[8px] font-mono text-brand-platinum/40 truncate">{wt.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-brand-platinum/5 grid grid-cols-3 gap-4">
              <div>
                <div className="text-[10px] font-bold text-brand-platinum/30 uppercase tracking-widest">Time Elapsed</div>
                <div className="text-lg font-mono text-brand-green">{(agenticSim.elapsed * 10).toFixed(1)}h</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-brand-platinum/30 uppercase tracking-widest">Sessions</div>
                <div className="text-lg font-mono text-brand-green">10+</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-brand-platinum/30 uppercase tracking-widest">Cognitive Load</div>
                <div className="text-lg font-mono text-brand-green">Moderate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Central Controls */}
        <div className="flex flex-col items-center justify-center gap-6 mt-12 pb-24">
           {!simActive && tradSim.completedCycles === 0 && (
              <button 
                onClick={() => setSimActive(true)} 
                className="bg-brand-green hover:brightness-110 px-24 py-8 rounded-[32px] font-black text-brand-black uppercase tracking-[0.2em] shadow-glow transition-all hover:scale-105 text-2xl group"
              >
                ▶ Run Simulation
                <span className="block text-[10px] opacity-40 group-hover:opacity-100 transition-opacity mt-1">Initialize Production Comparison</span>
              </button>
           )}
           
           {simActive && (
             <button onClick={() => setSimActive(false)} className="bg-white/10 hover:bg-white/20 px-12 py-5 rounded-2xl font-black text-brand-platinum uppercase tracking-widest transition-all">Pause Cycle</button>
           )}
           
           {!simActive && tradSim.completedCycles > 0 && (
             <button onClick={resetSimulations} className="bg-white/10 hover:bg-white/20 px-12 py-5 rounded-2xl font-black text-brand-platinum uppercase tracking-widest transition-all">Reset Comparison</button>
           )}

           {isDone && !simActive && (
              <div className="mt-16 animate-in slide-in-from-bottom-12 duration-1000 w-full">
                <div className="glass p-16 rounded-[60px] border-brand-green/30 text-center relative max-w-4xl mx-auto shadow-2xl shadow-brand-green/10">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-brand-green rounded-full flex items-center justify-center text-4xl shadow-glow">🎉</div>
                  <h3 className="text-5xl font-black text-brand-platinum uppercase tracking-tighter mb-8 leading-none">The Verdict</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left mb-12 border-b border-brand-platinum/10 pb-12">
                     <div className="space-y-3">
                        <div className="text-[10px] font-bold text-brand-platinum/40 uppercase tracking-widest">Traditional</div>
                        <div className="text-4xl font-mono text-brand-platinum">One mind executing tasks.</div>
                        <p className="text-xs text-brand-platinum/40">Sequential, manual context switching.</p>
                     </div>
                     <div className="space-y-3">
                        <div className="text-[10px] font-bold text-brand-green uppercase tracking-widest">Agentic</div>
                        <div className="text-4xl font-mono text-brand-green">One mind orchestrating parallel cognition.</div>
                        <p className="text-xs text-brand-green/60">Parallel sessions, persistent agents.</p>
                     </div>
                  </div>
                  <p className="text-brand-platinum/60 italic leading-relaxed text-lg mb-12">"You aren't coding faster. You are thinking wider. The shift to parallelism is the most significant evolution in human productivity since the assembly line."</p>
                  <button onClick={() => { setView(AppView.TRAINER); setIsDrillRunning(true); }} className="bg-brand-green hover:brightness-110 px-16 py-8 rounded-3xl font-black text-brand-black uppercase tracking-widest shadow-glow transition-all hover:scale-105 text-xl">Enter Command Center</button>
                </div>
              </div>
           )}
        </div>
      </div>
    );
  };

  const renderTrainer = () => (
    <div className="h-[80vh] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between glass p-4 rounded-2xl border-brand-green/20">
        <div className="flex items-center gap-4">
          <div className="bg-brand-green w-3 h-3 rounded-full animate-pulse shadow-lg shadow-brand-green/40"></div>
          <div><h2 className="text-[10px] font-bold uppercase tracking-widest text-brand-platinum/40">Active Fleet Command</h2><h1 className="font-bold text-brand-platinum">{activeDrill?.title}</h1></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right pr-4 border-r border-brand-platinum/5"><div className="text-[9px] font-bold text-brand-platinum/30 uppercase">Cognitive Load</div><div className="text-xs font-mono text-brand-platinum">{activeDrill?.id === 'swarm-1' ? 'MAXIMAL (FLEET)' : 'HIGH'}</div></div>
          <div className="text-center px-4"><div className="text-[10px] font-bold text-brand-platinum/40 uppercase">Fleet Hand-offs</div><div className="font-mono text-brand-green">{stats.interventions}</div></div>
          <button onClick={() => { setView(AppView.LANDING); setIsDrillRunning(false); }} className="bg-brand-platinum/5 hover:bg-brand-platinum/10 text-brand-platinum px-4 py-2 rounded-lg text-xs font-bold transition-all border border-brand-platinum/5 uppercase tracking-widest">End Mission</button>
        </div>
      </div>
      <div className={`flex-1 grid gap-4 overflow-hidden ${activeDrill?.id === 'swarm-1' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'}`}>
        {agents.map(agent => (
          <div key={agent.id} className={`flex flex-col glass rounded-xl border-t-2 overflow-hidden transition-all relative ${agent.status === 'awaiting_input' ? 'ring-2 ring-brand-green animate-pulse bg-brand-green/5 z-10 scale-105' : 'opacity-80 hover:opacity-100'}`} style={{ borderTopColor: agent.color }}>
            <div className="p-2 bg-brand-platinum/5 flex justify-between items-center border-b border-brand-platinum/5"><span className="font-bold text-[10px] uppercase tracking-wider truncate mr-2" style={{ color: agent.color }}>{agent.role}</span><span className="text-[8px] text-brand-platinum/30 font-mono">{agent.status === 'working' ? 'POLLING' : 'LOCKED'}</span></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[9px] scrollbar-hide">{agent.logs.map((log, i) => (<div key={i} className={log.startsWith('Human') ? 'text-brand-green border-l-2 border-brand-green/30 pl-2' : 'text-brand-platinum/40'}>{log}</div>))}<div ref={el => logContainerRef.current[agent.id] = el}></div></div>
            {agent.status === 'awaiting_input' && <div className="absolute inset-x-0 bottom-0 p-2 bg-brand-navy/90 backdrop-blur-sm border-t border-brand-green/20"><div className="text-[8px] font-bold text-brand-green uppercase mb-1">Attention Required</div></div>}
          </div>
        ))}
      </div>
      {intervention && (
        <div className="fixed inset-0 z-[100] bg-brand-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="glass w-full max-w-2xl rounded-[32px] p-10 border-brand-green/30 shadow-2xl shadow-brand-green/10">
            <div className="mb-6 flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest text-brand-green px-3 py-1 bg-brand-green/10 rounded-full border border-brand-green/20">Commander Decision: {agents.find(a => a.id === intervention.agentId)?.role}</span><span className="text-[10px] text-brand-platinum/30 font-mono uppercase">Agent Fleet Active</span></div>
            <h2 className="text-2xl font-bold mb-6 leading-tight text-brand-platinum">{intervention.prompt}</h2>
            <p className="text-xs text-brand-platinum/40 mb-8 italic">Strategy Tip: As a Commander, use the context from your other {agents.length - 1} active instances to guide this directive.</p>
            <div className="flex gap-3"><input autoFocus type="text" placeholder="Give your directive to the agent..." className="flex-1 bg-brand-black/50 border border-brand-platinum/10 rounded-xl px-4 py-3 outline-none focus:border-brand-green transition-all text-brand-platinum" onKeyDown={(e) => { if (e.key === 'Enter') handleInterventionResponse((e.target as HTMLInputElement).value); }} /><button onClick={(e) => { const input = (e.currentTarget.previousSibling as HTMLInputElement).value; handleInterventionResponse(input); }} className="bg-brand-green px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all text-brand-black uppercase tracking-widest text-xs">Send</button></div>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case AppView.HUB: return renderHub();
      case AppView.LANDING: return renderDrillSelector();
      case AppView.TRAINER: return renderTrainer();
      case AppView.EVOLUTION: return renderEvolution();
      default: return renderHub();
    }
  };

  return <Layout activeView={view} setView={setView}>{renderContent()}</Layout>;
};

export default App;