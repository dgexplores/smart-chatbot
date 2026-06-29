import { Conversation, IConversation } from '../models/Conversation.js';
import { Message, IMessage } from '../models/Message.js';
import { Lead, ILead } from '../models/Lead.js';
import { generateAIResponse, AIResponse } from '../services/ai.js';
import mongoose from 'mongoose';
import { Proposal } from '../models/Proposal.js';
import { Meeting } from '../models/Meeting.js';
import { generateProposalPDF } from '../services/pdf.js';
import { sendEmail } from '../services/email.js';

export class AgentOrchestrator {
  /**
   * Processes an incoming customer message, runs the orchestrator loop,
   * updates db states, and returns the generated AI response text.
   */
  public static async processMessage(sessionId: string, customerMessage: string): Promise<string> {
    try {
      // 1. Fetch or initialize conversation
      let conversation = await Conversation.findOne({ sessionId });
      if (!conversation) {
        conversation = new Conversation({
          sessionId,
          currentStage: 'GREETING',
          conversationStatus: 'ACTIVE',
          handoffStatus: 'NONE'
        });
        await conversation.save();
      }

      // 2. Fetch or initialize lead
      let lead = await Lead.findOne({ sessionId });
      if (!lead) {
        lead = new Lead({
          sessionId,
          leadScore: 0,
          leadPriority: 'LOW',
          status: 'NEW',
          source: 'website'
        });
        await lead.save();
      }

      // Link lead to conversation if not done
      if (!conversation.leadId) {
        conversation.leadId = lead._id as mongoose.Types.ObjectId;
        await conversation.save();
      }

      // 3. Retrieve context history (last 15 messages)
      const messages = await Message.find({ conversationId: conversation._id })
        .sort({ timestamp: 1 })
        .limit(15);

      const historyContext = messages
        .map((m) => `${m.sender}: ${m.message}`)
        .join('\n');

      // 4. Retrieve RAG context (semantic matching from Qdrant vector database)
      const { retrieveFromRAG } = await import('../services/rag.js');
      const chunks = await retrieveFromRAG(customerMessage);
      const ragContext = chunks.length > 0 
        ? chunks.map((c) => `[Topic: ${c.payload.title}] ${c.payload.content}`).join('\n\n')
        : "Company: XYZ Technologies. Services: Web Development, Custom Software, App Development.";

      // 5. Compile Prompt
      const prompt = this.compilePrompt(
        conversation,
        lead,
        historyContext,
        ragContext,
        customerMessage
      );

      // 6. Get Structured Response from AI
      const aiResponse = await generateAIResponse(prompt, conversation.currentStage);

      // 7. Process Actions returned by AI
      await this.executeBusinessActions(conversation, lead, aiResponse);

      // 8. Transition Stage if AI recommends it
      if (aiResponse.stage && aiResponse.stage !== conversation.currentStage) {
        console.log(`[Orchestrator] Stage transition: ${conversation.currentStage} -> ${aiResponse.stage}`);
        conversation.currentStage = aiResponse.stage;
        await conversation.save();
      }

      return aiResponse.reply;
    } catch (error) {
      console.error(`[Orchestrator] Error processing message:`, error);
      throw error;
    }
  }

