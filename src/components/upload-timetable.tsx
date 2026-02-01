"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileImage } from "lucide-react";
import { useStore } from "@/lib/store";
// Import AI service later

export function UploadTimetable() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { setTimetable } = useStore();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        try {
            const { parseTimetableImage } = await import('@/lib/gemini');
            const parsedData = await parseTimetableImage(file);
            setTimetable(parsedData);
            alert("Timetable parsed successfully!");
        } catch (error: any) {
            console.error("Parsing failed:", error);
            alert(`Parsing Failed: ${error.message || "Unknown error"}`);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="grid w-full gap-4">
            {!file ? (
                <div className="flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 transition-colors hover:border-primary/50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Upload Timetable Image</h3>
                    <p className="mb-4 mt-2 text-center text-sm text-muted-foreground">
                        Drag and drop or click to upload your schedule (Image files only)
                    </p>
                    <Label htmlFor="timetable-upload" className="cursor-pointer">
                        <div className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                            Select Image
                        </div>
                        <Input
                            id="timetable-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </Label>
                </div>
            ) : (
                <div className="flex items-center justify-between rounded-md border p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <FileImage className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Cancel</Button>
                        <Button size="sm" onClick={handleUpload} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {isUploading ? "Parsing..." : "Process"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
