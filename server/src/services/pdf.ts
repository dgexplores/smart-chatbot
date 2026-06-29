import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PDFProposalData {
  proposalNumber: string;
  customerName: string;
  companyName?: string;
  email: string;
  title: string;
  features: string[];
  deliverables: string[];
  timeline: string;
  estimatedCost: number;
}

/**
 * Generates a professional proposal PDF using PDFKit and saves it locally.
 * Returns the file path.
 */
export const generateProposalPDF = async (data: PDFProposalData): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filename = `proposal_${data.proposalNumber}.pdf`;
      
      // Ensure local output folder exists
      const outputDir = path.resolve(__dirname, '../../public/proposals');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filePath = path.join(outputDir, filename);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // --- Header / Branding ---
      doc
        .fillColor('#2563EB')
        .fontSize(20)
        .text('XYZ Technologies', 50, 50)
        .fillColor('#64748B')
        .fontSize(10)
        .text('Enterprise Digital Solutions & Consulting', 50, 75)
        .text(`Proposal Number: ${data.proposalNumber}`, 400, 50, { align: 'right' })
        .text(`Date: ${new Date().toLocaleDateString()}`, 400, 65, { align: 'right' });

      doc.moveDown(2);

      // --- Horizontal Separator ---
      doc
        .strokeColor('#E2E8F0')
        .lineWidth(1)
        .moveTo(50, 100)
        .lineTo(550, 100)
        .stroke();

      // --- Customer details ---
      doc.moveDown(1);
      doc
        .fillColor('#1E293B')
        .fontSize(14)
        .text('Project Proposal Summary', { underline: true });

      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor('#475569')
        .text(`Prepared For: ${data.customerName}`)
        .text(`Company: ${data.companyName || 'N/A'}`)
        .text(`Email: ${data.email}`)
        .text(`Project Title: ${data.title}`);

      doc.moveDown(1.5);

      // --- Requirements / Scope ---
      doc
        .fillColor('#1E293B')
        .fontSize(12)
        .text('Proposed Scope of Work');

      doc.moveDown(0.5);
      doc
        .fillColor('#475569')
        .fontSize(10);

      data.features.forEach((feature) => {
        doc.text(`• ${feature}`);
      });

      doc.moveDown(1.5);

      // --- Key Deliverables ---
      doc
        .fillColor('#1E293B')
        .fontSize(12)
        .text('Key Deliverables');

      doc.moveDown(0.5);
      doc
        .fillColor('#475569')
        .fontSize(10);

      data.deliverables.forEach((item) => {
        doc.text(`• ${item}`);
      });

      doc.moveDown(1.5);

      // --- Costing & Timeline ---
      doc
        .fillColor('#1E293B')
        .fontSize(12)
        .text('Project Timeline & Investment');

      doc.moveDown(0.5);
      doc
        .fillColor('#475569')
        .fontSize(10)
        .text(`Timeline: ${data.timeline}`);

      doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor('#2563EB')
        .text(`Estimated Project Cost: ₹${data.estimatedCost.toLocaleString('en-IN')}`);

      doc.font('Helvetica');

      doc.moveDown(1.5);

      // --- Signoff / Call to Action ---
      doc
        .strokeColor('#E2E8F0')
        .moveTo(50, doc.y)
        .lineTo(550, doc.y)
        .stroke();

      doc.moveDown(1);
      doc
        .fillColor('#64748B')
        .fontSize(8)
        .text('This proposal is valid for 30 days from the date of generation. Estimated costs are based on preliminary discovery requirements and are subject to minor scope adjustments upon final specifications signing.', { align: 'center' });

      // End PDF stream
      doc.end();

      writeStream.on('finish', () => {
        resolve(filePath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};
