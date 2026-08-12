import { User } from '../models/User.js';
import { Lead } from '../models/Lead.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Meeting } from '../models/Meeting.js';
import { Proposal } from '../models/Proposal.js';
import { Notification } from '../models/Notification.js';
import { CompetitorPrice } from '../models/CompetitorPrice.js';
import { PricingConfig } from '../models/PricingConfig.js';

/**
 * Seeds realistic demo data so the dashboard looks alive for showcases and
 * judge demos: leads across the pipeline, conversations, proposals (including
 * won/lost outcomes that feed the adaptive pricing loop), meetings,
 * notifications, and competitor price observations.
 *
 * Idempotent: skips entirely if leads already exist. Controlled by
 * SEED_DEMO_DATA=true in the environment (never runs in production by default).
 */
export const seedDemoData = async (): Promise<void> => {
  try {
    const leadCount = await Lead.countDocuments();
    if (leadCount > 0) {
      console.log('[SeedDemo] Leads already exist. Skipping demo data.');
      return;
    }

    const executive = await User.findOne({ role: 'executive' });
    if (!executive) {
      console.warn('[SeedDemo] No executive user found — run seedDatabase first.');
      return;
    }

    console.log('[SeedDemo] Seeding demo leads, conversations, proposals and market data...');

    // ------------------------------------------------------------------
    // Leads across the pipeline (realistic Indian SMB market)
    // ------------------------------------------------------------------
    const leads = await Lead.insertMany([
      {
        sessionId: 'demo-sess-001',
        customerName: 'Rajesh Sharma',
        companyName: 'Sharma Textiles',
        email: 'rajesh.sharma@sharmatextiles.in',
        phone: '+91 98765 10001',
        industry: 'Manufacturing',
        projectType: 'website',
        budget: '₹1.2 Lakhs',
        timeline: '3 weeks',
        leadScore: 88,
        leadPriority: 'HOT',
        status: 'MEETING_SCHEDULED',
        executiveAssigned: executive._id,
        requirementsSummary: 'Company website with product catalogue, enquiry form, and Google Maps integration.',
        aiSummary: 'Owner of a textile manufacturer. Needs a catalogue website before Diwali. Budget ₹1.2L, timeline flexible.',
        source: 'website',
        tags: ['hot', 'manufacturing', 'website'],
        notes: 'Prefers calls after 6 PM IST.'
      },
      {
        sessionId: 'demo-sess-002',
        customerName: 'Priya Patel',
        companyName: 'Petal & Co',
        email: 'priya@petalco.in',
        phone: '+91 98220 10002',
        industry: 'Cosmetics & Beauty',
        projectType: 'e-commerce',
        budget: '₹4 Lakhs',
        timeline: '2 months',
        leadScore: 92,
        leadPriority: 'HOT',
        status: 'PROPOSAL_SENT',
        executiveAssigned: executive._id,
        requirementsSummary: 'Full e-commerce store with UPI/COD payments, inventory, and WhatsApp order notifications.',
        aiSummary: 'Cosmetics brand scaling online. Wants e-commerce with UPI payments and subscription boxes. Budget ₹4L.',
        source: 'website',
        tags: ['ecommerce', 'upi', 'scale-up'],
        notes: 'Comparing with Shopify — needs to see the proposal today.'
      },
      {
        sessionId: 'demo-sess-003',
        customerName: 'Amit Verma',
        companyName: 'Verma Logistics',
        email: 'amit.verma@vermalogistics.com',
        phone: '+91 99870 10003',
        industry: 'Logistics',
        projectType: 'portal',
        budget: '₹2.5 Lakhs',
        timeline: '6 weeks',
        leadScore: 74,
        leadPriority: 'HIGH',
        status: 'NEGOTIATION',
        executiveAssigned: executive._id,
        requirementsSummary: 'Fleet tracking portal with driver app, live status, and invoice generation.',
        aiSummary: 'Logistics owner. Wants a tracking portal + driver app. Negotiating price — asked for a discount.',
        source: 'website',
        tags: ['portal', 'negotiation', 'custom'],
        notes: 'Countered at ₹2L. Close with priority support add-on.'
      },
      {
        sessionId: 'demo-sess-004',
        customerName: 'Sneha Iyer',
        companyName: 'FitLife Studio',
        email: 'sneha@fitlife.studio',
        phone: '+91 98110 10004',
        industry: 'Fitness',
        projectType: 'app',
        budget: '₹6 Lakhs',
        timeline: '3 months',
        leadScore: 81,
        leadPriority: 'HIGH',
        status: 'MEETING_SCHEDULED',
        executiveAssigned: executive._id,
        requirementsSummary: 'Booking app with class schedules, trainer profiles, and subscription payments.',
        aiSummary: 'Fitness studio chain (3 branches). Mobile app for class booking + memberships. Budget ₹6L.',
        source: 'website',
        tags: ['mobile-app', 'booking'],
        notes: 'Demo booked for Tuesday.'
      },
      {
        sessionId: 'demo-sess-005',
        customerName: 'Vikram Singh',
        companyName: 'Singh Realty',
        email: 'vikram@singhrealty.in',
        phone: '+91 98900 10005',
        industry: 'Real Estate',
        projectType: 'website',
        budget: '₹85k',
        timeline: '2 weeks',
        leadScore: 70,
        leadPriority: 'HIGH',
        status: 'WON',
        executiveAssigned: executive._id,
        requirementsSummary: 'Landing page with property listings and enquiry capture.',
        aiSummary: 'Real estate agent. Needs a sharp listings landing page. Small budget, quick turnaround.',
        source: 'website',
        tags: ['won', 'landing-page'],
        notes: 'Closed — site delivered.'
      },
      {
        sessionId: 'demo-sess-006',
        customerName: 'Anjali Deshmukh',
        companyName: 'Deshmukh Legal',
        email: 'anjali@deshmukhlegal.com',
        phone: '+91 97660 10006',
        industry: 'Legal',
        projectType: 'website',
        budget: '₹1 Lakh',
        timeline: '4 weeks',
        leadScore: 55,
        leadPriority: 'MEDIUM',
        status: 'QUALIFIED',
        requirementsSummary: 'Professional website with practice areas, team bios, and appointment scheduling.',
        aiSummary: 'Law firm. Wants a professional site with consultation booking. Budget ₹1L.',
        source: 'website',
        tags: ['legal', 'booking'],
        notes: ''
      },
      {
        sessionId: 'demo-sess-007',
        customerName: 'Rohit Malhotra',
        companyName: 'Malhotra Mart',
        email: 'rohit@malhotramart.in',
        phone: '+91 90040 10007',
        industry: 'Retail',
        projectType: 'e-commerce',
        budget: '₹3.5 Lakhs',
        timeline: '6 weeks',
        leadScore: 90,
        leadPriority: 'HOT',
        status: 'WON',
        executiveAssigned: executive._id,
        requirementsSummary: 'Multi-vendor marketplace with delivery tracking and payment gateway.',
        aiSummary: 'Retail chain going online. Marketplace model with 40+ vendors. Budget ₹3.5L.',
        source: 'website',
        tags: ['won', 'marketplace'],
        notes: 'Closed — kickoff next Monday.'
      },
      {
        sessionId: 'demo-sess-008',
        customerName: 'Kavita Nair',
        companyName: 'Nair & Associates',
        email: 'kavita@nairassociates.in',
        phone: '+91 98330 10008',
        industry: 'Accounting',
        projectType: 'portal',
        budget: '₹2 Lakhs',
        timeline: '2 months',
        leadScore: 48,
        leadPriority: 'MEDIUM',
        status: 'LOST',
        executiveAssigned: executive._id,
        requirementsSummary: 'Client portal with document sharing and invoicing.',
        aiSummary: 'CA firm. Portal for client documents. Lost to an in-house team.',
        source: 'website',
        tags: ['lost', 'portal'],
        notes: 'Went with an internal team — follow up in 6 months.'
      },
      {
        sessionId: 'demo-sess-009',
        customerName: 'Deepak Kulkarni',
        companyName: 'Kulkarni EdTech',
        email: 'deepak@kulkarniedtech.com',
        phone: '+91 97750 10009',
        industry: 'Education',
        projectType: 'saas',
        budget: '₹8 Lakhs',
        timeline: '4 months',
        leadScore: 85,
        leadPriority: 'HOT',
        status: 'PROPOSAL_SENT',
        executiveAssigned: executive._id,
        requirementsSummary: 'LMS platform with video courses, assessments, and certification.',
        aiSummary: 'EdTech founder. Full LMS platform. Budget ₹8L, fundraising in 2 months — timeline is tight.',
        source: 'website',
        tags: ['saas', 'edtech', 'fundraising'],
        notes: 'Wants a proposal with a payment-milestone plan.'
      },
      {
        sessionId: 'demo-sess-010',
        customerName: 'Neha Gupta',
        companyName: 'UrbanNest Interiors',
        email: 'neha@urbannest.in',
        phone: '+91 98510 10010',
        industry: 'Interior Design',
        projectType: 'website',
        budget: '₹95k',
        timeline: '3 weeks',
        leadScore: 40,
        leadPriority: 'MEDIUM',
        status: 'NEW',
        requirementsSummary: 'Portfolio website with project gallery and enquiry form.',
        aiSummary: 'Interior design studio. Portfolio site with before/after gallery. Early-stage enquiry.',
        source: 'website',
        tags: ['portfolio', 'new'],
        notes: ''
      }
    ]);

    // ------------------------------------------------------------------
    // Conversations + message threads
    // ------------------------------------------------------------------
    const conversations: any[] = [];
    const messages: any[] = [];
    const stageByStatus: Record<string, string> = {
      NEW: 'GREETING',
      QUALIFIED: 'QUALIFICATION',
      PROPOSAL_SENT: 'PROPOSAL_GENERATION',
      MEETING_SCHEDULED: 'HANDOFF',
      NEGOTIATION: 'HANDOFF',
      WON: 'CLOSED',
      LOST: 'CLOSED'
    };

    for (const lead of leads) {
      const stage = stageByStatus[lead.status] ?? 'DISCOVERY';
      const isClosed = lead.status === 'WON' || lead.status === 'LOST';
      const conversation = await Conversation.create({
        leadId: lead._id,
        sessionId: lead.sessionId,
        currentStage: stage,
        conversationStatus: isClosed ? 'COMPLETED' : 'ACTIVE',
        handoffStatus: lead.status === 'MEETING_SCHEDULED' || lead.status === 'NEGOTIATION' ? 'ACTIVE' : 'NONE',
        executiveId: lead.executiveAssigned,
        startedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        endedAt: isClosed ? new Date() : undefined
      });
      conversations.push(conversation);

      const t0 = Date.now() - 2 * 24 * 3600 * 1000;
      const aiFirst =
        stage === 'GREETING'
          ? "Hello! I'm the AI Solutions Consultant at XYZ Technologies. Could you tell me a bit about your business and what kind of website or application you are looking to build?"
          : "Thanks! Let me understand your requirements so I can prepare a formal estimate. What are the primary goals and who is your target audience?";
      const customerMsg =
        stage === 'GREETING'
          ? `Hi, we're ${lead.companyName} and we're looking to build a ${lead.projectType}.`
          : `We need a ${lead.projectType} with a budget around ${lead.budget}. My email is ${lead.email}.`;
      const aiFollow =
        stage === 'GREETING' || stage === 'DISCOVERY'
          ? 'Perfect — what features and pages do you have in mind?'
          : stage === 'QUALIFICATION'
            ? `Great, I've saved your details (${lead.email}). Based on your requirements I recommend the Professional package. Shall I generate a tailored proposal?`
            : stage === 'PROPOSAL_GENERATION'
              ? "Excellent choice! I'm generating a tailored digital proposal PDF for your review now — you'll receive a link in this chat shortly."
              : stage === 'HANDOFF'
                ? 'I understand. Let me hand this chat over to our senior sales executive right now — they will schedule a call to discuss a custom plan.'
                : 'I have scheduled a callback for you. Our team will reach out shortly. Thank you for reaching out!';

      messages.push(
        {
          conversationId: conversation._id,
          sender: 'CUSTOMER',
          message: customerMsg,
          messageType: 'TEXT',
          timestamp: new Date(t0 + 10 * 60 * 1000)
        },
        {
          conversationId: conversation._id,
          sender: 'AI',
          message: aiFirst,
          messageType: 'TEXT',
          timestamp: new Date(t0 + 11 * 60 * 1000)
        },
        {
          conversationId: conversation._id,
          sender: 'CUSTOMER',
          message: `We're interested — my email is ${lead.email}, budget around ${lead.budget}.`,
          messageType: 'TEXT',
          timestamp: new Date(t0 + 12 * 60 * 1000)
        },
        {
          conversationId: conversation._id,
          sender: 'AI',
          message: aiFollow,
          messageType: 'TEXT',
          timestamp: new Date(t0 + 13 * 60 * 1000)
        }
      );

      if (lead.status === 'PROPOSAL_SENT' || lead.status === 'WON') {
        messages.push({
          conversationId: conversation._id,
          sender: 'AI',
          message: 'Here is your proposal PDF:',
          messageType: 'PROPOSAL',
          metadata: { proposalNumber: `PROP-${lead._id.toString().slice(-4)}`, cost: lead.budget },
          timestamp: new Date(t0 + 14 * 60 * 1000)
        });
      }
      if (lead.status === 'NEGOTIATION') {
        messages.push({
          conversationId: conversation._id,
          sender: 'CUSTOMER',
          message: 'That is a bit above our budget. Can you match ₹2 Lakhs?',
          messageType: 'TEXT',
          timestamp: new Date(t0 + 16 * 60 * 1000)
        });
      }
    }
    await Message.insertMany(messages);

    // ------------------------------------------------------------------
    // Meetings
    // ------------------------------------------------------------------
    const scheduled = leads.filter((l) => l.status === 'MEETING_SCHEDULED');
    await Meeting.insertMany(
      scheduled.map((lead, i) => ({
        leadId: lead._id,
        executiveId: executive._id,
        title: `Kickoff call — ${lead.companyName}`,
        description: `Discuss ${lead.projectType} requirements and proposal.`,
        meetingDate: new Date(Date.now() + (i + 1) * 2 * 24 * 3600 * 1000),
        duration: 30,
        meetLink: `https://meet.google.com/demo-${String(i + 1).padStart(3, '0')}-xyz`,
        status: 'CONFIRMED' as const
      }))
    );
    const negotiating = leads.find((l) => l.status === 'NEGOTIATION');
    if (negotiating) {
      await Meeting.create({
        leadId: negotiating._id,
        executiveId: executive._id,
        title: `Price negotiation — ${negotiating.companyName}`,
        meetingDate: new Date(Date.now() + 24 * 3600 * 1000),
        duration: 30,
        status: 'REQUESTED' as const
      });
    }

    // ------------------------------------------------------------------
    // Proposals — including wins/losses that feed the adaptive pricing loop
    // ------------------------------------------------------------------
    const proposalDefs = [
      { lead: leads[1], services: ['ECOMMERCE'], cost: 400000, status: 'SENT', version: 1 },
      { lead: leads[4], services: ['WEB_DEVELOPMENT'], cost: 85000, status: 'APPROVED', version: 1 },
      { lead: leads[6], services: ['ECOMMERCE'], cost: 350000, status: 'APPROVED', version: 2 },
      { lead: leads[7], services: ['WEB_DEVELOPMENT', 'UI_UX_DESIGN'], cost: 260000, status: 'REJECTED', version: 1 },
      { lead: leads[8], services: ['SAAS_PLATFORM'], cost: 800000, status: 'SENT', version: 2 }
    ];
    for (const [idx, def] of proposalDefs.entries()) {
      const proposalNumber = `PROP-${String(1000 + idx * 7)}`;
      await Proposal.create({
        leadId: def.lead._id,
        proposalNumber,
        version: def.version,
        title: `${def.lead.companyName} — ${def.lead.projectType} proposal`,
        features: ['Responsive design', 'Admin dashboard', 'Payment gateway', 'Analytics'],
        deliverables: ['Source code', 'Design files', 'Deployment & training'],
        timeline: def.lead.timeline ?? '4 weeks',
        estimatedCost: def.cost,
        paymentMilestones: [
          { description: 'Advance (40%)', amount: Math.round(def.cost * 0.4) },
          { description: 'Mid-project (30%)', amount: Math.round(def.cost * 0.3) },
          { description: 'Delivery (30%)', amount: Math.round(def.cost * 0.3) }
        ],
        generatedBy: executive._id,
        services: def.services,
        pricingVersion: def.version,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        status: def.status
      });
    }

    // ------------------------------------------------------------------
    // Notifications for the executive
    // ------------------------------------------------------------------
    await Notification.insertMany([
      {
        userId: executive._id,
        leadId: leads[0]._id,
        type: 'HANDOFF',
        title: 'Handoff request',
        message: 'Rajesh Sharma (Sharma Textiles) is waiting for a call — lead scored 88.',
        channel: 'DASHBOARD'
      },
      {
        userId: executive._id,
        leadId: leads[2]._id,
        type: 'NEGOTIATION',
        title: 'Price negotiation',
        message: 'Amit Verma countered at ₹2 Lakhs — respond before EOD.',
        channel: 'DASHBOARD'
      },
      {
        userId: executive._id,
        leadId: leads[1]._id,
        type: 'PROPOSAL',
        title: 'Proposal sent',
        message: 'Proposal delivered to Priya Patel (Petal & Co).',
        channel: 'DASHBOARD'
      }
    ]);

    // ------------------------------------------------------------------
    // Competitor market observations (feeds the adaptive pricing loop)
    // ------------------------------------------------------------------
    const competitors = [
      { service: 'WEB_DEVELOPMENT', competitor: 'GoDaddy India', price: 14999 },
      { service: 'WEB_DEVELOPMENT', competitor: 'WebiNerds', price: 55000 },
      { service: 'WEB_DEVELOPMENT', competitor: 'Tatvic', price: 65000 },
      { service: 'MOBILE_APP', competitor: 'GeekyAnts', price: 420000 },
      { service: 'MOBILE_APP', competitor: 'Brilworks', price: 350000 },
      { service: 'SAAS_PLATFORM', competitor: 'Daffodil', price: 750000 },
      { service: 'ECOMMERCE', competitor: 'Netleaf', price: 280000 },
      { service: 'SEO', competitor: 'Rankz', price: 18000 }
    ];
    const observations: any[] = [];
    for (let week = 0; week < 8; week++) {
      for (const c of competitors) {
        observations.push({
          ...c,
          // Slight drift over time so the market looks "alive"
          price: Math.round(c.price * (1 + ((week - 4) * 0.02 + (Math.sin(week) * 0.01)))),
          capturedAt: new Date(Date.now() - week * 7 * 24 * 3600 * 1000)
        });
      }
    }
    await CompetitorPrice.insertMany(observations);

    // ------------------------------------------------------------------
    // Rate card: seed a v2 card so pricing history shows adaptation
    // ------------------------------------------------------------------
    const existingConfig = await PricingConfig.findOne({ isActive: true });
    if (!existingConfig) {
      const v1 = await PricingConfig.create({
        version: 1,
        effectiveFrom: new Date(Date.now() - 14 * 24 * 3600 * 1000),
        isActive: true,
        rates: [
          {
            service: 'WEB_DEVELOPMENT',
            label: 'Web Designing & Development',
            description: 'Custom React/Next.js design, mobile-first layouts, databases, and API integrations.',
            basePrice: 85000,
            multiplier: 1,
            corridorMin: 0.7,
            corridorMax: 1.3,
            tiers: []
          },
          {
            service: 'MOBILE_APP',
            label: 'Mobile Applications',
            description: 'iOS & Android apps (Flutter, React Native).',
            basePrice: 450000,
            multiplier: 1,
            corridorMin: 0.7,
            corridorMax: 1.3,
            tiers: []
          },
          {
            service: 'SAAS_PLATFORM',
            label: 'Custom SaaS Systems',
            description: 'Full-stack SaaS platforms.',
            basePrice: 800000,
            multiplier: 1,
            corridorMin: 0.7,
            corridorMax: 1.3,
            tiers: []
          },
          {
            service: 'ECOMMERCE',
            label: 'E-commerce Development',
            description: 'Stores with payments, inventory, and delivery.',
            basePrice: 350000,
            multiplier: 1,
            corridorMin: 0.7,
            corridorMax: 1.3,
            tiers: []
          }
        ]
      });
      // v2 reflects a small market-driven tweak (e.g. competitor pressure)
      v1.set('isActive', false);
      await v1.save();
      await PricingConfig.create({
        version: 2,
        effectiveFrom: new Date(Date.now() - 3 * 24 * 3600 * 1000),
        isActive: true,
        rates: v1.rates.map((r) => ({ ...r, multiplier: r.service === 'WEB_DEVELOPMENT' ? 0.95 : 1.02 }))
      });
      console.log('[SeedDemo] Seeded rate card history (v1 → v2).');
    }

    console.log(`[SeedDemo] Done — ${leads.length} leads, ${conversations.length} conversations, ${proposalDefs.length} proposals, ${observations.length} market observations.`);
  } catch (error) {
    console.error('[SeedDemo] Error seeding demo data:', error);
    throw error;
  }
};
