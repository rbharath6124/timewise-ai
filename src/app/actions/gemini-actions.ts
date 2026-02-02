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
            for (const version of VERSIONS) {
                try {
                    const model = genAI.getGenerativeModel(
                        {
                            model: modelName,
                            generationConfig: {
                                temperature: 0.1,
                                maxOutputTokens: 8192,
                                responseMimeType: "application/json",
                            }
                        },
                        { apiVersion: version as any }
                    );

                    const prompt = `
                        EXTRACT THE FULL ACADEMIC TIMETABLE.
                        
                        1. THE GRID (MUST EXTRACT ALL 9 COLUMNS):
                           C1: 09:00-09:50 | C2: 09:50-10:40 | C3: TEA BREAK | C4: 11:00-11:50 | C5: 11:50-12:40 | C6: LUNCH BREAK | C7: 01:40-02:30 | C8: 02:30-03:20 | C9: 03:20-04:10

                        2. CRITICAL - MULTI-SUBJECT CELLS:
                           - Some cells contain multiple subjects (e.g., "CEDX 01/07" or "SSDX 11/12").
                           - You MUST report these as separate entries if possible, or return the raw string (e.g. "CEDX 01/07") and I will split it.
                        
                        3. CRITICAL - AFTERNOON SESSIONS:
                           - YOU MUST JUMP OVER THE LUNCH BREAK (Column 6).
                           - Extract all classes sitting in Columns 7, 8, and 9. 

                        4. LEGEND LOOKUP:
                           - Match every code to the "Course Name" and "Faculty" in the bottom table.

                        SCHEMA:
                        {
                          "monday": [
                             { "start_col": 1, "end_col": 1, "code": "CEDX 01/07", "name": "...", "teacher": "...", "hall": "..." },
                             { "start_col": 7, "end_col": 7, "code": "SSDX 11/12", "name": "...", "teacher": "...", "hall": "..." }
                          ], ...
                        }
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
                    const text = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
                    const rawData = JSON.parse(text);

                    // --- TIME MAP ---
                    const colToStart: Record<number, string> = { 1: "09:00", 2: "09:50", 4: "11:00", 5: "11:50", 7: "13:40", 8: "14:30", 9: "15:20" };
                    const colToEnd: Record<number, string> = { 1: "09:50", 2: "10:40", 4: "11:50", 5: "12:40", 7: "14:30", 8: "15:20", 9: "16:10" };

                    const daysMap: Record<string, string> = {
                        monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday"
                    };

                    const transformedData = Object.entries(rawData).map(([dayKey, periods]: [string, any]) => {
                        const dayName = daysMap[dayKey.toLowerCase()] || (dayKey.charAt(0).toUpperCase() + dayKey.slice(1));

                        const cleanPeriods = (periods || []).flatMap((p: any) => {
                            const startTime = colToStart[p.start_col];
                            const endTime = colToEnd[p.end_col] || colToEnd[p.start_col];
                            if (!startTime || !endTime) return [];

                            // FAILSAFE SUBJECT SPLITTER: If the AI combined "CEDX 01/07", we split it here
                            const subjects = p.code.split(/[\/\+]/);
                            const prefix = p.code.match(/^[A-Z]+/)?.[0] || "";

                            return subjects.map((sub: string, idx: number) => {
                                let cleanSub = sub.trim();
                                if (idx > 0 && !cleanSub.match(/^[A-Z]/)) cleanSub = `${prefix} ${cleanSub}`;

                                return {
                                    id: Math.random().toString(36).substring(7),
                                    subject: cleanSub,
                                    courseName: p.name,
                                    teacherName: p.teacher,
                                    startTime,
                                    endTime,
                                    room: p.hall,
                                    type: "Lecture"
                                };
                            });
                        }).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

                        return { day: dayName, periods: cleanPeriods };
                    });

                    console.log(`✅ [PARSER] Success with ${modelName} (${version})`);
                    return { success: true, data: transformedData };
                } catch (error: any) {
                    console.warn(`⚠️ [PARSER] Failed with ${modelName} (${version}):`, error.message);
                    lastError = error;
                }
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
            for (const version of VERSIONS) {
                try {
                    const model = genAI.getGenerativeModel(
                        {
                            model: modelName,
                            generationConfig: {
                                temperature: 0.7,
                            }
                        },
                        { apiVersion: version as any }
                    );
                    const result = await model.generateContent([
                        { text: "You are TimeWise AI, a helpful assistant." },
                        { text: `Context: ${JSON.stringify(context)}\nUser: ${query}` }
                    ]);

                    const response = await result.response;
                    const text = response.text() || "I processed that.";
                    console.log(`✅ [CHAT] Success with ${modelName} (${version})`);
                    return { text };
                } catch (error: any) {
                    console.warn(`⚠️ [CHAT] Failed with ${modelName} (${version}):`, error.message);
                    lastError = error;
                }
            }
        }

        return { error: `Chat failed: ${lastError?.message || "No models available"}` };
    } catch (globalError: any) {
        return { error: globalError.message || "An unexpected chat error occurred." };
    }
}
