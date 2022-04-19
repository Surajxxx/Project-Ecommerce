const CartModel = require("../models/cartModel");
const ProductModel = require("../models/productModel");
const Validator = require("../utilities/validator");
const { Convert } = require('easy-currencies')

//*********************************************CREATE or ADD TO CART***************************************************** */

const createCart = async function(req, res) {
    try {
        const requestBody = req.body;
        const queryParams = req.query;
        const userId = req.params.userId;

        // query params must be empty
        if (Validator.isValidInputBody(queryParams)) {
            return res
                .status(404)
                .send({ status: false, message: " page not found" });
        }

        // using destructuring
        const { productId, cartId } = requestBody;

        // product id is required
        if (!Validator.isValidInputValue(productId)) {
            return res.status(400).send({
                status: false,
                message: "Product ID is required ",
            });
        }
        // product id should be a valid mongoose ObjectId
        if (!Validator.isValidObjectId(productId)) {
            return res
                .status(400)
                .send({ status: false, message: "Product ID is not valid" });
        }

        const productByProductId = await ProductModel.findOne({
            _id: productId,
            isDeleted: false,
            deletedAt: null,
        });

        if (!productByProductId) {
            return res
                .status(404)
                .send({ status: false, message: `No product found by ${productId}` });
        }

        let productPriceInRupees = productByProductId.price

        if (productByProductId.currencyId !== "INR") {
            // converting product price to INR
            productPriceInRupees = await Convert(productByProductId.price).from(productByProductId.currencyId).to("INR")
        }
        // checking whether user has any cart
        const cartByUserId = await CartModel.findOne({ userId: userId });

        if (requestBody.hasOwnProperty("cartId")) {
            // if cart Id is coming from requestBody so first validating cart id then updating cart data

            // cart Id must not be an empty string
            if (!Validator.isValidInputValue(cartId)) {
                return res
                    .status(400)
                    .send({ status: false, message: "cartId could not be blank" });
            }

            // cart Id must be a valid mongoose Object Id
            if (!Validator.isValidObjectId(cartId)) {
                return res
                    .status(400)
                    .send({ status: false, message: "cartId  is not valid" });
            }

            const cartByCartId = await CartModel.findById(cartId);

            if (!cartByCartId) {
                return res
                    .status(404)
                    .send({ status: false, message: `No cart found by ${cartId}` });
            }

            // if user is not matching in cart found by userId and cart found by cart id that mean some other user's cart id is coming from request body
            if (cartId !== cartByUserId._id.toString()) {
                return res.status(403).send({
                    status: false,
                    message: `User is not allowed to update this cart`,
                });
            }
        }

        //  if cart is not found by userId that mean some other user's cart Id is coming from request body
        if (cartByUserId) {
            // applying higher order function "map" on items array of cart to get an array of product id in string
            const isProductExistsInCart = cartByUserId.items.map(
                (product) => (product["productId"] = product["productId"].toString())
            );

            // if product id coming from request body is present in cart then updating its quantity
            if (isProductExistsInCart.includes(productId)) {
                /* condition :  cartId and items array element which has product id coming from request body
                    update :     totalItems will increase by 1, totalPrice will increase by price of that product 
                    and items array element(product) quantity will increase by one*/

                const updateExistingProductQuantity = await CartModel.findOneAndUpdate({ userId: userId, "items.productId": productId }, {
                    $inc: {
                        totalPrice: +productPriceInRupees,
                        "items.$.quantity": +1,
                    },
                }, { new: true });
                return res.status(200).send({
                    status: true,
                    message: "Product quantity updated to cart",
                    data: updateExistingProductQuantity,
                });
            }

            // if product id coming from request body is not present in cart then we have to add that product in items array of cart
            const aAddNewProductInItems = await CartModel.findOneAndUpdate({ userId: userId }, {
                $addToSet: { items: { productId: productId, quantity: 1 } },
                $inc: { totalItems: +1, totalPrice: +productPriceInRupees },
            }, { new: true });

            return res.status(200).send({
                status: true,
                message: "Item updated to cart",
                data: aAddNewProductInItems,
            });
        } else {
            // if no cart found by userID then creating a new cart the product coming from request body
            const productData = {
                productId: productId,
                quantity: 1,
            };

            const cartData = {
                userId: userId,
                items: [productData],
                totalPrice: productPriceInRupees,
                totalItems: 1,
            };

            const newCart = await CartModel.create(cartData);

            return res
                .status(200)
                .send({
                    status: true,
                    message: "New cart created and product added to cart",
                    data: newCart,
                });
        }
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//****************************************UPDATE CART************************************************** */

const updateCart = async function(req, res) {
    try {
        const requestBody = req.body;
        const queryParams = req.query;
        const userId = req.params.userId;

        if (Validator.isValidInputBody(queryParams)) {
            return res
                .status(404)
                .send({ status: false, message: " page not found" });
        }

        if (!Validator.isValidInputBody(requestBody)) {
            return res.status(404).send({
                status: false,
                message: "data is required to remove products in cart",
            });
        }

        const { productId, cartId, removeProduct } = requestBody;

        if (!Validator.isValidInputValue(productId)) {
            return res
                .status(400)
                .send({ status: false, message: "Product ID is required" });
        }

        if (!Validator.isValidObjectId(productId)) {
            return res
                .status(400)
                .send({ status: false, message: "Product ID is not valid" });
        }

        const productByProductId = await ProductModel.findOne({
            _id: productId,
            isDeleted: false,
            deletedAt: null,
        });

        if (!productByProductId) {
            return res
                .status(404)
                .send({ status: false, message: `No product found by ${productId}` });
        }

        let productPriceInRupees = productByProductId.price

        if (productByProductId.currencyId !== "INR") {
            // converting product price to INR
            productPriceInRupees = await Convert(productByProductId.price).from(productByProductId.currencyId).to("INR")
        }

        if (!Validator.isValidInputValue(cartId)) {
            return res
                .status(400)
                .send({ status: false, message: "cart Id is required" });
        }

        if (!Validator.isValidObjectId(cartId)) {
            return res
                .status(400)
                .send({ status: false, message: "cart Id  is not valid" });
        }

        const cartByCartId = await CartModel.findById(cartId);

        if (!cartByCartId) {
            return res
                .status(404)
                .send({ status: false, message: `No cart found by ${cartId}` });
        }

        const cartByUserId = await CartModel.findOne({ userId: userId });

        if (!cartByUserId) {
            return res.status(403).send({
                status: false,
                message: `User is not allowed to update this cart`,
            });
        }

        // cart id coming from request body and cart id of the user should be a  match
        if (cartId !== cartByUserId._id.toString()) {
            return res.status(403).send({
                status: false,
                message: `User is not allowed to update this cart`,
            });
        }

        // removeProduct should be either 1 or 0
        if (![0, 1].includes(removeProduct)) {
            return res.status(400).send({
                status: false,
                message: "Remove Product is required and its value must be either 0 or 1",
            });
        }

        // creating an array of objects with key productId and quantity
        const allProductsInCart = cartByCartId.items.map((product) => ({
            productId: product["productId"].toString(),
            quantity: product["quantity"],
        }));

        // console.log(allProductsInCart.flat())
        // checking product id coming from request body is present in the cart
        const isProductExistsInCart = allProductsInCart.filter(
            (x) => x.productId === productId
        );

        if (isProductExistsInCart.length === 0) {
            return res.status(404).send({
                status: false,
                message: "No product found by this product id inside cart",
            });
        }
        // identifying quantity of that product
        const productQuantity = isProductExistsInCart[0].quantity;

        // if client want to reduce the product quantity by one
        if (removeProduct === 1) {
            // first check whether productQuantity is  greater than one then reduce the quantity else remove whole product
            if (productQuantity > 1) {
                const decreaseExistingProductQuantity =
                    await CartModel.findOneAndUpdate({ _id: cartId, "items.productId": productId }, {
                        $inc: {
                            totalPrice: -productPriceInRupees,
                            "items.$.quantity": -1,
                        },
                    }, { new: true });

                return res.status(200).send({
                    status: true,
                    message: "product quantity reduced in cart",
                    data: decreaseExistingProductQuantity,
                });
            } else {
                const eraseProductFromCart = await CartModel.findOneAndUpdate({ _id: cartId }, {
                    $pull: { items: isProductExistsInCart[0] },
                    $inc: { totalItems: -1, totalPrice: -productPriceInRupees },
                }, { new: true });

                return res.status(200).send({
                    status: true,
                    message: "Product removed from cart",
                    data: eraseProductFromCart,
                });
            }
        } else {
            const removeProductFromCart = await CartModel.findOneAndUpdate({ _id: cartId }, {
                $pull: { items: isProductExistsInCart[0] },
                $inc: {
                    totalItems: -1,
                    totalPrice: -(productQuantity * productPriceInRupees),
                },
            }, { new: true });

            return res.status(200).send({
                status: true,
                message: "product removed from cart",
                data: removeProductFromCart,
            });
        }
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//***********************************GET CART DETAILS********************************************* */

const getCartDetails = async function(req, res) {
    try {
        const userId = req.params.userId;
        const queryParams = req.query;

        if (Validator.isValidInputBody(queryParams)) {
            return res
                .status(404)
                .send({ status: false, message: " page not found" });
        }

        const cartByUserId = await CartModel.findOne({ userId: userId });

        if (!cartByUserId) {
            return res.status(404).send({
                status: false,
                message: `no cart found by ${userId}`,
            });
        }

        return res
            .status(200)
            .send({
                status: true,
                message: "Cart details are here",
                data: cartByUserId,
            });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//************************************EMPTY CART***************************************************** */

const emptyCart = async function(req, res) {
    try {
        const userId = req.params.userId;
        const queryParams = req.query;

        if (Validator.isValidInputBody(queryParams)) {
            return res
                .status(404)
                .send({ status: false, message: " page not found" });
        }

        const cartByUserId = await CartModel.findOne({ userId: userId });

        if (!cartByUserId) {
            return res.status(404).send({
                status: false,
                message: `no cart found by ${userId}`,
            });
        }

        if (cartByUserId.items.length === 0 || cartByUserId.totalItems === 0) {
            return res.status(400).send({
                status: false,
                message: `cart is already empty`,
            });
        }

        const makeCartEmpty = await CartModel.findOneAndUpdate({ userId: userId }, { $set: { items: [], totalPrice: 0, totalItems: 0 } }, { new: true });
        return res
            .status(200)
            .send({
                status: true,
                message: "cart made empty successfully",
                data: makeCartEmpty,
            });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

module.exports = {
    createCart,
    updateCart,
    getCartDetails,
    emptyCart,
};