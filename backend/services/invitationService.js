const { Invitation, User, Programme, Department, Course } = require('../models');
const emailService = require('./emailService');
const { isAllowedEmail, describeAllowedDomains } = require('../utils/emailDomains');

class InvitationService {
  /**
   * Helper to resolve coordinator's department and programme
   */
  async resolveCoordinatorScope(user) {
    let departmentId = user.department?._id || user.department;
    let programmeId = user.programme?._id || user.programme;

    if (!programmeId) {
      const prog = await Programme.findOne({ coordinator: user._id });
      if (prog) {
        programmeId = prog._id;
        if (!departmentId) departmentId = prog.department;
      }
    }

    if (!departmentId || !programmeId) {
      const err = new Error('Coordinator has no assigned school / centre or programme. Please contact administrator.');
      err.statusCode = 400;
      throw err;
    }

    const [dept, prog] = await Promise.all([
      Department.findById(departmentId),
      Programme.findById(programmeId),
    ]);

    return { departmentId, programmeId, dept, prog };
  }

  /**
   * Create bulk or single faculty invitations
   * @param {Object} coordinator - Current logged in coordinator user
   * @param {Array<string>|string} rawEmails - List of emails
   */
  async inviteFaculty(coordinator, rawEmails) {
    const { departmentId, programmeId, dept, prog } = await this.resolveCoordinatorScope(coordinator);

    let emails = [];
    if (Array.isArray(rawEmails)) {
      emails = rawEmails;
    } else if (typeof rawEmails === 'string') {
      emails = rawEmails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
    }

    if (emails.length === 0) {
      const err = new Error('Please provide at least one email address');
      err.statusCode = 400;
      throw err;
    }

    if (emails.length > 50) {
      const err = new Error('Maximum 50 emails allowed per invite batch');
      err.statusCode = 400;
      throw err;
    }

    const results = [];

    for (const raw of emails) {
      const email = String(raw || '').toLowerCase().trim();
      if (!email) continue;

      // 1. Email format check
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        results.push({
          email,
          status: 'invalid',
          message: 'Invalid email format',
        });
        continue;
      }

      // 2. Exact domain match check
      if (!isAllowedEmail(email)) {
        results.push({
          email,
          status: 'domain_rejected',
          message: `Only ${describeAllowedDomains()} addresses are allowed`,
        });
        continue;
      }

      // 3. Already active user check
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.isActive) {
        results.push({
          email,
          status: 'already_active',
          message: 'User already has an active account',
        });
        continue;
      }

      // 4. Pending invite check for this department
      const existingPending = await Invitation.findOne({
        email,
        department: departmentId,
        status: 'pending',
      });
      if (existingPending) {
        results.push({
          email,
          status: 'already_invited',
          message: 'Invitation is already pending for this email',
        });
        continue;
      }

      // 5. Create invite
      const invite = await Invitation.create({
        email,
        department: departmentId,
        programme: programmeId,
        invitedBy: coordinator._id,
        status: 'pending',
        createdAt: new Date(),
        lastSentAt: new Date(),
      });

      // 6. Attempt email delivery
      const mailResult = await emailService.sendFacultyInvitation({
        toEmail: email,
        coordinatorName: coordinator.name,
        departmentName: dept?.name || dept?.code,
        programmeName: prog?.name || prog?.code,
      });

