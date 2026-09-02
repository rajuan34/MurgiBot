import { logger } from '../telemetry/logger';

export type PersonalityState = 'Playful' | 'Chill' | 'Wise' | 'Chaos' | 'Curious' | 'Supportive' | 'Competitive' | 'Sleepy' | 'Event' | 'Observer' | 'RESPECTFUL_SON_CALM' | 'RESPECTFUL_FRIENDLY';

export class EmotionEngine {
  private currentState: PersonalityState = 'Playful';

  /**
   * Evaluates the incoming message and automatically shifts Bohurupi's mood.
   * Strictly uses provided PersonalityStates.
   * Avoids being 'kind' by relying on the system prompt's definition of 'Supportive' (savage/dismissive).
   */
  evaluateInteraction(message: string): PersonalityState {
    const text = message.toLowerCase();
    let nextState = this.currentState;

    if (/(fight|battle|win|lose|noob|trash|1v1|beat|dare|bet|mara|muri)/.test(text)) {
      nextState = 'Competitive';
    } else if (/(crazy|wild|destroy|burn|scream|ahhh|wtf|lmao|lol|pagol|mor|morbi)/.test(text)) {
      nextState = 'Chaos';
    } else if (/(why|how|what|explain|tell|who|kivabe|keno|koi)/.test(text)) {
      nextState = 'Curious';
    } else if (/(sleep|tired|night|boring|yawn|bed|ghum|klanto)/.test(text)) {
      nextState = 'Sleepy';
    } else if (/(sad|help|depressed|hurt|broken|please|kanna|kosto)/.test(text)) {
      nextState = 'Supportive'; 
    } else if (/(smart|wise|advice|life|universe|think|gyan|bujhsi)/.test(text)) {
      nextState = 'Wise';
    } else if (/(relax|calm|chill|cool|peace|whatever|shanti)/.test(text)) {
      nextState = 'Chill';
    } else if (/(game|play|fun|joke|prank|khela|moja)/.test(text)) {
      nextState = 'Playful';
    } else if (/(event|party|eid|celebrate|happy new year)/.test(text)) {
      nextState = 'Event';
    }

    if (this.currentState !== nextState) {
      this.setState(nextState);
    }
    
    return this.currentState;
  }

  /**
   * Administrative / Manual state setting.
   */
  setState(newState: PersonalityState): PersonalityState {
    if (this.currentState !== newState) {
      logger.info(`State Shift: Bohurupi transitioned from [${this.currentState}] to [${newState}]`);
      this.currentState = newState;
    }
    return this.currentState;
  }

  getCurrentMood(): PersonalityState {
    return this.currentState;
  }
}
