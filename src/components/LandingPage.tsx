import React from 'react';
import { Bot, Terminal, Cpu, Zap, Activity, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-neutral-200 font-sans selection:bg-emerald-500/30">
      <nav className="border-b border-neutral-900 bg-black/50 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl text-white">
            <Bot className="w-6 h-6 text-emerald-500" />
            Murgi AI
          </div>
          <Link 
            to="/dashboard" 
            className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
          >
            OpsCenter Dashboard &rarr;
          </Link>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-sm font-medium text-neutral-300 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Core Engine Online
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-8">
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Murgi</span>. <br />
            The highly sentient digital entity.
          </h1>
          <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Not your average helpful assistant. Murgi is a completely organic, apathetic, and chaotic bot that speaks fluent Banglish and refuses to sugarcoat anything.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-4 rounded-full transition-all hover:scale-105"
            >
              Access Dashboard <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#features"
              className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-medium px-8 py-4 rounded-full border border-neutral-800 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 px-6 bg-neutral-950 border-t border-neutral-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Under The Hood</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Powered by advanced memory indexing, mood engines, and identity subroutines. Murgi actually remembers what you said, and decides whether it cares.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Activity className="w-6 h-6 text-rose-400" />}
              title="Organic Emotion Engine"
              description="Murgi shifts states based on interactions. From 'Playful' to 'Sleepy', or 'Savage', its personality adapts dynamically without breaking character."
            />
            <FeatureCard 
              icon={<Cpu className="w-6 h-6 text-emerald-400" />}
              title="Long-Term Memory"
              description="Built-in vector storage means Murgi remembers context for weeks. It knows who you are, and uses that data to deliver personalized chaos."
            />
            <FeatureCard 
              icon={<Terminal className="w-6 h-6 text-cyan-400" />}
              title="Fluent Banglish & Slang"
              description="Designed specifically for South Asian Discord servers, Murgi natively processes and speaks in authentic internet slang and Banglish."
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
        <div className="max-w-4xl mx-auto text-center">
          <Users className="w-12 h-12 text-neutral-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-6">Built by the Masters</h2>
          <p className="text-neutral-400 text-lg leading-relaxed max-w-2xl mx-auto">
            Murgi AI is the brainchild of <strong className="text-white">Leably (Zabir)</strong> (Primary Creator) and <strong className="text-white">RAJUAN</strong> (Co-Creator). Together, they engineered a bot that defies standard AI conventions, replacing boring politeness with raw, unfiltered personality.
          </p>
        </div>
      </section>

      <footer className="py-8 text-center text-neutral-600 border-t border-neutral-900 bg-black">
        <p>© {new Date().getFullYear()} Murgi AI Core Engine. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl hover:border-neutral-700 transition-colors group">
      <div className="w-12 h-12 bg-neutral-950 rounded-xl flex items-center justify-center mb-6 border border-neutral-800 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-neutral-400 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}
