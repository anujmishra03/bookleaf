/**
 * BookLeaf Official Knowledge Base & Communication Calibration
 * Extracted directly from BookLeaf Operations Specification
 */

export interface KnowledgeBaseSection {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  content: string;
  sampleQueriesAndResponses: Array<{
    query: string;
    expectedTone: string;
  }>;
}

export const BOOKLEAF_KNOWLEDGE_BASE: Record<string, KnowledgeBaseSection> = {
  company: {
    id: 'company',
    category: 'GENERAL_INQUIRY',
    title: 'Company Overview & Operating Model',
    keywords: ['bookleaf', 'who are you', 'company', 'services', 'packages', 'free', 'bestseller breakthrough', 'delhi', 'warehouse', 'repro india', 'epitome'],
    content: `• BookLeaf Publishing is a leading self-publishing company operating in India and the US, processing 1,200+ books monthly across a catalog of 22,000+ titles.
• Publishing packages:
  - Standard Free: No upfront cost.
  - Bestseller Breakthrough: Premium paid package with marketing and distribution add-ons.
• Services handled: Cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
• Printing facilities: In-house printing facility and warehouse located in Delhi. Also works with print partners including Repro India and Epitome Books.`,
    sampleQueriesAndResponses: [],
  },

  royalties: {
    id: 'royalties',
    category: 'ROYALTY_PAYMENTS',
    title: 'Royalty Policy & Calculation',
    keywords: ['royalty', 'royalties', 'payout', 'money', 'payment', 'paid', 'bank', 'threshold', 'net profit', 'quarter', 'quarterly', '80/20', 'earnings', 'split'],
    content: `• Royalty split: 80% of net profit per book goes to the author, 20% to BookLeaf.
• Net profit formula: MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping charges.
• Calculation and Payout schedule: Royalties are calculated quarterly and paid within 45 days of the quarter ending.
• Minimum payout threshold: ₹1,000. If accumulated royalties are below ₹1,000, they roll over automatically to the next quarter.
• Payout channel: Direct bank transfer to the bank account linked in the author dashboard.
• Dashboard transparency: Authors can view a detailed royalty breakdown in their dashboard showing sales figures per platform.`,
    sampleQueriesAndResponses: [
      {
        query: 'I published my book 4 months ago and still haven’t received any royalty. What’s going on?',
        expectedTone: 'Acknowledge the frustration. Explain the quarterly royalty cycle and 45-day payout window. Check if their bank details are linked. Provide the specific next payout date. If payment is genuinely overdue, escalate with a 48-hour resolution timeline.',
      },
      {
        query: 'My royalty amount seems too low. I sold 200 copies but only received ₹3,000.',
        expectedTone: 'Explain the net profit calculation: MRP minus printing, platform commission, and shipping. Offer to share a detailed line-by-line royalty breakdown. Don’t be defensive—offer transparency.',
      },
    ],
  },

  isbn: {
    id: 'isbn',
    category: 'ISBN_METADATA',
    title: 'ISBN & Metadata Policy',
    keywords: ['isbn', 'metadata', 'barcode', 'imprint', 'different isbn', 'wrong isbn', 'duplicate', 'catalog', 'listing', 'title change', 'author name'],
    content: `• Assignment: Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf.
• Imprint: ISBNs are registered under BookLeaf’s publisher imprint. If an author wants an ISBN under their own imprint, they must obtain it independently.
• Urgent Escalation: If an author reports an ISBN error (duplicate, wrong book linked, mismatch between Amazon and physical copy), it is treated as a HIGH/CRITICAL priority issue and escalated immediately to the production team with a 48-hour resolution timeline.`,
    sampleQueriesAndResponses: [
      {
        query: 'My book is showing a different ISBN on Amazon than what’s on the physical copy.',
        expectedTone: 'Treat as high priority. Acknowledge this is a serious data issue. Confirm you are escalating to the production team immediately. Provide a 48-hour resolution timeline.',
      },
    ],
  },

  printing: {
    id: 'printing',
    category: 'PRINTING_QUALITY',
    title: 'Printing Turnaround & Quality Guarantee',
    keywords: ['printing', 'quality', 'misprint', 'binding', 'pages misaligned', 'blurry', 'copies', 'print quality', 'defect', 'damaged', 'paper', 'delhi'],
    content: `• Production facility: In-house printing handles most orders. Overflow or specific format requirements go to Repro India or Epitome Books.
• Turnaround time: Standard print turnaround is 5–7 business days from order confirmation.
• Free Reprint Policy: If an author reports a quality issue (misprints, binding defects, color inconsistency, blurry images), BookLeaf arranges a 100% free reprint after verification. The author is politely asked to share photos of the defective copies. The reprint turnaround is 5–7 business days.`,
    sampleQueriesAndResponses: [
      {
        query: 'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.',
        expectedTone: 'Apologise sincerely. Ask the author to share photos of the defective copies. Confirm that BookLeaf will arrange a free reprint once verified. Provide a timeline of 5–7 business days for the reprint.',
      },
    ],
  },

  distribution: {
    id: 'distribution',
    category: 'DISTRIBUTION_AVAILABILITY',
    title: 'Distribution Channels & Retail Availability',
    keywords: ['distribution', 'amazon', 'flipkart', 'store', 'currently unavailable', 'out of stock', 'listing', 'uk', 'us', 'buy link', 'live'],
    content: `• Channels: Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK, and the official BookLeaf Store.
• Go-live timeline: New listings typically go live within 7–10 business days after publication is complete.
• Stock Sync Resolution: If a book shows as "Currently Unavailable" or out of stock on Amazon/Flipkart, it usually indicates a stock sync issue. BookLeaf’s ops team triggers a re-sync with the distribution team, with resolution expected within 24–48 hours.`,
    sampleQueriesAndResponses: [
      {
        query: 'My book is published but it’s showing as "Currently Unavailable" on Amazon.',
        expectedTone: 'Explain that this is typically a stock sync issue. Confirm you’re triggering a re-sync with the distribution team. Set expectation: 24–48 hours for it to go live again.',
      },
    ],
  },

  production: {
    id: 'production',
    category: 'PRODUCTION_UPDATES',
    title: 'Production Lifecycle & Milestone Stages',
    keywords: ['production', 'status', 'stages', 'timeline', 'editing', 'cover design', 'typesetting', 'proofreading', 'delay', 'how long', 'manuscript'],
    content: `• Sequential Stages: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
• Updates: Authors are updated at each stage via email/portal.
• Delays: Delays typically occur at Cover Design (waiting for author approval) and Proofreading (revision rounds). Ops teams must check actual stage status and communicate transparently without blaming the author.`,
    sampleQueriesAndResponses: [
      {
        query: 'It’s been 3 weeks and my book is still in typesetting. When will it be done?',
        expectedTone: 'Check the actual production status. If it’s delayed, be honest about why (e.g., waiting on author approval for proofs or complex formatting). Provide a specific updated timeline. Don’t blame the author even if delay was revision-related—frame it collaboratively.',
      },
    ],
  },

  general: {
    id: 'general',
    category: 'GENERAL_INQUIRY',
    title: 'General Inquiries & Metadata Updates',
    keywords: ['description', 'author bio', 'price change', 'account', 'email change', 'general', 'update'],
    content: `• Metadata updates (e.g., updating book description, author bio, keywords): Authors can submit changes through the dashboard support ticket or email. Changes reflect on retail platforms within 3–5 business days.`,
    sampleQueriesAndResponses: [
      {
        query: 'Can I update the description of my book on Amazon after it’s already live?',
        expectedTone: 'Yes, metadata updates can be submitted through the dashboard or by emailing the BookLeaf team. Changes typically reflect on platforms within 3–5 business days.',
      },
    ],
  },
};

export const COMMUNICATION_TONE_GUIDELINES = `
• Always empathetic and professional. Authors are our creative partners, not customers to be managed.
• Acknowledge the author’s concern before jumping to solutions.
• Be specific: include actual numbers, dates, monetary amounts, and statuses wherever possible rather than vague reassurances.
• If something is BookLeaf’s fault (delayed royalties, ISBN error, reprint), own it directly. No corporate deflection.
• If the issue requires escalation or investigation, give a clear timeline ("Our team will look into this and get back to you within 48 hours") rather than open-ended promises.
• Always end with a clear next step for the author and/or the BookLeaf team.
`;
