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
                        ACT AS A PRECISION GRID EXTRACTOR. 
                        
                        1. THE GRID SYSTEM (5 ROWS x 9 COLUMNS):
                           COL 1: 09:00-09:50
                           COL 2: 09:50-10:40
                           COL 3: [TEA BREAK - IGNORE]
                           COL 4: 11:00-11:50
                           COL 5: 11:50-12:40
                           COL 6: [LUNCH BREAK - IGNORE]
                           COL 7: 13:40-14:30
                           COL 8: 14:30-15:20
                           COL 9: 15:20-16:10

                        2. EXTRACTION STEPS:
                           - STEP A: View the image as a table with 5 rows (Mon-Fri) and 9 columns.
                           - STEP B: For each row, identify which columns contain text.
                           - STEP C: If a cell spans multiple columns (e.g. 11:00 to 12:40), mark it as starting at Col 4 and ending at Col 5.
                           - STEP D: For each cell, extract ALL course codes present (e.g. "SSDX 11/12").
                           
                        3. LEGEND LOOKUP (CRITICAL):
                           - Find the Course Details legend at the bottom.
                           - For EVERY course code found in a cell, create a separate entry.
                           - Match the CORRECT "Course Name" and "Faculty/Teacher" for that specific code.
                           - If a cell has codes "CEDX 01/07", you MUST create TWO objects: one for 01 and one for 07, each with their own unique name/teacher from the legend.

                        JSON SCHEMA:
                        {
                          "monday": [
                            {
                              "code": "CEDX 01",
                              "name": "Full Name from Legend",
                              "teacher": "Teacher from Legend",
                              "start_col": 1,
                              "end_col": 1,
                              "hall": "Room"
                            }
                          ],
                          ...
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

                    // --- COORDINATE TO TIME MAPPING ---
                    const colToStart: Record<number, string> = { 1: "09:00", 2: "09:50", 4: "11:00", 5: "11:50", 7: "13:40", 8: "14:30", 9: "15:20" };
                    const colToEnd: Record<number, string> = { 1: "09:50", 2: "10:40", 4: "11:50", 5: "12:40", 7: "14:30", 8: "15:20", 9: "16:10" };

                    const daysMap: Record<string, string> = {
                        monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday", friday: "Friday"
                    };

                    const transformedData = Object.entries(rawData).map(([dayKey, periods]: [string, any]) => {
                        return {
                            day: daysMap[dayKey.toLowerCase()] || (dayKey.charAt(0).toUpperCase() + dayKey.slice(1)),
                            periods: (periods || []).flatMap((p: any) => {
                                const startTime = colToStart[p.start_col];
                                const endTime = colToEnd[p.end_col] || colToEnd[p.start_col];
                                if (!startTime || !endTime) return [];

                                return [{
                                    id: Math.random().toString(36).substring(7),
                                    subject: p.code,
                                    courseName: p.name,
                                    teacherName: p.teacher,
                                    startTime,
                                    endTime,
                                    room: p.hall,
                                    type: "Lecture"
                                }];
                            }).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
                        };
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
