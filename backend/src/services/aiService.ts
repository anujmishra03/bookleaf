import { TicketCategory, TicketPriority } from '@prisma/client';
import { BOOKLEAF_KNOWLEDGE_BASE, COMMUNICATION_TONE_GUIDELINES, KnowledgeBaseSection } from '../config/knowledgeBase';

export interface AuthorContext {
  name: string;
  email: string;
  bankAccountLinked: boolean;
  bankDetails?: { bankName?: string; accountNumberLast4?: string } | null;
}

export interface BookContext {
  title: string;
  isbn?: string | null;
  status: string;
  mrp?: number;
  printingCost?: number;
  totalCopiesSold?: number;
  totalRoyaltyEarned?: number;
  royaltyPaid?: number;
  royaltyPending?: number;
}

export interface AiClassificationResult {
  category: TicketCategory;
  priority: TicketPriority;
  confidence: number;
  classificationReason: string;
  priorityReason: string;
  tokensUsed?: number;
  provider: string;
}

export interface AiDraftResult {
  draftResponse: string;
  relevantKbSections: string[];
  tokensUsed?: number;
  provider: string;
}

class AiService {
  private geminiKey: string;
  private openAiKey: string;
  private provider: 'gemini' | 'openai' | 'fallback';

  constructor() {
    this.geminiKey = process.env.GEMINI_API_KEY || '';
    this.openAiKey = process.env.OPENAI_API_KEY || '';
    const preferred = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

    if (preferred === 'openai' && this.openAiKey) {
      this.provider = 'openai';
    } else if (this.geminiKey) {
      this.provider = 'gemini';
    } else if (this.openAiKey) {
      this.provider = 'openai';
    } else {
      this.provider = 'fallback';
    }

    console.log(`🤖 AI Service initialized. Active provider: [${this.provider.toUpperCase()}]`);
  }

  /**
   * Selects relevant knowledge base sections using token-conscious keyword matching (RAG-lite)
   */
  public selectRelevantKb(query: string, categoryHint?: TicketCategory): KnowledgeBaseSection[] {
    const text = query.toLowerCase();
    const scored: Array<{ section: KnowledgeBaseSection; score: number }> = [];

    for (const key of Object.keys(BOOKLEAF_KNOWLEDGE_BASE)) {
      const section = BOOKLEAF_KNOWLEDGE_BASE[key];
      let score = 0;

      if (categoryHint && section.category === categoryHint) {
        score += 5;
      }

      for (const kw of section.keywords) {
        if (text.includes(kw.toLowerCase())) {
          score += 2;
        }
      }

      scored.push({ section, score });
    }

    scored.sort((a, b) => b.score - a.score);
    // Take top 2 most relevant sections to keep token usage minimal and hyper-focused
    const top = scored.filter((s) => s.score > 0).slice(0, 2).map((s) => s.section);
    return top.length > 0 ? top : [BOOKLEAF_KNOWLEDGE_BASE.company, BOOKLEAF_KNOWLEDGE_BASE.general];
  }

  /**
   * Classify Ticket and assign priority score
   */
  public async classifyTicket(
    subject: string,
    description: string,
    bookContext?: BookContext | null
  ): Promise<AiClassificationResult> {
    const combinedText = `${subject}\n${description}`.trim();

    // If active LLM is available, call it; otherwise degrade gracefully to rule engine
    if (this.provider === 'gemini' && this.geminiKey) {
      try {
        return await this.classifyWithGemini(combinedText, bookContext);
      } catch (err) {
        console.warn('⚠️ Gemini classification call failed, falling back to heuristic engine:', (err as Error).message);
      }
    } else if (this.provider === 'openai' && this.openAiKey) {
      try {
        return await this.classifyWithOpenAi(combinedText, bookContext);
      } catch (err) {
        console.warn('⚠️ OpenAI classification call failed, falling back to heuristic engine:', (err as Error).message);
      }
    }

    // Graceful Fallback Classifier
    return this.fallbackClassify(combinedText, bookContext);
  }

