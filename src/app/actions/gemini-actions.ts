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
    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY (Server) not found in environment variables.");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Use gemini-1.5-flash as it is fast and capable for this task
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data.data,
                    mimeType: base64Data.mimeType
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanText);

    } catch (error: any) {
        console.error("Gemini Parsing Error:", error);
        throw new Error(`Failed to parse timetable: ${error.message}`);
    }
}

export async function chatWithAIAction(query: string, context: any): Promise<{ text: string, toolCalls?: any[] }> {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY (Server) not found.");

    let lastError: any = null;

    // Try Flash first as it's fastest
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
                    console.log(`✅ [NUCLEAR-CHAT] Success with ${v}/${m}`);
                    return { text };
                }
            } catch (error: any) {
                lastError = error;
            }
        }
    }

    throw new Error(`Chat failed: ${lastError?.message || "No endpoints reachable"}`);
}
