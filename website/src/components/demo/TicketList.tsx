import { Ticket } from "@/lib/demo-data";

interface TicketListProps {
    tickets: Ticket[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}

export default function TicketList({ tickets, selectedId, onSelect }: TicketListProps) {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Ticket Queue
                </h2>
                <span className="badge purple">{tickets.length} Open</span>
            </div>

            <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {tickets.map((ticket) => (
                    <div
                        key={ticket.id}
                        onClick={() => onSelect(ticket.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${selectedId === ticket.id
                                ? 'bg-white/10 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-sm font-medium ${selectedId === ticket.id ? 'text-purple-300' : 'text-white'}`}>
                                {ticket.id}
                            </span>
                            <span className="text-xs text-gray-500">
                                {new Date(ticket.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <h3 className="text-sm font-semibold text-gray-200 mb-1 truncate">{ticket.subject}</h3>
                        <p className="text-xs text-gray-400 line-clamp-2">{ticket.query}</p>

                        {/* AI Tags - Placeholder for now */}
                        <div className="flex gap-2 mt-3">
                            {ticket.priority && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ticket.priority === 'High' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                        ticket.priority === 'Medium' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10' :
                                            'border-blue-500/30 text-blue-400 bg-blue-500/10'
                                    }`}>
                                    {ticket.priority}
                                </span>
                            )}
                            {ticket.sentiment && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${ticket.sentiment === 'Negative' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                                        ticket.sentiment === 'Positive' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                                            'border-gray-500/30 text-gray-400 bg-gray-500/10'
                                    }`}>
                                    {ticket.sentiment}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
