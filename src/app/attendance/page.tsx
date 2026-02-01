"use client";

import { useStore } from "@/lib/store";
import { AttendanceCard } from "@/components/attendance-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, RefreshCw, Upload } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Header } from "@/components/header";

export default function AttendancePage() {
    const { attendance, updateAttendance, syncAttendance } = useStore();
    const [newSubject, setNewSubject] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleAddSubject = () => {
        if (newSubject.trim()) {
            updateAttendance(newSubject.trim(), 'present');
            setIsOpen(false);
            setNewSubject("");
        }
    };

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => {
            syncAttendance();
            setIsSyncing(false);
        }, 600);
    };

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Header />
            <main className="flex-1 bg-muted/30 p-6 md:p-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Attendance Tracking</h1>
                        <p className="text-muted-foreground">Monitor your presence and maintain that 75% target.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                            Sync with Timetable
                        </Button>
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button className="shadow-lg">
                                    <Plus className="mr-2 h-4 w-4" /> Add Subject
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Subject</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Subject Name</Label>
                                        <Input
                                            id="name"
                                            placeholder="e.g. Mathematics II"
                                            value={newSubject}
                                            onChange={(e) => setNewSubject(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                                        />
                                    </div>
                                    <Button onClick={handleAddSubject} className="w-full">Create Tracker</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {attendance.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-background/50 p-12 text-center animate-in fade-in zoom-in duration-500">
                        <div className="rounded-full bg-muted p-6 mb-4">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No subjects found</h3>
                        <p className="max-w-xs text-muted-foreground mb-6">
                            Start tracking by adding subjects manually or syncing with your uploaded timetable.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="outline" asChild>
                                <Link href="/">Upload Timetable</Link>
                            </Button>
                            <Button onClick={() => setIsOpen(true)}>Add One Manually</Button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {attendance.map((record) => (
                            <AttendanceCard
                                key={record.subject}
                                subject={record.subject}
                                attended={record.attended}
                                missed={record.missed}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