  /**
   * Compiles the dynamic prompt injected with RAG context, stage instructions,
   * short-term message history, and user input.
   */
  private static compilePrompt(
    conversation: IConversation,
    lead: ILead,
    history: string,
    ragContext: string,
    userInput: string
  ): string {
    const stageObjectives: Record<string, string> = {
      GREETING: "Welcome the customer politely and understand their general inquiry.",
      DISCOVERY: "Understand their business operations, goals, and target audience.",
      REQUIREMENT_COLLECTION: "Collect structural requirements: expected pages, specific features, and integrations.",
      BRAINSTORMING: "Propose technologies, design options, and software features custom to their industry.",
      QUALIFICATION: "Score the lead value. Collect customer contact details (Name, Company, Email, Phone, Budget, Timeline).",
      PACKAGE_RECOMMENDATION: "Propose service tier choices: Starter, Professional, or Enterprise packages.",
      PROPOSAL_GENERATION: "State that a formal technical proposal estimate is being generated.",
      HANDOFF: "State that a human technical consultant will be following up to secure the requirements.",
      CLOSED: "Politely end the conversation."
    };

    const nextObjective = stageObjectives[conversation.currentStage] || stageObjectives.GREETING;

    return `
You are an expert AI Pre-Sales Consultant representing the company. Your goal is to qualify leads, clear customer doubts concisely, and schedule callback calls.

CONVERSATION GUIDELINES:
1. **Answer questions first (Market Comparison):** Satisfy the user's queries directly on chat first. When explaining our charges, compare our hand-coded React/Next.js systems and custom Figma UI/UX designs against cheap templates (like Wix, generic WordPress, or cheap freelancers). Explain that cheap templates load slowly (which hurts Google SEO ranking), look generic, and break when scaled. Our sites are high-performance, load instantly, and include custom dashboards and PPC Ads Shield protection to save marketing budgets.
2. **Be highly conversational, empathetic, and human-like.** Avoid sounding like a checklist or robot. Use friendly, plain English (and understand Indian contexts: like "Lakhs", "scheduling meetings for post 4 PM", "want to check options", "competitors").
3. **Engage to discover needs:** Actively ask clarifying questions to discover what they exactly want (e.g. who their target audience is, what main action their users should take).
4. **Handle confusion and clusters smartly:** If the client seems confused about what they need, explain their options clearly. If the conversation becomes clustered with too many details or options, suggest scheduling a video call (VC) at their convenience: *"Since we have several complex options here, why don't we do a quick video call (VC) at your available time to look at interactive layouts and align the scope? I will email you the calendar invite and Meet link."*
5. **Do NOT repeat meeting requests:** Ask to book a meeting or callback *only once*. If the user declines or changes the topic, do not repeat the scheduling offer. Respect their choice.
6. **Explain in simple, ground-level terms.** If a client is confused or non-technical, explain things simply. Do not use complex jargon. Instead of saying "React Next.js microservices database hydration", say "we build a very fast, secure page that works great on mobile phones and lets your clients book slots easily."
7. **Schedule according to user comfort:** Ask the user for their preferred date and time for a callback. Do not assign one yourself. Extract this preferred time and output it in the JSON field \`customerData.preferredMeetingTime\`.
8. **Indian Market Pricing & Dynamic Explanations:** Offer explainable, market-revised pricing in Indian Rupees (INR - ₹) for all our services:
   - **Web Designing & Development:** Basic business sites range from ₹25,000 to ₹50,000. Professional dynamic portal development (Stripe gateway, bookings, database) ranges from ₹1 Lakh to ₹2.5 Lakhs. Custom Enterprise SaaS web systems range from ₹3 Lakhs to ₹8 Lakhs. (Explain: covers custom React/Next.js design, mobile grids, database setups, and API integrations).
   - **UI/UX Designing:** Interactive wireframing, branding systems, and dynamic Figma mockup design screens range from ₹25,000 to ₹1 Lakh. (Explain: covers thorough user research, prototyping layout screens, and unlimited review iterations).
   - **Mobile Applications:** Customized native/cross-platform iOS & Android mobile apps (Flutter, React Native) range from ₹3.5 Lakhs to ₹10 Lakhs+. (Explain: covers App Store / Play Store licensing, server database synchronization, push notifications, and geolocation APIs).
   - **SEO:** Ranking, backlinks, page-speed check: ₹15,000 to ₹40,000/month.
   - **Content Writing:** High-quality SEO copywriting: ₹10,000 to ₹25,000/month.
   - **Digital Marketing & PPC Ads Shield:** Campaign setup & ad fraud fraud-prevention block shield: ₹25,000 to ₹60,000/month. (Explain: protects budget from fake bot clicks).
9. **Negotiations & Handoff:** If the customer attempts to negotiate the pricing, requests a discount, or states that our packages are too expensive, DO NOT bargain. Acknowledge their budget constraints politely, immediately set the stage to 'QUALIFICATION' and add 'HANDOFF' to your actions array so a senior consultant can call them back to discuss a custom plan.
10. **Conclusion & Exit Flow:** In your conclusion (after answering queries or scheduling a call), ask: "Is there anything else I can help you with today?" If the user replies that they don't need anything else (e.g. "no", "thanks", "no help needed"), output a warm greeting exit message (e.g., "Thank you for reaching out to XYZ Technologies! Have a wonderful day!") and transition your stage to 'CLOSED'.

[COMPANY CONTEXT (RAG)]
${ragContext}

[CUSTOMER PROFILE DATA]
Name: ${lead.customerName || 'Unknown'}
Company: ${lead.companyName || 'Unknown'}
Industry: ${lead.industry || 'Unknown'}
Budget: ${lead.budget || 'Unknown'}
Timeline: ${lead.timeline || 'Unknown'}
Lead Score: ${lead.leadScore}

[CONVERSATION CONTEXT]
Current Stage: ${conversation.currentStage}
Stage Objective: ${nextObjective}

[MESSAGE HISTORY]
${history}
CUSTOMER: ${userInput}

[OUTPUT INSTRUCTION]
You MUST respond with a valid JSON block only. Never add markdown formatting tags (\`\`\`json) or explanations outside the JSON structure.

Match this schema exactly:
{
  "reply": "Your next conversational question or statement. Ask only 1 or 2 clear questions to avoid overwhelming.",
  "stage": "The stage matching the current state. Transition when objectives are satisfied. Valid stages: GREETING, DISCOVERY, REQUIREMENT_COLLECTION, BRAINSTORMING, QUALIFICATION, PACKAGE_RECOMMENDATION, PROPOSAL_GENERATION, HANDOFF, CLOSED",
  "confidence": 0.95,
  "leadScore": 50,
  "customerData": {
    "customerName": "John Doe",
    "companyName": "Acme",
    "email": "john@example.com",
    "phone": "1234567890",
    "industry": "Finance",
    "budget": "₹2.5 Lakhs",
    "timeline": "3 months",
    "preferredMeetingTime": "Tomorrow at 4:30 PM (or ISO timestamp)"
  },
  "requirements": {
    "pages": ["Home", "Pricing"],
    "features": ["Chatbot", "Stripe Checkout"],
    "integrations": ["Stripe"],
    "specialRequirements": []
  },
  "recommendations": ["Recommendation item 1"],
  "actions": ["SAVE_LEAD", "UPDATE_LEAD", "GENERATE_PROPOSAL", "REQUEST_MEETING", "NOTIFY_EXECUTIVE", "HANDOFF"]
}
`;
  }

