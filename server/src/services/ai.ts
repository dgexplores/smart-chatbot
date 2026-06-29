import { GoogleGenerativeAI } from '@google/generative-ai';

// Interface for structured output from the LLM
export interface AIResponse {
  reply: string;
  stage:
    | 'GREETING'
    | 'DISCOVERY'
    | 'REQUIREMENT_COLLECTION'
    | 'BRAINSTORMING'
    | 'QUALIFICATION'
    | 'PACKAGE_RECOMMENDATION'
    | 'PROPOSAL_GENERATION'
    | 'HANDOFF'
    | 'CLOSED';
  confidence: number;
  leadScore: number;
  customerData: {
    customerName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    industry?: string;
    budget?: string;
    timeline?: string;
    preferredMeetingTime?: string;
  };
  requirements: {
    pages?: string[];
    features?: string[];
    integrations?: string[];
    specialRequirements?: string[];
  };
  recommendations: string[];
  actions: ('SAVE_LEAD' | 'UPDATE_LEAD' | 'GENERATE_PROPOSAL' | 'REQUEST_MEETING' | 'NOTIFY_EXECUTIVE' | 'HANDOFF')[];
}

let aiClient: any = null;

const getAIClient = () => {
  if (aiClient) return aiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && process.env.MOCK_LLM !== 'true') {
    throw new Error('[AI Service] GEMINI_API_KEY is not defined in environment variables.');
  }

  if (apiKey) {
    // Note: in newer @google/generative-ai versions, we initialize using new GoogleGenAI({ apiKey })
    // or standard constructor depending on the SDK version installed.
    // The standard v0.11 SDK import is GoogleGenAI from '@google/generative-ai' or similar
    try {
      aiClient = new GoogleGenerativeAI(apiKey);
    } catch (e) {
      console.warn('[AI Service] Failed to initialize GoogleGenAI with new client constructor, trying legacy initialization.');
      // Legacy fallback
    }
  }

  return aiClient;
};

