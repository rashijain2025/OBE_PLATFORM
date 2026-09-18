/**
 * @desc    Health check endpoint
 * @route   GET /api/health
 * @access  Public
 */
const getHealthStatus = (req, res) => {
    res.status(200).json({
        success: true,
        message: "OBE API Running"
    });
};

module.exports = {
    getHealthStatus
};
