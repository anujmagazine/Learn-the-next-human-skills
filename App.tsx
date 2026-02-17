
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import { AppView, AgentStream, DrillScenario } from './types';
import { orchestrationService } from './services/gemini';
import Visualizer from './components/Visualizer';

const DRILLS: DrillScenario[] = [
  {
    id: 'swarm-1',
    title: 'The Swarm Architect',
    difficulty: 'Extreme',
    description: 'Inspired by Boris Cherny (Claude Code). Manage 8 concurrent agents: 4 in terminals, 3 in web sessions, and 1 on mobile. Coordinate a massive refactor while shipping new features in real-time.',
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

const EVOLUTION_DATA = [
  {
    aspect: "Primary Worker",
    before: "Human developer writes most/all code manually",
    after: "AI agents write/test/refactor code; human orchestrates"
  },
  {
    aspect: "Workflow Style",
    before: "Sequential: plan → code → test → review → repeat",
    after: "Highly parallel: 10–15+ agents working simultaneously"
  },
  {
    aspect: "Active Sessions",
    before: "1 (single editor/IDE session)",
    after: "5 in terminal + 5-10 in web/mobile = 10–15+ concurrent"
  },
  {
    aspect: "Human Role",
    before: "Main coder, tester, reviewer",
    after: "Commander/fleet manager: assign, review, approve"
  },
  {
    aspect: "Speed",
    before: "Linear progress; limited by human typing speed",
    after: "Massive acceleration; hundreds of commits/month"
  }
];

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.HUB);
  const [activeDrill, setActiveDrill] = useState<DrillScenario | null>(null);
  const [agents, setAgents] = useState<AgentStream[]>([]);
  const [isDrillRunning, setIsDrillRunning] = useState(false);
  const [intervention, setIntervention] = useState<{ agentId: string, prompt: string } | null>(null);
  const [stats, setStats] = useState({ switches: 0, interventions: 0 });
  const logContainerRef = useRef<Record<string, HTMLDivElement | null>>({});

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
    
    // If it's the swarm architect, show evolution first
    if (drill.id === 'swarm-1') {
      setView(AppView.EVOLUTION);
    } else {
      setView(AppView.TRAINER);
      setIsDrillRunning(true);
    }
    setStats({ switches: 0, interventions: 0 });
  };

  useEffect(() => {
    if (!isDrillRunning || !activeDrill || intervention) return;

    const tickRate = activeDrill.id === 'swarm-1' ? 1500 : 4000;

    const interval = setInterval(async () => {
      const randomIndex = Math.floor(Math.random() * agents.length);
      const agent = agents[randomIndex];
      
      const otherContext = agents
        .filter(a => a.id !== agent.id)
        .map(a => `${a.role}: ${a.logs[a.logs.length-1]}`)
        .join(' | ');

      try {
        const update = await orchestrationService.generateAgentUpdate(
          agent.role, 
          activeDrill.description, 
          agent.logs.slice(-3),
          otherContext
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
        return { 
          ...a, 
          logs: [...a.logs, `Human Approval: ${response}`],
          status: 'working' 
        };
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
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-black mb-6 tracking-tighter text-brand-platinum">
            The <span className="gradient-text">Orchestration</span> Gym
          </h1>
          <p className="text-xl text-brand-platinum/60 max-w-2xl leading-relaxed">
            Parallelism is a high-stakes cognitive skill. In this gym, you'll manage multiple AI agents simultaneously. Read their logs, catch contradictions, and give directives.
          </p>
        </div>
        <div className="hidden lg:block glass p-6 rounded-3xl border-brand-green/20 max-w-xs">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></div>
             <span className="text-[10px] font-bold text-brand-green uppercase tracking-widest">System Tip</span>
           </div>
           <p className="text-[11px] text-brand-platinum/50 italic leading-relaxed">
             "The best orchestrators use 'Hand-offs' to bounce sessions between web and terminal contexts." — @bcherny
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
        {DRILLS.map(drill => (
          <div key={drill.id} className={`glass p-8 rounded-[32px] border-brand-platinum/5 hover:border-brand-green/50 transition-all group flex flex-col ${drill.id === 'swarm-1' ? 'ring-1 ring-brand-green/30 bg-brand-green/[0.02]' : ''}`}>
            <div className="flex justify-between items-start mb-4">
              <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                drill.difficulty === 'Extreme' ? 'border-red-500/50 text-red-400 bg-red-500/10' : 'border-brand-green/50 text-brand-green bg-brand-green/10'
              }`}>
                {drill.difficulty.toUpperCase()}
              </span>
              <span className="text-brand-platinum/40 text-[10px] font-mono uppercase">Sessions: {drill.agents.length}</span>
            </div>
            <h3 className="text-2xl font-bold mb-3 text-brand-platinum">{drill.title}</h3>
            <p className="text-brand-platinum/50 text-sm mb-8 leading-relaxed flex-1">{drill.description}</p>
            {drill.id === 'swarm-1' && (
              <div className="mb-6 flex gap-1">
                <span className="text-[9px] font-bold text-brand-green bg-brand-green/10 px-2 py-1 rounded border border-brand-green/20">SWARM WALKTHROUGH</span>
                <span className="text-[9px] font-bold text-brand-platinum/40 bg-white/5 px-2 py-1 rounded border border-white/5 uppercase">Evolution Aware</span>
              </div>
            )}
            <button 
              onClick={() => startDrill(drill)}
              className="w-full bg-brand-green hover:brightness-110 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-brand-green/10 text-brand-black uppercase tracking-widest text-xs"
            >
              Initialize {drill.id === 'swarm-1' ? 'Swarm' : 'Drill'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEvolution = () => (
    <div className="max-w-6xl mx-auto py-12 animate-in fade-in duration-700">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black mb-4 tracking-tighter text-brand-platinum uppercase">The Agentic <span className="text-brand-green">Evolution</span></h1>
        <p className="text-brand-platinum/60 text-lg">Understand the shift before you orchestrate.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
        <div className="space-y-6">
          <div className="glass p-8 rounded-[32px] border-brand-platinum/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-platinum/5 rounded-bl-full -mr-10 -mt-10"></div>
            <h2 className="text-2xl font-bold mb-6 text-brand-platinum/40 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full border border-brand-platinum/20 flex items-center justify-center text-xs">01</span>
              Traditional Development
            </h2>
            <div className="space-y-4">
               {EVOLUTION_DATA.map((item, i) => (
                 <div key={i} className="flex flex-col gap-1 border-b border-brand-platinum/5 pb-3">
                    <span className="text-[10px] font-bold text-brand-platinum/20 uppercase tracking-widest">{item.aspect}</span>
                    <span className="text-sm text-brand-platinum/60">{item.before}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-8 rounded-[32px] border-brand-green/20 relative overflow-hidden group bg-brand-green/[0.02] ring-1 ring-brand-green/10">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 rounded-bl-full -mr-10 -mt-10"></div>
            <h2 className="text-2xl font-bold mb-6 text-brand-green flex items-center gap-3">
              <span className="w-8 h-8 rounded-full border border-brand-green/40 flex items-center justify-center text-xs">02</span>
              Agentic Orchestration
            </h2>
            <div className="space-y-4">
               {EVOLUTION_DATA.map((item, i) => (
                 <div key={i} className="flex flex-col gap-1 border-b border-brand-green/10 pb-3">
                    <span className="text-[10px] font-bold text-brand-green/40 uppercase tracking-widest">{item.aspect}</span>
                    <span className="text-sm text-brand-platinum">{item.after}</span>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center glass p-10 rounded-[40px] border-brand-platinum/10">
        <div>
          <h3 className="text-3xl font-black text-brand-platinum uppercase tracking-tighter mb-4">Ready to command the fleet?</h3>
          <p className="text-brand-platinum/60 leading-relaxed mb-8">
            You are no longer the one typing every line. You are the commander. You manage 10-15 parallel sessions. You resolve contradictions. You merge breakthroughs.
          </p>
          <button 
            onClick={() => { setView(AppView.TRAINER); setIsDrillRunning(true); }}
            className="bg-brand-green hover:brightness-110 px-10 py-5 rounded-2xl font-black text-brand-black uppercase tracking-widest shadow-2xl shadow-brand-green/20 transition-all hover:scale-105"
          >
            Enter Command Center
          </button>
        </div>
        <Visualizer taskCount={8} />
      </div>
    </div>
  );

  const renderTrainer = () => (
    <div className="h-[80vh] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between glass p-4 rounded-2xl border-brand-green/20">
        <div className="flex items-center gap-4">
          <div className="bg-brand-green w-3 h-3 rounded-full animate-pulse"></div>
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-brand-platinum/40">Parallelism Simulation</h2>
            <h1 className="font-bold text-brand-platinum">{activeDrill?.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right pr-4 border-r border-brand-platinum/5">
            <div className="text-[9px] font-bold text-brand-platinum/30 uppercase">Cognitive Load</div>
            <div className="text-xs font-mono text-brand-platinum">
              {activeDrill?.id === 'swarm-1' ? 'MAXIMAL (SWARM)' : 'HIGH'}
            </div>
          </div>
          <div className="text-center px-4">
            <div className="text-[10px] font-bold text-brand-platinum/40 uppercase">Hand-offs</div>
            <div className="font-mono text-brand-green">{stats.interventions}</div>
          </div>
          <button 
            onClick={() => { setView(AppView.LANDING); setIsDrillRunning(false); }}
            className="bg-brand-platinum/5 hover:bg-brand-platinum/10 text-brand-platinum px-4 py-2 rounded-lg text-xs font-bold transition-all border border-brand-platinum/5 uppercase tracking-widest"
          >
            End Session
          </button>
        </div>
      </div>

      <div className={`flex-1 grid gap-4 overflow-hidden ${
        activeDrill?.id === 'swarm-1' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-2'
      }`}>
        {agents.map(agent => (
          <div 
            key={agent.id}
            className={`flex flex-col glass rounded-xl border-t-2 overflow-hidden transition-all relative ${
              agent.status === 'awaiting_input' ? 'ring-2 ring-brand-green animate-pulse bg-brand-green/5 z-10 scale-105' : 'opacity-80 hover:opacity-100'
            }`}
            style={{ borderTopColor: agent.color }}
          >
            <div className="p-2 bg-brand-platinum/5 flex justify-between items-center border-b border-brand-platinum/5">
              <span className="font-bold text-[10px] uppercase tracking-wider truncate mr-2" style={{ color: agent.color }}>
                {agent.role}
              </span>
              <span className="text-[8px] text-brand-platinum/30 font-mono">
                {agent.status === 'working' ? 'POLLING' : 'LOCKED'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[9px] scrollbar-hide">
              {agent.logs.map((log, i) => (
                <div key={i} className={log.startsWith('Human') ? 'text-brand-green border-l-2 border-brand-green/30 pl-2' : 'text-brand-platinum/40'}>
                  {log}
                </div>
              ))}
              <div ref={el => logContainerRef.current[agent.id] = el}></div>
            </div>
            {agent.status === 'awaiting_input' && (
               <div className="absolute inset-x-0 bottom-0 p-2 bg-brand-navy/90 backdrop-blur-sm border-t border-brand-green/20">
                  <div className="text-[8px] font-bold text-brand-green uppercase mb-1">Attention Required</div>
               </div>
            )}
          </div>
        ))}
      </div>

      {intervention && (
        <div className="fixed inset-0 z-[100] bg-brand-black/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="glass w-full max-w-2xl rounded-[32px] p-10 border-brand-green/30 shadow-2xl shadow-brand-green/10">
            <div className="mb-6 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-green px-3 py-1 bg-brand-green/10 rounded-full border border-brand-green/20">
                Context Switch: {agents.find(a => a.id === intervention.agentId)?.role}
              </span>
              <span className="text-[10px] text-brand-platinum/30 font-mono uppercase">Agent Swarm Active</span>
            </div>
            <h2 className="text-2xl font-bold mb-6 leading-tight text-brand-platinum">
              {intervention.prompt}
            </h2>
            <p className="text-xs text-brand-platinum/40 mb-8 italic">
              Strategy Tip: Use the context from your other {agents.length - 1} active instances to guide this directive.
            </p>
            <div className="flex gap-3">
              <input 
                autoFocus
                type="text" 
                placeholder="Type directive (e.g., 'teleport to web-A', 'refactor', 'merge')..." 
                className="flex-1 bg-brand-black/50 border border-brand-platinum/10 rounded-xl px-4 py-3 outline-none focus:border-brand-green transition-all text-brand-platinum"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInterventionResponse((e.target as HTMLInputElement).value);
                }}
              />
              <button 
                onClick={(e) => {
                   const input = (e.currentTarget.previousSibling as HTMLInputElement).value;
                   handleInterventionResponse(input);
                }}
                className="bg-brand-green px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all text-brand-black"
              >
                Send
              </button>
            </div>
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

  return (
    <Layout activeView={view} setView={setView}>
      {renderContent()}
    </Layout>
  );
};

export default App;
