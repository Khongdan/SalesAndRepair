const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const categoryService = require('../services/category.service');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories();
  return success(res, categories, 'Lấy danh sách danh mục thành công');
});

const createCategory = asyncHandler(async (req, res) => {
  const { categoryName, description } = req.body;
  const existing = await categoryService.findByName(categoryName);
  if (existing) throw new ApiError(409, 'Tên danh mục đã tồn tại');

  const categoryId = await categoryService.createCategory({ categoryName, description });
  const created = await categoryService.findById(categoryId);
  return success(res, created, 'Tạo danh mục thành công', 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const categoryId = Number(req.params.id);
  const existing = await categoryService.findById(categoryId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy danh mục');

  await categoryService.updateCategory(categoryId, req.body);
  const updated = await categoryService.findById(categoryId);
  return success(res, updated, 'Cập nhật danh mục thành công');
});

const deleteCategory = asyncHandler(async (req, res) => {
  const categoryId = Number(req.params.id);
  const existing = await categoryService.findById(categoryId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy danh mục');

  await categoryService.deleteCategory(categoryId);
  return success(res, {}, 'Xóa danh mục thành công');
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
