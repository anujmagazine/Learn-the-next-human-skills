
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface VisualizerProps {
  taskCount: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ taskCount }) => {
  const serialTime = taskCount * 120; // 2 hours per task traditionally
  const parallelTime = (serialTime / 25) + 15; // 25x speedup + 15m coordination

  const data = [
    { name: 'Doing it yourself', time: serialTime, color: '#475569', label: 'Sequential (Linear)' },
    { name: 'AI Orchestration', time: parallelTime, color: '#94c840', label: 'Parallel (Exponential)' },
  ];

  const hoursSaved = ((serialTime - parallelTime) / 60).toFixed(1);

  return (
    <div className="glass p-6 rounded-3xl border-brand-green/20">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-brand-platinum">The Efficiency Gap</h3>
          <p className="text-xs text-brand-platinum/40">Time comparison in minutes</p>
        </div>
        <div className="bg-brand-green/10 text-brand-green px-3 py-1 rounded-full text-[10px] font-bold border border-brand-green/20 uppercase tracking-widest">
          SAVED: {hoursSaved} HOURS
        </div>
      </div>
      
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: -20, right: 20 }}>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" hide />
            <Tooltip 
              cursor={{ fill: 'transparent' }}
              contentStyle={{ backgroundColor: '#121a44', border: '1px solid rgba(229, 230, 230, 0.1)', borderRadius: '12px', color: '#e5e6e6' }}
            />
            <Bar dataKey="time" radius={[0, 10, 10, 0]} barSize={40}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-4 text-center">
        <div className="p-3 bg-brand-platinum/5 rounded-xl border border-brand-platinum/5">
          <div className="text-[10px] font-bold text-brand-platinum/30 mb-1 uppercase tracking-widest">Serial Output</div>
          <div className="font-mono text-sm text-brand-platinum/60">1.0x Velocity</div>
        </div>
        <div className="p-3 bg-brand-green/10 rounded-xl border border-brand-green/20">
          <div className="text-[10px] font-bold text-brand-green/60 mb-1 uppercase tracking-widest">Nexus Velocity</div>
          <div className="font-mono text-sm text-brand-green">~{taskCount}x Velocity</div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;
