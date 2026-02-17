import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { AppView, AgentStream, DrillScenario } from './types';
import { orchestrationService } from './services/gemini';
import Visualizer from './components/Visualizer';

const DRILLS: DrillScenario[] = [
  {
    id: 'swarm-1',
    title: 'The Agent Fleet Commander',
    difficulty: 'Extreme',
    description: 'Stop being the coder and start being the Commander. Manage 8 concurrent AI agents simultaneously to refactor, test, and ship at 10x speed. Inspired by Boris Cherny’s multi-agent workflow.',
    agents: ['Terminal-1 (Auth)', 'Terminal-2 (Engine)', 'Terminal-3 (UI)', 'Terminal-4 (Testing)', 'Web-A (Research)', 'Web-B (Docs)', 'Web-C (Simplification)', 'Mobile-Review']
  },
  {
    id: 'crisis-1',
    title: 'The Global Launch Pivot',
    difficulty: 'Hard',
    description: 'A major competitor just released a similar product 2 hours before your launch. Manage 4 agents to pivot the entire strategy in real-time.',
    agents: ['Marketing Strategist', 'Technical Lead', 'Legal Counsel', 'PR Spokesperson']
  },
  {
    id: 'crisis-2',
    title: 'Cyber-Security Breach',
    difficulty: 'Extreme',
    description: 'Active data exfiltration in progress. Coordinate Defense, PR, Customer Support, and Forensic teams simultaneously.',
    agents: ['Infra Security', 'PR Manager', 'Support Lead', 'Legal']
  }
];

