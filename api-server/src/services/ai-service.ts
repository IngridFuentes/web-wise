import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AISuggestion {
  explanation: string;
  alternatives: string[];
  timeline: string;
}

export class AIService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async getSuggestion(feature: string, isBaseline: boolean, status: string, description: string): Promise<AISuggestion> {
    const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You're a web development expert. Analyze this web platform feature:

Feature: ${feature}
Baseline Status: ${isBaseline ? 'Baseline Safe' : 'Not Baseline'} (${status})
Description: ${description}

Provide ONLY a JSON response in this exact format:
{
  "explanation": "Brief explanation of why this is/isn't baseline and what it means for developers",
  "alternatives": ["alternative1", "alternative2", "alternative3"],
  "timeline": "When this feature will be safe to use everywhere"
}

Keep responses concise and practical for developers. Focus on actionable advice.`;

    try {
        console.log('🤖 Calling Gemini AI for feature:', feature); 
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('🤖 Raw AI response:', text); 
        
    
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const parsed = JSON.parse(cleanText);
        console.log('🤖 Parsed AI response:', parsed);
        
        return parsed;
    } catch (error) {
        console.error('🤖 AI service error:', error); 
        return this.getFallbackResponse(feature, isBaseline);
    }
}

  private getFallbackResponse(feature: string, isBaseline: boolean): AISuggestion {
    if (isBaseline) {
      return {
        explanation: `${feature} is widely supported and safe to use in production.`,
        alternatives: ['No alternatives needed - this feature is baseline safe!'],
        timeline: 'Ready to use now'
      };
    }

    return {
      explanation: `${feature} is not yet baseline. Consider alternatives for broader browser compatibility.`,
      alternatives: [
        'Check MDN documentation for alternatives',
        'Consider progressive enhancement approach',
        'Use feature detection before implementing'
      ],
      timeline: 'Timeline varies - monitor web-features updates'
    };
  }
}