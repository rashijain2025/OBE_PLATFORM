const invitationService = require('../services/invitationService');

class InvitationController {
  async invite(req, res, next) {
    try {
      const { emails } = req.body;
      const results = await invitationService.inviteFaculty(req.user, emails);

      const summary = {
        total: results.length,
        created: results.filter((r) => r.status === 'created').length,
        already_invited: results.filter((r) => r.status === 'already_invited').length,
        already_active: results.filter((r) => r.status === 'already_active').length,
        invalid: results.filter((r) => r.status === 'invalid').length,
        domain_rejected: results.filter((r) => r.status === 'domain_rejected').length,
      };

      res.status(201).json({
        success: true,
        data: {
          results,
          summary,
        },
        message: 'Invitations processed successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const invitations = await invitationService.listInvitations(req.user);
      res.json({
        success: true,
        data: invitations,
        message: 'Invitations retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async resend(req, res, next) {
    try {
      const result = await invitationService.resendInvitation(req.user, req.params.id);
      res.json({
        success: true,
        data: result.invite,
        mailSent: result.mailSent,
        message: 'Invitation resent successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async revoke(req, res, next) {
    try {
      const result = await invitationService.revokeInvitation(req.user, req.params.id);
      res.json({
        success: true,
        data: null,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  async listFaculty(req, res, next) {
    try {
      const faculty = await invitationService.listDepartmentFaculty(req.user);
      res.json({
        success: true,
        data: faculty,
        message: 'Department faculty retrieved successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async assignCourses(req, res, next) {
    try {
      const { courseIds } = req.body;
      if (!Array.isArray(courseIds)) {
        return res.status(400).json({
          success: false,
          data: null,
          message: 'courseIds must be an array of course IDs',
        });
      }
      const result = await invitationService.assignFacultyCourses(req.user, req.params.id, courseIds);
      res.json({
        success: true,
        data: null,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new InvitationController();
