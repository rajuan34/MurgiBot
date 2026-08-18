import React from 'react';
import { Smile, Zap, Coffee, Moon, Sparkles, Brain, Flame, Heart, Eye, UserCheck, Activity } from 'lucide-react';

export function MoodIndicator({ mood }: { mood?: string }) {
  if (!mood) return null;

  const getMoodConfig = (m: string) => {
    switch (m) {
      case 'Playful': return { icon: Smile, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
      case 'Chill': return { icon: Coffee, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
      case 'Chaos': return { icon: Zap, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' };
      case 'Wise': return { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' };
      case 'Sleepy': return { icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-400/10', border: 'border-indigo-400/20' };
      case 'Competitive': return { icon: Flame, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' };
      case 'Supportive': return { icon: Heart, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20' };
      case 'Observer': return { icon: Eye, color: 'text-neutral-400', bg: 'bg-neutral-400/10', border: 'border-neutral-400/20' };
      case 'Curious': return { icon: Sparkles, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20' };
      case 'RESPECTFUL_SON_CALM': return { icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Son Mode' };
      case 'RESPECTFUL_FRIENDLY': return { icon: UserCheck, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', label: 'Co-Creator Mode' };
      default: return { icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
    }
  };

  const config = getMoodConfig(mood);
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.bg} ${config.border} ${config.color} text-xs font-medium`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="capitalize">{config.label || mood}</span>
    </div>
  );
}
