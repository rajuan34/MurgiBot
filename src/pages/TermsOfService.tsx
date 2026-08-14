import React from 'react';
import { FileText } from 'lucide-react';

export function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-neutral-300 p-8 md:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-12">
          <FileText className="w-10 h-10 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
          <p>
            By inviting our bot to your Discord server or interacting with it, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the bot.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">2. Description of Service</h2>
          <p>
            The bot provides AI-powered conversational assistance, utilities, and contextual memory features within Discord. We reserve the right to modify, suspend, or discontinue any part of the service at any time without notice.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">3. Acceptable Use</h2>
          <p>
            You agree not to use the bot to:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-neutral-400">
            <li>Generate or distribute illegal, harmful, or explicitly offensive content.</li>
            <li>Spam, harass, or abuse other users.</li>
            <li>Attempt to bypass security features, rate limits, or disrupt the underlying infrastructure.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">4. Liability and Disclaimer</h2>
          <p>
            The bot is provided "as is" and "as available" without any warranties of any kind. We are not liable for any damages, data loss, or issues arising from the use or inability to use the bot. AI-generated responses are automated and do not necessarily reflect the views of the developer.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">5. Changes to Terms</h2>
          <p>
            We may update these Terms of Service periodically. Continued use of the bot after any modifications indicates your acceptance of the updated terms.
          </p>
        </section>

        <div className="pt-8 border-t border-neutral-800 text-sm text-neutral-500">
          Last updated: {new Date().toLocaleDateString()}
        </div>
        
        <div className="pt-4">
          <a href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            &larr; Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
