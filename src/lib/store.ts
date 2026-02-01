import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Timetable, AttendanceRecord, CalendarEvent } from '@/types';

interface AppState {
    timetable: Timetable;
    attendance: AttendanceRecord[];
    events: CalendarEvent[];

    // Actions
    setTimetable: (timetable: Timetable) => void;
    updateAttendance: (subject: string, type: 'present' | 'absent') => void;
    resetAttendance: (subject: string) => void;
    editAttendance: (subject: string, attended: number, missed: number) => void;
    syncAttendance: () => void;
    addEvent: (event: CalendarEvent) => void;
    removeEvent: (id: string) => void;
    rescheduleClass: (subject: string, fromDay: string, toDay: string) => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            timetable: [],
            attendance: [],
            events: [],

            setTimetable: (timetable) => set({ timetable }),

            updateAttendance: (subject, type) => set((state) => {
                const existing = state.attendance.find(r => r.subject === subject);
                let newAttendance = [...state.attendance];

                if (existing) {
                    newAttendance = newAttendance.map(r =>
                        r.subject === subject
                            ? { ...r, [type === 'present' ? 'attended' : 'missed']: r[type === 'present' ? 'attended' : 'missed'] + 1 }
                            : r
                    );
                } else {
                    newAttendance.push({
                        subject,
                        attended: type === 'present' ? 1 : 0,
                        missed: type === 'absent' ? 1 : 0
                    });
                }
                return { attendance: newAttendance };
            }),

            resetAttendance: (subject) => set((state) => ({
                attendance: state.attendance.filter(r => r.subject !== subject)
            })),

            editAttendance: (subject, attended, missed) => set((state) => ({
                attendance: state.attendance.find(r => r.subject === subject)
                    ? state.attendance.map(r => r.subject === subject ? { ...r, attended, missed } : r)
                    : [...state.attendance, { subject, attended, missed }]
            })),

            syncAttendance: () => set((state) => {
                const uniqueSubjects = new Set<string>();
                state.timetable.forEach(day => {
                    day.periods.forEach(p => uniqueSubjects.add(p.subject));
                });

                const newAttendance = [...state.attendance];
                uniqueSubjects.forEach(subject => {
                    if (!newAttendance.find(r => r.subject === subject)) {
                        newAttendance.push({ subject, attended: 0, missed: 0 });
                    }
                });

                return { attendance: newAttendance };
            }),

            addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
            removeEvent: (id) => set((state) => ({ events: state.events.filter(e => e.id !== id) })),

            rescheduleClass: (subject, fromDay, toDay) => set((state) => {
                const updatedTimetable = [...state.timetable];

                const fromDayIdx = updatedTimetable.findIndex(d => d.day.toLowerCase() === fromDay.toLowerCase());
                const toDayIdx = updatedTimetable.findIndex(d => d.day.toLowerCase() === toDay.toLowerCase());

                if (fromDayIdx === -1) return state;

                const fromDaySchedule = updatedTimetable[fromDayIdx];
                const periodsToMove = fromDaySchedule.periods.filter(p =>
                    p.subject.toLowerCase().includes(subject.toLowerCase()) ||
                    subject.toLowerCase().includes(p.subject.toLowerCase())
                );

                if (periodsToMove.length === 0) return state;

                // Remove from original day
                updatedTimetable[fromDayIdx] = {
                    ...fromDaySchedule,
                    periods: fromDaySchedule.periods.filter(p => !periodsToMove.includes(p))
                };

                // Add to new day
                if (toDayIdx !== -1) {
                    updatedTimetable[toDayIdx] = {
                        ...updatedTimetable[toDayIdx],
                        periods: [...updatedTimetable[toDayIdx].periods, ...periodsToMove]
                    };
                } else {
                    // Create new day if it doesn't exist
                    updatedTimetable.push({
                        day: toDay as any,
                        periods: periodsToMove
                    });
                }

                return { timetable: updatedTimetable };
            }),
        }),
        {
            name: 'timewise-storage',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