// Generates a mock pre-sales executive response that matches the stage flow
export const generateMockResponse = (prompt: string, stage: string): AIResponse => {
  // Extract user's message from the compiled prompt block
  const lines = prompt.split('\n');
  const customerLine = [...lines].reverse().find((line) => line.trim().startsWith('CUSTOMER:'));
  const userInput = customerLine ? customerLine.replace(/CUSTOMER:\s*/i, '').trim() : '';

  console.log(`[AI Service] Mock Mode. Input: "${userInput}" | Current Stage: ${stage}`);

  let nextStage = stage;
  let reply = '';
  const customerData: any = {};
  const actions: string[] = [];

  // Parse details using regex
  const emailMatch = userInput.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    customerData.email = emailMatch[0];
  }

  const budgetMatch = userInput.match(/(\d+\s*(Lakhs|Lakh|k|K|thousand|thousands|million|L|l|\$|₹))/i);
  if (budgetMatch) {
    customerData.budget = budgetMatch[0];
  }

  const nameMatch = userInput.match(/(my name is|i am|this is|call me)\s+([a-zA-Z]+)/i);
  if (nameMatch) {
    customerData.customerName = nameMatch[2];
  }

  // Simple state machine that transitions based on stages
  // Simple state machine that transitions based on stages
  if (userInput.toLowerCase().includes('schedule') || userInput.toLowerCase().includes('call') || userInput.toLowerCase().includes('meet')) {
    nextStage = 'QUALIFICATION';
    reply = "I have scheduled a callback call for you to showcase our options! I'll generate the Google Meet link for us right now.";
    actions.push('REQUEST_MEETING', 'UPDATE_LEAD');
    customerData.preferredMeetingTime = "Tomorrow at 4:30 PM";
  } else if (userInput.toLowerCase().includes('negotiate') || userInput.toLowerCase().includes('cheap') || userInput.toLowerCase().includes('discount') || userInput.toLowerCase().includes('expensive')) {
    nextStage = 'HANDOFF';
    reply = "I completely understand you have budget constraints. Let me hand this chat over to our senior sales executive right now. We will schedule a callback call to discuss a custom pricing plan that fits your budget comfort.";
    actions.push('HANDOFF', 'UPDATE_LEAD');
  } else if (stage === 'GREETING') {
    nextStage = 'DISCOVERY';
    reply = "Hello! I'm the AI Solutions Consultant at XYZ Technologies. Could you tell me a bit about your business and what kind of website or application you are looking to build?";
    actions.push('UPDATE_LEAD');
  } else if (stage === 'DISCOVERY') {
    nextStage = 'REQUIREMENT_COLLECTION';
    const keywords = ['website', 'app', 'portal', 'e-commerce', 'shop', 'blog', 'software'];
    let projectType = 'project';
    for (const kw of keywords) {
      if (userInput.toLowerCase().includes(kw)) {
        projectType = kw;
        break;
      }
    }
    reply = `A custom ${projectType} sounds like a great project! What are the primary goals of this ${projectType}, and who is your target audience?`;
    actions.push('UPDATE_LEAD');
  } else if (stage === 'REQUIREMENT_COLLECTION') {
    nextStage = 'BRAINSTORMING';
    reply = "Understood. To help specify the scope, what features (like membership dashboards, booking, or online payments) and pages do you need?";
    actions.push('UPDATE_LEAD');
  } else if (stage === 'BRAINSTORMING') {
    nextStage = 'QUALIFICATION';
    reply = "Based on your needs, we recommend a responsive React frontend, a Node.js API, scheduling portals, and secure Stripe payment integration. How do these suggestions sound to you? Also, to prepare a formal estimate, could you share your name, company name, email address, and approximate budget?";
    actions.push('UPDATE_LEAD');
  } else if (stage === 'QUALIFICATION') {
    const hasContact = customerData.email || userInput.includes('@') || userInput.toLowerCase().includes('email') || userInput.toLowerCase().includes('budget');
    if (hasContact) {
      nextStage = 'PACKAGE_RECOMMENDATION';
      reply = `Thank you! I have saved your details. We have structured three packages for your project:
1. **Starter** (₹25,000) - Basic setup & styling
2. **Professional** (₹1.5 Lakhs) - Adds advanced integrations
3. **Enterprise** (₹3.5 Lakhs+) - Custom backend, CRM, and scalability

I recommend the **Professional Package** for your requirements. Which package would you like to proceed with?`;
      actions.push('SAVE_LEAD', 'UPDATE_LEAD');
    } else {
      nextStage = 'QUALIFICATION';
      reply = "Thanks for the info! To proceed with generating your formal estimate, could you please share your name, email address, and approximate budget?";
      actions.push('UPDATE_LEAD');
    }
  } else if (stage === 'PACKAGE_RECOMMENDATION') {
    nextStage = 'PROPOSAL_GENERATION';
    reply = "Excellent choice! I am generating a tailored digital proposal PDF for your review now. You'll receive a link in this chat shortly.";
    actions.push('GENERATE_PROPOSAL', 'SAVE_LEAD');
  } else if (stage === 'PROPOSAL_GENERATION') {
    nextStage = 'HANDOFF';
    reply = "I've generated the proposal PDF! You can see it attached below. I have also passed your qualified requirements to our lead technical consultant, who will review them and email you to schedule a kick-off call. Is there anything else you'd like to add?";
    actions.push('HANDOFF');
  } else if (stage === 'HANDOFF') {
    nextStage = 'CLOSED';
    reply = "I've passed your request to our team. Thank you for reaching out to XYZ Technologies. Have a wonderful day!";
  } else {
    reply = "Thank you for reaching out to XYZ Technologies. Have a wonderful day!";
  }

  // Fallbacks for customer data
  const finalCustomerData = {
    customerName: customerData.customerName || 'Test Lead',
    companyName: customerData.companyName || 'Acme Corp',
    email: customerData.email || 'test@company.com',
    phone: '1234567890',
    industry: userInput.toLowerCase().includes('website') ? 'Web Services' : 'Software',
    budget: customerData.budget || '₹2.5 Lakhs',
    timeline: '2 months'
  };

  return {
    reply,
    stage: nextStage as any,
    confidence: 0.95,
    leadScore: nextStage === 'QUALIFICATION' || nextStage === 'PROPOSAL_GENERATION' ? 85 : 45,
    customerData: finalCustomerData,
    requirements: {
      pages: ['Home', 'About', 'Services', 'Contact'],
      features: ['Contact Form', 'Responsive Design', 'Admin Dashboard']
    },
    recommendations: ['React/Vite', 'Node.js Express', 'MongoDB Atlas'],
    actions: actions as any
  };
};

export const generateAIResponse = async (prompt: string, currentStage: string): Promise<AIResponse> => {
  const isMockMode = process.env.MOCK_LLM === 'true';

  if (isMockMode) {
    return generateMockResponse(prompt, currentStage);
  }

  try {
    const client = getAIClient();
    // Default model is gemini-flash-lite-latest if not specified
    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log('[AI Service] Response received from Gemini:', responseText);

    // Validate and parse the structured output, stripping any leading/trailing backticks or markdown markers
    let cleanJSON = responseText.trim();
    cleanJSON = cleanJSON.replace(/^`+(json)?/i, '').trim();
    cleanJSON = cleanJSON.replace(/`+$/, '').trim();

    const parsed: AIResponse = JSON.parse(cleanJSON);
    return parsed;
  } catch (error: any) {
    console.error('[AI Service] Gemini API call error:', error);
    // Fallback to a valid JSON response format
    return {
      reply: "I apologize, but I encountered a small issue processing your request. Could you please repeat that?",
      stage: currentStage as any,
      confidence: 0.5,
      leadScore: 0,
      customerData: {},
      requirements: {},
      recommendations: [],
      actions: []
    };
  }
};
