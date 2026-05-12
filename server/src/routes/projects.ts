import { Router } from "express";
import { z } from "zod";
import { ProjectRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { getMembership, requireAdmin } from "../services/projectAccess.js";

const router = Router();

const createProjectSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(5000).optional().nullable(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(ProjectRole).default(ProjectRole.MEMBER),
});

const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(ProjectRole),
});

router.use(requireAuth);

router.get("/", async (req: AuthedRequest, res, next) => {
  try {
    const userId = req.userId!;
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      include: {
        project: {
          include: {
            _count: { select: { tasks: true, members: true } },
          },
        },
      },
      orderBy: { project: { updatedAt: "desc" } },
    });
    res.json({
      projects: memberships.map((m) => ({
        id: m.project.id,
        name: m.project.name,
        description: m.project.description,
        role: m.role,
        taskCount: m.project._count.tasks,
        memberCount: m.project._count.members,
        updatedAt: m.project.updatedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

router.post("/", async (req: AuthedRequest, res, next) => {
  try {
    const body = createProjectSchema.parse(req.body);
    const userId = req.userId!;
    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          name: body.name,
          description: body.description ?? null,
          ownerId: userId,
        },
      });
      await tx.projectMember.create({
        data: {
          projectId: p.id,
          userId,
          role: "ADMIN",
        },
      });
      return p;
    });
    res.status(201).json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        role: "ADMIN" as const,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/:projectId", async (req: AuthedRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const m = await getMembership(projectId, req.userId!);
    if (!m) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        _count: { select: { tasks: true } },
      },
    });
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        yourRole: m.role,
        memberCount: project.members.length,
        taskCount: project._count.tasks,
        members: project.members.map((x) => ({
          id: x.user.id,
          email: x.user.email,
          name: x.user.name,
          role: x.role,
        })),
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.patch("/:projectId", async (req: AuthedRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const m = await getMembership(projectId, req.userId!);
    if (!m || !requireAdmin(m.role)) {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    const body = updateProjectSchema.parse(req.body);
    if (!body.name && body.description === undefined) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
      },
    });
    res.json({
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.delete("/:projectId", async (req: AuthedRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const m = await getMembership(projectId, req.userId!);
    if (!m || !requireAdmin(m.role)) {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    await prisma.project.delete({ where: { id: projectId } });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

router.post("/:projectId/members", async (req: AuthedRequest, res, next) => {
  try {
    const { projectId } = req.params;
    const m = await getMembership(projectId, req.userId!);
    if (!m || !requireAdmin(m.role)) {
      res.status(403).json({ error: "Admin role required" });
      return;
    }
    const body = addMemberSchema.parse(req.body);
    const target = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    });
    if (!target) {
      res.status(404).json({ error: "No user with that email" });
      return;
    }
    if (target.id === req.userId) {
      res.status(400).json({ error: "You are already in the project" });
      return;
    }
    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: target.id },
      },
    });
    if (existing) {
      res.status(409).json({ error: "User is already a member" });
      return;
    }
    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: target.id,
        role: body.role,
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
    res.status(201).json({
      member: {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
        role: member.role,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.patch(
  "/:projectId/members/:userId",
  async (req: AuthedRequest, res, next) => {
    try {
      const { projectId, userId: memberUserId } = req.params;
      const m = await getMembership(projectId, req.userId!);
      if (!m || !requireAdmin(m.role)) {
        res.status(403).json({ error: "Admin role required" });
        return;
      }
      const body = updateMemberRoleSchema.parse(req.body);
      const target = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: memberUserId },
        },
      });
      if (!target) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (project?.ownerId === memberUserId && body.role === "MEMBER") {
        res.status(400).json({
          error: "Cannot demote the project owner from Admin",
        });
        return;
      }
      const updated = await prisma.projectMember.update({
        where: { id: target.id },
        data: { role: body.role },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      });
      res.json({
        member: {
          id: updated.user.id,
          email: updated.user.email,
          name: updated.user.name,
          role: updated.role,
        },
      });
    } catch (e) {
      next(e);
    }
  }
);

router.delete(
  "/:projectId/members/:userId",
  async (req: AuthedRequest, res, next) => {
    try {
      const { projectId, userId: memberUserId } = req.params;
      const m = await getMembership(projectId, req.userId!);
      if (!m || !requireAdmin(m.role)) {
        res.status(403).json({ error: "Admin role required" });
        return;
      }
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (project?.ownerId === memberUserId) {
        res.status(400).json({ error: "Cannot remove the project owner" });
        return;
      }
      const deleted = await prisma.$transaction(async (tx) => {
        await tx.task.updateMany({
          where: { projectId, assigneeId: memberUserId },
          data: { assigneeId: null },
        });
        return tx.projectMember.deleteMany({
          where: { projectId, userId: memberUserId },
        });
      });
      if (deleted.count === 0) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
);

export default router;
