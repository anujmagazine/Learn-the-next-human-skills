
import { GoogleGenAI, Type } from "@google/genai";

export class OrchestrationService {
  private ai: GoogleGenAI;

  constructor() {
    // Correctly initialize GoogleGenAI using process.env.API_KEY directly.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateAgentUpdate(
    role: string, 
    scenario: string, 
    history: string[], 
    otherAgentsContext: string
  ): Promise<{ text: string; needsInput: boolean; prompt?: string }> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an AI Agent with the role: ${role}. 
      Current Scenario: ${scenario}
      Your previous work: ${history.join('\n')}
      What other agents are doing: ${otherAgentsContext}
      
      Generate a short "log update" (2-3 sentences) of what you are doing. 
      Occasionally (20% chance), you must stop and ask the "Human Orchestrator" for a critical decision that requires them to know what the other agents are doing.`,
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

    // response.text is a property that returns the generated text.
    return JSON.parse(response.text || "{}");
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
    // response.text is a property that returns the generated text.
    return response.text;
  }
}

export const orchestrationService = new OrchestrationService();
