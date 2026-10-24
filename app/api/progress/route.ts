import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/progress
 * Returns user roadmap & milestone progress, with fallback for guest/offline
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const roadmapId = searchParams.get("roadmapId");

    if (!userId) {
      return NextResponse.json({
        userId: "guest",
        completedMilestones: [],
        completedNodes: [],
        progressPercentage: 0,
        isGuest: true,
      });
    }

    // Query user milestone progress from DB
    const userProgress = await prisma.userProgress.findMany({
      where: {
        userId,
        ...(roadmapId
          ? {
              milestone: {
                roadmapId,
              },
            }
          : {}),
      },
      include: {
        milestone: true,
      },
    });

    const completedMilestones = userProgress
      .filter((p) => p.completed)
      .map((p) => p.milestoneId);

    const totalMilestones = userProgress.length;
    const progressPercentage =
      totalMilestones > 0
        ? Math.round((completedMilestones.length / totalMilestones) * 100)
        : 0;

    return NextResponse.json({
      userId,
      completedMilestones,
      totalCount: totalMilestones,
      progressPercentage,
      isGuest: false,
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    // Graceful fallback response to prevent breaking UI
    return NextResponse.json({
      userId: "fallback",
      completedMilestones: [],
      progressPercentage: 0,
      error: "Unable to query DB progress",
    });
  }
}

/**
 * POST /api/progress
 * Toggles milestone completion persistently in database
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const { milestoneId, completed, title, roadmapId = "default-roadmap" } = body;

    if (!milestoneId) {
      return NextResponse.json(
        { error: "milestoneId is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json({
        success: true,
        message: "Guest session progress recorded locally",
        milestoneId,
        completed: Boolean(completed),
      });
    }

    // Ensure Roadmap and Milestone exist in DB so foreign keys don't fail
    await prisma.roadmap.upsert({
      where: { id: roadmapId },
      update: {},
      create: {
        id: roadmapId,
        title: "Developer Personalized Roadmap",
        description: "Adaptive career progression roadmap",
      },
    });

    await prisma.milestone.upsert({
      where: { id: milestoneId },
      update: {
        title: title || milestoneId,
      },
      create: {
        id: milestoneId,
        title: title || milestoneId,
        roadmapId,
      },
    });

    // Upsert UserProgress record
    const updatedProgress = await prisma.userProgress.upsert({
      where: {
        userId_milestoneId: {
          userId,
          milestoneId,
        },
      },
      update: {
        completed: Boolean(completed),
      },
      create: {
        userId,
        milestoneId,
        completed: Boolean(completed),
      },
    });

    // If milestone completed, award points and increment tasks in UserStats if exists
    if (completed) {
      try {
        await prisma.userStats.upsert({
          where: { userId },
          update: {
            points: { increment: 25 },
            tasksCompleted: { increment: 1 },
            dailyGoalProgress: { increment: 25 },
          },
          create: {
            userId,
            points: 25,
            tasksCompleted: 1,
            dailyGoalProgress: 25,
          },
        });
      } catch (statsError) {
        console.warn("Could not update userStats on milestone complete:", statsError);
      }
    }

    return NextResponse.json({
      success: true,
      progress: updatedProgress,
      message: "Milestone progress updated successfully",
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}