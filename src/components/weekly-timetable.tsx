"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, BookOpen, User, GraduationCap, Trash2, Plus } from "lucide-react";
import { DayOfWeek } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UploadTimetable } from "./upload-timetable";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function WeeklyTimetable() {
    const { timetable, clearTimetable } = useStore();
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const getToday = () => {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[new Date().getDay()] as DayOfWeek;
    };

    const currentDay = getToday();

    const handleRemove = () => {
        if (confirm("Are you sure you want to remove your timetable? This will also reset your attendance data.")) {
            clearTimetable();
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Weekly Schedule
                </CardTitle>
                <div className="flex gap-2">
                    <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                                <Plus className="h-3.5 w-3.5" />
                                Update
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Update Timetable</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                                <UploadTimetable onSuccess={() => setIsUploadOpen(false)} />
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        onClick={handleRemove}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue={currentDay} className="w-full">
                    <div className="overflow-x-auto pb-2">
                        <TabsList className="inline-flex w-full md:w-auto h-auto p-1 bg-muted/50">
                            {DAYS.map((day) => (
                                <TabsTrigger
                                    key={day}
                                    value={day}
                                    className="px-4 py-2 text-sm"
                                >
                                    {day.substring(0, 3)}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {DAYS.map((day) => {
                        const daySchedule = timetable.find(d => d.day === day);

                        // Robust 24-hour sorting
                        const sortedPeriods = daySchedule?.periods ? [...daySchedule.periods].sort((a, b) => {
                            const timeA = a.startTime.padStart(5, '0');
                            const timeB = b.startTime.padStart(5, '0');
                            return timeA.localeCompare(timeB);
                        }) : [];

                        return (
                            <TabsContent key={day} value={day} className="mt-4 space-y-4">
                                {sortedPeriods.length > 0 ? (
                                    <div className="grid gap-3">
                                        {sortedPeriods.map((period) => (
                                            <div
                                                key={period.id}
                                                className="group relative flex flex-col gap-2 rounded-lg border bg-card p-4 transition-all hover:bg-muted/50 shadow-sm"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1.5">
                                                        <div className="flex flex-col">
                                                            <h4 className="text-base font-bold leading-tight">{period.subject}</h4>
                                                            {period.courseName && (
                                                                <span className="text-xs font-medium text-orange-500/90 dark:text-orange-400 flex items-center gap-1">
                                                                    <GraduationCap className="h-3 w-3" />
                                                                    {period.courseName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-3.5 w-3.5 text-primary/70" />
                                                                <span className="font-mono">{period.startTime} - {period.endTime}</span>
                                                            </div>
                                                            {period.room && (
                                                                <div className="flex items-center gap-1">
                                                                    <MapPin className="h-3.5 w-3.5 text-primary/70" />
                                                                    <span>{period.room}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {period.type && (
                                                        <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 font-semibold uppercase tracking-wider bg-primary/5">
                                                            {period.type}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {period.teacherName && (
                                                    <div className="mt-1 pt-2 border-t border-muted/50 flex items-center gap-2">
                                                        <User className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                        <span className="text-xs text-muted-foreground italic font-medium">
                                                            {period.teacherName}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex h-[150px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                                        <p className="text-sm text-muted-foreground">No classes scheduled for {day}</p>
                                    </div>
                                )}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </CardContent>
        </Card>
    );
}
