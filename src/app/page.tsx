"use client";

import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { UploadTimetable } from "@/components/upload-timetable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import { AttendanceRecord } from "@/types";
import { WeeklyTimetable } from "@/components/weekly-timetable";
import { AttendanceCard } from "@/components/attendance-card";
import { Header } from "@/components/header";

export default function Dashboard() {
  const { data: session } = useSession();
  const { timetable, attendance } = useStore();

  const hasTimetable = timetable && timetable.length > 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 p-6 md:p-8">
        {!hasTimetable ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center space-y-6 pt-20 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Welcome to TimeWise AI</h2>
              <p className="text-muted-foreground">
                Your intelligent academic assistant. Upload your timetable to get started.
              </p>
            </div>

            <Card className="w-full">
              <CardHeader>
                <CardTitle>Get Started</CardTitle>
                <CardDescription>Upload an image of your class schedule</CardDescription>
              </CardHeader>
              <CardContent>
                <UploadTimetable />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Manage your academic schedule and attendance.</p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <WeeklyTimetable />
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="mb-4 text-lg font-semibold tracking-tight">Quick Attendance</h3>
                  <div className="grid gap-4">
                    {attendance.length > 0 ? (
                      attendance.map((record: AttendanceRecord) => (
                        <AttendanceCard
                          key={record.subject}
                          subject={record.subject}
                          attended={record.attended}
                          missed={record.missed}
                        />
                      ))
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="flex h-32 items-center justify-center p-6 text-center">
                          <p className="text-sm text-muted-foreground">No subjects found. They will appear here after you mark attendance.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
