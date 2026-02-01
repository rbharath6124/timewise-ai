export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface ClassPeriod {
    id: string;
    subject: string;
    startTime: string; // HH:mm 24-hour format
    endTime: string;   // HH:mm 24-hour format
    room?: string;
    type?: "Lecture" | "Lab" | "Tutorial";
}

export interface DaySchedule {
    day: DayOfWeek;
    periods: ClassPeriod[];
}

export type Timetable = DaySchedule[];

export interface AttendanceRecord {
    subject: string;
    attended: number;
    missed: number;
    // total is calculated as attended + missed
}

export interface CalendarEvent {
    id: string;
    title: string;
    date: string; // ISO Date String
    type: "Holiday" | "Duty" | "Absence" | "Exam" | "Other";
    description?: string;
}
