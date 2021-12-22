const express = require('express');
const router = express.Router();
const {
    userController,
    productController,
    cartController,
    orderController
} = require('../controllers');
const middleware = require('../middlewares/auth')

router.post('/register', userController.userCreation)
router.post('/login')
router.get('/user/:userId/profile')
router.put('/user/:userId/profile')

module.exports = router;