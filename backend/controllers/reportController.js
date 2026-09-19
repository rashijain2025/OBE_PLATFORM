const { computeCourseAttainment } = require('../services/attainmentService');

/**
 * Helper to escape CSV cell values safely
 */
const escapeCSV = (value) => {
    if (value === null || value === undefined) return '""';
    const stringValue = String(value).replace(/"/g, '""');
    return `"${stringValue}"`;
};

/**
 * Generate formatted CSV string from course report data
 */
const generateReportCSV = (reportData) => {
    const { course, targetPercentage, summary, outcomes, belowTargetOutcomes } = reportData;

    const lines = [];

    // Header & Metadata
    lines.push('========================================================================');
    lines.push('OUTCOME-BASED EDUCATION (OBE) COURSE PERFORMANCE REPORT');
    lines.push('========================================================================');
    lines.push('');
    lines.push('COURSE DETAILS');
    lines.push(`Course Code,${escapeCSV(course.courseCode)}`);
    lines.push(`Course Name,${escapeCSV(course.courseName)}`);
    lines.push(`Department,${escapeCSV(course.department)}`);
    lines.push(`Semester,${escapeCSV(course.semester)}`);
    lines.push(`Academic Year,${escapeCSV(course.academicYear)}`);
    lines.push(`Credits,${escapeCSV(course.credits)}`);
    lines.push(`Target Threshold,${escapeCSV(targetPercentage + '%')}`);
    lines.push(`Generated On,${escapeCSV(new Date().toISOString())}`);
    lines.push('');

    // Summary Section
    lines.push('OBE PERFORMANCE SUMMARY');
    lines.push(`Total Course Outcomes,${escapeCSV(summary.totalCOs)}`);
    lines.push(`Evaluated Outcomes,${escapeCSV(summary.evaluatedCOs)}`);
    lines.push(`Attained Outcomes,${escapeCSV(summary.attainedCOs)}`);
    lines.push(`Below Target Outcomes,${escapeCSV(summary.belowTargetCOs)}`);
    lines.push(
        `Average CO Attainment,${escapeCSV(summary.averageAttainment !== null ? summary.averageAttainment + '%' : 'N/A')}`
    );
    lines.push(`Total Enrolled Students,${escapeCSV(summary.totalEnrolledStudents)}`);
    lines.push(`Course Attainment Status,${escapeCSV(summary.courseAttainmentStatus)}`);
    lines.push('');

    // CO-wise Attainment Table
    lines.push('COURSE OUTCOME (CO) ATTAINMENT BREAKDOWN');
    lines.push(
        [
            'CO Code',
            'Bloom Level',
            'Description',
            'Mapped Questions',
            'Max Marks',
            'Students Considered',
            'Students Attained',
            'Attainment %',
            'Target %',
            'Status',
            'Remarks',
        ].join(',')
    );

    outcomes.forEach((co) => {
        lines.push(
            [
                escapeCSV(co.code),
                escapeCSV(co.bloomLevel || 'Understand'),
                escapeCSV(co.description),
                escapeCSV(co.mappedQuestionsCount),
                escapeCSV(co.maxMarks),
                escapeCSV(co.studentsConsidered),
                escapeCSV(co.studentsAttained),
                escapeCSV(co.attainmentPercentage !== null ? co.attainmentPercentage + '%' : 'N/A'),
                escapeCSV(co.targetPercentage + '%'),
                escapeCSV(co.status),
                escapeCSV(co.remarks),
            ].join(',')
        );
    });
    lines.push('');

    // Below Target Section (Constructive / Non-judgmental)
    lines.push('AREAS FOR CURRICULUM REVIEW (BELOW TARGET THRESHOLD)');
    if (belowTargetOutcomes && belowTargetOutcomes.length > 0) {
        lines.push(
            [
                'CO Code',
                'Bloom Level',
                'Description',
                'Attainment %',
                'Target %',
                'Gap %',
                'Students Considered',
                'Students Attained',
                'Status',
            ].join(',')
        );

        belowTargetOutcomes.forEach((co) => {
            lines.push(
                [
                    escapeCSV(co.code),
                    escapeCSV(co.bloomLevel || 'Understand'),
                    escapeCSV(co.description),
                    escapeCSV(co.attainmentPercentage + '%'),
                    escapeCSV(co.targetPercentage + '%'),
                    escapeCSV(co.gapPercentage + '%'),
                    escapeCSV(co.studentsConsidered),
                    escapeCSV(co.studentsAttained),
                    escapeCSV(co.status),
                ].join(',')
            );
        });
    } else {
        lines.push('All evaluated Course Outcomes have met or exceeded the target threshold.');
    }

    return lines.join('\r\n');
};

/**
 * @desc    Get course-level OBE performance report
 * @route   GET /api/courses/:courseId/report
 * @access  Private (Faculty assigned to course)
 */
const getCourseReport = async (req, res, next) => {
    try {
        const { courseId } = req.params;
        const result = await computeCourseAttainment(
            courseId,
            req.user._id,
            req.query.target
        );

        const reportData = {
            course: {
                id: result.course._id,
                courseCode: result.course.courseCode,
                courseName: result.course.courseName,
                department: result.course.department,
                semester: result.course.semester,
                academicYear: result.course.academicYear,
                credits: result.course.credits,
                description: result.course.description,
            },
            targetPercentage: result.targetPercentage,
            summary: {
                totalCOs: result.totalCourseOutcomes,
                evaluatedCOs: result.evaluatedOutcomesCount,
                attainedCOs: result.attainedOutcomesCount,
                belowTargetCOs: result.belowTargetOutcomesCount,
                averageAttainment: result.averageAttainment,
                totalEnrolledStudents: result.totalEnrolledStudents,
                courseAttainmentStatus: result.courseAttainmentStatus,
            },
            outcomes: result.outcomes.map((o) => ({
                coId: o.coId,
                code: o.code,
                description: o.description,
                bloomLevel: o.bloomLevel,
                mappedQuestionsCount: o.mappedQuestionsCount,
                maxMarks: o.maxMarks,
                studentsConsidered: o.studentsConsidered,
                studentsAttained: o.studentsAttained,
                attainmentPercentage: o.attainmentPercentage,
                targetPercentage: o.targetPercentage,
                status: o.status,
                remarks: o.remarks,
            })),
            belowTargetOutcomes: result.belowTargetOutcomes,
        };

        // Format CSV export if requested
        if (req.query.format === 'csv') {
            const csvContent = generateReportCSV(reportData);
            const filename = `OBE_Report_${result.course.courseCode || 'Course'}.csv`;

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.status(200).send(csvContent);
        }

        res.status(200).json({
            success: true,
            data: reportData,
        });
    } catch (err) {
        if (err.statusCode) {
            res.status(err.statusCode);
        }
        next(err);
    }
};

module.exports = {
    getCourseReport,
};
