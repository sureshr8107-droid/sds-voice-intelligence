import { Router, Request, Response } from 'express';
import { authenticateUser, requireRole } from '../middleware/auth';

export const authRouter = Router();

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private (Authenticated)
 */
authRouter.get('/auth/me', authenticateUser, (req: Request, res: Response) => {
  res.status(200).json({
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /api/v1/auth/admin/test
 * @desc    Test admin-only role enforcement
 * @access  Private (Admin only)
 */
authRouter.get(
  '/auth/admin/test',
  authenticateUser,
  requireRole('admin'),
  (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Admin authorization granted.',
      admin: req.user?.fullName,
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * @route   GET /api/v1/auth/staff/test
 * @desc    Test staff/operator role enforcement
 * @access  Private (Staff, Operator, Admin)
 */
authRouter.get(
  '/auth/staff/test',
  authenticateUser,
  requireRole('admin', 'staff', 'operator'),
  (req: Request, res: Response) => {
    res.status(200).json({
      message: 'Staff authorization granted.',
      staff: req.user?.fullName,
      role: req.user?.role,
      timestamp: new Date().toISOString(),
    });
  }
);
