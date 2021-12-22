const express = require('express');
const router = express.Router();
const {
    userController,
    productController,
    cartController,
    orderController
} = require('../controllers');

router.post('/register')
router.post('/login')
router.get('/user/:userId/profile')
router.put('/user/:userId/profile')

module.exports = router;