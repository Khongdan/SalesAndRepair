const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const activityLogService = require('../services/activityLog.service');

const getActivityLogs = asyncHandler(async (req, res) => {
  const { page, pageSize, userId, action } = req.query;
  const result = await activityLogService.listActivityLogs({
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 30,
    userId: userId ? Number(userId) : undefined,
    action,
  });
  return success(res, result, 'Lấy nhật ký hệ thống thành công');
});

module.exports = { getActivityLogs };
