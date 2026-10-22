import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BookLeaf Publishing - Author Support & Communication API',
      version: '1.0.0',
      description: `Production REST API for BookLeaf Publishing's Author Support & Operations Communication Portal.
Features role-based access control (Authors & Admins), AI auto-classification, priority scoring, grounded response drafting, and real-time Socket.IO synchronization.`,
      contact: {
        name: 'BookLeaf Technical Operations',
        email: 'dev@bookleafpub.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token obtained from /auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['AUTHOR', 'ADMIN'] },
            phone: { type: 'string', nullable: true },
            bankAccountLinked: { type: 'boolean' },
          },
        },
        Book: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            isbn: { type: 'string', nullable: true },
            genre: { type: 'string' },
            status: { type: 'string' },
            mrp: { type: 'number' },
            printingCost: { type: 'number' },
            totalCopiesSold: { type: 'integer' },
            totalRoyaltyEarned: { type: 'number' },
            royaltyPaid: { type: 'number' },
            royaltyPending: { type: 'number' },
          },
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            ticketNumber: { type: 'string' },
            subject: { type: 'string' },
            description: { type: 'string' },
            category: {
              type: 'string',
              enum: [
                'ROYALTY_PAYMENTS',
                'ISBN_METADATA',
                'PRINTING_QUALITY',
                'DISTRIBUTION_AVAILABILITY',
                'PRODUCTION_UPDATES',
                'GENERAL_INQUIRY',
              ],
            },
            priority: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
            status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] },
            aiDraftResponse: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
