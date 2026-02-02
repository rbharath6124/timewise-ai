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
                    }
                });
                const prompt = `
                    ACT AS AN EXPERT DATA EXTRACTION AI. 
                    YOUR TASK: Convert the provided timetable image into a 100% accurate, complete JSON schedule.
                    
                    GUIDELINES FOR MAXIMUM ACCURACY:
                    1. SCAN THE ENTIRE IMAGE: Identify all rows (time slots) and all columns (days).
                    2. ALL DAYS: Ensure you capture every day present in the image (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday).
                    3. ALL PERIODS: Extract every single class, lecture, or lab. Do not skip any time slots.
                    4. CELL SPANNING: If a class spans multiple time slots, capture its full duration (start of first slot to end of last slot).
                    5. DATA POINTS:
                       - "subject": The course code (e.g., CS102, MAT201).
                       - "courseName": The full descriptive name of the subject.
                       - "teacherName": The name of the professor or instructor.
                       - "startTime": Start time in 24-hour HH:mm format (CRITICAL: Convert 12h AM/PM to 24h).
                       - "endTime": End time in 24-hour HH:mm format.
                       - "room": Building/Room number.
                       - "type": Classify as "Lecture", "Lab", or "Tutorial".
                    
                    OUTPUT FORMAT (Strict JSON):
                    [
                      {
                        "day": "Monday",
                        "periods": [
                          { 
                            "id": "generate-a-unique-id", 
                            "subject": "CS101", 
                            "courseName": "Data Structures", 
                            "teacherName": "Dr. Aris", 
                            "startTime": "09:00", 
                            "endTime": "10:30", 
                            "type": "Lecture", 
                            "room": "LHC-102" 
                          }
                        ]
                      }
                    ]

                    CRITICAL FINAL CHECKS:
                    - Did you miss any days? (Check Mon-Sun)
                    - Are all times in HH:mm (24-hour)?
                    - Is the JSON valid?
                    - Return ONLY the JSON. No preamble, no markdown fences.
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
                const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

                const parsed = JSON.parse(cleanText);
                console.log(`✅ [PARSER] Success with ${modelName}`);
                return { success: true, data: parsed };
            } catch (error: any) {
                console.warn(`⚠️ [PARSER] Failed with ${modelName}:`, error.message);
                lastError = error;
                // If it's a 404, we continue to the next model
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
