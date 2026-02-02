"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const VERSIONS = ["v1", "v1beta"];
const MODELS = [
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp",
    "gemini-pro" // old alias
];

export async function parseTimetableAction(base64Data: { data: string, mimeType: string }): Promise<any> {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
        if (!apiKey) {
            return { error: "GEMINI_API_KEY not found. Please set it in Vercel Environment Variables." };
        }

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

        // Try multiple versions and models to bypass 404 or compatibility issues
        for (const v of VERSIONS) {
            for (const m of ["gemini-1.5-flash", "gemini-1.5-pro"]) {
                try {
                    const genUrl = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`;
                    console.log(`📡 [PARSER] Trying ${v}/${m}...`);

                    const res = await fetch(genUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: prompt },
                                    {
                                        inline_data: {
                                            mime_type: base64Data.mimeType,
                                            data: base64Data.data
                                        }
                                    }
                                ]
                            }]
                        })
                    });

                    if (res.status === 200) {
                        const data = await res.json();
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

                        try {
                            const parsed = JSON.parse(cleanText);
                            console.log(`✅ [PARSER] Success with ${v}/${m}`);
                            return { success: true, data: parsed };
                        } catch (parseError: any) {
                            console.error("JSON Parse Error:", text);
                            lastError = new Error("AI returned invalid JSON format.");
                            continue;
                        }
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        lastError = new Error(`API ${v}/${m} returned ${res.status}: ${errData.error?.message || "Unknown error"}`);
                    }
                } catch (error: any) {
                    lastError = error;
                }
            }
        }

        return { error: `Parsing failed after trying all endpoints: ${lastError?.message || "No endpoints reachable"}` };

    } catch (error: any) {
        console.error("Gemini Parsing Action Global Error:", error);
        return { error: error.message || "An unexpected error occurred during parsing." };
    }
}

export async function chatWithAIAction(query: string, context: any): Promise<{ text?: string, error?: string, toolCalls?: any[] }> {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
        if (!apiKey) return { error: "GEMINI_API_KEY not found." };

        let lastError: any = null;

        for (const v of VERSIONS) {
            for (const m of ["gemini-1.5-flash", "gemini-1.5-pro"]) {
                try {
                    const genUrl = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`;
                    const res = await fetch(genUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [
                                { role: "user", parts: [{ text: "You are TimeWise AI, a helpful assistant." }] },
                                { role: "model", parts: [{ text: "Understood." }] },
                                { role: "user", parts: [{ text: `Context: ${JSON.stringify(context)}\nUser: ${query}` }] }
                            ]
                        })
                    });

                    if (res.status === 200) {
                        const data = await res.json();
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I processed that.";
                        return { text };
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        lastError = new Error(`API returned ${res.status}: ${errData.error?.message || "Unknown error"}`);
                    }
                } catch (error: any) {
                    lastError = error;
                }
            }
        }

        return { error: `Chat failed: ${lastError?.message || "No endpoints reachable"}` };
    } catch (globalError: any) {
        return { error: globalError.message || "An unexpected chat error occurred." };
    }
}
