import React from 'react';
import { Shield } from 'lucide-react';

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-neutral-300 p-8 md:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-12">
          <Shield className="w-10 h-10 text-emerald-500" />
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
          <p>
            When you interact with our Discord bot, we may collect basic usage data necessary for the bot's functionality. This includes your Discord User ID, server interactions, and messages explicitly directed at the bot. We do not log or store messages in channels where the bot is not directly invoked.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">2. How We Use Your Data</h2>
          <p>
            The collected data is used exclusively to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-400">
            <li>Provide the requested bot features and responses.</li>
            <li>Maintain context for active conversations.</li>
            <li>Improve the stability and performance of the bot.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">3. Data Retention</h2>
          <p>
            Contextual memory and short-term message logs are retained temporarily and are periodically purged. Long-term contextual facts requested by the user are stored securely to provide continued personalized experiences. You may request deletion of your data at any time.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">4. Third-Party Sharing</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to outside parties. Anonymized prompts may be processed by AI providers (such as Google Gemini) strictly for the purpose of generating responses.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or wish to request data deletion, please contact the bot administrator via our support server or through direct messaging.
          </p>
        </section>

        <div className="pt-8 border-t border-neutral-800 text-sm text-neutral-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
        
        <div className="pt-4">
          <a href="/" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            &larr; Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