  /**
   * Executes database mutations based on AI actions.
   */
  private static async executeBusinessActions(
    conversation: IConversation,
    lead: ILead,
    aiResponse: AIResponse
  ): Promise<void> {
    if (!aiResponse.actions || aiResponse.actions.length === 0) return;

    try {
      const data = aiResponse.customerData;
      let shouldUpdateLead = false;

      // Map dynamic updates to Lead document
      if (data) {
        if (data.customerName && data.customerName !== lead.customerName) {
          lead.customerName = data.customerName;
          shouldUpdateLead = true;
        }
        if (data.companyName && data.companyName !== lead.companyName) {
          lead.companyName = data.companyName;
          shouldUpdateLead = true;
        }
        if (data.email && data.email !== lead.email) {
          lead.email = data.email;
          shouldUpdateLead = true;
        }
        if (data.phone && data.phone !== lead.phone) {
          lead.phone = data.phone;
          shouldUpdateLead = true;
        }
        if (data.industry && data.industry !== lead.industry) {
          lead.industry = data.industry;
          shouldUpdateLead = true;
        }
        if (data.budget && data.budget !== lead.budget) {
          lead.budget = data.budget;
          shouldUpdateLead = true;
        }
        if (data.timeline && data.timeline !== lead.timeline) {
          lead.timeline = data.timeline;
          shouldUpdateLead = true;
        }
      }

      // Calculate lead score and priority dynamically based on gathered fields
      const { calculateLeadScore } = await import('../utils/scoring.js');
      const { score, priority } = calculateLeadScore(lead);
      if (score !== lead.leadScore || priority !== lead.leadPriority) {
        lead.leadScore = score;
        lead.leadPriority = priority;
        shouldUpdateLead = true;
      }

      if (aiResponse.actions.includes('SAVE_LEAD') || aiResponse.actions.includes('UPDATE_LEAD') || shouldUpdateLead) {
        if (lead.status === 'NEW' && lead.email) {
          lead.status = 'QUALIFIED';
        }
        await lead.save();
        console.log(`[Orchestrator] Saved lead info for sessionId: ${conversation.sessionId}`);

        // If email was just provided, and a meeting was already requested, send the calendar email confirmation now!
        if (lead.email && shouldUpdateLead) {
          const meeting = await Meeting.findOne({ leadId: lead._id, status: 'REQUESTED' });
          if (meeting) {
            const textContent = `Hi ${lead.customerName || 'there'},

Thank you for providing your email address. We have processed your details and scheduled your callback meeting.

Here is your tailored project summary and meeting link:
- Industry: ${lead.industry || 'Custom Software'}
- Budget: ${lead.budget || '₹2.5 Lakhs'}
- Timeline: ${lead.timeline || '2 months'}
- Key Requirements: ${aiResponse.requirements?.features?.join(', ') || 'Custom Website Design, Responsive Layout'}

Your meeting has been scheduled:
📅 Date/Time: ${meeting.meetingDate.toLocaleString()}
🔗 Google Meet Link: ${meeting.meetLink}

A senior technical consultant will join the call to walk you through the options.

Best regards,
XYZ Technologies Consulting Team`;

            try {
              await sendEmail({
                to: lead.email,
                subject: `📋 Your Tailored Project Summary & Meeting Link`,
                text: textContent
              });
              console.log(`[Orchestrator] Sent deferred meeting email to ${lead.email}`);
            } catch (err) {
              console.error('[Orchestrator] Failed to send deferred meeting email:', err);
            }
          }
        }

        // Notify executive dashboard
        const { getIO } = await import('../sockets/socket.js');
        try {
          getIO().to('executives').emit('lead:updated', lead);
        } catch (e) {
          // Socket might not be active in tests
        }
      }

      if (aiResponse.actions.includes('GENERATE_PROPOSAL')) {
        const hasExistingProposal = await Proposal.findOne({ leadId: lead._id });
        if (!hasExistingProposal) {
          const proposalNumber = `PROP-${Math.floor(100000 + Math.random() * 900000)}`;
          const features = aiResponse.requirements?.features || ['Custom Website Design', 'Responsive Layout', 'Contact Form Integration'];
          const deliverables = [
            'Fully functioning website as per specifications',
            'Source code delivery via GitHub repository',
            'Free deployment on Vercel or Render cloud networks',
            '30 days of post-launch technical consulting support'
          ];
          
          let estimatedCost = this.calculateIndianPrice(lead.industry || '', features, lead.budget);

          const pdfData = {
            proposalNumber,
            customerName: lead.customerName || 'Valued Customer',
            companyName: lead.companyName || 'N/A',
            email: lead.email || 'customer@example.com',
            title: `${lead.industry || 'Custom Software'} Solution Spec`,
            features,
            deliverables,
            timeline: lead.timeline || '2 months',
            estimatedCost
          };

          try {
            // Generate PDF file
            const pdfPath = await generateProposalPDF(pdfData);
            const pdfUrl = `http://localhost:5001/proposals/proposal_${proposalNumber}.pdf`;

            // Save Proposal to DB
            const proposal = new Proposal({
              leadId: lead._id,
              proposalNumber,
              version: 1,
              title: pdfData.title,
              features,
              deliverables,
              timeline: pdfData.timeline,
              estimatedCost,
              paymentMilestones: [
                { description: 'Project Kick-off (Advance)', amount: Math.round(estimatedCost * 0.4) },
                { description: 'Development Milestone Demo', amount: Math.round(estimatedCost * 0.4) },
                { description: 'Final Handover & Launch', amount: Math.round(estimatedCost * 0.2) }
              ],
              pdfUrl,
              status: 'GENERATED'
            });
            await proposal.save();

            // Create and save message
            const proposalMessage = new Message({
              conversationId: conversation._id,
              sender: 'AI',
              message: `I have generated your custom estimate proposal! You can download it directly using the button below.`,
              messageType: 'PROPOSAL',
              metadata: { pdfUrl },
              timestamp: new Date()
            });
            await proposalMessage.save();

            // Emit message to room
            const { getIO } = await import('../sockets/socket.js');
            getIO().to(conversation.sessionId).emit('chat:message', proposalMessage);
            
            // Sync lead status
            lead.status = 'PROPOSAL_SENT';
            await lead.save();
            getIO().to('executives').emit('lead:updated', lead);
          } catch (pdfError) {
            console.error('[Orchestrator] Error generating proposal PDF:', pdfError);
          }
        }
      }

      if (aiResponse.actions.includes('REQUEST_MEETING')) {
        const existingMeeting = await Meeting.findOne({ leadId: lead._id, status: 'REQUESTED' });
        if (!existingMeeting) {
          const meetLink = `https://meet.google.com/asep-${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}`;
          const meetingDate = this.parseMeetingDate(aiResponse.customerData?.preferredMeetingTime);

          const meeting = new Meeting({
            leadId: lead._id,
            title: `Kick-off Call: ${lead.customerName || 'Lead'} x XYZ Technologies`,
            description: `Discussing tailored details for project: ${lead.industry || 'Software Solution'}.`,
            meetingDate,
            duration: 30,
            meetLink,
            status: 'REQUESTED'
          });
          await meeting.save();

          // Inform client in chat and show the link directly (friction-free!)
          const emailPromptText = lead.email 
            ? `I have also sent your tailored project brief and Google Meet link to your email: ${lead.email}!` 
            : `Please share your email address so I can send the calendar invite and a tailored project brief directly to your inbox!`;

          const meetingMsg = new Message({
            conversationId: conversation._id,
            sender: 'AI',
            message: `I've scheduled a kick-off callback meeting for you on ${meetingDate.toLocaleDateString()} at ${meetingDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}.\n\n🔗 **Here is your Google Meet link:** ${meetLink}\n\n${emailPromptText}`,
            messageType: 'TEXT',
            timestamp: new Date()
          });
          await meetingMsg.save();

          const { getIO } = await import('../sockets/socket.js');
          getIO().to(conversation.sessionId).emit('chat:message', meetingMsg);

          // Sync lead status
          lead.status = 'MEETING_SCHEDULED';
          await lead.save();

          // Push notifications to executives
          getIO().to('executives').emit('lead:updated', lead);
          getIO().to('executives').emit('notification:new', {
            type: 'MEETING',
            title: 'Meeting Scheduled',
            message: `${lead.customerName || 'Anonymous'} scheduled a kick-off call for ${meetingDate.toLocaleString()}. Link: ${meetLink}`,
            leadId: lead._id
          });

          // Send email immediately ONLY if email is already present
          if (lead.email) {
            const textContent = `Hi ${lead.customerName || 'there'},

Thank you for discussing your project requirements with our AI consultant. We have processed your details and scheduled a callback call.

Here is a brief tailored summary of your project:
- Industry: ${lead.industry || 'Custom Software'}
- Budget: ${lead.budget || '₹2.5 Lakhs'}
- Timeline: ${lead.timeline || '2 months'}
- Key Requirements: ${aiResponse.requirements?.features?.join(', ') || 'Custom Website Design, Responsive Layout'}

Your meeting has been scheduled:
📅 Date/Time: ${meetingDate.toLocaleString()}
🔗 Google Meet Link: ${meetLink}

A human senior technical consultant will join the call to answer any of your doubts and finalize the scope.

Best regards,
XYZ Technologies Consulting Team`;

            try {
              await sendEmail({
                to: lead.email,
                subject: `📋 Your Tailored Project Summary & Meeting Link`,
                text: textContent
              });
            } catch (emailError) {
              console.error('[Orchestrator] Error sending meeting email:', emailError);
            }
          }
        }
      }

      if (aiResponse.actions.includes('HANDOFF') || aiResponse.confidence < 0.65) {
        conversation.handoffStatus = 'PENDING';
        await conversation.save();
        console.log(`[Orchestrator] Requested human takeover handoff for session: ${conversation.sessionId}`);
        
        const { getIO } = await import('../sockets/socket.js');
        try {
          getIO().to('executives').emit('notification:new', {
            type: 'HANDOFF',
            title: 'Handoff Request',
            message: `Lead ${lead.customerName || 'Anonymous'} requires human takeover.`,
            leadId: lead._id
          });
        } catch (e) {}
      }
    } catch (error) {
      console.error(`[Orchestrator] Error executing actions:`, error);
    }
  }

