const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const {
  getUserName,
  getUserPlan,
  deleteUser,
  getAllUsers,
  getCurrentUser
} = { ...require('../controllers/userController') };

router.get('/user/name', isAuthenticated, getUserName);
router.get('/user/trial', isAuthenticated, getUserPlan);
router.delete('/user', isAuthenticated, deleteUser);
router.get('/user', getCurrentUser);
router.get('/users', getAllUsers);

module.exports = router;