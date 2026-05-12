import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    const projectIds = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const ids = projectIds.map((p) => p.projectId);
    if (ids.length === 0) {
      res.json({
        summary: {
          totalTasks: 0,
          todo: 0,
          inProgress: 0,
          done: 0,
          overdue: 0,
          myAssignedOpen: 0,
        },
        overdueTasks: [],
        myUpcoming: [],
      });
      return;
    }

    const [statusGroups, overdueList, overdueCount, myAssigned, myUpcoming] =
      await Promise.all([
      prisma.task.groupBy({
        by: ["status"],
        where: { projectId: { in: ids } },
        _count: { id: true },
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: ids },
          dueDate: { lt: now },
          status: { not: "DONE" },
        },
        orderBy: { dueDate: "asc" },
        take: 20,
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
      }),
      prisma.task.count({
        where: {
          projectId: { in: ids },
          dueDate: { lt: now },
          status: { not: "DONE" },
        },
      }),
      prisma.task.count({
        where: {
          projectId: { in: ids },
          assigneeId: userId,
          status: { not: "DONE" },
        },
      }),
      prisma.task.findMany({
        where: {
          projectId: { in: ids },
          assigneeId: userId,
          dueDate: { gte: now },
          status: { not: "DONE" },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          project: { select: { id: true, name: true } },
        },
      }),
    ]);

    const counts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    let total = 0;
    for (const g of statusGroups) {
      counts[g.status] = g._count.id;
      total += g._count.id;
    }

    res.json({
      summary: {
        totalTasks: total,
        todo: counts.TODO,
        inProgress: counts.IN_PROGRESS,
        done: counts.DONE,
        overdue: overdueCount,
        myAssignedOpen: myAssigned,
      },
      overdueTasks: overdueList,
      myUpcoming,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
