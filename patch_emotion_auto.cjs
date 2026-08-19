const fs = require('fs');
let content = fs.readFileSync('src/backend/emotion/EmotionEngine.ts', 'utf8');

const targetFunction = `  /**
   * Evaluates the incoming message. 
   * As per the new directive: Murgi's mood MUST NOT change based on individual chat content.
   * Therefore, this simply returns the current state.
   */
  evaluateInteraction(message: string): PersonalityState {
    return this.currentState;
  }`;

const replacementFunction = `  /**
   * Evaluates the incoming message and automatically shifts Murgi's mood.
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
  }`;

content = content.replace(targetFunction, replacementFunction);
fs.writeFileSync('src/backend/emotion/EmotionEngine.ts', content);
console.log('EmotionEngine updated to automatically change mood based on text.');
