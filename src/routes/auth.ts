import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  // Mock login: NextAuth handles real login, this just fulfills PRD schema
  res.json({ success: true, message: 'Use NextAuth on frontend for actual auth' });
});

authRouter.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true });
});

authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});
