const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const deviceService = require('../services/device.service');

const getDevicesByCustomer = asyncHandler(async (req, res) => {
  const devices = await deviceService.listByCustomer(Number(req.query.customerId));
  return success(res, devices, 'Lấy danh sách thiết bị thành công');
});

module.exports = { getDevicesByCustomer };
