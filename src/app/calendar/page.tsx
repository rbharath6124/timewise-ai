"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { CalendarEvent } from "@/types";

export default function CalendarPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const { events, addEvent } = useStore();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState("");
    const [newEventType, setNewEventType] = useState<CalendarEvent["type"]>("Other");

    // Filter events for selected date
    const selectedDateEvents = events.filter(event =>
        date && new Date(event.date).toDateString() === date.toDateString()
    );

    const handleAddEvent = () => {
        if (date && newEventTitle) {
            addEvent({
                id: crypto.randomUUID(),
                title: newEventTitle,
                date: date.toISOString(),
                type: newEventType,
            });
            setNewEventTitle("");
            setNewEventType("Other");
            setIsDialogOpen(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6 md:p-8 md:flex-row">
            <div className="flex-1 space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Calendar</h1>
                    <p className="text-muted-foreground">Manage your schedule, holidays, and duties.</p>
                </div>

                <Card className="w-fit">
                    <CardContent className="p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border"
                        />
                    </CardContent>
                </Card>
            </div>

            <div className="flex-1 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                        {date ? format(date, "MMMM d, yyyy") : "Select a date"}
                    </h2>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" disabled={!date}>
                                <Plus className="mr-2 h-4 w-4" /> Add Event
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Event via Calendar</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="title" className="text-right">Title</Label>
                                    <Input
                                        id="title"
                                        value={newEventTitle}
                                        onChange={(e) => setNewEventTitle(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="type" className="text-right">Type</Label>
                                    <Select value={newEventType} onValueChange={(v: any) => setNewEventType(v)}>
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue placeholder="type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Holiday">Holiday</SelectItem>
                                            <SelectItem value="Duty">Duty</SelectItem>
                                            <SelectItem value="Absence">Absence</SelectItem>
                                            <SelectItem value="Exam">Exam</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button onClick={handleAddEvent}>Save Event</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="space-y-4">
                    {selectedDateEvents.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No events for this day.</p>
                    ) : (
                        selectedDateEvents.map(event => (
                            <Card key={event.id}>
                                <CardHeader className="py-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">{event.title}</CardTitle>
                                        <Badge variant={
                                            event.type === 'Holiday' ? 'secondary' :
                                                event.type === 'Exam' ? 'destructive' :
                                                    event.type === 'Duty' ? 'default' : 'outline'
                                        }>
                                            {event.type}
                                        </Badge>
                                    </div>
                                </CardHeader>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
