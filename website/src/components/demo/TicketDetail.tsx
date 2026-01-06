import { Ticket } from "@/lib/demo-data";
import { useState } from "react";

interface TicketDetailProps {
    ticket: Ticket | null;
    onGenerateResponse: (ticketId: string) => Promise<void>;
    isGenerating: boolean;
}

export default function TicketDetail({ ticket, onGenerateResponse, isGenerating }: TicketDetailProps) {
    if (!ticket) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">No Ticket Selected</p>
                    <p className="text-sm">Select a ticket from the queue to view details.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden relative">
            {/* Ticket Header */}
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-white/10">
                <div>
                    <h2 className="text-2xl font-bold mb-2">{ticket.subject}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {ticket.customer}
                        </span>
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {ticket.email}
                        </span>
                        <span>{new Date(ticket.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {ticket.status === 'Open' && <span className="badge green">Open</span>}
                </div>
            </div>

            {/* Ticket Content */}
            <div className="flex-grow overflow-y-auto mb-6 custom-scrollbar pr-2">
                <div className="glass-card p-4 rounded-xl bg-white/5 mb-6">
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{ticket.query}</p>
                </div>

                {/* AI Analysis Section */}
                {(ticket.sentiment || ticket.priority) && (
                    <div className="mb-6 animate-fade-in">
                        <h3 className="text-sm font-semibold text-purple-400 mb-3 uppercase tracking-wider">AI Analysis</h3>
                        <div className="flex gap-4">
                            <div className="glass-card p-3 rounded-lg flex-1 border-white/5">
                                <span className="text-xs text-gray-500 block mb-1">Sentiment</span>
                                <span className={`font-medium ${ticket.sentiment === 'Negative' ? 'text-red-400' :
                                        ticket.sentiment === 'Positive' ? 'text-green-400' : 'text-gray-300'
                                    }`}>
                                    {ticket.sentiment || 'Analyzing...'}
                                </span>
                            </div>
                            <div className="glass-card p-3 rounded-lg flex-1 border-white/5">
                                <span className="text-xs text-gray-500 block mb-1">Priority</span>
                                <span className={`font-medium ${ticket.priority === 'High' ? 'text-red-400' :
                                        ticket.priority === 'Medium' ? 'text-yellow-400' : 'text-blue-400'
                                    }`}>
                                    {ticket.priority || 'Analyzing...'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Draft Response Section */}
                {ticket.aiDraftResponse && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                AI Suggested Response
                            </h3>
                        </div>
                        <div className="glass-card p-4 rounded-xl border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden group">
                            <textarea
                                className="w-full bg-transparent border-none focus:ring-0 text-gray-200 resize-none h-32 focus:outline-none custom-scrollbar"
                                value={ticket.aiDraftResponse}
                                readOnly
                            />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-2 py-1 rounded">
                                    Copy
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                            <button className="btn-secondary text-sm py-2">Discard</button>
                            <button className="btn-primary text-sm py-2">Send Response</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Bar */}
            {!ticket.aiDraftResponse && (
                <div className="mt-auto pt-4 border-t border-white/10 flex justify-end">
                    <button
                        onClick={() => onGenerateResponse(ticket.id)}
                        disabled={isGenerating}
                        className={`btn-primary ${isGenerating ? 'opacity-75 cursor-wait' : ''}`}
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating Response...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                </svg>
                                Generate AI Response
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
