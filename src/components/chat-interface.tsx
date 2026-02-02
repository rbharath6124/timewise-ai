"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { chatWithAIAction } from "@/app/actions/gemini-actions";
import { toast } from "sonner";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        { id: "1", role: "assistant", content: "Hello! I'm TimeWise AI. Ask me anything about your schedule." }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { timetable, attendance, events } = useStore();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const cleanContext = {
                timetable: timetable.map(d => ({
                    day: d.day,
                    periods: d.periods.map(p => ({ subject: p.subject, startTime: p.startTime, endTime: p.endTime, room: p.room }))
                })),
                attendance: attendance.map(a => ({ subject: a.subject, attended: a.attended, missed: a.missed }))
            };
            const response = await chatWithAIAction(userMessage.content, cleanContext);

            if (response.error) {
                throw new Error(response.error);
            }

            let aiContent = response.text || "I've processed your request.";

            if (response.toolCalls && response.toolCalls.length > 0) {
                for (const call of response.toolCalls) {
                    if (call.name === "reschedule_class") {
                        const { subject, fromDay, toDay } = call.args;
                        useStore.getState().rescheduleClass(subject, fromDay, toDay);
                        toast.success(`Rescheduled ${subject} from ${fromDay} to ${toDay}!`);
                        aiContent = `I've moved your ${subject} class from ${fromDay} to ${toDay} as requested.`;
                    }
                }
            }

            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: aiContent }]);
        } catch (error: any) {
            console.error("Chat failed:", error);
            const errorMessage = error.message || "I had trouble reaching my AI brain. It might be a network issue or quota limit.";
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-hidden p-0">
                <div className="flex h-full flex-col p-4 overflow-y-auto">
                    {messages.map((m) => (
                        <div
                            key={m.id}
                            className={`mb-4 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`flex max-w-[80%] gap-3 rounded-lg p-3 ${m.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                    }`}
                            >
                                {m.role === "assistant" && <Bot className="mt-1 h-4 w-4 shrink-0" />}
                                <p className="text-sm">{m.content}</p>
                                {m.role === "user" && <User className="mt-1 h-4 w-4 shrink-0" />}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start mb-4">
                            <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                                <Bot className="h-4 w-4" />
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        </div>
                    )}
                    <div ref={scrollRef} />
                </div>
            </div>
            <footer className="border-t p-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex w-full items-center gap-2"
                >
                    <Input
                        placeholder="Ask about your schedule..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </footer>
        </div>
    );
}
