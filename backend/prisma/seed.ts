import { PrismaClient, Role, ProductionStage, TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function mapStatusToStage(statusStr: string | null | undefined): ProductionStage {
  if (!statusStr) return ProductionStage.PUBLISHED_LIVE;
  const s = statusStr.toLowerCase();
  if (s.includes('cover design')) return ProductionStage.COVER_DESIGN;
  if (s.includes('typesetting')) return ProductionStage.TYPESETTING;
  if (s.includes('editing')) return ProductionStage.EDITING;
  if (s.includes('proofreading')) return ProductionStage.PROOFREADING;
  if (s.includes('isbn')) return ProductionStage.ISBN_ASSIGNMENT;
  if (s.includes('printing')) return ProductionStage.PRINTING;
  if (s.includes('distribution')) return ProductionStage.DISTRIBUTION_SETUP;
  return ProductionStage.PUBLISHED_LIVE;
}

async function main() {
  console.log('🌱 Starting BookLeaf database seed with official dataset...');

  // Clean existing tables in order
  await prisma.auditLog.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.book.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Create Operations / Admin Team
  const admin1 = await prisma.user.create({
    data: {
      email: 'admin@bookleafpub.com',
      passwordHash: defaultPasswordHash,
      name: 'Aditi Varma (Lead Operations)',
      role: Role.ADMIN,
      phone: '+91 98765 43210',
      city: 'Delhi',
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      email: 'support@bookleafpub.com',
      passwordHash: defaultPasswordHash,
      name: 'Vikram Mehta (Author Relations)',
      role: Role.ADMIN,
      phone: '+91 98111 22334',
      city: 'Delhi',
    },
  });

  console.log('✅ Admin accounts created:');
  console.log('   - admin@bookleafpub.com / password123');
  console.log('   - support@bookleafpub.com / password123');

  // Load sample dataset
  const jsonPath = path.join(__dirname, 'bookleaf_sample_data.json');
  const fallbackRootPath = path.join(__dirname, '..', '..', 'bookleaf_sample_data.json');
  const targetPath = fs.existsSync(jsonPath) ? jsonPath : fallbackRootPath;

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Cannot find bookleaf_sample_data.json at ${targetPath}`);
  }

  const raw = fs.readFileSync(targetPath, 'utf-8');
  const data = JSON.parse(raw);
  console.log(`📖 Loading ${data.authors.length} authors from ${targetPath}...`);

  const createdAuthorMap = new Map<string, any>();
  const createdBookMap = new Map<string, any>();

  for (const a of data.authors) {
    // Unlink bank account for AUTH006 (Arjun Malhotra) as an intentional edge case
    const isBankLinked = a.author_id !== 'AUTH006';

    const author = await prisma.user.create({
      data: {
        authorCode: a.author_id,
        email: a.email.toLowerCase(),
        passwordHash: defaultPasswordHash,
        name: a.name,
        role: Role.AUTHOR,
        phone: a.phone,
        city: a.city,
        joinedDate: a.joined_date ? new Date(a.joined_date) : null,
        bankAccountLinked: isBankLinked,
        bankAccountDetails: isBankLinked
          ? JSON.stringify({
              bankName: 'HDFC Bank',
              accountNumberLast4: '4821',
              ifsc: 'HDFC0001234',
            })
          : null,
      },
    });

    createdAuthorMap.set(a.author_id, author);

    if (Array.isArray(a.books)) {
      for (const b of a.books) {
        const stage = mapStatusToStage(b.status);
        const copies = Number(b.total_copies_sold || 0);

        // Sales distribution breakdown
        const platformSales = {
          amazonIn: Math.floor(copies * 0.55),
          flipkart: Math.floor(copies * 0.25),
          amazonUs: b.available_on?.includes('Amazon US') ? Math.floor(copies * 0.15) : 0,
          bookleafStore: Math.floor(copies * 0.05),
        };

        const book = await prisma.book.create({
          data: {
            bookCode: b.book_id,
            title: b.title,
            isbn: b.isbn || null,
            genre: b.genre || 'Fiction',
            publicationDate: b.publication_date ? new Date(b.publication_date) : null,
            status: stage,
            mrp: Number(b.mrp || 0),
            printingCost: Number(b.mrp ? Math.round(b.mrp * 0.3) : 0),
            authorRoyaltyPerCopy: b.author_royalty_per_copy ? Number(b.author_royalty_per_copy) : null,
            totalCopiesSold: copies,
            totalRoyaltyEarned: Number(b.total_royalty_earned || 0),
            royaltyPaid: Number(b.royalty_paid || 0),
            royaltyPending: Number(b.royalty_pending || 0),
            lastRoyaltyPayoutDate: b.last_royalty_payout_date ? new Date(b.last_royalty_payout_date) : null,
            printPartner: b.print_partner || null,
            availableOnJson: b.available_on ? JSON.stringify(b.available_on) : null,
            platformSalesJson: JSON.stringify(platformSales),
            authorId: author.id,
          },
        });

        createdBookMap.set(b.book_id, book);
      }
    }
  }

  console.log(`✅ Seeded ${data.authors.length} authors and 18 books successfully.`);

  // -------------------------------------------------------------
  // Seed Realistic Initial Tickets grounded in this exact dataset
  // -------------------------------------------------------------

  // Ticket 1: Priya Sharma (AUTH001, Whispers of the Ganges BK001) - CRITICAL / Royalty
  const priya = createdAuthorMap.get('AUTH001');
  const bookGanges = createdBookMap.get('BK001');
  if (priya && bookGanges) {
    const t1 = await prisma.ticket.create({
      data: {
        ticketNumber: 'BL-1001',
        subject: 'Pending royalty of ₹3,570 for Whispers of the Ganges',
        description: 'Hello team, my dashboard shows ₹3,570 as pending royalty for Whispers of the Ganges following the October payout. Could you please confirm when the next disbursement batch will be processed?',
        category: TicketCategory.ROYALTY_PAYMENTS,
        priority: TicketPriority.CRITICAL,
        status: TicketStatus.OPEN,
        aiClassified: true,
        aiConfidence: 0.97,
        aiClassificationReason: 'Inquiry regarding pending royalty balance following previous disbursement batch.',
        aiPriorityReason: 'Financial query regarding overdue quarterly balance exceeding ₹1,000 threshold.',
        aiDraftResponse: `Dear Priya,

Thank you for reaching out, and I appreciate you following up regarding your royalty payout for "Whispers of the Ganges".

At BookLeaf Publishing, royalties are calculated quarterly and disbursed within 45 days after quarter close. We verified your linked HDFC Bank account (ending in 4821) and can confirm that your pending royalty of ₹3,570 has been queued for our upcoming payment batch scheduled on the 15th of this month.

Our accounts team is reviewing your batch transfer, and we will update you with the UTR transaction reference number within 48 hours.

Warm regards,
BookLeaf Author Support Team`,
        authorId: priya.id,
        bookId: bookGanges.id,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: t1.id,
        senderId: priya.id,
        senderRole: Role.AUTHOR,
        message: t1.description,
      },
    });
  }

  // Ticket 2: Sneha Kulkarni (AUTH007, Midnight in Mysore BK013) - HIGH / Production Updates
  const sneha = createdAuthorMap.get('AUTH007');
  const bookMysore = createdBookMap.get('BK013');
  if (sneha && bookMysore) {
    const t2 = await prisma.ticket.create({
      data: {
        ticketNumber: 'BL-1002',
        subject: 'Midnight in Mysore has been in Cover Design for 3 weeks',
        description: 'Hi BookLeaf ops, my thriller manuscript "Midnight in Mysore" has been stuck at the Cover Design stage for almost 3 weeks now. When will I receive the proofs so we can move to Typesetting and ISBN assignment?',
        category: TicketCategory.PRODUCTION_UPDATES,
        priority: TicketPriority.HIGH,
        status: TicketStatus.IN_PROGRESS,
        aiClassified: true,
        aiConfidence: 0.96,
        aiClassificationReason: 'Production milestone query regarding timeline delay at Cover Design stage.',
        aiPriorityReason: 'Author awaiting proof approval to unblock subsequent typesetting and ISBN milestones.',
        aiDraftResponse: `Dear Sneha,

Thank you for reaching out regarding the production timeline for "Midnight in Mysore".

Cover Design is one of our most critical collaborative stages, as we want to ensure the visual typography perfectly matches the thriller genre. Our design team is finalizing two front-cover concepts with our Delhi creative desk. You will receive digital proofs directly in your author inbox within 2 business days. Once you approve the artwork, your manuscript will advance immediately to Typesetting and ISBN registration.

We appreciate your creative collaboration as we bring your book to life.

Warm regards,
BookLeaf Author Support Team`,
        authorId: sneha.id,
        bookId: bookMysore.id,
        assignedToId: admin1.id,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: t2.id,
        senderId: sneha.id,
        senderRole: Role.AUTHOR,
        message: t2.description,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: t2.id,
        senderId: admin1.id,
        senderRole: Role.ADMIN,
        message: 'Dear Sneha, our design lead has completed the front jacket concept. We will dispatch the galley link by tomorrow afternoon.',
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: t2.id,
        senderId: admin1.id,
        senderRole: Role.ADMIN,
        isInternalNote: true,
        message: 'INTERNAL NOTE: Designer uploaded revision #2 on Drive. Repro India paper specification is 80 GSM natural shade.',
      },
    });
  }

  // Ticket 3: Kavita Deshmukh (AUTH009, The Nagpur Notebooks BK016) - MEDIUM / Threshold Rollover Edge Case
  const kavita = createdAuthorMap.get('AUTH009');
  const bookNagpur = createdBookMap.get('BK016');
  if (kavita && bookNagpur) {
    const t3 = await prisma.ticket.create({
      data: {
        ticketNumber: 'BL-1003',
        subject: 'Why wasn’t my ₹850 royalty disbursed for The Nagpur Notebooks?',
        description: 'My dashboard shows ₹850 earned on 34 copies sold, but no payment was made to my bank account. Is there an issue with my payout?',
        category: TicketCategory.ROYALTY_PAYMENTS,
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        aiClassified: true,
        aiConfidence: 0.95,
        aiClassificationReason: 'Inquiry regarding payout withholding on accumulated royalty below minimum threshold.',
        aiPriorityReason: 'Standard policy explanation regarding the ₹1,000 quarterly threshold rollover.',
        aiDraftResponse: `Dear Kavita,

Thank you for contacting BookLeaf Support regarding "The Nagpur Notebooks".

We are happy to clarify how our royalty disbursements work. Under BookLeaf’s standard royalty policy, the minimum payout threshold for quarterly bank transfers is ₹1,000. Because your current accumulated royalty stands at ₹850 (34 copies sold × ₹25/copy), this amount will automatically roll over to the next quarter without any deduction.

As your book continues to sell across Amazon India and the BookLeaf Store, once your total reaches or exceeds ₹1,000, the full accumulated amount will be disbursed in the subsequent quarterly cycle.

Warm regards,
BookLeaf Author Support Team`,
        authorId: kavita.id,
        bookId: bookNagpur.id,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: t3.id,
        senderId: kavita.id,
        senderRole: Role.AUTHOR,
        message: t3.description,
      },
    });
  }

  // Ticket 4: Arjun Malhotra (AUTH006, Turban Tales BK010) - HIGH / Unlinked Bank Account Edge Case
  const arjun = createdAuthorMap.get('AUTH006');
  const bookTurban = createdBookMap.get('BK010');
  if (arjun && bookTurban) {
    const t4 = await prisma.ticket.create({
      data: {
        ticketNumber: 'BL-1004',
        subject: 'Haven’t received ₹2,464 royalty for Turban Tales',
        description: 'I published Turban Tales in September and sold 88 copies with ₹2,464 earned. Why have I not received any money yet?',
        category: TicketCategory.ROYALTY_PAYMENTS,
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        aiClassified: true,
        aiConfidence: 0.98,
        aiClassificationReason: 'Query regarding royalty payout with unlinked author bank details.',
        aiPriorityReason: 'Payout held due to missing author disbursement account information.',
        aiDraftResponse: `Dear Arjun,

Thank you for reaching out, and congratulations on the sales for "Turban Tales" (88 copies sold)!

Upon reviewing your account, we noticed that your bank account details are currently not linked in your Author Dashboard. Because your accumulated royalty of ₹2,464 exceeds our ₹1,000 threshold, your payment is ready, but our accounts team requires your bank details (Bank Name, Account Number, and IFSC code) to initiate the transfer.

Next Steps:
1. Please log in to your Author Dashboard and click the "Link Bank Account" button.
2. Once your details are submitted, our finance team will verify them and disburse your ₹2,464 in the upcoming payout run.

Warm regards,
BookLeaf Author Support Team`,
        authorId: arjun.id,
        bookId: bookTurban.id,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: t4.id,
        senderId: arjun.id,
        senderRole: Role.AUTHOR,
        message: t4.description,
      },
    });
  }

  // Ticket 5: Rohit Kapoor (AUTH002, Code & Karma BK003) - HIGH / Distribution Stock Sync Issue
  const rohit = createdAuthorMap.get('AUTH002');
  const bookCode = createdBookMap.get('BK003');
  if (rohit && bookCode) {
    const t5 = await prisma.ticket.create({
      data: {
        ticketNumber: 'BL-1005',
        subject: 'Code & Karma showing as "Currently Unavailable" on Amazon US',
        description: 'Readers in California tried purchasing Code & Karma yesterday but the Amazon US page says "Currently Unavailable". Could you please fix the stock sync?',
        category: TicketCategory.DISTRIBUTION_AVAILABILITY,
        priority: TicketPriority.HIGH,
        status: TicketStatus.OPEN,
        aiClassified: true,
        aiConfidence: 0.94,
        aiClassificationReason: 'Retailer catalog stock synchronization outage on international channel.',
        aiPriorityReason: 'Active retail link unavailability directly halts author international sales.',
        aiDraftResponse: `Dear Rohit,

Thank you for alerting us regarding the Amazon US listing for "Code & Karma".

When an international listing shows as "Currently Unavailable", it is typically due to an inventory catalog feed refresh between our US print partner Repro India and Amazon's global fulfillment centers.

Our distribution operations team has already triggered an emergency inventory re-sync feed with Amazon US. Retail feeds typically reflect updated live stock within 24 to 48 hours. We are actively monitoring the listing and will update you as soon as buyability is restored.

Warm regards,
BookLeaf Author Support Team`,
        authorId: rohit.id,
        bookId: bookCode.id,
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: t5.id,
        senderId: rohit.id,
        senderRole: Role.AUTHOR,
        message: t5.description,
      },
    });
  }

  console.log('✅ Seeded 5 realistic tickets and communication threads across edge cases.');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
