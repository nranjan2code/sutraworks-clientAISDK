export interface Ticket {
    id: string;
    customer: string;
    email: string;
    subject: string;
    query: string;
    status: 'Open' | 'In Progress' | 'Resolved';
    timestamp: string;
    priority?: 'High' | 'Medium' | 'Low'; // To be AI classified
    sentiment?: 'Positive' | 'Neutral' | 'Negative'; // To be AI classified
    aiSummary?: string;
    aiDraftResponse?: string;
}

export const MOCK_TICKETS: Ticket[] = [
    {
        id: "T-1042",
        customer: "Sarah Chen",
        email: "sarah.c@techcorp.com",
        subject: "API Rate limits?",
        query: "Hi, we're hitting 429 errors on the production environment. We upgraded to the Enterprise plan yesterday but it seems limits haven't propagated. Can you check? It's blocking our deployment.",
        status: 'Open',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    },
    {
        id: "T-1043",
        customer: "Michael Ross",
        email: "mike@startup.io",
        subject: "Integration Help",
        query: "Love the SDK! Just wondering if there's a guide on how to switch providers dynamically based on user preference? e.g. Let user choose between Claude and GPT-4.",
        status: 'Open',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    },
    {
        id: "T-1044",
        customer: "David Kim",
        email: "dkim@finserve.net",
        subject: "Security Question",
        query: "Our compliance team needs to know exactly where the keys are stored. Is it in localStorage or memory? We need a formal statement on the Zero Trust architecture.",
        status: 'Open',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    }
];
