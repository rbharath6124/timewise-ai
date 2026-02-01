"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, BookOpen } from "lucide-react";
import { DayOfWeek } from "@/types";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function WeeklyTimetable() {
    const { timetable } = useStore();

    const getToday = () => {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return days[new Date().getDay()] as DayOfWeek;
    };

    const currentDay = getToday();

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Weekly Schedule
                </CardTitle>
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
                        const sortedPeriods = daySchedule?.periods.sort((a, b) =>
                            a.startTime.localeCompare(b.startTime)
                        ) || [];

                        return (
                            <TabsContent key={day} value={day} className="mt-4 space-y-4">
                                {sortedPeriods.length > 0 ? (
                                    <div className="grid gap-3">
                                        {sortedPeriods.map((period) => (
                                            <div
                                                key={period.id}
                                                className="group relative flex flex-col gap-2 rounded-lg border bg-card p-4 transition-all hover:bg-muted/50"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <h4 className="font-semibold leading-none">{period.subject}</h4>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{period.startTime} - {period.endTime}</span>
                                                        </div>
                                                    </div>
                                                    {period.type && (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                            {period.type}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {period.room && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <MapPin className="h-3 w-3" />
                                                        <span>Room: {period.room}</span>
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
