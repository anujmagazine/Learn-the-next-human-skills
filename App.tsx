import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter, ComposedChart } from 'recharts';
import { Play, RotateCcw, User, Users, Laptop, Globe, Smartphone, CheckCircle2, AlertCircle, ArrowRight, Info, Folder, Headset, Layout as LayoutIcon, Search, ShieldAlert, XCircle, Zap, Clock, Brain, Eye, ShieldCheck, ArrowLeft, Compass, Navigation, Target, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppView, AgentStream, DrillScenario } from './types';
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
  const [learnStep, setLearnStep] = useState(0);
  const [isLearnSimRunning, setIsLearnSimRunning] = useState(false);
  const [activeDrill, setActiveDrill] = useState<DrillScenario | null>(null);
  const [agents, setAgents] = useState<AgentStream[]>([]);
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [intervention, setIntervention] = useState<{ agentId: string, prompt: string } | null>(null);
  const [stats, setStats] = useState({ switches: 0, interventions: 0 });
  const logContainerRef = useRef<Record<string, HTMLDivElement | null>>({});

  // New Simulation States
  const [simActive, setSimActive] = useState(false);
  const [simClock, setSimClock] = useState(0);
  
  const [tradSim, setTradSim] = useState({
    elapsed: 0,
    activeStepIndex: 0,
    steps: [
      { id: 'code', label: 'Write Code', status: 'Waiting', progress: 0 },
      { id: 'test', label: 'Run Tests', status: 'Waiting', progress: 0 },
      { id: 'fix', label: 'Fix Errors', status: 'Waiting', progress: 0 },
      { id: 'integrate', label: 'Integrate', status: 'Waiting', progress: 0 },
      { id: 'deploy', label: 'Deploy', status: 'Waiting', progress: 0 },
    ],
    isDone: false
  });

  const [agenticSim, setAgenticSim] = useState({
    elapsed: 0,
    workers: [
      { id: 'feature', name: 'Feature Worker', progress: 0, status: 'typing, checking, and testing...' },
      { id: 'refactor', name: 'Refactor Worker', progress: 0, status: 'typing, checking, and testing...' },
      { id: 'docs', name: 'Docs Worker', progress: 0, status: 'typing, checking, and testing...' },
      { id: 'test', name: 'Test Worker', progress: 0, status: 'typing, checking, and testing...' },
      { id: 'verify', name: 'Verification Worker', progress: 0, status: 'typing, checking, and testing...' },
    ],
    notifications: [] as any[],
    isDone: false,
    activeDevice: 'laptop' as 'laptop' | 'browser' | 'phone'
  });

  // Verification Fatigue Simulation State
  const [verSim, setVerSim] = useState({
    isRunning: false,
    linesReviewed: 0,
    fatigue: 0,
    errors: 0,
    chartData: [] as { x: number, y: number, errorY?: number | null }[],
    isDone: false
  });

  const VERIFICATION_SNIPPETS = [
    "Net margin improved from 8.2% to 14.1% despite significant cost pressures in the supply chain and logistics sectors.",
    "Active users grew from 18,200 to 19,850 representing a 15% growth rate that exceeds the industry average for this quarter.",
    "Customer churn reduced to 2.1% following comprehensive onboarding improvements and a new customer success initiative.",
    "Revenue increased 12% quarter over quarter, driven by enterprise renewals and a strong performance in the APAC region.",
    "Compliance certificate acknowledged by the primary regulator last week, ensuring continued operations in all major territories.",
    "Board review confirmed strategy is 'risk-neutral' despite a 40% projected loss in the high-volatility emerging markets segment.", // Intelligence Error
    "Forecast assumes stable fuel prices amid a volatility spike that has seen prices fluctuate by more than 25% in three days.",
    "Report concludes market is 'saturated' but recommends doubling ad spend to capture a larger share of the existing audience.", // Intelligence Error
    "User engagement metrics show a 400% increase in daily active sessions following the deployment of the new mobile interface.",
    "Database latency reduced by 50ms after index optimization and the implementation of a more efficient caching layer.",
    "Security audit passed with zero critical vulnerabilities found, though some minor patches were recommended for the legacy systems.",
    "Marketing spend optimized for a 4.2x return on ad spend, significantly outperforming the previous campaign's 2.8x benchmark.",
    "New hire onboarding time reduced from 14 days to 9 days, allowing teams to scale more rapidly during the peak season.",
    "Inventory turnover ratio improved to 6.5x annually, reflecting better demand forecasting and streamlined warehouse operations.",
    "Customer satisfaction score reached an all-time high of 4.8/5.0, based on a survey of over 10,000 verified users."
  ];

  useEffect(() => {
    let interval: any;
    if (verSim.isRunning && verSim.linesReviewed < 5000) {
      interval = setInterval(() => {
        setVerSim(prev => {
          const newLines = Math.min(5000, prev.linesReviewed + 25);
          // Non-linear fatigue growth
          const newFatigue = Math.pow(newLines / 5000, 2) * 100;
          
          // Errors start slipping through as fatigue increases
          let newErrors = prev.errors;
          const isError = newFatigue > 20 && Math.random() < (newFatigue / 250);
          if (isError) {
            newErrors += 1;
          }

          const newChartData = [...prev.chartData];
          if (newLines % 125 === 0 || isError) {
            newChartData.push({ 
              x: newLines, 
              y: Math.round(newFatigue),
              errorY: isError ? Math.round(newFatigue) : null
            });
          }

          const isDone = newLines >= 5000;
          return {
            ...prev,
            linesReviewed: newLines,
            fatigue: newFatigue,
            errors: newErrors,
            chartData: newChartData,
            isDone,
            isRunning: !isDone
          };
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [verSim.isRunning, verSim.linesReviewed]);

  const startVerificationSim = () => {
    setVerSim({
      isRunning: true,
      linesReviewed: 0,
      fatigue: 0,
      errors: 0,
      chartData: [{ x: 0, y: 0, errorY: null }],
      isDone: false
    });
  };

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
    setSimClock(0);
    setTradSim({
      elapsed: 0,
      activeStepIndex: 0,
      steps: [
        { id: 'code', label: 'Write Code', status: 'Waiting', progress: 0 },
        { id: 'test', label: 'Run Tests', status: 'Waiting', progress: 0 },
        { id: 'fix', label: 'Fix Errors', status: 'Waiting', progress: 0 },
        { id: 'integrate', label: 'Integrate', status: 'Waiting', progress: 0 },
        { id: 'deploy', label: 'Deploy', status: 'Waiting', progress: 0 },
      ],
      isDone: false
    });
    setAgenticSim({
      elapsed: 0,
      workers: [
        { id: 'feature', name: 'Feature Worker', progress: 0, status: 'typing, checking, and testing...' },
        { id: 'refactor', name: 'Refactor Worker', progress: 0, status: 'typing, checking, and testing...' },
        { id: 'docs', name: 'Docs Worker', progress: 0, status: 'typing, checking, and testing...' },
        { id: 'test', name: 'Test Worker', progress: 0, status: 'typing, checking, and testing...' },
        { id: 'verify', name: 'Verification Worker', progress: 0, status: 'typing, checking, and testing...' },
      ],
      notifications: [],
      isDone: false,
      activeDevice: 'laptop'
    });
  };

  const handleNotificationAction = () => {
    setAgenticSim(prev => ({
      ...prev,
      notifications: prev.notifications.slice(1)
    }));
  };

  const NOTIFICATION_MESSAGES = [
    "says: looks good.",
    "requests review on API integration.",
    "completed unit tests for auth module.",
    "found a minor bug in the refactor, fixed it.",
    "updated documentation for the new feature.",
    "optimized database queries for better performance.",
    "ready to merge the latest changes."
  ];

  useEffect(() => {
    if (!simActive || view !== AppView.EVOLUTION) return;
    
    const interval = setInterval(() => {
      setSimClock(prev => prev + 1);

      // Traditional Simulation Logic (42 hours total)
      setTradSim(prev => {
        if (prev.isDone) return prev;

        let nextActiveIndex = prev.activeStepIndex;
        let nextElapsed = prev.elapsed + 0.01; // Slower time scaling

        const nextSteps = prev.steps.map((step, idx) => {
          if (idx < nextActiveIndex) return { ...step, status: 'Done', progress: 100 };
          if (idx === nextActiveIndex) {
            const nextProgress = step.progress + 0.4; // Slower progress
            if (nextProgress >= 100) {
              return { ...step, status: 'Done', progress: 100 };
            }
            return { ...step, status: 'working...', progress: nextProgress };
          }
          return { ...step, status: 'Waiting', progress: 0 };
        });

        if (nextSteps[nextActiveIndex].status === 'Done') {
          if (nextActiveIndex < nextSteps.length - 1) {
            nextActiveIndex++;
          } else {
            return { ...prev, elapsed: 42, isDone: true, steps: nextSteps, activeStepIndex: nextActiveIndex };
          }
        }

        return {
          ...prev,
          elapsed: nextElapsed > 42 ? 42 : nextElapsed,
          activeStepIndex: nextActiveIndex,
          steps: nextSteps
        };
      });

      // Agentic Simulation Logic (2 hours total)
      setAgenticSim(prev => {
        if (prev.isDone) return prev;

        let nextElapsed = prev.elapsed + 0.005;
        const nextWorkers = prev.workers.map(w => {
          if (w.progress >= 100) return w;
          const nextProgress = w.progress + (Math.random() * 1.2); // Slower progress
          return {
            ...w,
            progress: nextProgress >= 100 ? 100 : nextProgress
          };
        });

        const allDone = nextWorkers.every(w => w.progress >= 100);

        // Random Notifications
        let nextNotifications = [...prev.notifications];
        if (Math.random() > 0.92 && nextNotifications.length < 3 && !allDone) {
          const worker = nextWorkers[Math.floor(Math.random() * nextWorkers.length)];
          if (worker.progress < 100) {
            nextNotifications.push({
              id: Math.random().toString(36).substr(2, 9),
              agentName: worker.name,
              message: NOTIFICATION_MESSAGES[Math.floor(Math.random() * NOTIFICATION_MESSAGES.length)],
              type: 'approval'
            });
          }
        }

        return {
          ...prev,
          elapsed: nextElapsed > 2 ? 2 : nextElapsed,
          workers: nextWorkers,
          notifications: nextNotifications,
          isDone: allDone
        };
      });

    }, 100);

    return () => clearInterval(interval);
  }, [simActive, view]);

  useEffect(() => {
    if (simActive && tradSim.isDone && agenticSim.isDone) {
      setSimActive(false);
    }
  }, [simActive, tradSim.isDone, agenticSim.isDone]);

  // Learn Simulation Progression
  useEffect(() => {
    let timeout: any;
    if (isLearnSimRunning && view === AppView.LEARN) {
      const timings = [5000, 8000, 10000, 15000, 0]; // ms for each step
      const currentTiming = timings[learnStep];
      
      if (currentTiming > 0 && learnStep < timings.length - 1) {
        timeout = setTimeout(() => {
          setLearnStep(prev => prev + 1);
        }, currentTiming);
      } else if (learnStep === timings.length - 1) {
        setIsLearnSimRunning(false);
      }
    }
    return () => clearTimeout(timeout);
  }, [isLearnSimRunning, learnStep, view]);

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
        <button 
          onClick={() => setView(AppView.LEARN)}
          className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full text-left w-full appearance-none"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
            <svg className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A2 2 0 013 15.487V6.513a2 2 0 011.553-1.943L9 2l5.447 2.724A2 2 0 0116 6.669v8.818a2 2 0 01-1.553 1.943L9 20z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 20V2m0 18L3.553 17.276A2 2 0 013 15.487V6.513a2 2 0 011.553-1.943L9 2m0 18l5.447-2.724A2 2 0 0116 15.487V6.513a2 2 0 01-1.553-1.943L9 2" /></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-green/20 group-hover:scale-110 transition-transform">
              <span className="text-3xl">🧭</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum group-hover:text-brand-green transition-colors">Literacy, not training</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              Shift from tool proficiency to strategic judgment. Master the "what" and "why" of AI application, focusing on direction and workflow redesign over simple automation.
            </p>
          </div>
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
            Launch Skill Guide <span className="group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </button>

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

        <div 
          onClick={() => setView(AppView.VERIFICATION)}
          className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-brand-platinum">
            <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-platinum/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-platinum/20 group-hover:scale-110 transition-transform">
              <span className="text-3xl">👁️</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum group-hover:text-brand-green transition-colors">Verification Fatigue</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              Master high-speed auditing. Train your ability to spot hallucinations and logic errors without succumbing to cognitive exhaustion.
            </p>
          </div>
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
            Launch Simulation <span className="group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </div>

        <div className="group relative glass p-10 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-platinum">
            <svg className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-platinum/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-platinum/20">
              <span className="text-3xl">🧠</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum">Thinking in Prompts</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              Thinking in prompts is the habit of framing your thoughts as questions or instructions you could give to an AI.
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
            <svg className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-platinum/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-platinum/20">
              <span className="text-3xl">🧪</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum">Become a CEO</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              Chief Experimentation Officer. In the AI era, the speed of your learning loops determines your competitive advantage.
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
            <svg className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="relative z-10 flex-1">
            <div className="w-16 h-16 bg-brand-platinum/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-platinum/20">
              <span className="text-3xl">🎯</span>
            </div>
            <h2 className="text-3xl font-bold mb-4 text-brand-platinum">Define the What</h2>
            <p className="text-brand-platinum/60 text-lg leading-relaxed mb-8">
              In an AI-driven world where execution is instant, advantage shifts to clearly defining the right problem before asking for solutions.
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

  const renderVerification = () => {
    return (
      <div className="max-w-7xl mx-auto py-12 px-6 animate-in fade-in duration-700 min-h-screen bg-white text-gray-900">
        {/* Header */}
        <div className="flex justify-between items-start mb-12 border-b border-gray-100 pb-8">
          <div>
            <button onClick={() => setView(AppView.HUB)} className="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest mb-4">
              <ArrowRight className="w-3 h-3 rotate-180" />
              Back to Hub
            </button>
            <h1 className="text-4xl font-light tracking-tight text-gray-900 mb-2">
              Verification Fatigue: <span className="font-bold">The Drift of Human Judgment</span>
            </h1>
            <p className="text-gray-500 text-lg">
              As volume rises across the day, cognitive sharpness declines.
            </p>
          </div>
          <button 
            onClick={startVerificationSim}
            className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg"
          >
            {verSim.isRunning || verSim.isDone ? 'Reset' : 'Run workday'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Simulation */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-1">A professional reviewing AI generated lines throughout the day</h2>
              <p className="text-gray-400 text-sm mb-8">The stream below represents continuous AI generated text being reviewed.</p>
              
              <div className="grid grid-cols-2 gap-8 mb-4">
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lines reviewed</div>
                  <div className="text-3xl font-bold tabular-nums">{verSim.linesReviewed}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fatigue level</div>
                  <div className="text-3xl font-bold tabular-nums">{Math.round(verSim.fatigue)}%</div>
                </div>
              </div>
              
              {/* Fatigue Progress Bar */}
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-8">
                <motion.div 
                  className="h-full bg-gray-900"
                  animate={{ width: `${verSim.fatigue}%` }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                />
              </div>

              {/* Scrolling List */}
              <div className="relative h-[800px] border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white to-transparent z-10" />
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent z-10" />
                
                <div className="p-8 space-y-4">
                  <motion.div
                    animate={verSim.isRunning ? { y: [0, -5000] } : { y: 0 }}
                    transition={verSim.isRunning ? { duration: 60, repeat: Infinity, ease: "linear" } : {}}
                    className="space-y-4"
                  >
                    {[...Array(100)].map((_, i) => {
                      const snippet = VERIFICATION_SNIPPETS[i % VERIFICATION_SNIPPETS.length];
                      // Calculate individual blur based on fatigue
                      const blurAmount = Math.max(0, (verSim.fatigue - 20) / 15);
                      return (
                        <div 
                          key={i} 
                          className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm text-sm font-medium transition-all duration-500"
                          style={{ filter: `blur(${blurAmount}px)`, opacity: 1 - (blurAmount / 10) }}
                        >
                          {snippet}
                        </div>
                      );
                    })}
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Metrics */}
          <div className="lg:col-span-5 space-y-12">
            {/* Errors slipping through */}
            <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
              <div className="text-sm font-medium text-gray-500 mb-4">Errors slipping through</div>
              <div className="text-7xl font-bold text-red-500 tabular-nums mb-2">{verSim.errors}</div>
              <p className="text-gray-400 text-xs mb-6">Missed issues increase as fatigue rises</p>
              
              <div className="pt-6 border-t border-gray-50">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Simulated Hallucinations</div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <div className="text-[11px] text-gray-500 leading-relaxed">
                      <span className="font-bold text-gray-700">Reasoning Flaws:</span> AI claiming a strategy is "risk-neutral" while citing data that indicates extreme volatility.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <div className="text-[11px] text-gray-500 leading-relaxed">
                      <span className="font-bold text-gray-700">Statistical Drift:</span> Subtle mismatches between percentage growth and raw numbers.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                    <div className="text-[11px] text-gray-500 leading-relaxed">
                      <span className="font-bold text-gray-700">Cognitive Blindness:</span> As fatigue peaks, the brain begins to "auto-complete" text, missing obvious flaws.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm">
              <div className="text-sm font-bold mb-1">Fatigue measured against volume</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-8">X axis: AI lines reviewed - Y axis: fatigue percentage</div>
              
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={verSim.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="x" 
                      type="number"
                      domain={[0, 5000]}
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      hide
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="y" 
                      stroke="#111827" 
                      strokeWidth={3} 
                      dot={false} 
                      animationDuration={0}
                      isAnimationActive={false}
                    />
                    <Scatter 
                      name="Errors"
                      dataKey="errorY" 
                      fill="#ef4444" 
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex justify-between mt-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>0</span>
                <span>1000</span>
                <span>2000</span>
                <span>3000</span>
                <span>4000</span>
                <span>5000</span>
              </div>
              <div className="text-center mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lines Reviewed</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
    const formatSimClock = (ticks: number) => {
      const totalSeconds = Math.floor(ticks / 10);
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <div className="max-w-[1400px] mx-auto py-8 px-6 animate-in fade-in duration-700 bg-[#F8F9FA] min-h-screen text-[#333]">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div className="flex items-start gap-6">
            <button 
              onClick={() => setView(AppView.HUB)}
              className="mt-1 p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
              title="Back to Hub"
            >
              <ArrowRight className="w-6 h-6 rotate-180" />
            </button>
            <div>
              <h1 className="text-4xl font-bold mb-2 tracking-tight">One Brain vs Many Brains</h1>
              <p className="text-gray-500 text-lg">Goal: Show how software gets built in two different ways.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSimActive(!simActive)}
              className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-2.5 rounded-full font-bold shadow-sm hover:bg-gray-50 transition-all"
            >
              {simActive ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              {simActive ? 'Pause' : 'Start Simulation'}
            </button>
            <button 
              onClick={resetSimulations}
              className="flex items-center gap-2 bg-white border border-gray-200 px-6 py-2.5 rounded-full font-bold shadow-sm hover:bg-gray-50 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <div className="text-gray-400 font-mono text-sm">
              Sim clock: {formatSimClock(simClock)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          
          {/* LEFT PANEL: TRADITIONAL */}
          <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Traditional Way</h2>
                <p className="text-gray-500 text-sm">One Brain. One Task at a Time.</p>
              </div>
              <div className="flex items-center gap-2 text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <User className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">One developer</span>
              </div>
            </div>

            {/* Metrics */}
            <div className={`mb-8 p-6 rounded-[24px] border transition-all duration-500 grid grid-cols-4 gap-4 ${tradSim.isDone ? 'bg-green-50 border-green-200 shadow-sm' : 'border-transparent border-b border-gray-100 pb-8 px-0'}`}>
              <div className="text-center">
                <div className={`text-[10px] font-bold uppercase mb-1 transition-colors duration-500 ${tradSim.isDone ? 'text-green-700' : 'text-gray-400'}`}>Active Tasks</div>
                <div className={`text-lg font-bold transition-colors duration-500 ${tradSim.isDone ? 'text-green-600' : 'text-gray-900'}`}>{simActive && !tradSim.isDone ? 1 : 0}</div>
              </div>
              <div className="text-center">
                <div className={`text-[10px] font-bold uppercase mb-1 transition-colors duration-500 ${tradSim.isDone ? 'text-green-700' : 'text-gray-400'}`}>Project Folders</div>
                <div className={`text-lg font-bold transition-colors duration-500 ${tradSim.isDone ? 'text-green-600' : 'text-gray-900'}`}>1</div>
              </div>
              <div className="text-center">
                <div className={`text-[10px] font-bold uppercase mb-1 transition-colors duration-500 ${tradSim.isDone ? 'text-green-700' : 'text-gray-400'}`}>Human Effort</div>
                <div className={`text-lg font-bold transition-colors duration-500 ${tradSim.isDone ? 'text-green-600' : 'text-orange-500'}`}>High</div>
              </div>
              <div className="text-center">
                <div className={`text-[10px] font-bold uppercase mb-1 transition-colors duration-500 ${tradSim.isDone ? 'text-green-700' : 'text-gray-400'}`}>Time</div>
                <div className={`text-lg font-bold transition-colors duration-500 ${tradSim.isDone ? 'text-green-600' : 'text-gray-900'}`}>{tradSim.elapsed.toFixed(1)} hrs</div>
              </div>
            </div>

            <div className="space-y-8 flex-1">
              {/* Project Folder */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 text-gray-400">
                    <Folder className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Project folder</div>
                    <div className="text-xs text-gray-500">Single workspace</div>
                  </div>
                </div>
                <div className="mt-4 text-[10px] text-gray-400 uppercase font-bold tracking-widest">Only one step runs at a time.</div>
              </div>

              {/* Step List */}
              <div className="space-y-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Step list</div>
                <div className="space-y-3">
                  {tradSim.steps.map((step, idx) => {
                    const isActive = idx === tradSim.activeStepIndex && simActive;
                    return (
                      <motion.div 
                        key={step.id} 
                        animate={isActive ? { 
                          backgroundColor: ['rgba(239, 246, 255, 1)', 'rgba(191, 219, 254, 1)', 'rgba(239, 246, 255, 1)'],
                          borderColor: ['rgba(191, 219, 254, 1)', 'rgba(96, 165, 250, 1)', 'rgba(191, 219, 254, 1)'],
                          scale: [1, 1.02, 1]
                        } : {}}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isActive ? 'bg-blue-50 border-blue-200 shadow-md' : 'bg-white border-gray-100'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step.status === 'Done' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            {step.status === 'Done' ? <CheckCircle2 className="w-5 h-5" /> : <ArrowRight className="w-4 h-4" />}
                          </div>
                          <span className={`font-bold ${step.status === 'Done' ? 'text-gray-400' : 'text-gray-900'}`}>{step.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive && <span className="text-[10px] text-blue-600 font-black animate-pulse tracking-widest">WORKING...</span>}
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{step.status}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">Result</div>
              <div className="text-lg font-bold">
                {!simActive && tradSim.elapsed === 0 ? 'Press Start to run.' : 
                 tradSim.isDone ? `Finished in 42 hours` : 'Working...'}
              </div>
              <div className="mt-4 text-[10px] text-gray-400 uppercase font-bold tracking-widest">Everything happens in sequence.</div>
            </div>
          </div>

          {/* RIGHT PANEL: AGENTIC */}
          <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-sm flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Agentic Way</h2>
                <p className="text-gray-500 text-sm">One Brain. Many Workers.</p>
              </div>
              <div className="flex items-center gap-2 text-blue-500 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                <Headset className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Orchestrator</span>
              </div>
            </div>

            {/* Metrics */}
            <div className={`mb-8 p-6 rounded-[24px] border transition-all duration-500 grid grid-cols-4 gap-4 ${agenticSim.isDone ? 'bg-green-50 border-green-200 shadow-sm' : 'border-transparent border-b border-gray-100 pb-8 px-0'}`}>
              <div className="text-center">
                <div className={`text-[10px] font-bold uppercase mb-1 transition-colors duration-500 ${agenticSim.isDone ? 'text-green-700' : 'text-gray-400'}`}>Active Workers</div>
                <div className={`text-lg font-bold transition-colors duration-500 ${agenticSim.isDone ? 'text-green-600' : 'text-gray-900'}`}>10+</div>
              </div>
              <div className="text-center">
                <div className={`text-[10px] font-bold uppercase mb-1 transition-colors duration-500 ${agenticSim.isDone ? 'text-green-700' : 'text-gray-400'}`}>Workspaces</div>
                <div className={`text-lg font-bold transition-colors duration-500 ${agenticSim.isDone ? 'text-green-600' : 'text-gray-900'}`}>5</div>
              </div>
              <div className="text-center">
                <div className={`text-[10px] font-bold uppercase mb-1 transition-colors duration-500 ${agenticSim.isDone ? 'text-green-700' : 'text-gray-400'}`}>Human Role</div>
                <div className={`text-lg font-bold transition-colors duration-500 ${agenticSim.isDone ? 'text-green-600' : 'text-blue-500'}`}>Supervisor</div>
              </div>
              <div className="text-center">
                <div className={`text-[10px] font-bold uppercase mb-1 transition-colors duration-500 ${agenticSim.isDone ? 'text-green-700' : 'text-gray-400'}`}>Time</div>
                <div className={`text-lg font-bold transition-colors duration-500 ${agenticSim.isDone ? 'text-green-600' : 'text-gray-900'}`}>{agenticSim.elapsed.toFixed(1)} hrs</div>
              </div>
            </div>

            <div className="space-y-8 flex-1">
              {/* Live View */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold text-gray-900">Live view</div>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button className={`px-3 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all ${agenticSim.activeDevice === 'laptop' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`} onClick={() => setAgenticSim(p => ({...p, activeDevice: 'laptop'}))}>
                      <Laptop className="w-3 h-3" /> Laptop
                    </button>
                    <button className={`px-3 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all ${agenticSim.activeDevice === 'browser' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`} onClick={() => setAgenticSim(p => ({...p, activeDevice: 'browser'}))}>
                      <Globe className="w-3 h-3" /> Browser
                    </button>
                    <button className={`px-3 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 transition-all ${agenticSim.activeDevice === 'phone' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`} onClick={() => setAgenticSim(p => ({...p, activeDevice: 'phone'}))}>
                      <Smartphone className="w-3 h-3" /> Phone
                    </button>
                  </div>
                </div>

                <div className="relative min-h-[400px] bg-gray-50 rounded-3xl p-8 border border-gray-100 flex items-center justify-center">
                  {/* Orchestrator */}
                  <div className="z-10 bg-white p-6 rounded-2xl border border-gray-200 shadow-xl text-center w-48">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-500 border border-blue-100">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-gray-900 mb-1">Orchestrator</div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-4">Guides the workers</div>
                    <div className="text-[10px] text-gray-500">
                      Human role:<br/>
                      <span className="text-blue-500 font-bold uppercase tracking-widest">Supervisor</span>
                    </div>
                  </div>

                  {/* Workers */}
                  {agenticSim.workers.map((worker, idx) => {
                    const angles = [0, 72, 144, 216, 288];
                    const baseAngle = angles[idx] * (Math.PI / 180);
                    
                    // 7 rounds = 14 * Math.PI. Tying to progress ensures it stops at exactly 7 rounds.
                    // Because we slowed down progress, this now happens at a smooth, visible speed.
                    const totalRotation = (worker.progress / 100) * (14 * Math.PI);
                    const angle = baseAngle + totalRotation;
                    
                    const isWorking = worker.progress < 100 && simActive;
                    const radius = 160 + (isWorking ? Math.sin(simClock * 0.05) * 10 : 0);
                    
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                      <motion.div 
                        key={worker.id}
                        initial={false}
                        animate={{ x, y }}
                        transition={{ type: 'spring', damping: 30, stiffness: 60 }}
                        className="absolute bg-white p-4 rounded-2xl border border-gray-100 shadow-md w-44 z-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-100">
                              <Folder className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-900 truncate w-24">{worker.name}</span>
                          </div>
                          <span className="text-[10px] font-mono text-blue-500 font-bold">{Math.round(worker.progress)}%</span>
                        </div>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${worker.progress}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-[8px] text-gray-400 font-bold uppercase">
                            <Users className="w-2 h-2" /> AI worker
                          </div>
                          <div className="flex items-center gap-1 text-[8px] text-gray-400 font-bold uppercase">
                            <Laptop className="w-2 h-2" /> Laptop
                          </div>
                        </div>
                        <div className="mt-1 text-[8px] text-gray-400 italic truncate">{worker.status}</div>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="flex justify-between px-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  <span>Each worker gets its own workspace.</span>
                  <span>Workers run continuously.</span>
                </div>
              </div>

              {/* Merge Moment */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex items-center gap-6 relative overflow-hidden">
                <div className="flex-1 relative z-10">
                  <div className="text-sm font-bold text-gray-900 mb-1">Merge moment</div>
                  <div className="text-xs text-gray-500 mb-2">Workers send results into MAIN PROJECT.</div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Multiple arrows merge at once.</div>
                </div>
                
                {/* Visual Arrows */}
                <div className="absolute inset-0 pointer-events-none opacity-10">
                  <svg className="w-full h-full" viewBox="0 0 400 100">
                    <path d="M50,20 Q150,50 250,50" stroke="currentColor" strokeWidth="2" fill="none" className="text-blue-500" />
                    <path d="M50,50 Q150,50 250,50" stroke="currentColor" strokeWidth="2" fill="none" className="text-blue-500" />
                    <path d="M50,80 Q150,50 250,50" stroke="currentColor" strokeWidth="2" fill="none" className="text-blue-500" />
                  </svg>
                </div>

                <div className="w-24 h-24 bg-white rounded-2xl border-2 border-dashed border-blue-200 flex items-center justify-center text-center p-2 relative z-10">
                  <div className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">MAIN PROJECT</div>
                </div>
              </div>

              {/* Smart Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Smart notifications
                </div>
                <div className="min-h-[100px] bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center justify-center text-center">
                  <AnimatePresence mode="wait">
                    {agenticSim.notifications.length > 0 ? (
                      <motion.div 
                        key={agenticSim.notifications[0].id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-gray-900">Smart notification</div>
                            <div className="text-sm text-gray-600 font-medium">
                              <span className="font-bold">{agenticSim.notifications[0].agentName}</span> {agenticSim.notifications[0].message}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            onClick={handleNotificationAction}
                            className="flex-1 bg-white border border-gray-200 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={handleNotificationAction}
                            className="flex-1 bg-white border border-gray-200 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                          >
                            Adjust
                          </button>
                        </div>
                        <div className="mt-3 text-left text-[10px] text-gray-400 italic">Human guides.</div>
                      </motion.div>
                    ) : (
                      <div className="text-xs text-gray-400 font-medium">Notifications will appear while workers run.</div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="text-xs font-bold text-gray-400 uppercase mb-2">Result</div>
              <div className="text-lg font-bold">
                {agenticSim.isDone ? 'Finished in 2 hours' : 'Working...'}
              </div>
              <div className="text-[10px] text-gray-500 font-medium mb-4">Human mostly supervised</div>
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Work happened in parallel.</div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
              <Info className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Recent guidance</div>
                <div className="text-[10px] text-gray-500">Notifications will show up during the run.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Final Comparison */}
        <AnimatePresence>
          {tradSim.isDone && agenticSim.isDone && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[40px] border border-gray-100 p-12 shadow-sm"
            >
              <div className="flex justify-between items-end mb-10">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Final Comparison</h2>
                  <p className="text-gray-500">A simple way to remember the difference.</p>
                </div>
                <div className="flex gap-3">
                  <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Traditional: Done</div>
                  <div className="bg-blue-50 px-4 py-2 rounded-full border border-blue-100 text-[10px] font-bold text-blue-500 uppercase tracking-widest">Agentic: Done</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                  <div className="text-lg font-bold text-gray-900 mb-1">Traditional Way</div>
                  <div className="text-sm text-gray-500 mb-6">One brain doing everything.</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">One-Line Lesson for Your App</div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 font-bold text-gray-900">
                    Traditional = <span className="text-gray-400">Doing the work</span>
                  </div>
                </div>
                <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100">
                  <div className="text-lg font-bold text-gray-900 mb-1">Agentic Way</div>
                  <div className="text-sm text-gray-500 mb-6">One brain directing many workers.</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">One-Line Lesson for Your App</div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 font-bold text-gray-900">
                    Agentic = <span className="text-blue-500">Directing the work</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-[10px] text-gray-400 font-medium mb-8">
                Tip: If you want fewer popups, hit Pause and Resume after one notification.
              </div>

              <div className="text-center">
                <button 
                  onClick={() => setView(AppView.HUB)}
                  className="bg-blue-500 text-white px-12 py-4 rounded-full font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-600 transition-all hover:scale-105"
                >
                  Finish & Return to Hub
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

  const renderLearn = () => {
    const steps = [
      {
        id: 'intro',
        content: (
          <div className="text-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-3 py-1 rounded-full bg-brand-green/10 text-brand-green text-[10px] font-bold uppercase tracking-widest mb-6 border border-brand-green/20"
            >
              AI & BEYOND
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-7xl font-black text-brand-platinum mb-8 leading-[0.85] tracking-tighter"
            >
              Training is the <span className="text-brand-platinum/20 italic">starting line.</span><br />
              Literacy is the <span className="text-brand-green">whole race.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-brand-platinum/60 max-w-2xl mx-auto leading-relaxed mb-12"
            >
              AI Literacy is tool proficiency plus the judgment to know what's worth building.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              onClick={() => {
                setLearnStep(1);
                setIsLearnSimRunning(true);
              }}
              className="px-8 py-4 bg-brand-green text-brand-black font-black uppercase tracking-widest text-sm rounded-full hover:scale-105 transition-transform shadow-lg shadow-brand-green/20"
            >
              Start Simulation
            </motion.button>
          </div>
        )
      },
      {
        id: 'act-one',
        content: (
          <div className="w-full max-w-4xl">
            <div className="flex flex-col items-center text-center mb-16">
              <motion.div 
                initial={{ opacity: 0, letterSpacing: '0.1em' }}
                animate={{ opacity: 1, letterSpacing: '0.3em' }}
                className="text-[10px] font-black text-brand-platinum/20 uppercase mb-4"
              >
                ACT ONE
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-brand-platinum mb-4"
              >
                Training is the <span className="text-brand-green">GPS.</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-brand-platinum/40 max-w-lg"
              >
                Essential. You need it. But it's just the engine, not the journey.
              </motion.p>
            </div>

            <div className="glass rounded-[40px] p-12 border-brand-platinum/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-brand-platinum">
                <Navigation className="w-32 h-32" />
              </div>
              <div className="space-y-4 relative z-10">
                {[
                  { step: '01', text: 'Open ChatGPT', icon: '🌐' },
                  { step: '02', text: 'Paste this prompt', icon: '📋' },
                  { step: '03', text: 'Click "Generate"', icon: '⚡' },
                  { step: '04', text: 'Copy output. Done.', icon: '✅' },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    className="flex items-center gap-6 p-5 rounded-2xl bg-brand-platinum/5 border border-brand-platinum/5"
                  >
                    <span className="font-mono text-[10px] text-brand-platinum/20">{item.step}</span>
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-brand-platinum font-bold text-lg">{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-12 pt-8 border-t border-brand-platinum/5 text-center"
              >
                <p className="text-brand-platinum/40 text-sm italic mb-4">"Fast. Efficient. Necessary. But not sufficient."</p>
                <div className="text-brand-green font-bold uppercase tracking-widest text-xs">You can drive. But who decides where to go?</div>
              </motion.div>
            </div>
            
            <div className="mt-12 flex justify-center h-8">
              {/* Manual navigation removed for simulation feel */}
            </div>
          </div>
        )
      },
      {
        id: 'act-two',
        content: (
          <div className="w-full max-w-5xl">
            <div className="flex flex-col items-center text-center mb-16">
              <motion.div 
                initial={{ opacity: 0, letterSpacing: '0.1em' }}
                animate={{ opacity: 1, letterSpacing: '0.3em' }}
                className="text-[10px] font-black text-brand-platinum/20 uppercase mb-4"
              >
                ACT TWO
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-brand-platinum mb-4"
              >
                Literacy is <span className="text-brand-green">GPS + Compass.</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-brand-platinum/40 max-w-lg"
              >
                You know the tools and you know where North is.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass aspect-square rounded-[60px] border-brand-green/20 flex items-center justify-center relative overflow-hidden bg-brand-green/5"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-80 h-80 rounded-full border border-brand-green/10 border-dashed animate-spin-slow"></div>
                  <div className="absolute w-64 h-64 rounded-full border border-brand-green/20 border-dashed animate-spin-slow-reverse"></div>
                </div>
                <div className="relative z-10 text-center">
                  <Compass className="w-40 h-40 text-brand-green mb-8 mx-auto animate-pulse" />
                  <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-[10px] font-black text-brand-green/60 uppercase tracking-[0.2em]">
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }}>WHY</motion.span>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}>WHAT IF</motion.span>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }}>RISK</motion.span>
                    <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2, delay: 1.5 }}>VALUE</motion.span>
                  </div>
                </div>
              </motion.div>
              <div className="space-y-6">
                {[
                  "Is this the right problem to solve?",
                  "What happens if we're wrong?",
                  "Should AI even be used here?"
                ].map((q, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + (i * 0.2) }}
                    className="glass p-8 rounded-3xl border-brand-platinum/10 flex items-center gap-6 group hover:border-brand-green/30 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-brand-green/10 flex items-center justify-center border border-brand-green/20">
                      <HelpCircle className="w-6 h-6 text-brand-green" />
                    </div>
                    <span className="text-brand-platinum text-xl font-medium italic leading-tight">"{q}"</span>
                  </motion.div>
                ))}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="mt-8 p-8 bg-brand-platinum/5 rounded-3xl border border-brand-platinum/10"
                >
                  <p className="text-brand-platinum/60 text-lg leading-relaxed text-center">
                    Same tools. But now you also choose the destination.
                  </p>
                </motion.div>
              </div>
            </div>
            
            <div className="mt-16 flex justify-center h-8">
              {/* Manual navigation removed for simulation feel */}
            </div>
          </div>
        )
      },
      {
        id: 'act-three',
        content: (
          <div className="w-full max-w-6xl">
            <div className="flex flex-col items-center text-center mb-16">
              <motion.div 
                initial={{ opacity: 0, letterSpacing: '0.1em' }}
                animate={{ opacity: 1, letterSpacing: '0.3em' }}
                className="text-[10px] font-black text-brand-platinum/20 uppercase mb-4"
              >
                ACT THREE
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-brand-platinum mb-4"
              >
                Same Monday morning.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-brand-platinum/40 max-w-lg"
              >
                Same tools. Two different mindsets.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 px-6 py-3 bg-brand-platinum/5 rounded-full border border-brand-platinum/10 text-sm text-brand-platinum/60 italic"
              >
                "The CEO wants a competitive analysis by Thursday."
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Only Trained */}
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="glass rounded-[40px] border-brand-platinum/5 overflow-hidden flex flex-col"
              >
                <div className="bg-brand-platinum/5 p-8 border-b border-brand-platinum/5">
                  <div className="text-[10px] font-black text-brand-platinum/30 uppercase tracking-widest mb-2">MINDSET A</div>
                  <h3 className="text-2xl font-bold text-brand-platinum/40">Only Trained</h3>
                </div>
                <div className="p-10 space-y-8 flex-1">
                  {[
                    { step: '01', text: 'Opens ChatGPT. Pastes the email.' },
                    { step: '02', text: 'Prompts: "Generate a competitive analysis."' },
                    { step: '03', text: 'Gets 1200 words. Formats. Sends Tuesday.' },
                    { step: '04', text: 'CEO: "This is generic. Anyone could\'ve Googled this."' },
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 + (i * 0.2) }}
                      className="flex gap-6"
                    >
                      <span className="font-mono text-xs text-brand-platinum/20 mt-1">{item.step}</span>
                      <p className="text-brand-platinum/40 text-lg leading-snug">{item.text}</p>
                    </motion.div>
                  ))}
                </div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="p-10 bg-brand-platinum/5 border-t border-brand-platinum/5"
                >
                  <div className="text-[10px] font-bold text-brand-platinum/20 uppercase mb-3 tracking-widest">RESULT</div>
                  <p className="text-brand-platinum/60 font-bold text-xl leading-tight">Fast delivery. Zero strategic value. Replaced next quarter.</p>
                </motion.div>
              </motion.div>

              {/* AI Literate */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="glass rounded-[40px] border-brand-green/20 overflow-hidden bg-brand-green/5 flex flex-col"
              >
                <div className="bg-brand-green/10 p-8 border-b border-brand-green/10">
                  <div className="text-[10px] font-black text-brand-green uppercase tracking-widest mb-2">MINDSET B</div>
                  <h3 className="text-2xl font-bold text-brand-platinum">AI Literate</h3>
                </div>
                <div className="p-10 space-y-8 flex-1">
                  {[
                    { step: '01', text: 'Pauses. "What decision does this need to inform?"' },
                    { step: '02', text: 'Calls CEO\'s office. Learns it\'s about an acquisition.' },
                    { step: '03', text: 'Uses the same AI tools - to pull filings, map risk, model scenarios.' },
                    { step: '04', text: 'Delivers a decision-ready brief. Cuts pulled into the deal room.' },
                  ].map((item, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.2 + (i * 0.2) }}
                      className="flex gap-6"
                    >
                      <span className="font-mono text-xs text-brand-green/40 mt-1">{item.step}</span>
                      <p className="text-brand-platinum text-lg font-bold leading-snug">{item.text}</p>
                    </motion.div>
                  ))}
                </div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2 }}
                  className="p-10 bg-brand-green/10 border-t border-brand-green/10"
                >
                  <div className="text-[10px] font-bold text-brand-green uppercase mb-3 tracking-widest">RESULT</div>
                  <p className="text-brand-platinum font-black text-xl leading-tight">Same tools. Better question. Seat at the table.</p>
                </motion.div>
              </motion.div>
            </div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3 }}
              className="mt-16 text-center text-brand-platinum/40 font-bold uppercase tracking-[0.3em] text-sm"
            >
              Both used the same tools. <span className="text-brand-green">Only one changed the outcome.</span>
            </motion.div>
            
            <div className="mt-16 flex justify-center h-8">
              {/* Manual navigation removed for simulation feel */}
            </div>
          </div>
        )
      },
      {
        id: 'bottom-line',
        content: (
          <div className="w-full max-w-5xl">
            <div className="flex flex-col items-center text-center mb-16">
              <motion.div 
                initial={{ opacity: 0, letterSpacing: '0.1em' }}
                animate={{ opacity: 1, letterSpacing: '0.3em' }}
                className="text-[10px] font-black text-brand-platinum/20 uppercase mb-4"
              >
                THE BOTTOM LINE
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-12 rounded-[50px] border-brand-platinum/5"
              >
                <h3 className="text-3xl font-bold text-brand-platinum/40 mb-8">Training alone</h3>
                <ul className="space-y-5 text-brand-platinum/40 text-lg">
                  <li className="flex items-start gap-3">
                    <span className="text-brand-platinum/20 mt-1.5">•</span>
                    <span>Builds operators who execute faster.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-brand-platinum/20 mt-1.5">•</span>
                    <span>Tool-specific. Task-oriented.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-brand-platinum/20 mt-1.5">•</span>
                    <span>Necessary foundation.</span>
                  </li>
                  <li className="pt-8 text-brand-platinum/20 font-black uppercase tracking-[0.2em] text-xs">
                    Answers: "How do I do this?"
                  </li>
                </ul>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass p-12 rounded-[50px] border-brand-green/30 bg-brand-green/5"
              >
                <h3 className="text-3xl font-bold text-brand-platinum mb-8">Literacy</h3>
                <ul className="space-y-5 text-brand-platinum text-lg">
                  <li className="flex items-start gap-3">
                    <span className="text-brand-green mt-1.5">•</span>
                    <span className="font-bold">Builds owners with tool skills plus judgment.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-brand-green mt-1.5">•</span>
                    <span className="font-bold">Strategic. Durable. Tool-agnostic thinking.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-brand-green mt-1.5">•</span>
                    <span className="font-bold">The competitive advantage.</span>
                  </li>
                  <li className="pt-8 text-brand-green font-black uppercase tracking-[0.2em] text-xs">
                    Also answers: "What should we be doing - and why?"
                  </li>
                </ul>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center py-24 border-t border-brand-platinum/5"
            >
              <h2 className="text-5xl font-black text-brand-platinum mb-12 leading-[1.1] max-w-4xl mx-auto tracking-tighter">
                "Training teaches you to <span className="text-brand-platinum/20 italic">play the instrument.</span><br />
                Literacy teaches you to <span className="text-brand-green">play it and write the music.</span>"
              </h2>
              <div className="text-[10px] font-black text-brand-platinum/20 uppercase tracking-[0.8em]">
                AI & BEYOND — BUILDING AI LITERATE LEADERS
              </div>
              
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={() => {
                  setView(AppView.HUB);
                  setLearnStep(0);
                }}
                className="mt-20 px-10 py-4 border border-brand-platinum/20 rounded-full text-brand-platinum/40 hover:text-brand-platinum hover:border-brand-platinum transition-all font-bold uppercase text-[10px] tracking-widest"
              >
                Finish Guide
              </motion.button>
            </motion.div>
          </div>
        )
      }
    ];

    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
        {/* Navigation Controls */}
        <div className="fixed top-24 left-8 z-50 flex flex-col gap-4">
          <button 
            onClick={() => {
              setView(AppView.HUB);
              setLearnStep(0);
              setIsLearnSimRunning(false);
            }}
            className="group flex items-center gap-2 text-brand-platinum/40 hover:text-brand-platinum transition-colors font-bold uppercase text-[10px] tracking-widest"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            Exit Simulation
          </button>
          
          {isLearnSimRunning ? (
            <button 
              onClick={() => setIsLearnSimRunning(false)}
              className="group flex items-center gap-2 text-brand-green hover:text-brand-green/80 transition-colors font-bold uppercase text-[10px] tracking-widest"
            >
              <RotateCcw className="w-3 h-3" />
              Pause Simulation
            </button>
          ) : learnStep > 0 && learnStep < steps.length - 1 && (
            <button 
              onClick={() => setIsLearnSimRunning(true)}
              className="group flex items-center gap-2 text-brand-green hover:text-brand-green/80 transition-colors font-bold uppercase text-[10px] tracking-widest"
            >
              <Play className="w-3 h-3 fill-current" />
              Resume Simulation
            </button>
          )}
          
          {isLearnSimRunning && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-green/10 border border-brand-green/20">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
              <span className="text-[8px] font-bold text-brand-green uppercase tracking-widest">Auto-Playing</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="fixed top-24 left-1/2 -translate-x-1/2 flex gap-2 z-50">
          {steps.map((_, i) => (
            <div 
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === learnStep ? 'w-8 bg-brand-green' : 'w-2 bg-brand-platinum/10'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={learnStep}
            initial={{ opacity: 0, x: 100, filter: 'blur(10px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -100, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
            className="w-full flex items-center justify-center py-20 px-6"
          >
            {steps[learnStep].content}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  };

  const renderContent = () => {
    switch (view) {
      case AppView.HUB: return renderHub();
      case AppView.LANDING: return renderDrillSelector();
      case AppView.TRAINER: return renderTrainer();
      case AppView.EVOLUTION: return renderEvolution();
      case AppView.VERIFICATION: return renderVerification();
      case AppView.LEARN: return renderLearn();
      default: return renderHub();
    }
  };

  return <Layout activeView={view} setView={setView}>{renderContent()}</Layout>;
};

export default App;