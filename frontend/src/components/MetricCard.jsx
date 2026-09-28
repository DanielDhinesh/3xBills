import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MetricCard = ({ title, value, icon: Icon, trend, trendValue, color = "blue", subtitle }) => {
  const colorMap = {
    blue: "from-blue-600/20 to-blue-500/5 text-blue-400 border-blue-500/20",
    emerald: "from-emerald-600/20 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
    amber: "from-amber-600/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    purple: "from-purple-600/20 to-purple-500/5 text-purple-400 border-purple-500/20",
    indigo: "from-indigo-600/20 to-indigo-500/5 text-indigo-400 border-indigo-500/20",
    rose: "from-rose-600/20 to-rose-500/5 text-rose-400 border-rose-500/20"
  };

  const iconBgMap = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/30"
  };

  return (
    <div className={`p-3.5 sm:p-4 md:p-5 rounded-2xl glass-card bg-gradient-to-b ${colorMap[color] || colorMap.blue} border backdrop-blur-md relative overflow-hidden transition duration-300 hover:scale-[1.01] flex flex-col justify-between min-w-0`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] sm:text-xs font-bold app-text-muted uppercase tracking-wider leading-tight min-w-0 break-words">
          {title}
        </span>
        {Icon && (
          <div className={`p-1.5 sm:p-2 rounded-xl border ${iconBgMap[color] || iconBgMap.blue} shrink-0`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-1">
        <h3 className="text-base sm:text-lg md:text-xl xl:text-2xl font-black app-text-primary tracking-tight truncate max-w-full" title={String(value)}>
          {value}
        </h3>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] sm:text-xs font-bold shrink-0 ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <TrendingDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-[10px] sm:text-xs app-text-muted mt-1.5 truncate">{subtitle}</p>
      )}
    </div>
  );
};

export default MetricCard;
