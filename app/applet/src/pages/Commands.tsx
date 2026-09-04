import React from 'react';
import { Terminal, Shield, Gavel, Swords, Dice5, MessageSquare, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const commandCategories = [
  {
    title: "Animated Commands",
    description: "Multi-frame interactive ASCII animations.",
    icon: <Terminal className="w-5 h-5 text-purple-400" />,
    commands: [
      {
        name: "!court [@user]",
        description: "Runs an animated courtroom trial where Bohrupi slams the gavel and renders a colored verdict.",
        icon: <Gavel className="w-4 h-4 text-orange-400" />
      },
      {
        name: "!fight [@user]",
        description: "Simulates an arcade street fighter match between Bohrupi and the target user with health bars and KO.",
        icon: <Swords className="w-4 h-4 text-red-400" />
      },
      {
        name: "!biryani_roulette [@user]",
        description: "A slot-machine style animation to check what bad item the user gets in their Biryani.",
        icon: <Dice5 className="w-4 h-4 text-green-400" />
      }
    ]
  },
  {
    title: "Chat & Roast Commands",
    description: "Hilarious texts to keep the server alive.",
    icon: <MessageSquare className="w-5 h-5 text-blue-400" />,
    commands: [
      { name: "!bully [@user]", description: "Playfully bullies/roasts the target user." },
      { name: "!expose [@user]", description: "Exposes funny 'secrets' and search history about the user." },
      { name: "!hype [@user]", description: "Hypes up the user to the extreme." },
      { name: "!agree [@user]", description: "Aggressively agrees with the target user (Creator/Co-creator)." },
      { name: "!predict [@user]", description: "Predicts the funny future of the user." },
      { name: "!lore [@user]", description: "Tells funny fake lore and history about the user." }
    ]
  },
  {
    title: "Group Events",
    description: "Commands that target the whole chat.",
    icon: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
    commands: [
      { name: "!biryani_war", description: "Starts a debate/war about biryani and other local foods." },
      { name: "!nasta_check", description: "Checks if everyone in the chat has eaten their snacks/food." },
      { name: "!roast_chat", description: "Roasts the entire chat's current state or IQ level." }
    ]
  }
];

export default function Commands() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 selection:bg-purple-500/30">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8 flex items-center space-x-4">
          <Link to="/" className="p-2 hover:bg-neutral-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-neutral-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Terminal className="w-8 h-8 text-purple-500" />
              Bot Commands
            </h1>
            <p className="text-neutral-400 mt-2">
              Explore all the available commands for Bohrupi.
            </p>
          </div>
        </div>

        <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-4 mb-10 flex items-start gap-4">
          <Shield className="w-6 h-6 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-purple-300 font-semibold mb-1">Admin Only Access</h3>
            <p className="text-neutral-400 text-sm">
              These commands can only be executed by the Creator and Co-creator. Unauthorized users will receive a funny rejection message from Bohrupi.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {commandCategories.map((category, idx) => (
            <div key={idx} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-neutral-800 rounded-lg">
                  {category.icon}
                </div>
                <h2 className="text-xl font-semibold text-white">{category.title}</h2>
              </div>
              <p className="text-neutral-400 text-sm mb-6">{category.description}</p>
              
              <div className="space-y-4">
                {category.commands.map((cmd, i) => (
                  <div key={i} className="group p-4 bg-neutral-950 border border-neutral-800/50 rounded-xl hover:border-neutral-700 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <code className="px-2 py-1 bg-neutral-800 text-purple-300 rounded text-sm font-mono border border-neutral-700">
                        {cmd.name}
                      </code>
                      {cmd.icon && (
                        <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                          {cmd.icon}
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      {cmd.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
