const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const {
  getUserName,
  deleteUser,
  getAllUsers,
  getCurrentUser
} = { ...require('../controllers/userController') };

router.get('/user/name', isAuthenticated, getUserName);
router.delete('/user', isAuthenticated, deleteUser);
router.get('/user', getCurrentUser);
router.get('/users', getAllUsers);

module.exports = router;