  /**
   * Generate an AI draft response based on ticket and BookLeaf Knowledge Base
   */
  public async generateDraftResponse(
    subject: string,
    description: string,
    category: TicketCategory,
    author: AuthorContext,
    book?: BookContext | null
  ): Promise<AiDraftResult> {
    const relevantSections = this.selectRelevantKb(`${subject} ${description}`, category);

    if (this.provider === 'gemini' && this.geminiKey) {
      try {
        return await this.generateDraftGemini(subject, description, category, author, book, relevantSections);
      } catch (err) {
        console.warn('⚠️ Gemini draft generation failed, falling back to template engine:', (err as Error).message);
      }
    } else if (this.provider === 'openai' && this.openAiKey) {
      try {
        return await this.generateDraftOpenAi(subject, description, category, author, book, relevantSections);
      } catch (err) {
        console.warn('⚠️ OpenAI draft generation failed, falling back to template engine:', (err as Error).message);
      }
    }

    // Graceful Fallback Template Engine
    return this.fallbackDraft(subject, description, category, author, book, relevantSections);
  }

  // ==========================================
  // LLM Implementations (Gemini & OpenAI)
  // ==========================================

  private async classifyWithGemini(
    text: string,
    book?: BookContext | null
  ): Promise<AiClassificationResult> {
    const prompt = `You are the lead ticket triage AI for BookLeaf Publishing.
Analyze this author query and classify it into exactly one category and one priority level.

CATEGORIES:
- ROYALTY_PAYMENTS (payout delays, net profit calculation, minimum threshold ₹1000, bank account issues)
- ISBN_METADATA (ISBN mismatches, catalog errors, book linking issues, imprint)
- PRINTING_QUALITY (misprints, paper quality, binding defects, blurry images)
- DISTRIBUTION_AVAILABILITY (Amazon/Flipkart stock sync, unavailable listings, global distribution)
- PRODUCTION_UPDATES (stages: typesetting, cover design, editing, proofreading delays)
- GENERAL_INQUIRY (author bio updates, marketing packages, general questions)

PRIORITIES:
- CRITICAL (Severe distress: >3 months missing royalties, launch blocker)
- HIGH (ISBN mismatches, printing batch defects, out of stock during active campaign)
- MEDIUM (Typesetting/production delays, explanation of royalty breakdown)
- LOW (General inquiries, bio/description updates, minor questions)

Context: ${book ? `Book Title: ${book.title}, Status: ${book.status}` : 'General / Account level'}
Author Query:
"""
${text}
"""

Respond ONLY with valid JSON in this format:
{
  "category": "ROYALTY_PAYMENTS | ISBN_METADATA | PRINTING_QUALITY | DISTRIBUTION_AVAILABILITY | PRODUCTION_UPDATES | GENERAL_INQUIRY",
  "priority": "CRITICAL | HIGH | MEDIUM | LOW",
  "confidence": 0.95,
  "classificationReason": "one short sentence explaining category",
  "priorityReason": "one short sentence explaining priority"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          maxOutputTokens: 250,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawJson);

    return {
      category: parsed.category as TicketCategory,
      priority: parsed.priority as TicketPriority,
      confidence: parsed.confidence || 0.95,
      classificationReason: parsed.classificationReason || 'Classified via Gemini AI',
      priorityReason: parsed.priorityReason || 'Prioritized based on impact and urgency',
      tokensUsed: data.usageMetadata?.totalTokenCount || 180,
      provider: 'Gemini 1.5 Flash',
    };
  }

  private async classifyWithOpenAi(
    text: string,
    book?: BookContext | null
  ): Promise<AiClassificationResult> {
    const prompt = `Classify this BookLeaf author ticket into category and priority according to company guidelines.
Valid Categories: ROYALTY_PAYMENTS, ISBN_METADATA, PRINTING_QUALITY, DISTRIBUTION_AVAILABILITY, PRODUCTION_UPDATES, GENERAL_INQUIRY.
Valid Priorities: CRITICAL, HIGH, MEDIUM, LOW.

Query: ${text}
Book Context: ${book ? `${book.title} (${book.status})` : 'General'}

Return JSON: { "category": "...", "priority": "...", "confidence": 0.95, "classificationReason": "...", "priorityReason": "..." }`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return {
      category: parsed.category,
      priority: parsed.priority,
      confidence: parsed.confidence || 0.94,
      classificationReason: parsed.classificationReason,
      priorityReason: parsed.priorityReason,
      tokensUsed: data.usage?.total_tokens || 190,
      provider: 'OpenAI GPT-4o-mini',
    };
  }

  private async generateDraftGemini(
    subject: string,
    description: string,
    category: TicketCategory,
    author: AuthorContext,
    book: BookContext | null | undefined,
    kbSections: KnowledgeBaseSection[]
  ): Promise<AiDraftResult> {
    const kbContext = kbSections.map((s) => `### ${s.title}\n${s.content}`).join('\n\n');
    const authorDetails = `Author: ${author.name} (${author.email})\nBank Linked: ${author.bankAccountLinked ? `Yes (${author.bankDetails?.bankName || 'Linked Bank'})` : 'NO - Unlinked'}`;
    const bookDetails = book
      ? `Book: "${book.title}", ISBN: ${book.isbn || 'Pending Assignment'}, Status: ${book.status}, Copies Sold: ${book.totalCopiesSold || 0}, Royalty Earned: ₹${book.totalRoyaltyEarned || 0}, Pending Payout: ₹${book.royaltyPending || 0}`
      : 'General / Account level inquiry';

    const systemPrompt = `You are a Senior Author Support Specialist at BookLeaf Publishing.
Draft an empathetic, clear, and professional response to the author's ticket.

COMMUNICATION RULES:
${COMMUNICATION_TONE_GUIDELINES}

BOOKLEAF POLICIES & KNOWLEDGE BASE:
${kbContext}

AUTHOR CONTEXT:
${authorDetails}

BOOK CONTEXT:
${bookDetails}

INSTRUCTIONS:
1. Greet the author warmly by their first name (e.g. "Dear ${author.name.split(' ')[0]}").
2. Explicitly acknowledge their specific frustration or situation first.
3. Reference their actual data (dates, amounts, copies, status) where relevant.
4. If a delay or issue occurred, own it gracefully without deflection.
5. Provide a realistic timeline (e.g., 24-48 hours for stock sync, 48 hours for investigation, 5-7 business days for reprints).
6. State the exact next step.
7. Sign off as:
Warm regards,
BookLeaf Author Support Team`;

    const userPrompt = `Ticket Subject: ${subject}\nTicket Description:\n${description}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\n---\nAuthor's Ticket:\n${userPrompt}` }] },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini draft error: ${res.status}`);
    }

    const data: any = await res.json();
    const draft = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return {
      draftResponse: draft,
      relevantKbSections: kbSections.map((s) => s.id),
      tokensUsed: data.usageMetadata?.totalTokenCount || 450,
      provider: 'Gemini 1.5 Flash',
    };
  }

  private async generateDraftOpenAi(
    subject: string,
    description: string,
    category: TicketCategory,
    author: AuthorContext,
    book: BookContext | null | undefined,
    kbSections: KnowledgeBaseSection[]
  ): Promise<AiDraftResult> {
    const kbContext = kbSections.map((s) => `### ${s.title}\n${s.content}`).join('\n\n');
    const systemPrompt = `You are a Senior Author Support Specialist at BookLeaf Publishing.
Tone: Empathetic, professional, specific numbers and dates, direct ownership, clear next steps.
Knowledge Base:\n${kbContext}
Author: ${author.name}, Bank: ${author.bankAccountLinked ? 'Linked' : 'Not Linked'}
Book Context: ${book ? `${book.title} | Status: ${book.status} | Royalty Pending: ₹${book.royaltyPending || 0}` : 'General'}`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Subject: ${subject}\n\nDescription: ${description}` },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI draft error: ${res.status}`);
    }

    const data: any = await res.json();
    return {
      draftResponse: data.choices[0].message.content.trim(),
      relevantKbSections: kbSections.map((s) => s.id),
      tokensUsed: data.usage?.total_tokens || 420,
      provider: 'OpenAI GPT-4o-mini',
    };
  }

  // ==========================================
  // Deterministic Intelligent Fallback Engine
  // (Ensures 100% Graceful Degradation)
  // ==========================================

  private fallbackClassify(text: string, book?: BookContext | null): AiClassificationResult {
    const lower = text.toLowerCase();

    // 1. Royalty & Payments
    if (
      lower.includes('royalt') ||
      lower.includes('payout') ||
      lower.includes('payment') ||
      lower.includes('paid') ||
      lower.includes('bank') ||
      lower.includes('money') ||
      lower.includes('profit') ||
      lower.includes('threshold') ||
      lower.includes('quarter')
    ) {
      const isCritical =
        lower.includes('not received') ||
        lower.includes('haven’t received') ||
        lower.includes('havent received') ||
        lower.includes('months') ||
        lower.includes('never paid') ||
        lower.includes('urgent') ||
        lower.includes('missing');

      return {
        category: TicketCategory.ROYALTY_PAYMENTS,
        priority: isCritical ? TicketPriority.CRITICAL : TicketPriority.MEDIUM,
        confidence: 0.92,
        classificationReason: 'Identified payment, royalty calculation, or disbursement inquiry.',
        priorityReason: isCritical
          ? 'Author reports delayed or missing royalty payout over extended duration.'
          : 'Standard royalty calculation and statement breakdown query.',
        tokensUsed: 0,
        provider: 'BookLeaf Intelligent Rules Engine (Fallback)',
      };
    }

    // 2. ISBN & Metadata
    if (
      lower.includes('isbn') ||
      lower.includes('barcode') ||
      lower.includes('imprint') ||
      lower.includes('wrong book') ||
      lower.includes('metadata') ||
      lower.includes('duplicate')
    ) {
      return {
        category: TicketCategory.ISBN_METADATA,
        priority: TicketPriority.HIGH,
        confidence: 0.94,
        classificationReason: 'Identified ISBN identifier or catalog metadata discrepancy.',
        priorityReason: 'ISBN errors directly affect retail catalog listings and require 48-hour escalation.',
        tokensUsed: 0,
        provider: 'BookLeaf Intelligent Rules Engine (Fallback)',
      };
    }

    // 3. Printing & Quality
    if (
      lower.includes('print') ||
      lower.includes('quality') ||
      lower.includes('defect') ||
      lower.includes('misprint') ||
      lower.includes('binding') ||
      lower.includes('blurry') ||
      lower.includes('damaged') ||
      lower.includes('author copies')
    ) {
      return {
        category: TicketCategory.PRINTING_QUALITY,
        priority: TicketPriority.HIGH,
        confidence: 0.93,
        classificationReason: 'Identified physical print quality or defective copy report.',
        priorityReason: 'Author copy defects impact author trust and qualify for free reprint verification.',
        tokensUsed: 0,
        provider: 'BookLeaf Intelligent Rules Engine (Fallback)',
      };
    }

    // 4. Distribution & Retail Availability
    if (
      lower.includes('amazon') ||
      lower.includes('flipkart') ||
      lower.includes('unavailable') ||
      lower.includes('out of stock') ||
      lower.includes('listing') ||
      lower.includes('buy link') ||
      lower.includes('distribution')
    ) {
      return {
        category: TicketCategory.DISTRIBUTION_AVAILABILITY,
        priority: TicketPriority.HIGH,
        confidence: 0.91,
        classificationReason: 'Identified retail distribution channel or listing stock sync issue.',
        priorityReason: 'Unavailable retail listings directly hurt book sales and author discoverability.',
        tokensUsed: 0,
        provider: 'BookLeaf Intelligent Rules Engine (Fallback)',
      };
    }

    // 5. Production & Milestone Updates
    if (
      lower.includes('typesetting') ||
      lower.includes('cover') ||
      lower.includes('proofreading') ||
      lower.includes('editing') ||
      lower.includes('production') ||
      lower.includes('delay') ||
      lower.includes('status') ||
      lower.includes('stage')
    ) {
      return {
        category: TicketCategory.PRODUCTION_UPDATES,
        priority: TicketPriority.MEDIUM,
        confidence: 0.90,
        classificationReason: 'Identified inquiry regarding book production lifecycle or timeline.',
        priorityReason: 'Production milestone query requiring timeline transparency.',
        tokensUsed: 0,
        provider: 'BookLeaf Intelligent Rules Engine (Fallback)',
      };
    }

    // 6. General Inquiry
    return {
      category: TicketCategory.GENERAL_INQUIRY,
      priority: TicketPriority.LOW,
      confidence: 0.88,
      classificationReason: 'General inquiry or metadata update request.',
      priorityReason: 'Standard non-urgent inquiry.',
      tokensUsed: 0,
      provider: 'BookLeaf Intelligent Rules Engine (Fallback)',
    };
  }

  private fallbackDraft(
    subject: string,
    description: string,
    category: TicketCategory,
    author: AuthorContext,
    book: BookContext | null | undefined,
    kbSections: KnowledgeBaseSection[]
  ): AiDraftResult {
    const firstName = author.name.split(' ')[0] || 'Author';

    let draft = '';

    switch (category) {
      case TicketCategory.ROYALTY_PAYMENTS: {
        const isBankUnlinked = !author.bankAccountLinked;
        const pending = book?.royaltyPending ?? 0;

        if (isBankUnlinked) {
          draft = `Dear ${firstName},

Thank you for reaching out to BookLeaf Support. I completely understand your concern regarding your royalty payout.

Upon reviewing your author profile, we noticed that your bank account details are currently not linked in your author dashboard. At BookLeaf, royalties are calculated quarterly and disbursed within 45 days of the quarter ending, provided accumulated royalties exceed our minimum threshold of ₹1,000. Because your bank details are pending, payouts cannot be released automatically.

Next Steps:
1. Please navigate to your Author Dashboard settings and update your bank account details (Bank Name, Account Number, and IFSC code).
2. Once submitted, our accounts team will verify and release your accumulated royalties in the upcoming disbursement batch.

We apologize for any confusion and are here to ensure your payout is processed smoothly.

Warm regards,
BookLeaf Author Support Team`;
        } else {
          draft = `Dear ${firstName},

Thank you for reaching out, and I apologize for any stress caused regarding your royalty payments${book ? ` for "${book.title}"` : ''}.

At BookLeaf, we follow an 80/20 royalty split (80% of net profit goes directly to you). Royalties are calculated on a quarterly cycle and disbursed within 45 days following the quarter close, with a minimum payout threshold of ₹1,000. 

We have escalated your account to our finance team for an immediate payment audit. If your payout is overdue, our team will resolve and provide payment confirmation within 48 hours.

We appreciate your partnership and patience as we verify the disbursement records.

Warm regards,
BookLeaf Author Support Team`;
        }
        break;
      }

      case TicketCategory.ISBN_METADATA: {
        draft = `Dear ${firstName},

Thank you for bringing this to our attention. We treat all ISBN and metadata discrepancies with high urgency.

Every book published through BookLeaf receives a unique ISBN assigned under our publisher imprint. A discrepancy between physical copies and online retail platforms usually indicates an outdated distributor catalog feed.

We have forwarded this directly to our production and catalog team for an emergency re-sync. Corrections typically reflect across Amazon and retail platforms within 24 to 48 hours. We will follow up with you as soon as the live catalog updates.

Warm regards,
BookLeaf Author Support Team`;
        break;
      }

      case TicketCategory.PRINTING_QUALITY: {
        draft = `Dear ${firstName},

We sincerely apologize for the quality issue you experienced with your author copies. At BookLeaf, we take pride in our print standards, and this does not reflect the quality we strive for.

Under our BookLeaf Quality Guarantee, if copies have misprints, binding defects, or color misalignment, we arrange a 100% free reprint right away.

To expedite this:
• Please reply to this ticket or share a couple of clear photographs showing the defective copies.
• Once our quality assurance team verifies the photos, we will trigger a fresh print run at our Delhi facility with a standard turnaround of 5–7 business days.

We will make sure this is rectified promptly.

Warm regards,
BookLeaf Author Support Team`;
        break;
      }

      case TicketCategory.DISTRIBUTION_AVAILABILITY: {
        draft = `Dear ${firstName},

Thank you for contacting us regarding the availability of your book${book ? ` "${book.title}"` : ''}.

When a book shows as "Currently Unavailable" on Amazon or Flipkart after being published, it is almost always due to a stock synchronization refresh between distributor inventory feeds. 

Our distribution team has already triggered an inventory re-sync with Amazon and retail partners. These listing syncs typically reflect live on the store page within 24–48 hours. We will monitor the link and notify you once full purchasing availability is restored.

Warm regards,
BookLeaf Author Support Team`;
        break;
      }

      case TicketCategory.PRODUCTION_UPDATES: {
        draft = `Dear ${firstName},

Thank you for checking in on the production progress of your book${book ? ` "${book.title}"` : ''}.

Our standard production workflow advances through: Manuscript Received → Editing → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Live Distribution. 

${book ? `Your book is currently in the ${book.status.replace(/_/g, ' ')} stage.` : 'We are reviewing your production milestones.'} We are ensuring that the layout and typography meet all publishing specifications. Our production lead is reviewing your files, and you will receive your next milestone update within 2 business days.

Thank you for your creative collaboration!

Warm regards,
BookLeaf Author Support Team`;
        break;
      }

      default: {
        draft = `Dear ${firstName},

Thank you for contacting BookLeaf Publishing Support.

We have received your query and reviewed your account details. For general inquiries and metadata updates (such as book descriptions or author bio changes), updates submitted through the dashboard reflect across platforms within 3–5 business days.

Our support team is reviewing your specific request and will provide any additional details or confirmation within 24 hours.

Warm regards,
BookLeaf Author Support Team`;
        break;
      }
    }

    return {
      draftResponse: draft,
      relevantKbSections: kbSections.map((s) => s.id),
      tokensUsed: 0,
      provider: 'BookLeaf Grounded Policy Template Engine (Fallback)',
    };
  }
}

export const aiService = new AiService();
