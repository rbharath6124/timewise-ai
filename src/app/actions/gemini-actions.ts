"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const VERSIONS = ["v1", "v1beta"];

const MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro"
];

export async function parseTimetableAction(base64Data: { data: string, mimeType: string }): Promise<any> {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
        if (!apiKey) {
            return { error: "GEMINI_API_KEY not found. Please set it in Vercel Environment Variables." };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        let lastError: any = null;

        for (const modelName of MODELS) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 8192,
                        responseMimeType: "application/json",
                    }
                });
                const prompt = `
                    TASK: CONVERT UNIVERSITY TIMETABLE TO JSON.
                    
                    IMAGE ANALYSIS RULES:
                    1. THE GRID: Scan the top table. Note there are 9+ time columns.
                    2. THE BREAKS: "Tea Break" (10:40-11:00) and "Lunch Break" (12:40-01:40) are VERTICAL. You MUST skip over them and continue scanning to the right.
                    3. AFTERNOON SLOTS: Do not stop at Lunch Break. There are 3 slots after lunch: 01:40, 02:30, and 03:20.
                    4. TIME CONVERSION (MANDATORY):
                       - All times after 12:00 PM must be 24-hour.
                       - 01:40 PM -> 13:40
                       - 02:30 PM -> 14:30
                       - 03:20 PM -> 15:20
                       - 04:10 PM -> 16:10
                    5. DATA MAPPING: Look at the CODE in the grid (e.g. SSDX 11). Find that code in the LEGEND (bottom table) to get the "Course Name" and "Course Faculty".

                    JSON SCHEMA:
                    [
                      {
                        "day": "Monday | Tuesday | Wednesday | Thursday | Friday",
                        "periods": [
                          {
                            "id": "unique-id",
                            "subject": "Short Code",
                            "courseName": "Full Name from Legend",
                            "teacherName": "Faculty from Legend",
                            "startTime": "HH:mm (24h)",
                            "endTime": "HH:mm (24h)",
                            "type": "Lecture | Lab | Tutorial",
                            "room": "Room Code"
                          }
                        ]
                      }
                    ]
                    
                    Respond with a JSON array based on the schema above. Include ALL classes for ALL days found in the image.
                `;

                const result = await model.generateContent([
                    {
                        inlineData: {
                            data: base64Data.data,
                            mimeType: base64Data.mimeType
                        }
                    },
                    { text: prompt }
                ]);

                const response = await result.response;
                const text = response.text();

                // Since we used responseMimeType: "application/json", 'text' is pure JSON
                const parsed = JSON.parse(text);
                console.log(`✅ [PARSER] Success with ${modelName}`);
                return { success: true, data: parsed };
            } catch (error: any) {
                console.warn(`⚠️ [PARSER] Failed with ${modelName}:`, error.message);
                lastError = error;
            }
        }

        return { error: `Parsing failed after trying all models: ${lastError?.message || "No models available"}` };

    } catch (error: any) {
        console.error("Gemini Parsing Action Global Error:", error);
        return { error: error.message || "An unexpected error occurred during parsing." };
    }
}

export async function chatWithAIAction(query: string, context: any): Promise<{ text?: string, error?: string, toolCalls?: any[] }> {
    try {
        const apiKey = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
        if (!apiKey) return { error: "GEMINI_API_KEY not found." };

        const genAI = new GoogleGenerativeAI(apiKey);
        let lastError: any = null;

        for (const modelName of MODELS) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature: 0.7,
                    }
                });
                const result = await model.generateContent([
                    { text: "You are TimeWise AI, a helpful assistant." },
                    { text: `Context: ${JSON.stringify(context)}\nUser: ${query}` }
                ]);

                const response = await result.response;
                const text = response.text() || "I processed that.";
                console.log(`✅ [CHAT] Success with ${modelName}`);
                return { text };
            } catch (error: any) {
                console.warn(`⚠️ [CHAT] Failed with ${modelName}:`, error.message);
                lastError = error;
            }
        }

        return { error: `Chat failed: ${lastError?.message || "No models available"}` };
    } catch (globalError: any) {
        return { error: globalError.message || "An unexpected chat error occurred." };
    }
}
