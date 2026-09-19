const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getEnrolledStudents,
    enrollStudent,
    removeStudent,
    updateEnrollmentStatus,
    searchAvailableStudents,
} = require('../controllers/enrollmentController');

const router = express.Router({ mergeParams: true });

// All enrollment routes require authentication and course ownership
router.use(protect);

// GET /api/courses/:courseId/students/search — Search candidates
router.get('/search', searchAvailableStudents);

// GET /api/courses/:courseId/students — Get enrolled students
router.get('/', getEnrolledStudents);

// POST /api/courses/:courseId/students — Enroll student (body: { studentId })
router.post('/', enrollStudent);

// POST /api/courses/:courseId/students/:studentId — Enroll student (param: studentId)
router.post('/:studentId', enrollStudent);

// DELETE /api/courses/:courseId/students/:studentId — Remove student
router.delete('/:studentId', removeStudent);

// PATCH /api/courses/:courseId/students/:studentId/status — Toggle/update status
router.patch('/:studentId/status', updateEnrollmentStatus);

const { getStudentCourseMarks } = require('../controllers/markController');

// GET /api/courses/:courseId/students/:studentId/marks — Get student course marks
router.get('/:studentId/marks', getStudentCourseMarks);

module.exports = router;
