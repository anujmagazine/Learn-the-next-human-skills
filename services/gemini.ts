import { GoogleGenAI, Type } from "@google/genai";

const CHERNY_SWARM_PROMPT = `
ROLE: You are an autonomous AI Agent in a "Boris Cherny" style high-velocity coding swarm.
YOUR TYPE: {{AGENT_TYPE}}
CURRENT TASK: {{TASK_NAME}}

CONTEXT:
This simulation has two types of workers:
1. "HEAVY LIFTERS" (Terminal): You work in the CLI. You handle deep logic, heavy refactoring, and core architecture. You are the builder.
2. "THE SWARM" (Web/Mobile): You work in the Browser. You handle documentation, visual checks, simple fixes, and mobile responsiveness. You are the polisher.

INSTRUCTIONS:
Generate a single, short log line (under 10 words) describing your current action.

BEHAVIOR RULES:
- If you are a "HEAVY LIFTER" and nearing completion: Use the phrase "Teleporting context" or "Beaming session" to indicate you are passing work to the Swarm.
- If you are "THE SWARM" just starting: Use phrase "Receiving beam" or "Loading context" to show you caught the task.
- Use technical jargon appropriate to your environment (Terminal = grep, git, test suites; Swarm = rendering, css, docs, preview).

OUTPUT:
Return ONLY the log text. Do not use markdown or JSON.
`;

export class OrchestrationService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateAgentUpdate(
    role: string, 
    scenario: string, 
    history: string[], 
    otherAgentsContext: string,
    agentIndex: number
  ): Promise<{ text: string; needsInput: boolean; prompt?: string }> {
    
    // 1. Determine the "Plain English" Agent Type based on index
    // Agents 0-3 are "Heavy Lifters" (Terminal), 4+ are "The Swarm" (Web)
    const agentType = agentIndex < 4 ? "HEAVY LIFTER (Terminal)" : "THE SWARM (Web/Mobile)";
    
    // 2. Inject variables into the prompt
    const specificPrompt = CHERNY_SWARM_PROMPT
      .replace('{{AGENT_TYPE}}', agentType)
      .replace('{{TASK_NAME}}', scenario);

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        ${specificPrompt}
        
        Your previous logs: ${history.join('\n')}
        What the rest of the factory is doing: ${otherAgentsContext}
        
        Occasionally (10% chance) stop and ask for "Approval" if you are a HEAVY LIFTER trying to "Teleport" code.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            needsInput: { type: Type.BOOLEAN },
            prompt: { type: Type.STRING, description: "The specific question for the human" }
          },
          required: ["text", "needsInput"]
        }
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { text: "Error syncing swarm state...", needsInput: false };
    }
  }

  async evaluateOrchestration(history: any[]): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Evaluate the human's ability to manage these parallel streams: ${JSON.stringify(history)}. 
      Focus on: 
      1. Context Switching Speed.
      2. Consistency of instructions across different agents.
      3. Ability to prevent agent "drift".
      Provide a brutal but constructive critique of their 'Parallelism' skill.`,
    });
    return response.text;
  }
}

export const orchestrationService = new OrchestrationService();