import { ILead } from '../models/Lead.js';

export const calculateLeadScore = (lead: Partial<ILead>): { score: number; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'HOT' } => {
  let score = 0;

  // 1. Company Information (max 20 points)
  if (lead.customerName) score += 5;
  if (lead.companyName) score += 5;
  if (lead.email) score += 5;
  if (lead.phone) score += 5;

  // 2. Budget (max 20 points)
  if (lead.budget) {
    score += 20;
  }

  // 3. Timeline (max 20 points)
  if (lead.timeline) {
    score += 20;
  }

  // 4. Requirement Clarity (max 20 points)
  if (lead.requirementsSummary) {
    score += 15;
  }
  if (lead.projectType) {
    score += 5;
  }

  // 5. Engagement Quality / active conversation indicators (max 20 points)
  if (lead.industry) score += 10;
  if (lead.tags && lead.tags.length > 0) score += 10;

  // Determine priority category
  let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'HOT' = 'LOW';
  if (score > 80) priority = 'HOT';
  else if (score > 60) priority = 'HIGH';
  else if (score > 30) priority = 'MEDIUM';

  return { score, priority };
};
