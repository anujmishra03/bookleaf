# BookLeaf Technical Assignment — Engineering Approach & Architectural Trade-offs
**Author:** Senior Full-Stack Engineering Candidate  
**Date:** October 2026  
**System:** Author Support & Communication Portal  

---

### 1. Approach & What Was Prioritised

In designing this system, I approached the assignment not merely as an isolated coding exercise, but as a critical piece of operational infrastructure for a publishing house processing **1,200+ books per month across 22,000+ titles**. Three core principles drove my technical priorities:

1. **Defensive AI Engineering & Graceful Degradation (25% Evaluation Weight):**
   - **The Problem:** Third-party LLMs (OpenAI, Gemini, Anthropic) inevitably encounter latency spikes, rate limits, or transient outages. A production ticketing portal cannot drop author support tickets because an external API is down.
   - **Our Solution:** Built a dual-layer AI architecture. When API credentials are valid and network is healthy, the system calls Google Gemini / OpenAI with structured schema enforcement. If an API call fails or keys are missing, the system automatically falls back to an intelligent heuristic rules and template engine.
   - **Grounded Tone:** Prompts were calibrated strictly against BookLeaf’s Knowledge Base and tone guidelines: acknowledging emotion first, owning internal faults directly, using concrete dates and numbers, and concluding with a clear next step.

2. **Strict Multi-Tenant Scoping & Role-Based Access Control (RBAC):**
   - Every database query for books and tickets is scoped to `req.user.id` when an author is authenticated.
   - Internal notes created by operations admins are stripped out at both the API layer and the WebSocket event level, ensuring authors never see internal deliberations.

3. **High-Impact Operations UX:**
   - In customer support, response time correlates directly with author retention. The ticket queue default sort specifically spots **urgent tickets (Critical / High)** and **oldest unresolved queries** first.
   - Admins are presented with a pre-drafted response immediately upon opening a ticket, saving minutes of drafting time while maintaining full review and editing control.

---

### 2. Trade-offs Made

| Trade-off | Decision Made | Rationale |
| :--- | :--- | :--- |
| **Database** | SQLite via Prisma ORM for initial review | Eliminates Docker / external database setup hurdles for evaluators. With Prisma, moving to PostgreSQL requires only updating the `provider` and `DATABASE_URL`. |
| **Real-time Protocol** | Socket.IO over Server-Sent Events (SSE) or Long-Polling | Socket.IO provides bi-directional event rooms (`admins`, `ticket:<id>`, `user:<id>`), typing indicators, and automatic reconnection. |
| **Knowledge Retrieval** | Keyword-scored RAG-lite over Vector Embeddings | For a focused ~10-page company knowledge base, keyword relevance matching guarantees deterministic chunk retrieval without the overhead and indexing latency of an external vector database. |
| **File Attachments** | UI file dropzone with size metadata formatting | Followed the assignment recommendation to prioritize core ticket workflows and AI response quality over setting up external S3/GCS buckets. |

---

### 3. How to Evolve This into an Enterprise Production System

Given the opportunity to scale this platform across BookLeaf’s 22,000+ title catalog, I would introduce the following evolutions:

1. **Vector RAG with Pinecone or pgvector:**  
   As the knowledge base grows with specific distribution agreements, tax withholding rules (US vs. India), and printing contract nuances, transition to chunked vector embeddings with semantic hybrid search.

2. **Inbound/Outbound Email Synchronization (Postmark / SendGrid Inbound Parse):**  
   Many traditional authors prefer email over logging into a portal. Ingesting email replies into the ticket thread via webhooks would ensure seamless communication regardless of the author's preferred medium.

3. **Automated Banking Verification (Penny-Drop APIs):**  
   Integrate Cashfree or Razorpay Fund Account Validation to instantly verify author bank accounts and IFSC codes upon entry, preventing failed royalty transfers before quarterly disbursement runs.

4. **Automated Defect Verification via Vision AI:**  
   For print quality tickets, integrate a multimodal vision model (e.g., Gemini 1.5 Flash Vision) to analyze author-uploaded photos of misprints, automating the initial free-reprint approval workflow.