// Realistic hours for standard software tasks (Traditional Sequential Approach)
const SIM_TASKS = [
  { id: 1, name: 'User Authentication', duration: 24 }, // 3 days
  { id: 2, name: 'Database Schema', duration: 12 },    // 1.5 days
  { id: 3, name: 'API Endpoints', duration: 32 },      // 4 days
  { id: 4, name: 'Frontend UI', duration: 40 },        // 5 days
  { id: 5, name: 'Payment Integration', duration: 20 }, // 2.5 days
  { id: 6, name: 'Email Service', duration: 8 },       // 1 day
  { id: 7, name: 'Analytics Dashboard', duration: 28 }, // 3.5 days
  { id: 8, name: 'Testing Suite', duration: 24 },      // 3 days
  { id: 9, name: 'Documentation', duration: 8 },       // 1 day
  { id: 10, name: 'Deployment Pipeline', duration: 12 },// 1.5 days
  { id: 11, name: 'Error Handling', duration: 16 },    // 2 days
  { id: 12, name: 'Performance Optimization', duration: 24 }, // 3 days
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HUB);
  const [activeDrill, setActiveDrill] = useState<DrillScenario | null>(null);
  const [agents, setAgents] = useState<AgentStream[]>([]);
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [intervention, setIntervention] = useState<{ agentId: string, prompt: string } | null>(null);
  const [stats, setStats] = useState({ switches: 0, interventions: 0 });
  const logContainerRef = useRef<Record<string, HTMLDivElement | null>>({});

  // Simulation States
  const [simMode, setSimMode] = useState<'traditional' | 'modern'>('traditional');
  const [simActive, setSimActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [taskProgress, setTaskProgress] = useState<number[]>(new Array(SIM_TASKS.length).fill(0));
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<number>>(new Set());

  const startDrill = (drill: DrillScenario) => {
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
      resetSimulation('traditional');
    } else {
      setView(AppView.TRAINER);
      setIsDrillRunning(true);
    }
    setStats({ switches: 0, interventions: 0 });
  };

  const resetSimulation = (mode: 'traditional' | 'modern') => {
    setSimMode(mode);
    setSimActive(false);
    setElapsedTime(0);
    setTaskProgress(new Array(SIM_TASKS.length).fill(0));
    setCompletedTaskIds(new Set());
  };

  useEffect(() => {
    agents.forEach(agent => {
      const container = logContainerRef.current[agent.id];
      if (container) {
        container.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [agents]);

  // Simulation speed controller
  // In Traditional, we want it to feel slow but not take literal days. 1s sim = 8h work.
  // In Modern, 1s sim = 1h work (since everything happens at once).
  useEffect(() => {
    if (!simActive || view !== AppView.EVOLUTION) return;
    
    const tickRate = 100; // 10 ticks per simulation second
    const interval = setInterval(() => {
      setTaskProgress(prevProgress => {
        const newProgress = [...prevProgress];
        
        if (simMode === 'traditional') {
          // Sequential: Only work on the first incomplete task
          const nextTaskIndex = SIM_TASKS.findIndex((_, idx) => !completedTaskIds.has(SIM_TASKS[idx].id));
          if (nextTaskIndex !== -1) {
            const task = SIM_TASKS[nextTaskIndex];
            // Speed factor: Complete 2h of work every tick (20h per second)
            const workPerTick = 2.0; 
            newProgress[nextTaskIndex] += (workPerTick / task.duration) * 100;
            
            // Increment elapsed time based on work done
            setElapsedTime(prev => parseFloat((prev + workPerTick).toFixed(1)));

            if (newProgress[nextTaskIndex] >= 100) {
              newProgress[nextTaskIndex] = 100;
              setCompletedTaskIds(prev => new Set(prev).add(task.id));
            }
          } else {
            setSimActive(false);
          }
        } else {
          // Parallel: All tasks progress simultaneously
          let allDone = true;
          // In modern, the constraint is human attention (coordination).
          // We assume the work happens 20x faster in parallel.
          const workPerTick = 0.4; 
          
          SIM_TASKS.forEach((task, idx) => {
            if (newProgress[idx] < 100) {
              newProgress[idx] += (workPerTick / (task.duration / 20)) * 100;
              allDone = false;
              if (newProgress[idx] >= 100) {
                newProgress[idx] = 100;
                setCompletedTaskIds(prev => new Set(prev).add(task.id));
              }
            }
          });
          
          // Elapsed time in modern represents wall-clock time passed
          setElapsedTime(prev => parseFloat((prev + workPerTick).toFixed(1)));
          
          if (allDone) setSimActive(false);
        }
        return newProgress;
      });
    }, tickRate);
    return () => clearInterval(interval);
  }, [simActive, simMode, completedTaskIds, view]);

  useEffect(() => {
    if (!isDrillRunning || !activeDrill || intervention) return;
    const tickRate = activeDrill.id === 'swarm-1' ? 1500 : 4000;
    const interval = setInterval(async () => {
      const randomIndex = Math.floor(Math.random() * agents.length);
      const agent = agents[randomIndex];
      const otherContext = agents.filter(a => a.id !== agent.id).map(a => `${a.role}: ${a.logs[a.logs.length-1]}`).join(' | ');
      try {
        const update = await orchestrationService.generateAgentUpdate(agent.role, activeDrill.description, agent.logs.slice(-3), otherContext);
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
        {/* Parallelism - Active */}
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

        {/* Verification Fatigue - Coming Soon */}
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

        {/* Interview AI Models - Coming Soon */}
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

        {/* Resist Intellectual Laziness - Coming Soon */}
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
      
      <div className="mt-20 glass p-10 rounded-[40px] border-brand-platinum/5 text-center">
        <h3 className="text-sm font-bold text-brand-platinum/30 uppercase tracking-widest mb-6">The Future Skill Matrix</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {['Context Switching', 'Hallucination Spotting', 'System Prompting', 'Agent Synthesis', 'Strategic De-coupling', 'Agent Vetting', 'Multi-instance Swarming'].map(skill => (
            <span key={skill} className="px-4 py-2 bg-brand-platinum/5 rounded-full text-xs font-medium text-brand-platinum/40 border border-brand-platinum/5">
              {skill}
            </span>
          ))}
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
          <div key={drill.id} className="glass p-8 rounded-[32px] border-brand-platinum/5 flex flex-col group hover:border-brand-green/20 transition-all">
            <div className="flex justify-between items-start mb-6">
              <div className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${
                drill.difficulty === 'Extreme' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-brand-green/10 text-brand-green border-brand-green/20'
              }`}>
                {drill.difficulty}
              </div>
              <div className="text-xs font-mono text-brand-platinum/20">{drill.agents.length} AGENTS</div>
            </div>
            <h3 className="text-xl font-bold text-brand-platinum mb-4 group-hover:text-brand-green transition-colors">{drill.title}</h3>
            <p className="text-xs text-brand-platinum/60 mb-8 leading-relaxed flex-1">
              {drill.description}
            </p>
            <button 
              onClick={() => startDrill(drill)}
              className="w-full bg-brand-platinum/5 group-hover:bg-brand-green group-hover:text-brand-black transition-all py-4 rounded-xl font-bold uppercase tracking-widest text-[10px]"
            >
              Initialize {drill.id === 'swarm-1' ? 'Fleet' : 'Drill'}
            </button>
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
DEPLOY 12 specialized autonomous agents to build a high-scale e-commerce engine.
COORDINATE tasks from authentication to deployment concurrently.
ENSURE context sharing between Terminal-1 (Auth) and Terminal-2 (Engine).
GOAL: High-fidelity system delivery with parallel execution.`;

    const formatTime = (hours: number) => {
      if (hours < 8) return `${hours.toFixed(1)} Work Hours`;
      const days = (hours / 8).toFixed(1);
      return `${days} Work Days`;
    };

    return (
      <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-700">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setView(AppView.LANDING)} 
            className="text-brand-platinum/50 hover:text-brand-green transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Missions
          </button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter text-brand-platinum uppercase">
            The Evolution of <span className="gradient-text">Engineering</span>
          </h1>
          <p className="text-brand-platinum/60 text-lg max-w-2xl mx-auto">
            From sequential coding to parallel AI orchestration—see how engineering transformed from writing every line to conducting an orchestra.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="glass p-1 rounded-2xl flex border border-brand-platinum/10">
            <button onClick={() => resetSimulation('traditional')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-widest ${simMode === 'traditional' ? 'bg-brand-platinum/20 text-brand-platinum' : 'text-brand-platinum/40 hover:text-brand-platinum'}`}>Traditional (Before)</button>
            <button onClick={() => resetSimulation('modern')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-widest ${simMode === 'modern' ? 'bg-brand-green/20 text-brand-green' : 'text-brand-platinum/40 hover:text-brand-green'}`}>Modern (After)</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass p-6 rounded-3xl border-brand-platinum/5">
            <div className="text-[10px] font-bold text-brand-platinum/30 uppercase tracking-widest mb-1">Total Effort Elapsed</div>
            <div className="text-3xl font-mono text-brand-platinum">{formatTime(elapsedTime)}</div>
          </div>
          <div className="glass p-6 rounded-3xl border-brand-platinum/5">
            <div className="text-[10px] font-bold text-brand-platinum/30 uppercase tracking-widest mb-1">Tasks Completed</div>
            <div className="text-3xl font-mono text-brand-platinum">{completedTaskIds.size} / {SIM_TASKS.length}</div>
          </div>
          <div className="glass p-6 rounded-3xl border-brand-platinum/5">
            <div className="text-[10px] font-bold text-brand-platinum/30 uppercase tracking-widest mb-1">Project Velocity</div>
            <div className={`text-3xl font-mono ${simMode === 'modern' ? 'text-brand-green' : 'text-brand-platinum'}`}>{simMode === 'modern' ? '20.6x' : '1.0x'}</div>
          </div>
        </div>

        <div className="glass rounded-[40px] border-brand-platinum/10 p-10 mb-12 relative overflow-hidden">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 relative">
               {simMode === 'traditional' ? <div className="w-full h-full bg-orange-500/20 rounded-full flex items-center justify-center text-3xl border-2 border-orange-500/40">🧑‍💻</div> : <div className="w-full h-full bg-brand-green/20 rounded-full flex items-center justify-center text-3xl border-2 border-brand-green/40 shadow-glow">⚡</div>}
            </div>
            <h2 className="text-2xl font-bold text-brand-platinum uppercase">{simMode === 'traditional' ? 'Sequential Manual Production' : 'Parallel Agentic Orchestration'}</h2>
            <p className="text-brand-platinum/40 text-sm mt-2 text-center max-w-2xl">{simMode === 'traditional' ? 'One engineer writing logic, debugging, and deploying linearly. High individual effort, low organizational speed.' : 'One commander managing 12 specialized agents. Bottleneck shifted from coding speed to human coordination bandwidth.'}</p>
          </div>

          {/* Traditional Start State: IDE Block */}
          {simMode === 'traditional' && !simActive && completedTaskIds.size === 0 && (
            <div className="max-w-3xl mx-auto mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
               <div className="glass rounded-xl overflow-hidden border border-brand-platinum/10 shadow-2xl">
                 <div className="bg-brand-navy/60 px-4 py-2 flex items-center justify-between border-b border-brand-platinum/5">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-green/50"></div>
                    </div>
                    <div className="text-[10px] font-mono text-brand-platinum/40 uppercase tracking-widest">manual_implementation.ts</div>
                 </div>
                 <div className="p-6 font-mono text-sm leading-relaxed overflow-hidden">
                    <pre className="text-brand-platinum/80 whitespace-pre-wrap">
                      {codeSnippet.split('\n').map((line, i) => {
                        const highlighted = line
                          .replace(/(function|async|await|return|throw|new|const)/g, '<span class="text-purple-400">$1</span>')
                          .replace(/(Error|db|credentials|user)/g, '<span class="text-blue-400">$1</span>')
                          .replace(/(\".*?\")/g, '<span class="text-brand-green">$1</span>');
                        return (
                          <div key={i} className="flex gap-4">
                            <span className="text-brand-platinum/20 w-4 text-right select-none">{i + 1}</span>
                            <span dangerouslySetInnerHTML={{ __html: highlighted }} />
                          </div>
                        );
                      })}
                    </pre>
                 </div>
               </div>
               
               <div className="mt-12 flex justify-center">
                  <button 
                    onClick={() => setSimActive(true)} 
                    className="bg-brand-green hover:brightness-110 px-12 py-5 rounded-2xl font-black text-brand-black uppercase tracking-widest shadow-2xl shadow-brand-green/20 transition-all hover:scale-105"
                  >
                    Start Production Simulation
                  </button>
               </div>
            </div>
          )}

          {/* Modern Start State: Prompt Box */}
          {simMode === 'modern' && !simActive && completedTaskIds.size === 0 && (
            <div className="max-w-3xl mx-auto mb-10 animate-in fade-in slide-in-from-top-4 duration-1000">
              <div className="glass rounded-3xl overflow-hidden border border-brand-green/30 shadow-2xl bg-brand-green/[0.02]">
                <div className="bg-brand-green/10 px-6 py-4 flex items-center justify-between border-b border-brand-green/20">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-brand-green shadow-glow"></div>
                    <span className="text-xs font-black text-brand-green uppercase tracking-[0.2em]">Deployment Directive</span>
                  </div>
                  <div className="text-[10px] font-mono text-brand-platinum/40 uppercase tracking-widest">AI-ORCHESTRATOR-v1.0</div>
                </div>
                <div className="p-10 font-mono text-lg leading-relaxed text-brand-platinum relative">
                  <div className="absolute top-4 right-6 text-4xl opacity-10">🪄</div>
                  <p className="whitespace-pre-wrap italic">
                    {modernPrompt.split('\n').map((line, i) => (
                      <span key={i} className="block mb-2">
                        <span className="text-brand-green mr-4 select-none">›</span>
                        {line}
                      </span>
                    ))}
                  </p>
                  <div className="mt-8 pt-8 border-t border-brand-platinum/5 flex items-center gap-4">
                     <div className="w-12 h-1 bg-brand-green/30 rounded-full overflow-hidden">
                        <div className="w-full h-full bg-brand-green animate-pulse"></div>
                     </div>
                     <span className="text-[10px] font-bold text-brand-green/40 uppercase tracking-widest animate-pulse">Initializing Agent Swarm...</span>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex justify-center">
                <button 
                  onClick={() => setSimActive(true)} 
                  className="bg-brand-green hover:brightness-110 px-16 py-6 rounded-2xl font-black text-brand-black uppercase tracking-widest shadow-glow transition-all hover:scale-105 text-lg"
                >
                  Start Fleet Execution
                </button>
              </div>
            </div>
          )}

          {/* Regular Controls & Grid (Shown during simulation or after completion) */}
          {(simActive || completedTaskIds.size > 0) && (
            <>
              <div className={`grid gap-4 ${simMode === 'modern' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4' : 'grid-cols-1'}`}>
                {SIM_TASKS.map((task, idx) => (
                  <div key={task.id} className={`p-4 rounded-2xl border transition-all duration-500 ${completedTaskIds.has(task.id) ? 'bg-brand-green/10 border-brand-green/30' : taskProgress[idx] > 0 ? 'bg-brand-platinum/5 border-brand-platinum/20' : 'bg-white/5 border-white/5'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${completedTaskIds.has(task.id) ? 'text-brand-green' : 'text-brand-platinum/40'}`}>{simMode === 'modern' ? `Agent ${idx + 1}` : `Phase ${idx + 1}`}</span>
                      <span className="text-[10px] font-mono text-brand-platinum/30">{task.duration}h Effort</span>
                    </div>
                    <div className="text-xs font-bold text-brand-platinum mb-3 truncate">{task.name}</div>
                    <div className="w-full h-1.5 bg-brand-platinum/5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-100 ${simMode === 'modern' ? 'bg-brand-green shadow-glow' : 'bg-orange-500'}`} style={{ width: `${taskProgress[idx]}%` }}></div>
                    </div>
                    <div className="mt-2 text-[8px] font-mono text-brand-platinum/20 uppercase">
                      {completedTaskIds.has(task.id) ? 'Status: Integrated' : taskProgress[idx] > 0 ? 'Status: Processing' : 'Status: Queued'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex justify-center gap-4">
                {simActive && <button onClick={() => setSimActive(false)} className="bg-white/10 hover:bg-white/20 px-10 py-4 rounded-2xl font-black text-brand-platinum uppercase tracking-widest transition-all">Pause Sim</button>}
                {!simActive && completedTaskIds.size > 0 && <button onClick={() => resetSimulation(simMode)} className="bg-white/10 hover:bg-white/20 px-10 py-4 rounded-2xl font-black text-brand-platinum uppercase tracking-widest transition-all">Restart</button>}
              </div>
            </>
          )}
        </div>

        {completedTaskIds.size === SIM_TASKS.length && !simActive && (
          <div className="animate-in slide-in-from-bottom-10 duration-1000 mb-12">
            <div className="glass p-12 rounded-[40px] border-brand-green/30 text-center relative">
               <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-brand-green rounded-full flex items-center justify-center text-3xl shadow-glow">🎉</div>
               <h3 className="text-4xl font-black text-brand-platinum uppercase tracking-tighter mb-4">Development Cycle Complete!</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left mt-10">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-brand-platinum/40 uppercase tracking-widest border-b border-brand-platinum/5 pb-2">Sequential Manual Logic</h4>
                    <ul className="space-y-2 text-brand-platinum/60 text-sm">
                      <li>✅ Total Effort: 248 Work Hours</li>
                      <li>📅 Timeline: ~31 Standard Work Days</li>
                      <li>👤 1 Developer, Linear Mindset</li>
                      <li>🧱 High Context Switching Costs</li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-brand-green uppercase tracking-widest border-b border-brand-green/20 pb-2">Agentic Parallelism</h4>
                    <ul className="space-y-2 text-brand-platinum text-sm">
                      <li>✅ Total Effort: 12 Work Hours (Coordination Only)</li>
                      <li>🚀 Timeline: ~1.5 Standard Work Days</li>
                      <li>🤖 12 Autonomous Agents + 1 Commander</li>
                      <li>⚡ 20.6x Velocity Increase</li>
                    </ul>
                  </div>
               </div>
               <div className="mt-12 pt-12 border-t border-brand-platinum/5">
                  <p className="text-brand-platinum/60 italic leading-relaxed max-w-2xl mx-auto text-sm mb-12">"The bottleneck in the modern age is no longer typing or syntax. It's the high-bandwidth coordination of intelligence. To 10x your output, you must stop being the worker and start being the conductor."<br /><span className="not-italic font-bold text-brand-green mt-2 block">— Next Human Principles</span></p>
                  <button onClick={() => { setView(AppView.TRAINER); setIsDrillRunning(true); }} className="bg-brand-green hover:brightness-110 px-12 py-6 rounded-2xl font-black text-brand-black uppercase tracking-widest shadow-2xl shadow-brand-green/20 transition-all hover:scale-105 text-lg">Enter Command Center</button>
               </div>
            </div>
          </div>
        )}
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