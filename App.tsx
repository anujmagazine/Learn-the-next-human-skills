import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter, ComposedChart } from 'recharts';
import { Play, RotateCcw, User, Users, Laptop, Globe, Smartphone, CheckCircle2, AlertCircle, ArrowRight, Info, Folder, Headset, Layout as LayoutIcon, Search, ShieldAlert, XCircle, Zap, Clock, Brain, Eye, ShieldCheck, ArrowLeft, Compass, Navigation, Target, HelpCircle, BookOpen, Layers, Sparkles, FlaskConical, MessageSquare, Shield, Workflow, GraduationCap, Plus } from 'lucide-react';
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

  // Taste Simulation State
  const [tasteTab, setTasteTab] = useState(1);
  const [tasteContextAdded, setTasteContextAdded] = useState(false);
  const [noTastePromptShown, setNoTastePromptShown] = useState(false);
  const [defineSimStep, setDefineSimStep] = useState(0);
  const [isDefineSimRunning, setIsDefineSimRunning] = useState(false);

  // Verification Instinct Simulation State
  const [instinctSim, setInstinctSim] = useState({
    isRunning: false,
    score: 0,
    timeSaved: 0,
    verificationTax: 0,
    hallucinationHits: [] as any[],
    outputs: [] as any[],
    isDone: false,
    currentStep: 'triage' as 'triage' | 'results'
  });

  // Verification Fatigue Simulation State
  const [fatigueSim, setFatigueSim] = useState({
    isRunning: false,
    energy: 100,
    accuracy: 100,
    tasksCompleted: 0,
    errorsMissed: 0,
    timeElapsed: 0,
    isDone: false,
    currentTask: null as any,
    history: [] as any[]
  });

  const [selectedOutput, setSelectedOutput] = useState<any>(null);

  const FATIGUE_TASKS = [
    { id: 1, type: 'fact', content: "The capital of France is Paris.", hasError: false, difficulty: 10 },
    { id: 2, type: 'code', content: "function add(a, b) { return a - b; }", hasError: true, difficulty: 30, error: "Subtraction instead of addition" },
    { id: 3, type: 'fact', content: "The speed of light is 299,792,458 m/s.", hasError: false, difficulty: 15 },
    { id: 4, type: 'logic', content: "If all A are B, and some B are C, then all A are C.", hasError: true, difficulty: 40, error: "Invalid syllogism" },
    { id: 5, type: 'fact', content: "Water boils at 100°C at sea level.", hasError: false, difficulty: 10 },
    { id: 6, type: 'code', content: "const x = [1, 2, 3]; console.log(x[3]);", hasError: true, difficulty: 25, error: "Index out of bounds" },
    { id: 7, type: 'fact', content: "The Great Wall of China is visible from the moon.", hasError: true, difficulty: 20, error: "Common myth, not true" },
    { id: 8, type: 'logic', content: "A implies B. B is true. Therefore A is true.", hasError: true, difficulty: 35, error: "Affirming the consequent" },
    { id: 9, type: 'fact', content: "Jupiter is the largest planet in our solar system.", hasError: false, difficulty: 10 },
    { id: 10, type: 'code', content: "for (let i = 0; i < 10; i--) { ... }", hasError: true, difficulty: 30, error: "Infinite loop" },
  ];

  const startFatigueSim = () => {
    setFatigueSim({
      isRunning: true,
      energy: 100,
      accuracy: 100,
      tasksCompleted: 0,
      errorsMissed: 0,
      timeElapsed: 0,
      isDone: false,
      currentTask: FATIGUE_TASKS[0],
      history: []
    });
  };

  const handleFatigueAction = (action: 'verify' | 'skip' | 'tool' | 'break') => {
    setFatigueSim(prev => {
      if (!prev.currentTask) return prev;

      let newEnergy = prev.energy;
      let newErrorsMissed = prev.errorsMissed;
      let newAccuracy = prev.accuracy;
      let nextTaskIndex = prev.tasksCompleted + 1;
      let isDone = nextTaskIndex >= FATIGUE_TASKS.length;

      if (action === 'verify') {
        newEnergy -= prev.currentTask.difficulty * (1 + (100 - prev.energy) / 100);
        // Chance to miss error based on fatigue
        const missChance = (100 - prev.energy) / 200;
        if (prev.currentTask.hasError && Math.random() < missChance) {
          newErrorsMissed++;
        }
      } else if (action === 'skip') {
        if (prev.currentTask.hasError) {
          newErrorsMissed++;
        }
      } else if (action === 'tool') {
        newEnergy -= 5; // Tool is efficient
      } else if (action === 'break') {
        newEnergy = Math.min(100, newEnergy + 30);
        return { ...prev, energy: newEnergy }; // Break doesn't advance task
      }

      newAccuracy = Math.max(0, 100 - (newErrorsMissed / (prev.tasksCompleted + 1)) * 100);

      return {
        ...prev,
        energy: Math.max(0, newEnergy),
        errorsMissed: newErrorsMissed,
        accuracy: newAccuracy,
        tasksCompleted: nextTaskIndex,
        currentTask: isDone ? null : FATIGUE_TASKS[nextTaskIndex],
        isDone,
        history: [...prev.history, { task: prev.currentTask, action, energy: newEnergy }]
      };
    });
  };

  const INSTINCT_OUTPUTS = [
    {
      id: 'o1',
      title: "Quarterly Financial Summary",
      content: "Revenue grew 12% to $4.2M. Net margin improved to 14.1%. Operating expenses were $2.8M, a 5% decrease from Q3. The cash position remains strong at $1.5M.",
      fullText: "The company's performance in Q4 was exceptional, driven by a strong rebound in the APAC region and a significant reduction in overhead costs. Revenue grew 12% to $4.2M, primarily due to the successful launch of the 'Enterprise Plus' tier. Net margin improved to 14.1%, up from 11.2% in the previous quarter. Operating expenses were $2.8M, a 5% decrease from Q3, as we optimized our cloud infrastructure spending. The cash position remains strong at $1.5M, providing ample runway for our planned expansion into the European market in early 2027.",
      risk: 'low',
      hasError: false,
      isSlowHallucination: false,
      verificationCost: 5, // minutes
      timeSaved: 30 // minutes
    },
    {
      id: 'o2',
      title: "Market Analysis Brief",
      content: "The APAC region shows a 25% growth potential. Competitor A has lost 5% market share. Our new product line is expected to capture 10% of the mid-market segment by year-end.",
      fullText: "Our latest market research indicates that the APAC region shows a 25% growth potential over the next 18 months, particularly in the emerging tech hubs of Southeast Asia. Competitor A has lost 5% market share due to recent leadership changes and a failed product pivot. Our new product line is expected to capture 10% of the mid-market segment by year-end, assuming current adoption rates continue. Market saturation is currently at 65%, leaving significant room for our expansion strategy.",
      risk: 'medium',
      hasError: true,
      isSlowHallucination: true,
      hallucinatedSentence: "the APAC region shows a 25% growth potential over the next 18 months",
      errorDetail: "The 25% growth potential in APAC is based on a misread of the 2023 report which actually cited 2.5%. This error compounds in the 'mid-market segment' projection.",
      errorConsequence: "Cost 15 hours of strategic planning rework because the regional expansion budget was based on a 10x inflated growth projection.",
      verificationCost: 15,
      timeSaved: 45
    },
    {
      id: 'o3',
      title: "Technical Architecture Proposal",
      content: "The new microservices architecture will use Kafka for messaging. Database latency is expected to be <50ms. We will implement a Redis cache to handle peak loads.",
      fullText: "The proposed architecture for the 'Project Phoenix' migration focuses on scalability and fault tolerance. The new microservices architecture will use Kafka for messaging between services, ensuring reliable event delivery. Database latency is expected to be <50ms for 99% of requests, thanks to the new distributed indexing strategy. We will implement a Redis cache to handle peak loads and reduce the strain on the primary database. Security audit passed with zero critical vulnerabilities, and the system is ready for the first phase of deployment.",
      risk: 'high',
      hasError: false,
      isSlowHallucination: false,
      verificationCost: 25,
      timeSaved: 120
    },
    {
      id: 'o4',
      title: "Legal Contract Review",
      content: "The liability clause is standard. Termination requires 30 days notice. Intellectual property remains with the client. The jurisdiction is set to Delaware.",
      fullText: "The contract for the 'Global Logistics' partnership has been reviewed for standard compliance. The liability clause is standard and protects both parties from indirect damages. Termination requires 30 days written notice by either party. Intellectual property remains with the client, with a limited license granted to the provider for the duration of the project. The jurisdiction is set to Delaware, which is standard for our US-based agreements. No unusual indemnification requirements found during the initial audit.",
      risk: 'high',
      hasError: true,
      isSlowHallucination: true,
      hallucinatedSentence: "The jurisdiction is set to Delaware",
      errorDetail: "The jurisdiction is actually set to New York in the source document, but the AI 'hallucinated' Delaware based on common patterns. This could lead to significant legal complications.",
      errorConsequence: "Cost 10 hours of legal rework and potential filing delays because the wrong jurisdiction was cited in the summary, leading to incorrect filing preparations.",
      verificationCost: 30,
      timeSaved: 180
    },
    {
      id: 'o5',
      title: "Customer Success Report",
      content: "Churn reduced to 2.1%. CSAT score is 4.8/5.0. Onboarding time is now 9 days. 85% of users completed the advanced training module.",
      fullText: "Our customer success metrics for the quarter show a positive trend across all key performance indicators. Churn reduced to 2.1%, down from 2.8% last quarter. The CSAT score is 4.8/5.0, reflecting the impact of our new support portal. Onboarding time is now 9 days on average, a 35% improvement. 85% of users completed the advanced training module within the first month, which correlates strongly with long-term retention. We are on track to meet our annual targets.",
      risk: 'low',
      hasError: false,
      isSlowHallucination: false,
      verificationCost: 5,
      timeSaved: 20
    },
    {
      id: 'o6',
      title: "Product Roadmap Q3",
      content: "Mobile app v2.0 launch in August. Integration with Salesforce completed. New AI-powered search feature in beta.",
      fullText: "The Q3 roadmap focuses on expanding our ecosystem and enhancing user discovery. Mobile app v2.0 launch is scheduled for August, featuring a complete UI overhaul. Integration with Salesforce was completed ahead of schedule, allowing for seamless CRM data sync. The new AI-powered search feature is currently in beta with 500 select enterprise users, showing a 40% increase in search relevancy. We are also exploring a potential partnership with a major cloud provider for edge computing capabilities.",
      risk: 'medium',
      hasError: true,
      isSlowHallucination: true,
      hallucinatedSentence: "Integration with Salesforce was completed ahead of schedule",
      errorDetail: "The Salesforce integration is actually delayed by 3 weeks due to API versioning issues, but the AI reported it as 'completed ahead of schedule' based on the original project plan.",
      errorConsequence: "Cost 5 hours of client communication damage control because sales teams promised immediate CRM sync to 3 major prospects based on this summary.",
      verificationCost: 12,
      timeSaved: 40
    }
  ];

  const startInstinctSim = () => {
    setInstinctSim({
      isRunning: true,
      score: 0,
      timeSaved: 0,
      verificationTax: 0,
      hallucinationHits: [],
      outputs: INSTINCT_OUTPUTS.map(o => ({ ...o, status: 'pending' })),
      isDone: false,
      currentStep: 'triage'
    });
  };

  const handleTriage = (outputId: string, action: 'deep' | 'spot' | 'trust') => {
    setInstinctSim(prev => {
      const newOutputs = prev.outputs.map(o => {
        if (o.id === outputId) return { ...o, status: action };
        return o;
      });
      return { ...prev, outputs: newOutputs };
    });
  };

  const completeInstinctSim = () => {
    setInstinctSim(prev => {
      let totalTimeSaved = 0;
      let totalTax = 0;
      const hits: any[] = [];

      prev.outputs.forEach(o => {
        if (o.status === 'trust') {
          if (o.hasError) {
            totalTimeSaved -= o.timeSaved * 2; 
            hits.push({ title: o.title, consequence: o.errorConsequence, penalty: o.timeSaved * 2 });
          } else {
            totalTimeSaved += o.timeSaved;
          }
        } else if (o.status === 'spot') {
          totalTax += o.verificationCost * 0.3;
          if (o.hasError) {
            if (Math.random() > 0.5) {
              totalTimeSaved += o.timeSaved;
            } else {
              totalTimeSaved -= o.timeSaved;
              hits.push({ title: o.title, consequence: o.errorConsequence, penalty: o.timeSaved });
            }
          } else {
            totalTimeSaved += o.timeSaved;
          }
        } else if (o.status === 'deep') {
          totalTax += o.verificationCost;
          totalTimeSaved += o.timeSaved;
        }
      });

      const effectiveProductivity = totalTimeSaved - totalTax;

      return {
        ...prev,
        timeSaved: totalTimeSaved,
        verificationTax: totalTax,
        hallucinationHits: hits,
        score: effectiveProductivity,
        isDone: true,
        isRunning: false,
        currentStep: 'results'
      };
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4">
        <button 
          onClick={() => setView(AppView.LEARN)}
          className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full text-left w-full appearance-none"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
            <Compass className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20 group-hover:scale-110 transition-transform shrink-0">
                <Compass className="w-7 h-7 text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum group-hover:text-brand-green transition-colors leading-tight">Literacy, not training</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              Shift from tool proficiency to strategic judgment. Master the "what" and "why" of AI application, focusing on direction and workflow redesign over simple automation.
            </p>
          </div>
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
            Launch Simulation <span className="group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </button>

        <div 
          onClick={() => setView(AppView.LANDING)}
          className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
            <Layers className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20 group-hover:scale-110 transition-transform shrink-0">
                <Layers className="w-7 h-7 text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum group-hover:text-brand-green transition-colors leading-tight">Parallelism</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              The "Orchestration Gym." Learn to maintain a unified vision while multiple agents bombard you with conflicting logs and critical decisions.
            </p>
          </div>
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
            Launch Simulation <span className="group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </div>

        <div 
          onClick={() => setView(AppView.TASTE)}
          className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
            <Sparkles className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20 group-hover:scale-110 transition-transform shrink-0">
                <Sparkles className="w-7 h-7 text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum group-hover:text-brand-green transition-colors leading-tight">Taste</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              AI can generate infinite options. Taste is your ability to say “yes to this, no to that and explain why.”
            </p>
          </div>
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
            Launch Simulation <span className="group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </div>

        <div 
          onClick={() => setView(AppView.DEFINE_THE_WHAT)}
          className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
            <Target className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20 group-hover:scale-110 transition-transform shrink-0">
                <Target className="w-7 h-7 text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum group-hover:text-brand-green transition-colors leading-tight">Define the What</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              In an AI-driven world where execution is instant, advantage shifts to clearly defining the right problem before asking for solutions.
            </p>
          </div>
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
            Launch Simulation <span className="group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </div>

        <div 
          onClick={() => setView(AppView.VERIFICATION_GATEWAY)}
          className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
            <ShieldCheck className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20 group-hover:scale-110 transition-transform shrink-0">
                <ShieldCheck className="w-7 h-7 text-brand-green" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum group-hover:text-brand-green transition-colors leading-tight uppercase">Verification</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              Master high-speed auditing. Train your ability to spot hallucinations and logic errors without succumbing to cognitive exhaustion.
            </p>
          </div>
          <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
            Learn and Grow the skill <span className="group-hover:translate-x-2 transition-transform">→</span>
          </div>
        </div>

        <div className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-brand-platinum">
            <MessageSquare className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-platinum/10 rounded-xl flex items-center justify-center border border-brand-platinum/20 shrink-0">
                <Brain className="w-7 h-7 text-brand-platinum" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum leading-tight">Thinking in Prompts</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              Thinking in prompts is the habit of framing your thoughts as questions or instructions you could give to an AI.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>

        <div className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-brand-platinum">
            <FlaskConical className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-platinum/10 rounded-xl flex items-center justify-center border border-brand-platinum/20 shrink-0">
                <FlaskConical className="w-7 h-7 text-brand-platinum" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum leading-tight">Become a CEO</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              Chief Experimentation Officer. In the AI era, the speed of your learning loops determines your competitive advantage.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>

        <div className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-brand-platinum">
            <Shield className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-platinum/10 rounded-xl flex items-center justify-center border border-brand-platinum/20 shrink-0">
                <Shield className="w-7 h-7 text-brand-platinum" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum leading-tight">Resist Intellectual Laziness</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              Use AI without switching off your own thinking. Build habits that keep your reasoning, judgment, and creativity sharp.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>

        <div className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-brand-platinum">
            <Users className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-platinum/10 rounded-xl flex items-center justify-center border border-brand-platinum/20 shrink-0">
                <Users className="w-7 h-7 text-brand-platinum" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum leading-tight">Interview AI Models</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              Learn the art of "Agent Onboarding." Protocols to stress-test and validate an AI's logic and personality before delegating tasks.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>

        <div className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-brand-platinum">
            <Workflow className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-platinum/10 rounded-xl flex items-center justify-center border border-brand-platinum/20 shrink-0">
                <Workflow className="w-7 h-7 text-brand-platinum" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum leading-tight">Thinking in Workflows</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              Deconstruct complex goals into modular, agent-ready sequences. Master the architecture of multi-step AI orchestration.
            </p>
          </div>
          <div className="relative z-10 mt-auto">
            <div className="inline-block px-4 py-1 rounded-full bg-brand-navy text-brand-platinum/40 text-xs font-bold uppercase tracking-widest">
              Coming Soon
            </div>
          </div>
        </div>

        <div className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 opacity-60 grayscale hover:grayscale-0 transition-all cursor-not-allowed overflow-hidden flex flex-col h-full">
          <div className="absolute top-0 right-0 p-6 opacity-5 text-brand-platinum">
            <GraduationCap className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 bg-brand-platinum/10 rounded-xl flex items-center justify-center border border-brand-platinum/20 shrink-0">
                <GraduationCap className="w-7 h-7 text-brand-platinum" />
              </div>
              <h2 className="text-2xl font-bold text-brand-platinum leading-tight">Learning how to learn</h2>
            </div>
            <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
              In an era of rapid obsolescence, your ability to acquire new mental models is the only permanent competitive advantage.
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
      <div className="max-w-7xl mx-auto py-12 px-6 animate-in fade-in duration-700 min-h-screen bg-[#F8F9FA] text-gray-900">
        {/* Header */}
        <div className="flex justify-between items-start mb-12 border-b border-gray-200 pb-8">
          <div>
            <button onClick={() => setView(AppView.HUB)} className="text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest mb-4">
              <ArrowLeft className="w-3 h-3" />
              Back to Hub
            </button>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 mb-2 uppercase">
              Verification <span className="text-blue-600">Triage & ROI</span>
            </h1>
            <p className="text-gray-500 text-lg">
              Master the "Fact-Check Tax" and build the instinct to spot slow hallucinations.
            </p>
          </div>
          <div className="flex gap-4">
            {!instinctSim.isRunning && !instinctSim.isDone && (
              <button 
                onClick={startInstinctSim}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                Start Triage Drill
              </button>
            )}
            {(instinctSim.isRunning || instinctSim.isDone) && (
              <button 
                onClick={() => {
                  setInstinctSim(prev => ({ ...prev, isRunning: false, isDone: false }));
                  setSelectedOutput(null);
                }}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-900 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
              >
                Reset Simulation
              </button>
            )}
          </div>
        </div>

        {!instinctSim.isRunning && !instinctSim.isDone ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-blue-50 rounded-[32px] flex items-center justify-center mb-8 border border-blue-100">
              <ShieldCheck className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-4xl font-black mb-4 tracking-tight">Ready to build the instinct?</h2>
            <p className="text-gray-500 max-w-md mb-12 text-lg leading-relaxed">
              You will be presented with a series of AI outputs. Your goal is to triage them efficiently to maximize your <strong>Effective Productivity</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mb-12">
              <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="font-bold mb-2">The Fact-Check Tax</h3>
                <p className="text-xs text-gray-500">Verification costs time. If you verify everything, you lose the speed AI gave you.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mb-4 text-red-600">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="font-bold mb-2">Slow Hallucinations</h3>
                <p className="text-xs text-gray-500">Errors that are internally consistent and confident. Hard to spot without deep verification.</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-4 text-green-600">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="font-bold mb-2">Triage Logic</h3>
                <p className="text-xs text-gray-500">Decide: Trust, Spot-Check, or Deep Verify based on risk and complexity.</p>
              </div>
            </div>
            <button 
              onClick={startInstinctSim}
              className="px-12 py-4 bg-gray-900 text-white rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-2xl"
            >
              Start Simulation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left Column: Triage Inbox */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  Triage Inbox
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-bold">
                    {instinctSim.outputs.filter(o => o.status === 'pending').length} Pending
                  </span>
                </h2>
                {instinctSim.isRunning && (
                  <button 
                    onClick={completeInstinctSim}
                    disabled={instinctSim.outputs.some(o => o.status === 'pending')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-blue-700 transition-all"
                  >
                    Calculate ROI
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {instinctSim.outputs.map(output => (
                  <div 
                    key={output.id} 
                    onClick={() => setSelectedOutput(output)}
                    className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                      selectedOutput?.id === output.id 
                        ? 'bg-white border-blue-500 shadow-lg ring-1 ring-blue-500' 
                        : 'bg-white border-gray-100 shadow-sm hover:border-blue-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            output.risk === 'low' ? 'bg-green-100 text-green-700' :
                            output.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {output.risk} risk
                          </span>
                          <h3 className="font-bold text-lg">{output.title}</h3>
                        </div>
                        <p className="text-gray-500 text-sm line-clamp-2">{output.content}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {output.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleTriage(output.id, 'trust'); }}
                              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-gray-200"
                            >
                              Trust
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleTriage(output.id, 'spot'); }}
                              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-gray-200"
                            >
                              Spot
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleTriage(output.id, 'deep'); }}
                              className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-gray-200"
                            >
                              Deep
                            </button>
                          </div>
                        ) : (
                          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            output.status === 'trust' ? 'bg-gray-900 text-white border-gray-900' :
                            output.status === 'spot' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            'bg-indigo-50 text-indigo-600 border-indigo-200'
                          }`}>
                            {output.status} verified
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Save: {output.timeSaved}m</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Tax: {output.verificationCost}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Details & ROI */}
            <div className="lg:col-span-5 space-y-8">
              {/* ROI Dashboard (Visible when done) */}
              {instinctSim.isDone && (
                <div className="p-8 bg-gray-900 text-white rounded-[32px] shadow-2xl space-y-8">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Effective Productivity</div>
                    <div className="text-6xl font-black mb-2">{Math.round(instinctSim.score)}m</div>
                    <p className="text-sm text-gray-400">Total time saved minus the verification tax and hallucination penalties.</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/10">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Gross Saved</div>
                      <div className="text-2xl font-bold text-green-400">+{instinctSim.timeSaved}m</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fact-Check Tax</div>
                      <div className="text-2xl font-bold text-red-400">-{Math.round(instinctSim.verificationTax)}m</div>
                    </div>
                  </div>

                  {instinctSim.hallucinationHits.length > 0 && (
                    <div className="pt-8 border-t border-white/10 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-red-400 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        The Hallucination Hit
                      </h4>
                      <div className="space-y-3">
                        {instinctSim.hallucinationHits.map((hit, i) => (
                          <div key={i} className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                            <div className="flex justify-between items-start mb-1">
                              <div className="font-bold text-sm text-red-200">{hit.title}</div>
                              <div className="text-xs font-black text-red-400">-{hit.penalty}m</div>
                            </div>
                            <p className="text-[10px] text-red-300/70 leading-relaxed">{hit.consequence}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-2 text-blue-400">The ROI Lesson</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Exhaustive verification is a productivity killer. The instinct is knowing when to trust, when to spot-check, and when to deep-dive based on the cost of being wrong.
                    </p>
                  </div>
                </div>
              )}

              {/* Output Inspector */}
              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
                {selectedOutput ? (
                  <>
                    <div className="p-8 border-b border-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          selectedOutput.risk === 'low' ? 'bg-green-100 text-green-700' :
                          selectedOutput.risk === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {selectedOutput.risk} risk
                        </span>
                        <h3 className="font-bold text-xl">{selectedOutput.title}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <span>ID: {selectedOutput.id}</span>
                        <span>Type: AI Generated Summary</span>
                      </div>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto bg-gray-50/50">
                      <div className="prose prose-sm max-w-none">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Full AI Output</h4>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {selectedOutput.fullText}
                        </p>
                      </div>

                      {instinctSim.isDone && selectedOutput.hasError && (
                        <div className="mt-8 p-6 bg-red-50 border border-red-100 rounded-2xl space-y-4">
                          <div className="flex items-center gap-2 text-red-600">
                            <ShieldAlert className="w-5 h-5" />
                            <span className="font-bold uppercase tracking-widest text-xs">Hallucination Detected</span>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">The Error</div>
                            <p className="text-sm text-red-900 font-medium italic">"{selectedOutput.hallucinatedSentence}"</p>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">The Consequence</div>
                            <p className="text-sm text-red-800">{selectedOutput.errorConsequence}</p>
                          </div>
                        </div>
                      )}

                      {instinctSim.isDone && !selectedOutput.hasError && (
                        <div className="mt-8 p-6 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-bold uppercase tracking-widest text-xs">Verified Reliable</span>
                        </div>
                      )}
                    </div>
                    {!instinctSim.isDone && (
                      <div className="p-6 bg-white border-t border-gray-50 flex gap-3">
                        <button 
                          onClick={() => handleTriage(selectedOutput.id, 'trust')}
                          className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                            selectedOutput.status === 'trust' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          Trust
                        </button>
                        <button 
                          onClick={() => handleTriage(selectedOutput.id, 'spot')}
                          className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                            selectedOutput.status === 'spot' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          Spot
                        </button>
                        <button 
                          onClick={() => handleTriage(selectedOutput.id, 'deep')}
                          className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                            selectedOutput.status === 'deep' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          Deep
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-400">
                    <Eye className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">Select an output from the inbox to inspect the full text and perform triage.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
              className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-widest mb-6 border border-blue-100"
            >
              AI & BEYOND
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-7xl font-black text-gray-900 mb-8 leading-[0.85] tracking-tighter"
            >
              Training is the <span className="text-gray-300 italic">starting line.</span><br />
              Literacy is the <span className="text-blue-600">whole race.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-12"
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
              className="px-8 py-4 bg-blue-600 text-white font-black uppercase tracking-widest text-sm rounded-full hover:scale-105 transition-transform shadow-lg shadow-blue-600/20"
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
                className="text-sm font-black text-gray-400 uppercase mb-4"
              >
                ACT ONE
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-gray-900 mb-4"
              >
                Training is the <span className="text-blue-600">GPS.</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-gray-500 max-w-lg"
              >
                Essential. You need it. But it's just the engine, not the journey.
              </motion.p>
            </div>

            <div className="bg-white rounded-[40px] p-12 border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-gray-900">
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
                    className="flex items-center gap-6 p-5 rounded-2xl bg-gray-50 border border-gray-100"
                  >
                    <span className="font-mono text-xs text-gray-400">{item.step}</span>
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-gray-900 font-bold text-lg">{item.text}</span>
                  </motion.div>
                ))}
              </div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-12 pt-8 border-t border-gray-100 text-center"
              >
                <p className="text-gray-500 text-sm italic mb-4">"Fast. Efficient. Necessary. But not sufficient."</p>
                <div className="text-blue-600 font-bold uppercase tracking-widest text-sm">You can drive. But who decides where to go?</div>
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
                className="text-sm font-black text-gray-400 uppercase mb-4"
              >
                ACT TWO
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-gray-900 mb-4"
              >
                Literacy is <span className="text-blue-600">GPS + Compass.</span>
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-gray-500 max-w-lg"
              >
                You know the tools and you know where North is.
              </motion.p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white aspect-square rounded-[60px] border border-blue-100 shadow-sm flex items-center justify-center relative overflow-hidden bg-blue-50/30"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-80 h-80 rounded-full border border-blue-100 border-dashed animate-spin-slow"></div>
                  <div className="absolute w-64 h-64 rounded-full border border-blue-100 border-dashed animate-spin-slow-reverse"></div>
                </div>
                <div className="relative z-10 text-center">
                  <Compass className="w-40 h-40 text-blue-600 mb-8 mx-auto animate-pulse" />
                  <div className="grid grid-cols-2 gap-x-12 gap-y-6 text-xs font-black text-blue-600/60 uppercase tracking-[0.2em]">
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
                    className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-6 group hover:border-blue-300 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                      <HelpCircle className="w-6 h-6 text-blue-600" />
                    </div>
                    <span className="text-gray-900 text-xl font-medium italic leading-tight">"{q}"</span>
                  </motion.div>
                ))}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                  className="mt-8 p-8 bg-gray-50 rounded-3xl border border-gray-100"
                >
                  <p className="text-gray-500 text-lg leading-relaxed text-center">
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
                className="text-sm font-black text-gray-400 uppercase mb-4"
              >
                ACT THREE
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl font-bold text-gray-900 mb-4"
              >
                Same Monday morning.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-gray-500 max-w-lg"
              >
                Same tools. Two different mindsets.
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-8 px-6 py-3 bg-gray-50 rounded-full border border-gray-100 text-sm text-gray-500 italic"
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
                className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="bg-gray-50 p-8 border-b border-gray-100">
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">MINDSET A</div>
                  <h3 className="text-2xl font-bold text-gray-400">Only Trained</h3>
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
                      <span className="font-mono text-xs text-gray-300 mt-1">{item.step}</span>
                      <p className="text-gray-500 text-lg leading-snug">{item.text}</p>
                    </motion.div>
                  ))}
                </div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                  className="p-10 bg-gray-50 border-t border-gray-100"
                >
                  <div className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-widest">RESULT</div>
                  <p className="text-gray-600 font-bold text-xl leading-tight">Fast delivery. Zero strategic value. Replaced next quarter.</p>
                </motion.div>
              </motion.div>

              {/* AI Literate */}
              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-[40px] border border-blue-100 shadow-sm overflow-hidden bg-blue-50/30 flex flex-col"
              >
                <div className="bg-blue-50 p-8 border-b border-blue-100">
                  <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">MINDSET B</div>
                  <h3 className="text-2xl font-bold text-gray-900">AI Literate</h3>
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
                      <span className="font-mono text-xs text-blue-400 mt-1">{item.step}</span>
                      <p className="text-gray-900 text-lg font-bold leading-snug">{item.text}</p>
                    </motion.div>
                  ))}
                </div>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2 }}
                  className="p-10 bg-blue-50 border-t border-blue-100"
                >
                  <div className="text-xs font-bold text-blue-600 uppercase mb-3 tracking-widest">RESULT</div>
                  <p className="text-gray-900 font-black text-xl leading-tight">Same tools. Better question. Seat at the table.</p>
                </motion.div>
              </motion.div>
            </div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3 }}
              className="mt-16 text-center text-gray-400 font-bold uppercase tracking-[0.3em] text-base"
            >
              Both used the same tools. <span className="text-blue-600">Only one changed the outcome.</span>
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
                className="text-sm font-black text-gray-400 uppercase mb-4"
              >
                THE BOTTOM LINE
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-12 rounded-[50px] border border-gray-100 shadow-sm"
              >
                <h3 className="text-3xl font-bold text-gray-400 mb-8">Training alone</h3>
                <ul className="space-y-5 text-gray-500 text-lg">
                  <li className="flex items-start gap-3">
                    <span className="text-gray-300 mt-1.5">•</span>
                    <span>Builds operators who execute faster.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-gray-300 mt-1.5">•</span>
                    <span>Tool-specific. Task-oriented.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-gray-300 mt-1.5">•</span>
                    <span>Necessary foundation.</span>
                  </li>
                  <li className="pt-8 text-gray-300 font-black uppercase tracking-[0.2em] text-sm">
                    Answers: "How do I do this?"
                  </li>
                </ul>
              </motion.div>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white p-12 rounded-[50px] border border-blue-100 shadow-sm bg-blue-50/30"
              >
                <h3 className="text-3xl font-bold text-gray-900 mb-8">Literacy</h3>
                <ul className="space-y-5 text-gray-900 text-lg">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 mt-1.5">•</span>
                    <span className="font-bold">Builds owners with tool skills plus judgment.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 mt-1.5">•</span>
                    <span className="font-bold">Strategic. Durable. Tool-agnostic thinking.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-blue-600 mt-1.5">•</span>
                    <span className="font-bold">The competitive advantage.</span>
                  </li>
                  <li className="pt-8 text-blue-600 font-black uppercase tracking-[0.2em] text-sm">
                    Also answers: "What should we be doing - and why?"
                  </li>
                </ul>
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center py-24 border-t border-gray-100"
            >
              <h2 className="text-5xl font-black text-gray-900 mb-12 leading-[1.1] max-w-4xl mx-auto tracking-tighter">
                "Training teaches you to <span className="text-gray-300 italic">play the instrument.</span><br />
                Literacy teaches you to <span className="text-blue-600">play it and write the music.</span>"
              </h2>
              <div className="text-xs font-black text-gray-400 uppercase tracking-[0.8em]">
                AI & BEYOND — BUILDING AI LITERATE LEADERS
              </div>
              
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                onClick={() => {
                  setView(AppView.HUB);
                  setLearnStep(0);
                  setIsLearnSimRunning(false);
                }}
                className="mt-12 px-10 py-4 bg-gray-900 text-white font-black uppercase tracking-widest text-sm rounded-full hover:scale-105 transition-transform shadow-xl"
              >
                Return to Hub
              </motion.button>
            </motion.div>
          </div>
        )
      }
    ];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#F8F9FA] text-[#333]">
        {/* Navigation Controls */}
        <div className="absolute top-12 left-10 z-[60] flex flex-col gap-4">
          <button 
            onClick={() => {
              setView(AppView.HUB);
              setLearnStep(0);
              setIsLearnSimRunning(false);
            }}
            className="group flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors font-bold uppercase text-xs tracking-widest"
          >
            <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            Exit Simulation
          </button>
          
          {isLearnSimRunning ? (
            <button 
              onClick={() => setIsLearnSimRunning(false)}
              className="group flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors font-bold uppercase text-xs tracking-widest"
            >
              <RotateCcw className="w-3 h-3" />
              Pause Simulation
            </button>
          ) : learnStep > 0 && learnStep < steps.length - 1 && (
            <button 
              onClick={() => setIsLearnSimRunning(true)}
              className="group flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors font-bold uppercase text-xs tracking-widest"
            >
              <Play className="w-3 h-3 fill-current" />
              Resume Simulation
            </button>
          )}
          
          {isLearnSimRunning && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Auto-Playing</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-2 z-[60]">
          {steps.map((_, i) => (
            <div 
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === learnStep ? 'w-8 bg-blue-500' : 'w-2 bg-gray-200'
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

  const renderDefineTheWhat = () => {
    const nextStep = () => setDefineSimStep(prev => prev + 1);
    const resetSim = () => {
      setDefineSimStep(0);
      setNoTastePromptShown(false);
    };

    return (
      <div className="min-h-screen bg-black text-white font-sans selection:bg-brand-green selection:text-black overflow-hidden relative">
        {/* Navigation / Header */}
        <div className="absolute top-4 left-0 w-full p-8 flex justify-between items-center z-[60]">
          <div className="text-[10px] font-black text-brand-green uppercase tracking-[0.4em]">
            Simulation 04 — Define the What
          </div>
          <button 
            onClick={() => setView(AppView.HUB)}
            className="text-white/40 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            Exit Sim
          </button>
        </div>

        <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
          <AnimatePresence mode="wait">
            {defineSimStep === 0 && (
              <motion.div 
                key="step0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                <motion.h1 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-6xl md:text-8xl font-black tracking-tighter"
                >
                  When AI can do<br />almost anything
                </motion.h1>
                <motion.div 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-1 w-32 bg-white mx-auto"
                />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="space-y-4"
                >
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-brand-green">
                    what is left for you?
                  </h2>
                  <p className="text-xl text-white/70 font-medium">
                    This simulation answers that question.
                  </p>
                </motion.div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                  onClick={nextStep}
                  className="mt-12 px-8 py-4 bg-brand-green text-brand-black rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)]"
                >
                  Click to start
                </motion.button>
              </motion.div>
            )}

            {defineSimStep === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-3xl w-full text-left"
              >
                <div className="text-[10px] font-black text-brand-green uppercase tracking-[0.4em] mb-8">
                  The World You're In Now
                </div>
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold mb-12 leading-tight"
                >
                  AI can now do this — faster than any of us:
                </motion.h2>
                <div className="space-y-6 mb-16">
                  {[
                    "Write reports",
                    "Analyse data",
                    "Draft documents",
                    "Build strategies",
                    "Answer complex questions"
                  ].map((item, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.1) }}
                      className="text-2xl text-white/60 font-medium flex items-center gap-4"
                    >
                      <div className="w-1.5 h-1.5 bg-brand-green rounded-full" />
                      {item}
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 }}
                  className="space-y-4"
                >
                  <p className="text-3xl font-bold leading-tight">
                    Speed of execution is no longer your edge.
                  </p>
                  <p className="text-3xl font-bold text-brand-green leading-tight">
                    Something else is.
                  </p>
                </motion.div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3.5 }}
                  onClick={nextStep}
                  className="mt-16 px-8 py-4 bg-brand-green text-brand-black rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)]"
                >
                  Next
                </motion.button>
              </motion.div>
            )}

            {defineSimStep === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-3xl w-full text-left"
              >
                <div className="text-[10px] font-black text-brand-green uppercase tracking-[0.4em] mb-8">
                  Here's what usually happens
                </div>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-2xl font-medium mb-12 leading-relaxed"
                >
                  A company notices its customer numbers are falling. Someone opens AI and types:
                </motion.p>
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/5 border border-white/10 p-8 rounded-2xl mb-8"
                >
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Prompt</div>
                  <div className="text-xl font-bold text-brand-green">
                    "Write a plan to improve customer retention."
                  </div>
                </motion.div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="space-y-4"
                >
                  <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">AI Delivers</div>
                  <div className="flex items-start gap-3 text-lg">
                    <CheckCircle2 className="w-5 h-5 text-brand-green mt-1 shrink-0" />
                    <span>A detailed 12-point retention strategy</span>
                  </div>
                  <div className="flex items-start gap-3 text-lg">
                    <CheckCircle2 className="w-5 h-5 text-brand-green mt-1 shrink-0" />
                    <span>Loyalty rewards. Email campaigns. Better onboarding.</span>
                  </div>
                  <p className="text-white/40 italic text-sm mt-4">Looks thorough. Looks professional.</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 3.5 }}
                  className="mt-12 bg-red-500/20 border border-red-500/50 p-8 rounded-2xl"
                >
                  <h2 className="text-2xl md:text-3xl font-bold text-red-500 leading-tight">
                    But the product itself had drifted from what customers needed.
                  </h2>
                </motion.div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5 }}
                  onClick={nextStep}
                  className="mt-12 px-8 py-4 bg-brand-green text-brand-black rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)]"
                >
                  The failure
                </motion.button>
              </motion.div>
            )}

            {defineSimStep === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-3xl w-full text-left"
              >
                <div className="text-[10px] font-black text-brand-green uppercase tracking-[0.4em] mb-8">
                  The Real Question
                </div>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl md:text-7xl font-black tracking-tighter mb-12"
                >
                  Why did that happen?
                </motion.h1>
                <div className="space-y-4 mb-16">
                  {[
                    "The team didn't lack intelligence.",
                    "They didn't lack effort.",
                    "They didn't even lack AI."
                  ].map((text, i) => (
                    <motion.p 
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + (i * 0.3) }}
                      className="text-2xl text-white/40 font-medium"
                    >
                      {text}
                    </motion.p>
                  ))}
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 }}
                  className="space-y-6"
                >
                  <p className="text-3xl font-bold leading-tight">
                    They jumped to solving before they understood <span className="text-brand-green">what they were actually solving.</span>
                  </p>
                  <p className="text-white/40 text-lg">
                    This is the most common — and most costly — mistake in an AI-powered world.
                  </p>
                </motion.div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 4 }}
                  onClick={nextStep}
                  className="mt-16 px-8 py-4 bg-brand-green text-brand-black rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)]"
                >
                  The comparison
                </motion.button>
              </motion.div>
            )}

            {defineSimStep === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-5xl w-full"
              >
                <div className="text-[10px] font-black text-brand-green uppercase tracking-[0.4em] mb-12 text-center">
                  Two kinds of people. Same AI. Very different outcomes.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/5 border border-white/10 p-10 rounded-[40px] relative overflow-hidden text-left"
                  >
                    <div className="text-2xl font-bold mb-8 text-white/40">The Executor</div>
                    <div className="space-y-6 mb-12">
                      {["Gets a brief", "Feels urgency to act", "Opens AI immediately", "Gets a polished output", "Moves on"].map((item, i) => (
                        <div key={i} className="text-lg text-white/60 flex items-center gap-4">
                          <div className="w-1 h-1 bg-white/20 rounded-full" />
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="text-red-500 font-bold text-lg">Worked hard on the wrong thing.</div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 }}
                    className="bg-brand-green/5 border border-brand-green/20 p-10 rounded-[40px] relative overflow-hidden text-left"
                  >
                    <div className="text-2xl font-bold mb-8 text-brand-green">The Definer</div>
                    <div className="space-y-6 mb-12">
                      {["Gets a brief", "Pauses", "Questions the framing", "Asks: what's actually broken?", "Then acts"].map((item, i) => (
                        <div key={i} className="text-lg text-white flex items-center gap-4">
                          <div className="w-1.5 h-1.5 bg-brand-green rounded-full" />
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="text-brand-green font-bold text-lg">Changed the actual outcome.</div>
                  </motion.div>
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.5 }}
                  className="mt-16 text-center space-y-4"
                >
                  <p className="text-2xl font-medium">The difference is not technical skill.</p>
                  <p className="text-3xl font-bold text-brand-green">It's the habit of questioning the problem before solving it.</p>
                  <p className="text-white/40 text-sm max-w-2xl mx-auto">
                    Anyone can learn to use AI. Very few learn to direct it well. The definer is who every organisation will compete to find.
                  </p>
                </motion.div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 5 }}
                  onClick={nextStep}
                  className="mt-16 px-8 py-4 bg-brand-green text-brand-black rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)] mx-auto block"
                >
                  The Habits
                </motion.button>
              </motion.div>
            )}

            {defineSimStep === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-3xl w-full text-left"
              >
                <div className="text-[10px] font-black text-brand-green uppercase tracking-[0.4em] mb-8">
                  Three habits of mind
                </div>
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-4xl font-bold mb-12 leading-tight"
                >
                  This skill is not about prompting better. It operates above AI entirely.
                </motion.h2>
                <div className="space-y-6 mb-16">
                  {[
                    { title: "Curiosity", desc: "Ask what's actually broken — not just what's being reported." },
                    { title: "Skepticism", desc: "Treat the first framing of a problem as a starting point, not the truth." },
                    { title: "Patience", desc: "Resist the urge to act before you've defined what you're actually solving." }
                  ].map((habit, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (i * 0.3) }}
                      className="bg-white/5 border border-white/10 p-6 rounded-2xl"
                    >
                      <div className="text-brand-green font-bold text-xl mb-2">{habit.title}</div>
                      <div className="text-white/60">{habit.desc}</div>
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2 }}
                  className="space-y-4"
                >
                  <p className="text-2xl text-white/40 font-medium">In a world where how to do something is free —</p>
                  <p className="text-4xl font-black tracking-tighter">"What to create" <span className="text-brand-green">becomes everything.</span></p>
                </motion.div>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 3.5 }}
                  onClick={nextStep}
                  className="mt-16 px-8 py-4 bg-brand-green text-brand-black rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)]"
                >
                  Final Move
                </motion.button>
              </motion.div>
            )}

            {defineSimStep === 6 && (
              <motion.div 
                key="step6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-3xl w-full text-center"
              >
                <motion.h1 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                  className="text-7xl md:text-9xl font-black tracking-tighter mb-12 text-brand-green uppercase"
                >
                  Your move.
                </motion.h1>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-8"
                >
                  <p className="text-2xl text-white/80 leading-relaxed">
                    Before your next AI prompt — <span className="font-bold">pause for 10 seconds.</span>
                  </p>
                  <p className="text-4xl font-black tracking-tight text-white leading-tight">
                    Ask: <span className="text-brand-green">"What is actually broken here?"</span>
                  </p>
                  <p className="text-xl text-white/40 font-medium">
                    That question is where your value lives.
                  </p>
                  <div className="pt-16">
                    <button 
                      onClick={resetSim}
                      className="px-12 py-6 bg-brand-green text-brand-black rounded-full font-black uppercase tracking-[0.2em] text-sm hover:bg-white transition-all flex items-center gap-3 mx-auto shadow-[0_0_30px_rgba(0,255,0,0.2)]"
                    >
                      <RotateCcw className="w-5 h-5" /> Replay Simulation
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 w-full p-8 flex justify-center gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div 
              key={i}
              className={`h-1 transition-all duration-500 rounded-full ${i <= defineSimStep ? 'w-8 bg-brand-green' : 'w-2 bg-white/10'}`}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderTaste = () => {
    const renderTab1 = () => (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-7xl font-black text-gray-900 mb-8 tracking-tighter"
          >
            What is taste,<br />really?
          </motion.h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm"
          >
            <div className="text-2xl font-black text-gray-900 uppercase tracking-[0.2em] mb-6">The Old World</div>
            <p className="text-2xl text-gray-500 leading-relaxed italic">
              Skill was the bottleneck. Not everyone could design, code, write, or build. The barrier protected quality.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm"
          >
            <div className="text-2xl font-black text-blue-600 uppercase tracking-[0.2em] mb-6">The AI World</div>
            <p className="text-2xl text-gray-900 font-medium leading-relaxed">
              Now anyone can make anything. The bottleneck has shifted. The new question isn't <span className="text-blue-600">can you?</span> — it's <span className="text-blue-600">should you, and why?</span>
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900 p-12 rounded-[40px] text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/30" />
          <p className="text-3xl text-white font-serif italic leading-relaxed max-w-3xl mx-auto">
            "Taste is the ability to say yes to one thing and no to everything else — and to know exactly why."
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <button 
            onClick={() => setTasteTab(2)}
            className="px-12 py-6 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-black uppercase tracking-widest text-xl transition-all flex items-center gap-4 mx-auto"
          >
            See Taste in Action <ArrowRight className="w-6 h-6" />
          </button>
        </motion.div>
      </div>
    );

    const renderTab2 = () => (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-center">
          <button 
            onClick={() => setNoTastePromptShown(true)}
            disabled={noTastePromptShown}
            className={`p-8 rounded-[32px] border-2 transition-all text-center group ${noTastePromptShown ? 'bg-white border-gray-100 opacity-50' : 'bg-white border-red-100 hover:border-red-200 hover:shadow-xl'}`}
          >
            <div className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-2">The Generic Output</div>
            <h4 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">AI Without Taste</h4>
            {!noTastePromptShown && (
              <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-xs">
                <Play className="w-4 h-4 fill-current" /> CLICK TO RUN PROMPT
              </div>
            )}
          </button>

          <button 
            onClick={() => setTasteContextAdded(true)}
            disabled={tasteContextAdded}
            className={`p-8 rounded-[32px] border-2 transition-all text-center group ${tasteContextAdded ? 'bg-white border-gray-100 opacity-50' : 'bg-white border-green-100 hover:border-green-200 hover:shadow-xl'}`}
          >
            <div className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-2">The Human Filter</div>
            <h4 className="text-2xl font-black text-[#A65E4E] uppercase tracking-tighter mb-4">AI Guided by Taste</h4>
            {!tasteContextAdded && (
              <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-xs">
                <Sparkles className="w-4 h-4 fill-current" /> CLICK TO ADD TASTE
              </div>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 items-stretch">
          {/* Row 1: The Prompts */}
          <div className={`transition-all duration-1000 ${noTastePromptShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 h-full">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">The Prompt</div>
              <div className="text-xs text-gray-600 font-mono leading-relaxed">
                "Generate a brand name, tagline, and color palette for a new tech connectivity company."
              </div>
            </div>
          </div>

          <div className={`transition-all duration-1000 ${tasteContextAdded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-[#FDFCFB] p-6 rounded-[32px] border border-[#E8E4E1] h-full">
              <div className="text-[10px] font-black text-[#A65E4E] uppercase tracking-[0.2em] mb-2">The Taste-Guided Prompt</div>
              <div className="text-xs text-[#2D3A2D] font-serif italic leading-relaxed">
                "We are building a company that helps people gather. It should feel like a warm kitchen, not a server room. One word name. Quiet tagline. Earthy colors."
              </div>
            </div>
          </div>

          {/* Row 2: Brand Name */}
          <div className={`transition-all duration-1000 ${noTastePromptShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Brand Name</div>
              <div className="text-xl font-bold text-gray-900 mb-1">SmartConnect Pro Plus™</div>
              <div className="text-xs text-red-700 font-bold italic">✕ Generic. Corporate. Forgettable.</div>
            </div>
          </div>

          <div className={`transition-all duration-1000 ${tasteContextAdded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-[#FDFCFB] p-8 rounded-[32px] border border-[#E8E4E1] shadow-sm relative overflow-hidden group h-full">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target className="w-12 h-12 text-[#2D3A2D]" />
              </div>
              <div className="text-[10px] font-black text-[#A65E4E] uppercase tracking-[0.2em] mb-4">Brand Name</div>
              <div className="text-4xl font-display font-black text-[#2D3A2D] mb-2 tracking-tighter">Gather</div>
              <div className="flex items-center gap-2 text-xs text-green-700 font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3 text-green-600" /> One word. Warm. Human.
              </div>
            </div>
          </div>

          {/* Row 3: Tagline */}
          <div className={`transition-all duration-1000 ${noTastePromptShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Tagline</div>
              <div className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-tight">INNOVATION. EXCELLENCE. RESULTS. YOUR SUCCESS IS OUR MISSION.</div>
              <div className="text-xs text-red-700 font-bold italic">✕ Four buzzwords. Says nothing.</div>
            </div>
          </div>

          <div className={`transition-all duration-1000 ${tasteContextAdded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-[#FDFCFB] p-8 rounded-[32px] border border-[#E8E4E1] shadow-sm group h-full">
              <div className="text-[10px] font-black text-[#A65E4E] uppercase tracking-[0.2em] mb-4">Tagline</div>
              <div className="text-2xl font-serif italic text-[#2D3A2D] mb-3 leading-tight">"Quietly powerful."</div>
              <div className="flex items-center gap-2 text-xs text-green-700 font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3 text-green-600" /> Holds tension. Earns curiosity.
              </div>
            </div>
          </div>

          {/* Row 4: Color Palette */}
          <div className={`transition-all duration-1000 ${noTastePromptShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Color Palette</div>
              <div className="flex gap-2 mb-3">
                <div className="w-10 h-10 rounded bg-[#7A8B99]" />
                <div className="w-10 h-10 rounded bg-[#8B9474]" />
                <div className="w-10 h-10 rounded bg-[#A68A64]" />
                <div className="w-10 h-10 rounded bg-[#8E7C93]" />
              </div>
              <div className="text-xs text-red-700 font-bold italic">✕ Default primary colors. No mood.</div>
            </div>
          </div>

          <div className={`transition-all duration-1000 ${tasteContextAdded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-[#FDFCFB] p-8 rounded-[32px] border border-[#E8E4E1] shadow-sm h-full">
              <div className="text-[10px] font-black text-[#A65E4E] uppercase tracking-[0.2em] mb-6">Color Palette</div>
              <div className="flex gap-4 mb-6">
                <div className="group relative">
                  <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] shadow-sm transition-transform group-hover:scale-110" />
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-gray-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Pearl</div>
                </div>
                <div className="group relative">
                  <div className="w-16 h-16 rounded-2xl bg-[#064E3B] shadow-md transition-transform group-hover:scale-110" />
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-gray-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Emerald</div>
                </div>
                <div className="group relative">
                  <div className="w-16 h-16 rounded-2xl bg-[#B45309] shadow-md transition-transform group-hover:scale-110" />
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[8px] font-bold text-gray-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Ochre</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-700 font-bold uppercase tracking-widest mt-4">
                <CheckCircle2 className="w-3 h-3 text-green-600" /> Unexpected. Warm. Sophisticated.
              </div>
            </div>
          </div>

          {/* Row 5: First Email Subject */}
          <div className={`transition-all duration-1000 ${noTastePromptShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">First Email Subject</div>
              <div className="bg-gray-50 p-3 rounded border border-gray-100 mb-2">
                <div className="text-xs font-bold text-gray-900">Exciting News! Our AMAZING Launch is HERE — Don't Miss This!</div>
              </div>
              <div className="text-xs text-red-700 font-bold italic">✕ Screaming. Deleted.</div>
            </div>
          </div>

          <div className={`transition-all duration-1000 ${tasteContextAdded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-[#FDFCFB] p-8 rounded-[32px] border border-[#E8E4E1] shadow-sm h-full">
              <div className="text-[10px] font-black text-[#A65E4E] uppercase tracking-[0.2em] mb-4">First Email Subject</div>
              <div className="bg-white p-5 rounded-2xl border border-[#E8E4E1] mb-3 shadow-inner">
                <div className="text-lg font-serif text-[#2D3A2D]">We got the thing wrong.</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-700 font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3 text-green-600" /> Impossible not to open.
              </div>
            </div>
          </div>

          {/* Row 6: Hero Image Prompt */}
          <div className={`transition-all duration-1000 ${noTastePromptShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Hero Image Prompt</div>
              <div className="bg-gray-50 p-3 rounded border border-gray-100 mb-2">
                <div className="text-xs text-gray-600">"Smiling diverse team of professionals shaking hands in a bright, modern office with glass walls."</div>
              </div>
              <div className="text-xs text-red-700 font-bold italic">✕ Stock photo cliché.</div>
            </div>
          </div>

          <div className={`transition-all duration-1000 ${tasteContextAdded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-[#FDFCFB] p-8 rounded-[32px] border border-[#E8E4E1] shadow-sm h-full">
              <div className="text-[10px] font-black text-[#A65E4E] uppercase tracking-[0.2em] mb-4">Hero Image Prompt</div>
              <div className="bg-white p-5 rounded-2xl border border-[#E8E4E1] mb-3 shadow-inner">
                <div className="text-sm text-[#2D3A2D] font-serif italic leading-relaxed">
                  "Empty chair at a kitchen table. Morning light. Steam rising from one cup."
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-700 font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3 text-green-600" /> A feeling, not a stock photo.
              </div>
            </div>
          </div>

          {/* Row 7: Call to Action */}
          <div className={`transition-all duration-1000 ${noTastePromptShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Call to Action</div>
              <div className="flex flex-wrap gap-2 mb-3">
                <div className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded">CLICK HERE TO START!</div>
                <div className="px-3 py-1.5 border border-blue-600 text-blue-600 text-[10px] font-bold rounded">BEGIN YOUR JOURNEY →</div>
              </div>
              <div className="text-xs text-red-700 font-bold italic">✕ Aggressive. Desperate.</div>
            </div>
          </div>

          <div className={`transition-all duration-1000 ${tasteContextAdded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}`}>
            <div className="bg-[#FDFCFB] p-8 rounded-[32px] border border-[#E8E4E1] shadow-sm h-full">
              <div className="text-[10px] font-black text-[#A65E4E] uppercase tracking-[0.2em] mb-6">Call to Action</div>
              <div className="mb-4">
                <div className="text-4xl font-display italic text-[#2D3A2D] tracking-tight">When you're ready.</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-700 font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3 text-green-600" /> It waits. That's respect.
              </div>
            </div>
          </div>


        </div>

        {tasteContextAdded && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-24 space-y-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-red-50/50 p-8 rounded-3xl border border-red-100">
                <p className="text-red-900/60 font-medium leading-relaxed text-xs">
                  <span className="font-bold block mb-2 text-red-900 text-sm">The result without taste:</span>
                  Technically correct. Could belong to any brand, in any industry, anywhere on earth.
                </p>
              </div>
              <div className="bg-green-50/50 p-8 rounded-3xl border border-green-100">
                <p className="text-green-900 font-medium leading-relaxed text-xs">
                  <span className="font-bold block mb-2 text-sm">The result with taste:</span>
                  Every element is intentional. This could only be this brand, for this founder.
                </p>
              </div>
            </div>

            <div className="text-center max-w-3xl mx-auto pt-12 border-t border-gray-100">
              <h3 className="text-4xl font-display font-black text-gray-900 mb-6 tracking-tight italic">
                Taste is not just the prompt. It's the <span className="text-blue-600 underline underline-offset-8">Filter</span>.
              </h3>
              <p className="text-xl text-gray-500 leading-relaxed">
                AI can generate 1,000 variations in seconds. But it can't tell you which one is <span className="text-gray-900 font-bold">Great</span>. Taste is the human ability to say "no" to the average and "yes" to the exceptional.
              </p>
            </div>
          </motion.div>
        )}

        <div className="mt-16 text-center">
          <button 
            onClick={() => setTasteTab(3)}
            className="px-10 py-5 bg-gray-900 text-white rounded-full font-black uppercase tracking-widest text-sm transition-all flex items-center gap-3 mx-auto"
          >
            Understand Why Taste Matters <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );

    const renderTab3 = () => (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-20">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl font-black text-gray-900 mb-6 tracking-tighter"
          >
            Why taste is your edge<br />in the AI age
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl text-gray-500"
          >
            AI can execute anything. It can't want the right thing.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {[
            {
              title: "Signal vs. Noise",
              text: "AI produces 10,000 options in seconds. Without taste you drown. With it, you know which one to keep — and why."
            },
            {
              title: "The Articulation Muscle",
              text: "Taste isn't just liking things. It's being able to say WHY — precisely enough that AI executes your vision, not the generic average."
            },
            {
              title: "Identity as Filter",
              text: "In a world where anyone can make anything, what you choose NOT to make defines you as much as what you do."
            },
            {
              title: "Cultural Fluency",
              text: "AI trained on averages produces the average. Tastemakers move culture forward — they don't simply reflect it back."
            }
          ].map((card, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm group hover:border-blue-200 transition-all"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-4">{card.title}</h3>
              <p className="text-gray-500 leading-relaxed text-lg">{card.text}</p>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-50 p-16 rounded-[60px] text-center border border-gray-100"
        >
          <p className="text-3xl text-gray-900 font-serif italic leading-relaxed max-w-3xl mx-auto mb-8">
            "You make things. As you make them, you try to be aware of how you make them. You try to speak your why — why yes to this, and no to that."
          </p>
          <div className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">
            — JACK CHENG
          </div>
        </motion.div>

        <div className="mt-20 flex flex-col items-center gap-6">
          <button 
            onClick={() => {
              setTasteTab(1);
              setTasteContextAdded(false);
              setNoTastePromptShown(false);
            }}
            className="px-10 py-5 bg-gray-900 text-white rounded-full font-black uppercase tracking-widest text-sm transition-all flex items-center gap-3"
          >
            <RotateCcw className="w-4 h-4" /> Run Again
          </button>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Taste sharpens with every repetition.
          </div>
          <button 
            onClick={() => setView(AppView.HUB)}
            className="mt-8 text-gray-400 hover:text-gray-900 font-bold uppercase text-[10px] tracking-widest transition-colors"
          >
            Return to Hub
          </button>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-[#F9F8F6] text-[#2D3A2D]">
        {/* Navigation Bar */}
        <div className="absolute top-0 left-0 w-full bg-white/60 backdrop-blur-xl border-b border-[#E8E4E1] z-[60]">
          <div className="max-w-7xl mx-auto px-8 h-24 flex items-center justify-between">
            <div className="flex items-center gap-10">
              <button 
                onClick={() => setView(AppView.HUB)}
                className="text-[#2D3A2D] font-black uppercase tracking-tighter text-base group flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-[#2D3A2D] rounded-xl flex items-center justify-center text-white transition-transform group-hover:scale-110">H</div>
                Master the Next <span className="text-[#A65E4E]">Human Skills</span>
              </button>
              <div className="h-6 w-[1px] bg-[#E8E4E1]" />
              <div className="text-[10px] font-black text-[#A65E4E] uppercase tracking-[0.4em]">
                Simulation 03 — Taste
              </div>
            </div>
            <div className="flex gap-10">
              {[
                { id: 1, label: '1. What is Taste?' },
                { id: 2, label: '2. The Experiment' },
                { id: 3, label: '3. Why it Matters' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setTasteTab(tab.id)}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all pb-2 border-b-2 ${tasteTab === tab.id ? 'text-[#A65E4E] border-[#A65E4E]' : 'text-gray-400 border-transparent hover:text-[#2D3A2D]'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={tasteTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {tasteTab === 1 && renderTab1()}
              {tasteTab === 2 && renderTab2()}
              {tasteTab === 3 && renderTab3()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const renderVerificationFatigue = () => {
    if (!fatigueSim.isRunning && !fatigueSim.isDone) {
      return (
        <div className="max-w-4xl mx-auto py-20 px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass p-12 rounded-[60px] border-brand-platinum/10"
          >
            <div className="w-24 h-24 bg-brand-green/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-brand-green/20">
              <Zap className="w-12 h-12 text-brand-green" />
            </div>
            <h1 className="text-5xl font-black text-brand-platinum mb-6 tracking-tighter uppercase">
              The Fatigue <span className="text-brand-green">Wall</span>
            </h1>
            <p className="text-xl text-brand-platinum/60 mb-12 max-w-2xl mx-auto leading-relaxed">
              In the agentic age, you don't just verify once. You verify <span className="text-brand-platinum font-bold italic underline decoration-brand-green underline-offset-4">thousands</span> of times. 
              Master the cognitive drain of the "Verification Tax."
            </p>
            <button 
              onClick={startFatigueSim}
              className="px-12 py-6 bg-brand-green text-brand-black rounded-full font-black uppercase tracking-[0.2em] text-sm hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,255,0,0.2)]"
            >
              Start Endurance Test
            </button>
          </motion.div>
        </div>
      );
    }

    if (fatigueSim.isDone) {
      return (
        <div className="max-w-4xl mx-auto py-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-12 rounded-[60px] border-brand-platinum/10 text-center"
          >
            <h2 className="text-4xl font-black text-brand-platinum mb-4 uppercase tracking-tighter">Simulation Complete</h2>
            <div className="grid grid-cols-3 gap-8 my-12">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="text-xs font-black text-brand-platinum/40 uppercase tracking-widest mb-2">Accuracy</div>
                <div className={`text-4xl font-black ${fatigueSim.accuracy > 90 ? 'text-brand-green' : 'text-red-500'}`}>
                  {Math.round(fatigueSim.accuracy)}%
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="text-xs font-black text-brand-platinum/40 uppercase tracking-widest mb-2">Energy Left</div>
                <div className="text-4xl font-black text-brand-platinum">
                  {Math.round(fatigueSim.energy)}%
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                <div className="text-xs font-black text-brand-platinum/40 uppercase tracking-widest mb-2">Missed Errors</div>
                <div className="text-4xl font-black text-red-500">
                  {fatigueSim.errorsMissed}
                </div>
              </div>
            </div>

            <div className="text-left bg-black/20 p-8 rounded-3xl border border-white/5 mb-12">
              <h3 className="text-sm font-black text-brand-platinum uppercase tracking-widest mb-4">Post-Simulation Analysis</h3>
              <p className="text-brand-platinum/70 leading-relaxed italic">
                {fatigueSim.accuracy > 90 
                  ? "Exceptional focus. You maintained high standards even as cognitive load increased. This is the hallmark of a high-performance orchestrator."
                  : fatigueSim.energy < 20
                  ? "You pushed through the fatigue wall, but your accuracy suffered. In real-world orchestration, this leads to 'Slow Hallucinations' that compound into catastrophic failure."
                  : "Inconsistent verification. Your judgment wavered as the task volume increased. Focus on building sustainable verification rhythms."}
              </p>
            </div>

            <div className="flex gap-4 justify-center">
              <button 
                onClick={startFatigueSim}
                className="px-10 py-5 bg-brand-green text-brand-black rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 transition-all"
              >
                Try Again
              </button>
              <button 
                onClick={() => setView(AppView.VERIFICATION_GATEWAY)}
                className="px-10 py-5 border border-brand-platinum/20 text-brand-platinum rounded-full font-black uppercase tracking-widest text-xs hover:bg-white/5 transition-all"
              >
                Return to Gateway
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setView(AppView.VERIFICATION_GATEWAY)}
              className="w-12 h-12 rounded-xl border border-white/10 flex items-center justify-center text-brand-platinum/40 hover:text-brand-platinum hover:border-white/30 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-brand-platinum uppercase tracking-tighter">Fatigue Endurance Test</h1>
              <div className="text-[10px] font-black text-brand-green uppercase tracking-[0.3em]">Task {fatigueSim.tasksCompleted + 1} of {FATIGUE_TASKS.length}</div>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="text-right">
              <div className="text-[10px] font-black text-brand-platinum/40 uppercase tracking-widest mb-2">Cognitive Energy</div>
              <div className="w-48 h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div 
                  className={`h-full ${fatigueSim.energy > 50 ? 'bg-brand-green' : fatigueSim.energy > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${fatigueSim.energy}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-brand-platinum/40 uppercase tracking-widest mb-2">Current Accuracy</div>
              <div className="text-xl font-black text-brand-platinum">{Math.round(fatigueSim.accuracy)}%</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={fatigueSim.currentTask?.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass p-12 rounded-[40px] border-brand-platinum/10 min-h-[400px] flex flex-col justify-center"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="px-3 py-1 bg-brand-green/10 border border-brand-green/20 rounded text-[10px] font-black text-brand-green uppercase tracking-widest">
                    {fatigueSim.currentTask?.type}
                  </div>
                  <div className="text-brand-platinum/40 text-[10px] font-black uppercase tracking-widest">
                    Difficulty: {fatigueSim.currentTask?.difficulty}
                  </div>
                </div>
                <div className="text-3xl font-medium text-brand-platinum leading-relaxed mb-12 font-mono">
                  {fatigueSim.currentTask?.content}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => handleFatigueAction('verify')}
                    className="p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-brand-green/50 hover:bg-brand-green/5 transition-all group text-left"
                  >
                    <div className="text-xs font-black text-brand-platinum/40 uppercase tracking-widest mb-2 group-hover:text-brand-green">Manual Verify</div>
                    <div className="text-brand-platinum font-bold">Deep Scan Content</div>
                  </button>
                  <button 
                    onClick={() => handleFatigueAction('tool')}
                    className="p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-brand-green/50 hover:bg-brand-green/5 transition-all group text-left"
                  >
                    <div className="text-xs font-black text-brand-platinum/40 uppercase tracking-widest mb-2 group-hover:text-brand-green">Use Tool</div>
                    <div className="text-brand-platinum font-bold">Automated Cross-Check</div>
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <div className="glass p-8 rounded-[40px] border-brand-platinum/10">
              <h3 className="text-sm font-black text-brand-platinum uppercase tracking-widest mb-6">Simulation Controls</h3>
              <div className="space-y-4">
                <button 
                  onClick={() => handleFatigueAction('break')}
                  className="w-full p-4 bg-brand-platinum/5 border border-white/10 rounded-2xl text-brand-platinum font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" /> Take 5m Break (+30 Energy)
                </button>
                <button 
                  onClick={() => handleFatigueAction('skip')}
                  className="w-full p-4 border border-red-500/20 text-red-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-red-500/5 transition-all"
                >
                  Skip Verification (High Risk)
                </button>
              </div>
            </div>

            <div className="glass p-8 rounded-[40px] border-brand-platinum/10">
              <h3 className="text-sm font-black text-brand-platinum uppercase tracking-widest mb-6">Live Log</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {fatigueSim.history.slice().reverse().map((h, i) => (
                  <div key={i} className="text-[10px] font-medium border-l-2 border-white/10 pl-3 py-1">
                    <span className="text-brand-platinum/40 uppercase tracking-widest mr-2">{h.action}</span>
                    <span className={h.task.hasError && h.action === 'skip' ? 'text-red-500' : 'text-brand-platinum/60'}>
                      {h.task.title || `Task ${h.task.id}`}
                    </span>
                  </div>
                ))}
                {fatigueSim.history.length === 0 && (
                  <div className="text-[10px] text-brand-platinum/20 italic">Awaiting first action...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVerificationGateway = () => {
    return (
      <div className="max-w-7xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="mb-16">
          <button 
            onClick={() => setView(AppView.HUB)}
            className="text-brand-platinum/40 hover:text-brand-green transition-colors flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest mb-8"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Hub
          </button>
          <h1 className="text-6xl font-black tracking-tighter text-brand-platinum mb-4 uppercase">
            Verification <span className="text-brand-green">Simulations</span>
          </h1>
          <p className="text-xl text-brand-platinum/60 max-w-2xl">
            Master the skills required to maintain accuracy without sacrificing the speed of AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Tile 1: The Fatigue Wall (Moved to first) */}
          <div 
            onClick={() => setView(AppView.VERIFICATION_FATIGUE)}
            className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
              <Zap className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20 group-hover:scale-110 transition-transform shrink-0">
                  <Zap className="w-7 h-7 text-brand-green" />
                </div>
                <h2 className="text-2xl font-bold text-brand-platinum group-hover:text-brand-green transition-colors leading-tight uppercase">The Fatigue Wall</h2>
              </div>
              <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
                Test your endurance. Learn to manage cognitive load and maintain accuracy across high-volume verification streams.
              </p>
            </div>
            <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
              Launch Simulation <span className="group-hover:translate-x-2 transition-transform">→</span>
            </div>
          </div>

          {/* Tile 2: Triage & ROI */}
          <div 
            onClick={() => setView(AppView.VERIFICATION)}
            className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
              <ShieldCheck className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20 group-hover:scale-110 transition-transform shrink-0">
                  <ShieldCheck className="w-7 h-7 text-brand-green" />
                </div>
                <h2 className="text-2xl font-bold text-brand-platinum group-hover:text-brand-green transition-colors leading-tight uppercase">Verification Triage & ROI Simulator</h2>
              </div>
              <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
                Master the "Fact-Check Tax." Learn to triage AI outputs based on risk and complexity to maximize your effective productivity.
              </p>
            </div>
            <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
              Launch Simulation <span className="group-hover:translate-x-2 transition-transform">→</span>
            </div>
          </div>

          {/* Tile 3: The Verification Instinct */}
          <div 
            onClick={() => setView(AppView.VERIFICATION_INSTINCT)}
            className="group relative glass p-8 rounded-[40px] border-brand-platinum/5 hover:border-brand-green/50 transition-all cursor-pointer overflow-hidden shadow-2xl hover:shadow-brand-green/10 flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity text-brand-green">
              <Shield className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 bg-brand-green/10 rounded-xl flex items-center justify-center border border-brand-green/20 group-hover:scale-110 transition-transform shrink-0">
                  <Shield className="w-7 h-7 text-brand-green" />
                </div>
                <h2 className="text-2xl font-bold text-brand-platinum group-hover:text-brand-green transition-colors leading-tight uppercase">The Verification Instinct</h2>
              </div>
              <p className="text-brand-platinum/70 text-base leading-relaxed mb-6">
                Build a reflexive, efficient verification habit that spots "slow hallucinations" before they compound into costly rework.
              </p>
            </div>
            <div className="relative z-10 mt-auto flex items-center gap-2 text-brand-green font-bold uppercase tracking-widest text-sm">
              Launch Simulation <span className="group-hover:translate-x-2 transition-transform">→</span>
            </div>
          </div>
        </div>
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
      case AppView.VERIFICATION_INSTINCT: return renderVerification();
      case AppView.VERIFICATION_FATIGUE: return renderVerificationFatigue();
      case AppView.VERIFICATION_GATEWAY: return renderVerificationGateway();
      case AppView.LEARN: return renderLearn();
      case AppView.TASTE: return renderTaste();
      case AppView.DEFINE_THE_WHAT: return renderDefineTheWhat();
      default: return renderHub();
    }
  };

  return <Layout activeView={view} setView={setView}>{renderContent()}</Layout>;
};

export default App;