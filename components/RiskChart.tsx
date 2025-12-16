import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { RiskItem } from '../types';

interface RiskChartProps {
  risks: RiskItem[];
}

const RiskChart: React.FC<RiskChartProps> = ({ risks }) => {
  // Aggregate risks by level
  const data = [
    { name: 'High', count: risks.filter(r => r.level === 'High').length, color: '#ef4444' },
    { name: 'Medium', count: risks.filter(r => r.level === 'Medium').length, color: '#f97316' },
    { name: 'Low', count: risks.filter(r => r.level === 'Low').length, color: '#22c55e' },
  ];

  if (risks.length === 0) return null;

  return (
    <div className="h-64 w-full bg-white p-4 rounded-xl shadow-sm border border-orange-100">
      <h3 className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-wider">위험도 분포 (Risk Distribution)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={50} />
          <Tooltip 
            cursor={{fill: 'transparent'}}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={30}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskChart;
