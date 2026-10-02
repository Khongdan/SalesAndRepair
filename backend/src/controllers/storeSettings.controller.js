const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const storeSettingsService = require('../services/storeSettings.service');
const { logActivity } = require('../services/activityLog.service');

const getStoreSettings = asyncHandler(async (req, res) => {
  const settings = await storeSettingsService.getStoreSettings();
  return success(res, settings, 'Lấy thông tin cửa hàng thành công');
});

const updateStoreSettings = asyncHandler(async (req, res) => {
  await storeSettingsService.updateStoreSettings({ ...req.body, updatedBy: req.user.userId });
  const updated = await storeSettingsService.getStoreSettings();
  logActivity({ userId: req.user.userId, action: 'UPDATE_STORE_SETTINGS', targetTable: 'StoreSettings', targetId: 1, description: `Cập nhật thông tin cửa hàng: ${updated.StoreName}` });
  return success(res, updated, 'Cập nhật thông tin cửa hàng thành công');
});

module.exports = { getStoreSettings, updateStoreSettings };
