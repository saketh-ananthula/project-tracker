import { Router } from "express";
import { z } from "zod";
import { TaskStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { getMembership, requireAdmin } from "../services/projectAccess.js";

const router = Router({ mergeParams: true });

const createTaskSchema = z.object({
  title: z.string().min(1).max(300).trim(),
  description: z.string().max(10000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().cuid().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(300).trim().optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.string().cuid().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
});

router.use(requireAuth);

function taskSelect() {
  return {
    id: true,
    title: true,
    description: true,
    status: true,
    dueDate: true,
    createdAt: true,
    updatedAt: true,
    assignee: { select: { id: true, email: true, name: true } },
    createdBy: { select: { id: true, email: true, name: true } },
  } as const;
}

router.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const m = await getMembership(projectId, req.userId!);
    if (!m) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      select: taskSelect(),
    });
    res.json({ tasks });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const m = await getMembership(projectId, req.userId!);
    if (!m) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const body = createTaskSchema.parse(req.body);
    if (body.assigneeId && !requireAdmin(m.role)) {
      res.status(403).json({ error: "Only admins can assign tasks" });
      return;
    }
    if (body.assigneeId) {
      const assigneeMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: body.assigneeId },
        },
      });
      if (!assigneeMember) {
        res.status(400).json({
          error: "Assignee must be a member of this project",
        });
        return;
      }
    }
    const task = await prisma.task.create({
      data: {
        projectId,
        title: body.title,
        description: body.description ?? null,
        status: body.status ?? "TODO",
        assigneeId: body.assigneeId ?? null,
        dueDate: body.dueDate ?? null,
        createdById: req.userId!,
      },
      select: taskSelect(),
    });
    res.status(201).json({ task });
  } catch (e) {
    next(e);
  }
});

router.patch("/:taskId", async (req: AuthedRequest, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const m = await getMembership(projectId, req.userId!);
    if (!m) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const body = updateTaskSchema.parse(req.body);
    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
    });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const isAdmin = requireAdmin(m.role);
    const isAssignee = task.assigneeId === req.userId;
    const isCreator = task.createdById === req.userId;

    if (body.assigneeId !== undefined && body.assigneeId !== null) {
      if (!isAdmin) {
        res.status(403).json({ error: "Only admins can assign tasks" });
        return;
      }
      const assigneeMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: body.assigneeId },
        },
      });
      if (!assigneeMember) {
        res.status(400).json({
          error: "Assignee must be a member of this project",
        });
        return;
      }
    }

    if (!isAdmin) {
      const changingRestricted =
        body.title !== undefined ||
        body.description !== undefined ||
        body.dueDate !== undefined;
      if (changingRestricted && !isCreator) {
        res.status(403).json({
          error: "Only the creator or an admin can edit title, description, or due date",
        });
        return;
      }
      if (body.status !== undefined && !isAssignee && !isCreator) {
        res.status(403).json({
          error: "Only assignee, creator, or admin can change status",
        });
        return;
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.assigneeId !== undefined && {
          assigneeId: body.assigneeId,
        }),
        ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
      },
      select: taskSelect(),
    });
    res.json({ task: updated });
  } catch (e) {
    next(e);
  }
});

router.delete("/:taskId", async (req: AuthedRequest, res, next) => {
  try {
    const { projectId, taskId } = req.params;
    const m = await getMembership(projectId, req.userId!);
    if (!m) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const task = await prisma.task.findFirst({
      where: { id: taskId, projectId },
    });
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const isAdmin = requireAdmin(m.role);
    const isCreator = task.createdById === req.userId;
    if (!isAdmin && !isCreator) {
      res.status(403).json({ error: "Only creator or admin can delete" });
      return;
    }
    await prisma.task.delete({ where: { id: taskId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
