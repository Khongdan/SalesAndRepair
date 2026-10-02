const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const roleService = require('../services/role.service');

const getRoles = asyncHandler(async (req, res) => {
  const roles = await roleService.listRoles();
  return success(res, roles, 'Lấy danh sách vai trò thành công');
});

module.exports = { getRoles };
