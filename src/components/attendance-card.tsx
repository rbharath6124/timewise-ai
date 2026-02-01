"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/store";
import { MoreVertical, Check, X, Trash2, Edit2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface AttendanceCardProps {
    subject: string;
    attended: number;
    missed: number;
}

export function AttendanceCard({ subject, attended, missed }: AttendanceCardProps) {
    const { updateAttendance, resetAttendance, editAttendance } = useStore();
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editValues, setEditValues] = useState({ attended, missed });

    const total = attended + missed;
    const percentage = total === 0 ? 0 : Math.round((attended / total) * 100);

    // Smart Stats Calculations
    const calculateSafeToMiss = () => {
        if (total === 0) return 0;
        let m = missed;
        // Find max 'm' such that attended / (attended + m) >= 0.75
        // attended >= 0.75 * (attended + m)
        // attended / 0.75 >= attended + m
        // (attended / 0.75) - attended >= m
        return Math.floor((attended / 0.75) - attended - missed);
    };

    const calculateMustAttend = () => {
        if (percentage >= 75) return 0;
        // Find min 'a' such that (attended + a) / (total + a) >= 0.75
        // attended + a >= 0.75 * total + 0.75 * a
        // 0.25 * a >= 0.75 * total - attended
        // a >= (0.75 * total - attended) / 0.25
        // a >= 3 * total - 4 * attended
        return Math.ceil(3 * total - 4 * attended);
    };

    const safeToMiss = calculateSafeToMiss();
    const mustAttend = calculateMustAttend();

    let statusColor = "bg-green-500";
    if (percentage < 75) statusColor = "bg-red-500";
    else if (percentage < 85) statusColor = "bg-yellow-500";

    const handleSaveEdit = () => {
        editAttendance(subject, editValues.attended, editValues.missed);
        setIsEditDialogOpen(false);
    };

    return (
        <>
            <Card className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate pr-4">{subject}</CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                                <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-700" onClick={() => resetAttendance(subject)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline justify-between">
                        <div className="text-3xl font-bold">{attended} / {total}</div>
                        <div className={`text-sm font-bold ${percentage < 75 ? "text-red-500" : "text-green-600"}`}>
                            {percentage}%
                        </div>
                    </div>
                    <Progress value={percentage} className={`mt-3 h-2 ${statusColor}`} />

                    <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                            {percentage >= 75 ? (
                                <>
                                    <span className="block text-lg text-foreground font-black">{safeToMiss > 0 ? safeToMiss : 0}</span>
                                    Safe to Miss
                                </>
                            ) : (
                                <>
                                    <span className="block text-lg text-red-500 font-black">{mustAttend}</span>
                                    Must Attend
                                </>
                            )}
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                            <span className="block text-lg text-foreground font-black">{total}</span>
                            Total Classes
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-950 transition-colors"
                            onClick={() => updateAttendance(subject, 'present')}
                        >
                            <Check className="mr-1 h-3 w-3" /> Present
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 transition-colors"
                            onClick={() => updateAttendance(subject, 'absent')}
                        >
                            <X className="mr-1 h-3 w-3" /> Absent
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Attendance: {subject}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="attended" className="text-right">Attended</Label>
                            <Input
                                id="attended"
                                type="number"
                                value={editValues.attended}
                                onChange={(e) => setEditValues({ ...editValues, attended: parseInt(e.target.value) || 0 })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="missed" className="text-right">Missed</Label>
                            <Input
                                id="missed"
                                type="number"
                                value={editValues.missed}
                                onChange={(e) => setEditValues({ ...editValues, missed: parseInt(e.target.value) || 0 })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
