import { Router } from 'express';
import { prisma } from '../utils/prisma';

export const adminRouter = Router();

// Middleware to check if user is admin
const isAdmin = async (req: any, res: any, next: any) => {
  // In a real app, extract user from JWT
  // For MVP, we'll check a custom header or just assume it's passed in body if we want it simple.
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const user = await prisma.user.findUnique({ where: { id: userId as string } });
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  req.user = user;
  next();
};

// GET /api/admin/stats
adminRouter.get('/stats', isAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const activeRooms = await prisma.room.count({ where: { isActive: true } });
    const totalRooms = await prisma.room.count();
    const totalReports = await prisma.report.count({ where: { status: 'PENDING' } });

    // Mocking DAU/MAU since we only have `createdAt` and `lastSeen` on user
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dau = await prisma.user.count({
      where: { lastSeen: { gte: yesterday } }
    });

    res.json({
      totalUsers,
      activeRooms,
      totalRooms,
      totalReports,
      dau
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/users
adminRouter.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        plan: true,
        createdAt: true,
        lastSeen: true,
        _count: {
          select: { reportsReceived: true, hostedRooms: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id/role
adminRouter.put('/users/:id/role', isAdmin, async (req, res) => {
  const { role } = req.body;
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// GET /api/admin/reports
adminRouter.get('/reports', isAdmin, async (req, res) => {
  try {
    const reports = await prisma.report.findMany({
      include: {
        reporter: { select: { id: true, name: true, image: true } },
        reported: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// PUT /api/admin/reports/:id/status
adminRouter.put('/reports/:id/status', isAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report status' });
  }
});
