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
                    ACT AS A PROFESSIONAL DATA ANALYST.
                    IMAGE TYPE: Academic Timetable with a Grid and a Course Legend.

                    OBJECTIVE: Create a complete JSON schedule by mapping short codes in the grid to the details in the legend.

                    STEP 1: EXTRACT THE COURSE LEGEND (Bottom Table)
                    - Identify every "Course Code" and its corresponding "Course Name" and "Course Faculty".
                    - Example: CEDX 01 -> Advanced Design of RC, Faculty: Dr.A.K.Kaliluthin.

                    STEP 2: SCAN THE GRID (Top Table)
                    - Columns: Time slots (e.g., 09:00 - 09:50).
                    - Rows: Days of the week (Mon, Tue, Wed, Thu, Fri).
                    - IGNORE: "Tea Break", "Lunch Break", "Prayer", and titles.

                    STEP 3: MAPPING & VALIDATION
                    - For every cell containing a code (e.g., SSDX 11/12/...):
                        a) Identify the Day and Time slot.
                        b) Look up the code in your extracted Legend to find the full Course Name and Teacher.
                        c) Convert times to STRICT 24-hour format. Ensure afternoon slots (e.g., 01:40 PM) become (13:40).
                        d) If a cell spans multiple slots (e.g., 11:00 - 12:40), create ONE entry with the full duration.

                    OUTPUT JSON STRUCTURE:
                    [
                      {
                        "day": "Monday",
                        "periods": [
                          { 
                            "id": "unique_string", 
                            "subject": "CODE", 
                            "courseName": "FULL NAME FROM LEGEND", 
                            "teacherName": "FACULTY FROM LEGEND", 
                            "startTime": "HH:mm", 
                            "endTime": "HH:mm", 
                            "type": "Lecture/Lab/Tutorial", 
                            "room": "ES 001" 
                          }
                        ]
                      }
                    ]

                    CRITICAL REQUIREMENTS:
                    - DO NOT MISS THE AFTERNOON SLOTS (01:40 PM onwards).
                    - If multiple codes are in one cell (e.g., CEDX 01/07), you can use the first one or combine the names.
                    - ALL DAYS (Mon-Fri) must be included.
                    - RETURN ONLY EXECUTABLE JSON. NO MARKDOWN.
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
