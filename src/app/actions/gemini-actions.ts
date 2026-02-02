"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const VERSIONS = ["v1", "v1beta"];

const MODELS = [
    "gemini-1.5-flash",
    "gemini-2.0-flash",
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
                const model = genAI.getGenerativeModel({ model: modelName });
                const prompt = `
                    Analyze this timetable image and extract the schedule into a strict JSON format.
                    The JSON should be an array of objects, where each object represents a day.
                    
                    Fields to include for each period:
                    - "subject": Short code or name (e.g. CS101)
                    - "courseName": Full name of the course
                    - "teacherName": Name of the instructor
                    - "startTime": Start time in STRICT 24-hour format (HH:mm, e.g. 14:30 instead of 2:30 PM)
                    - "endTime": End time in STRICT 24-hour format (HH:mm)
                    - "room": Room number or location
                    - "type": "Lecture", "Lab", or "Tutorial"

                    Format:
                    [
                      {
                        "day": "Monday",
                        "periods": [
                          { 
                            "id": "uuid", 
                            "subject": "Math", 
                            "courseName": "Advanced Calculus", 
                            "teacherName": "Dr. Smith", 
                            "startTime": "09:00", 
                            "endTime": "10:00", 
                            "type": "Lecture", 
                            "room": "101" 
                          }
                        ]
                      }
                    ]
                    
                    CRITICAL: 
                    1. Use 24-hour format for all times. If the image has 12-hour time (AM/PM), convert it.
                    2. If a field like room or teacher is missing, use an empty string or omit.
                    3. Return ONLY legitimate JSON.
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
                const model = genAI.getGenerativeModel({ model: modelName });
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
