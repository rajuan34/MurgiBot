import { logger } from '../telemetry/logger';

export interface ShortTermMessage {
  role: 'user' | 'murgi';
  text: string;
  timestamp: number;
}

export interface LongTermFact {
  fact: string;
  confidence: number;
  extractedAt: number;
}

/**
 * MemoryEngine handles context retention.
 * Separated into Short-term (recent chat history) and Long-term (core facts about users).
 * Note: Uses In-Memory arrays for demonstration. Should be replaced with Redis/Postgres.
 */
export class MemoryEngine {
  // Map of userId -> recent messages
  private shortTermMemory: Map<string, ShortTermMessage[]> = new Map();
  
  // Map of userId -> facts extracted over time
  private longTermMemory: Map<string, LongTermFact[]> = new Map();

  private readonly MAX_CONTEXT_MESSAGES = 10;

  addShortTermMessage(userId: string, role: 'user' | 'murgi', text: string) {
    if (!this.shortTermMemory.has(userId)) {
      this.shortTermMemory.set(userId, []);
    }
    
    const history = this.shortTermMemory.get(userId)!;
    history.push({ role, text, timestamp: Date.now() });

    // Keep only recent context to avoid token bloat
    if (history.length > this.MAX_CONTEXT_MESSAGES) {
      history.shift();
    }
  }

  getShortTermContext(userId: string): string {
    const history = this.shortTermMemory.get(userId) || [];
    if (history.length === 0) return 'No recent conversation context.';
    
    return history.map(m => `${m.role === 'user' ? 'User' : 'Murgi'}: ${m.text}`).join('\n');
  }

  // Long-term facts are manually or LLM-extracted data points (e.g. "User likes coffee")
  addLongTermFact(userId: string, fact: string) {
    if (!this.longTermMemory.has(userId)) {
      this.longTermMemory.set(userId, []);
    }
    this.longTermMemory.get(userId)!.push({
      fact,
      confidence: 1.0,
      extractedAt: Date.now()
    });
    logger.info(`Stored new long-term fact for user ${userId}`, { fact });
  }

  getLongTermContext(userId: string): string {
    const facts = this.longTermMemory.get(userId) || [];
    if (facts.length === 0) return 'No long-term facts known about this user.';
    
    return facts.map(f => `- ${f.fact}`).join('\n');
  }
  
  getStats() {
    return {
      activeConversations: this.shortTermMemory.size,
      knownUsers: this.longTermMemory.size
    };
  }
}
