const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth.middleware');
const { validateLogin, validateChangePassword } = require('../validators/auth.validator');

const router = express.Router();

router.post('/login', validateLogin, authController.login);
router.get('/me', authenticate, authController.me);
router.post('/change-password', authenticate, validateChangePassword, authController.changePassword);

module.exports = router;
