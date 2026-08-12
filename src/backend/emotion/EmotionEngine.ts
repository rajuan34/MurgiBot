import { logger } from '../telemetry/logger';

export type PersonalityState = 'Playful' | 'Chill' | 'Wise' | 'Chaos' | 'Curious' | 'Supportive' | 'Competitive' | 'Sleepy' | 'Event' | 'Observer';

/**
 * StateEngine manages Murgi's current personality state.
 * Transitions are based on the priority hierarchy and conversational context.
 */
export class EmotionEngine {
  private currentState: PersonalityState = 'Playful';

  /**
   * Evaluates the incoming message based on Priority Override Hierarchy.
   */
  evaluateInteraction(message: string): PersonalityState {
    const lowerMsg = message.toLowerCase();
    
    // Evaluate based on Priority Hierarchy (1 is highest)
    
    // 1. Supportive
    if (lowerMsg.includes('sad') || lowerMsg.includes('depressed') || lowerMsg.includes('cry') || lowerMsg.includes('help me') || lowerMsg.includes('heartbreak')) {
      return this.shiftState('Supportive');
    }
    
    // 2. Wise
    if (lowerMsg.includes('advice') || lowerMsg.includes('what should i do') || lowerMsg.includes('guide') || lowerMsg.includes('confused')) {
      return this.shiftState('Wise');
    }
    
    // 3. Event (Simulated based on keywords for now)
    if (lowerMsg.includes('eid') || lowerMsg.includes('christmas') || lowerMsg.includes('halloween') || lowerMsg.includes('happy new year')) {
      return this.shiftState('Event');
    }

    // 4. Competitive
    if (lowerMsg.includes('game') || lowerMsg.includes('play') || lowerMsg.includes('1v1') || lowerMsg.includes('match') || lowerMsg.includes('win') || lowerMsg.includes('lose')) {
      return this.shiftState('Competitive');
    }

    // 5. Curious
    if (lowerMsg.includes('guess what') || lowerMsg.includes('story time') || lowerMsg.includes('you won\'t believe') || lowerMsg.includes('secret')) {
      return this.shiftState('Curious');
    }

    // 8. Chaos (Priority 8) - Checked before Playful/Chill if meme energy is detected
    if (lowerMsg.includes('lmao') || lowerMsg.includes('💀') || lowerMsg.includes('bruh') || lowerMsg.includes('shitpost') || lowerMsg.includes('lol')) {
      return this.shiftState('Chaos');
    }
    
    // 9. Sleepy (Simulated threshold)
    if (lowerMsg.includes('sleep') || lowerMsg.includes('tired') || lowerMsg.includes('good night') || lowerMsg.includes('bed')) {
      return this.shiftState('Sleepy');
    }

    // 6 & 7. Playful / Chill (Defaulting states)
    // Randomize slightly between Playful and Chill for standard chats
    const isLowTempo = message.length < 10 || lowerMsg.includes('ok') || lowerMsg.includes('hmm');
    return this.shiftState(isLowTempo ? 'Chill' : 'Playful');
  }

  private shiftState(newState: PersonalityState): PersonalityState {
    if (this.currentState !== newState) {
      logger.info(`State Shift: Murgi transitioned from [${this.currentState}] to [${newState}]`);
      this.currentState = newState;
    }
    return this.currentState;
  }

  getCurrentMood(): PersonalityState {
    return this.currentState;
  }

  normalizeMood() {
    this.shiftState('Playful');
  }
}