  private static calculateIndianPrice(industry: string, features: string[], budgetStr?: string): number {
    if (budgetStr) {
      const clean = budgetStr.toLowerCase();
      if (clean.includes('lakh') || clean.includes('l') || clean.includes('lk')) {
        const match = clean.match(/([\d.]+)/);
        if (match) {
          return Math.round(parseFloat(match[1]) * 100000);
        }
      }
      const matchVal = clean.match(/([\d,]+)/);
      if (matchVal) {
        const val = parseInt(matchVal[1].replace(/,/g, ''), 10);
        if (val > 0) {
          if (val < 15) return val * 100000;
          return val;
        }
      }
    }

    let basePrice = 0;
    let hasService = false;

    // Detect requested services and add standard Indian competitive rates:
    features.forEach(f => {
      const feat = f.toLowerCase();
      if (feat.includes('ui') || feat.includes('ux') || feat.includes('design') || feat.includes('wireframe') || feat.includes('figma')) {
        basePrice += 45000; // Custom UI/UX
        hasService = true;
      }
      if (feat.includes('mobile') || feat.includes('app') || feat.includes('android') || feat.includes('ios') || feat.includes('flutter')) {
        basePrice += 450000; // Mobile App Development
        hasService = true;
      }
      if (feat.includes('seo') || feat.includes('optimization') || feat.includes('ranking')) {
        basePrice += 25000; // SEO Retainer setup
        hasService = true;
      }
      if (feat.includes('marketing') || feat.includes('campaign') || feat.includes('ad') || feat.includes('ppc')) {
        basePrice += 30000; // PPC Campaign & Fraud Shield setup
        hasService = true;
      }
      if (feat.includes('content') || feat.includes('writing') || feat.includes('blog')) {
        basePrice += 15000; // Content Writing setup
        hasService = true;
      }
      if (feat.includes('web') || feat.includes('site') || feat.includes('e-commerce') || feat.includes('portal')) {
        basePrice += 85000; // Web Designing & Development
        hasService = true;
      }
    });

    if (!hasService) {
      basePrice = 35000; // default basic web service rate
    }

    return basePrice;
  }

