import { Router } from 'express';
import { prisma } from '../utils/prisma';

export const reportsRouter = Router();

// POST /api/reports
reportsRouter.post('/', async (req, res) => {
  const { reporterId, reportedId, roomId, reason } = req.body;

  if (!reporterId || !reportedId || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedId,
        roomId,
        reason
      }
    });

    res.json(report);
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});
