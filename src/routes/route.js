const express = require('express')
const router = express.Router()
const UserController = require('../controllers/userController')
const Auth = require('../middleWares/auth')
const ProductController = require('../controllers/productController')
const CartController = require('../controllers/cartController')

//test-api
router.get('/test-me',  function(req, res){
    res.send({status:true, message : "test-api working fine"})
})

//*********************************USER API************************************************** */
router.post('/register', UserController.userRegistration)
router.post('/login', UserController.userLogin)
router.get('/user/:userId/profile', Auth.authentication, Auth.authorization, UserController.profileDetails)
router.post('/user/:userId/profile', Auth.authentication, Auth.authorization, UserController.userProfileUpdate)


//*********************************PRODUCT API**************************************************** */
router.post('/products', ProductController.registerProduct )
router.get('/products', ProductController.filterProducts)
router.get('/products/:productId', ProductController.getProduct)
router.put('/products/:productId', ProductController.updateProductDetails)
router.delete('/products/:productId', ProductController.deleteProduct)

//*************************************CART API***************************************************** */
router.post('/users/:userId/cart', Auth.authentication, Auth.authorization, CartController.createCart )
router.put('/users/:userId/cart', Auth.authentication, Auth.authorization, CartController.updateCart )
router.get('/users/:userId/cart', Auth.authentication, Auth.authorization, CartController.getCartDetails )
router.delete('/users/:userId/cart', Auth.authentication, Auth.authorization, CartController.emptyCart )


module.exports = router