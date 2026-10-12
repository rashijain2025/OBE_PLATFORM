const authService = require('../services/authService');

/**
 * Controller for Authentication endpoints
 */
class AuthController {
  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/register (Admin-only)
   */
  async register(req, res, next) {
    try {
      const { name, email, password, role, department, rollNo } = req.body;
      const user = await authService.register({
        name,
        email,
        password,
        role,
        department,
        rollNo,
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req, res, next) {
    try {
      const user = await authService.getMe(req.user._id);

      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully',
      });
    } catch (error) {
      next(error);
    }
  }
  /**
   * PATCH /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user._id, {
        currentPassword,
        newPassword,
      });

      res.status(200).json({
        success: true,
        data: null,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
