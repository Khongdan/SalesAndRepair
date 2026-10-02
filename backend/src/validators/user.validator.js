const ApiError = require('../utils/apiError');

function validateCreateUser(req, res, next) {
  const { username, password, fullName, roleId } = req.body;
  const errors = [];
  if (!username || username.trim().length < 3) errors.push('Username phải có ít nhất 3 ký tự');
  if (!password || password.length < 6) errors.push('Password phải có ít nhất 6 ký tự');
  if (!fullName || !fullName.trim()) errors.push('Họ tên là bắt buộc');
  if (!roleId || Number.isNaN(Number(roleId))) errors.push('RoleID là bắt buộc và phải là số');
  if (req.body.email && !/^\S+@\S+\.\S+$/.test(req.body.email)) errors.push('Email không hợp lệ');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validateUpdateUser(req, res, next) {
  const { fullName, roleId, status } = req.body;
  const errors = [];
  if (!fullName || !fullName.trim()) errors.push('Họ tên là bắt buộc');
  if (!roleId || Number.isNaN(Number(roleId))) errors.push('RoleID là bắt buộc và phải là số');
  if (status && !['ACTIVE', 'INACTIVE'].includes(status)) errors.push('Status không hợp lệ');
  if (req.body.email && !/^\S+@\S+\.\S+$/.test(req.body.email)) errors.push('Email không hợp lệ');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = { validateCreateUser, validateUpdateUser };
