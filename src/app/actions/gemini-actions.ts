"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODELS_TO_TRY = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash-8b",
    "gemini-2.0-flash-exp"
];

export async function parseTimetableAction(base64Data: { data: string, mimeType: string }): Promise<any> {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY not found in environment variables");

    console.log(`[Action] Starting parse. Key length: ${apiKey.length}. Start: ${apiKey.substring(0, 7)}`);

    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `
    Analyze this timetable image and extract the schedule into a strict JSON format.
    The JSON should be an array of objects, where each object represents a day.
    Format:
    [
      {
        "day": "Monday",
        "periods": [
          { "id": "uuid", "subject": "Math", "startTime": "09:00", "endTime": "10:00", "type": "Lecture", "room": "101" }
        ]
      }
    ]
    Use 24-hour format for time. If room or type is missing, omit or guess based on context if obvious.
    Return ONLY legitimate JSON, no markdown code fences.
  `;

    let lastError: any = null;

    for (const modelId of MODELS_TO_TRY) {
        try {
            console.log(`[Action] Trying model: ${modelId}`);
            const model = genAI.getGenerativeModel({ model: modelId });

            const result = await model.generateContent([
                { text: prompt },
                { inlineData: { data: base64Data.data, mimeType: base64Data.mimeType } }
            ]);
            const response = await result.response;
            const text = response.text();

            const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
            console.log(`✅ [Action] Success with ${modelId}`);
            return JSON.parse(cleanText);
        } catch (error: any) {
            console.error(`❌ [Action] Fail with ${modelId}:`, error.message);
            lastError = error;
        }
    }

    throw lastError || new Error("All Gemini models failed in server action.");
}

export async function chatWithAIAction(query: string, context: any): Promise<{ text: string, toolCalls?: any[] }> {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY not found in environment variables");

    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError: any = null;

    for (const modelId of MODELS_TO_TRY) {
        try {
            console.log(`[Action] Trying chat model: ${modelId}`);
            const model = genAI.getGenerativeModel({ model: modelId });

            const tools = [
                {
                    functionDeclarations: [
                        {
                            name: "reschedule_class",
                            description: "Reschedule a class period from one day to another.",
                            parameters: {
                                type: "OBJECT",
                                properties: {
                                    subject: { type: "STRING", description: "The name of the subject/class to move." },
                                    fromDay: { type: "STRING", enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], description: "The current day of the class." },
                                    toDay: { type: "STRING", enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], description: "The day to move the class to." }
                                },
                                required: ["subject", "fromDay", "toDay"]
                            }
                        }
                    ]
                }
            ];

            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: "You are TimeWise AI, a helpful academic assistant. You help students manage their timetable and attendance. You can answer questions about their schedule and also take actions like rescheduling classes using tools. When rescheduling, confirm the details with the user." }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Understood! I'm ready to help you manage my schedule. How can I assist you today?" }],
                    },
                ],
                tools: tools as any,
            });

            const result = await chat.sendMessage(`
                Context: ${JSON.stringify(context)}
                User Query: ${query}
            `);

            const response = await result.response;
            const toolCalls = response.functionCalls();

            console.log(`✅ [Action] Chat success with ${modelId}`);
            return {
                text: response.text(),
                toolCalls: toolCalls
            };
        } catch (error: any) {
            console.error(`❌ [Action] Chat fail with ${modelId}:`, error.message);
            lastError = error;
        }
    }

    throw lastError || new Error("No available Gemini models found for chatting on server.");
}