      results.push({
        email,
        status: 'created',
        mailSent: mailResult.sent,
        inviteId: invite._id,
        message: mailResult.sent
          ? 'Invitation email delivered successfully'
          : 'Invitation saved (SMTP not configured or sending failed)',
      });
    }

    return results;
  }

  /**
   * List invitations for coordinator's department
   */
  async listInvitations(coordinator) {
    const { departmentId } = await this.resolveCoordinatorScope(coordinator);

    const invitations = await Invitation.find({ department: departmentId })
      .populate('programme', 'name code')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    return invitations;
  }

  /**
   * Resend an invitation email
   */
  async resendInvitation(coordinator, inviteId) {
    const { departmentId, dept, prog } = await this.resolveCoordinatorScope(coordinator);

    const invite = await Invitation.findById(inviteId);
    if (!invite) {
      const err = new Error('Invitation not found');
      err.statusCode = 404;
      throw err;
    }

    // Ownership check
    if (String(invite.department) !== String(departmentId)) {
      const err = new Error('Forbidden: You can only resend invitations for your own school / centre');
      err.statusCode = 403;
      throw err;
    }

    if (invite.status !== 'pending') {
      const err = new Error(`Cannot resend an invitation with status '${invite.status}'`);
      err.statusCode = 400;
      throw err;
    }

    invite.lastSentAt = new Date();
    await invite.save();

    const mailResult = await emailService.sendFacultyInvitation({
      toEmail: invite.email,
      coordinatorName: coordinator.name,
      departmentName: dept?.name || dept?.code,
      programmeName: prog?.name || prog?.code,
    });

    return {
      invite,
      mailSent: mailResult.sent,
    };
  }

  /**
   * Revoke an invitation
   */
  async revokeInvitation(coordinator, inviteId) {
    const { departmentId } = await this.resolveCoordinatorScope(coordinator);

    const invite = await Invitation.findById(inviteId);
    if (!invite) {
      const err = new Error('Invitation not found');
      err.statusCode = 404;
      throw err;
    }

    // Ownership check
    if (String(invite.department) !== String(departmentId)) {
      const err = new Error('Forbidden: You can only revoke invitations for your own school / centre');
      err.statusCode = 403;
      throw err;
    }

    if (invite.status === 'revoked') {
      return { message: 'Invitation is already revoked' };
    }

    if (invite.status === 'accepted') {
      // Find faculty user
      const facultyUser = await User.findOne({ email: invite.email });
      if (facultyUser) {
        const assignedCoursesCount = await Course.countDocuments({ faculty: facultyUser._id });
        if (assignedCoursesCount > 0) {
          const err = new Error(
            `Cannot revoke invitation: faculty member is currently assigned to ${assignedCoursesCount} active course(s). Please reassign or unassign their courses first.`
          );
          err.statusCode = 400;
          throw err;
        }

        facultyUser.isActive = false;
        await facultyUser.save();
      }
    }

    invite.status = 'revoked';
    await invite.save();

    return { message: 'Invitation revoked successfully' };
  }

  /**
   * List faculty in coordinator's department with assigned courses count
   */
  async listDepartmentFaculty(coordinator) {
    const { departmentId, programmeId } = await this.resolveCoordinatorScope(coordinator);

    const facultyUsers = await User.find({
      department: departmentId,
      role: 'faculty',
    })
      .select('-passwordHash -googleId')
      .sort({ name: 1 });

    const facultyList = await Promise.all(
      facultyUsers.map(async (f) => {
        const assignedCourses = await Course.find({ faculty: f._id })
          .populate('programme', 'name code')
          .select('code name semester academicYear programme');

        return {
          ...f.toObject(),
          coursesAssigned: assignedCourses.length,
          courses: assignedCourses,
        };
      })
    );

    return facultyList;
  }

  /**
   * Assign courses of coordinator's programme to faculty member
   */
  async assignFacultyCourses(coordinator, facultyId, courseIds) {
    const { departmentId, programmeId } = await this.resolveCoordinatorScope(coordinator);

    const facultyUser = await User.findById(facultyId);
    if (!facultyUser || facultyUser.role !== 'faculty') {
      const err = new Error('Faculty member not found');
      err.statusCode = 404;
      throw err;
    }

    if (String(facultyUser.department) !== String(departmentId)) {
      const err = new Error('Cannot assign courses to faculty outside your school / centre');
      err.statusCode = 403;
      throw err;
    }

    // Verify all courseIds belong to coordinator's programme
    const courses = await Course.find({ _id: { $in: courseIds } });
    for (const c of courses) {
      if (String(c.programme) !== String(programmeId)) {
        const err = new Error(`Forbidden: Course ${c.code} belongs to another programme`);
        err.statusCode = 403;
        throw err;
      }
    }

    // Update faculty assignment on these courses
    await Course.updateMany(
      { _id: { $in: courseIds }, programme: programmeId },
      { $set: { faculty: facultyUser._id } }
    );

    return { message: `Assigned ${courses.length} course(s) to ${facultyUser.name}` };
  }
}

module.exports = new InvitationService();