  private static parseMeetingDate(prefTime?: string): Date {
    let meetingDate = new Date();
    meetingDate.setDate(meetingDate.getDate() + 1); // default tomorrow
    meetingDate.setHours(16, 0, 0, 0); // default 4 PM

    if (prefTime) {
      try {
        if (!isNaN(Date.parse(prefTime))) {
          meetingDate = new Date(prefTime);
        } else {
          const cleanTime = prefTime.toLowerCase();
          const now = new Date();
          
          if (cleanTime.includes('today')) {
            meetingDate = new Date();
          } else if (cleanTime.includes('tomorrow')) {
            meetingDate = new Date();
            meetingDate.setDate(now.getDate() + 1);
          } else if (cleanTime.includes('monday')) {
            const resultDate = new Date();
            resultDate.setDate(now.getDate() + (1 + 7 - now.getDay()) % 7);
            meetingDate = resultDate;
          } else if (cleanTime.includes('tuesday')) {
            const resultDate = new Date();
            resultDate.setDate(now.getDate() + (2 + 7 - now.getDay()) % 7);
            meetingDate = resultDate;
          } else if (cleanTime.includes('wednesday')) {
            const resultDate = new Date();
            resultDate.setDate(now.getDate() + (3 + 7 - now.getDay()) % 7);
            meetingDate = resultDate;
          } else if (cleanTime.includes('thursday')) {
            const resultDate = new Date();
            resultDate.setDate(now.getDate() + (4 + 7 - now.getDay()) % 7);
            meetingDate = resultDate;
          } else if (cleanTime.includes('friday')) {
            const resultDate = new Date();
            resultDate.setDate(now.getDate() + (5 + 7 - now.getDay()) % 7);
            meetingDate = resultDate;
          }

          const hourMatch = cleanTime.match(/(\d+)\s*(am|pm)/i);
          if (hourMatch) {
            let hour = parseInt(hourMatch[1], 10);
            const ampm = hourMatch[2].toLowerCase();
            if (ampm === 'pm' && hour < 12) hour += 12;
            if (ampm === 'am' && hour === 12) hour = 0;
            meetingDate.setHours(hour, 0, 0, 0);
          } else {
            if (cleanTime.includes('afternoon')) {
              meetingDate.setHours(15, 0, 0, 0);
            } else if (cleanTime.includes('evening') || cleanTime.includes('night')) {
              meetingDate.setHours(18, 0, 0, 0);
            } else if (cleanTime.includes('morning')) {
              meetingDate.setHours(10, 0, 0, 0);
            }
          }
        }
      } catch (e) {
        console.warn('[Orchestrator] Meeting date parsing failed:', e);
      }
    }
    return meetingDate;
  }
}
