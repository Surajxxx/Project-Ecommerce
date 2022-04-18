const OrderModel = require('../models/orderModel')
const Validator = require('../utilities/validator')

//*******************************************CREATE ORDER*************************************************** */

const createOrder = async function(req, res) {
    try {
        const requestBody = req.body
        const queryParams = req.query
        const userIdFromParams = req.params.userId

        // query params must be empty
        if (Validator.isValidInputBody(queryParams)) {
            return res
                .status(404)
                .send({ status: false, message: " page not found" });
        }


        if (!Validator.isValidInputBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Cart data is required " })
        }

        const { userId, items, totalPrice, totalItems } = requestBody

        if (Object.keys(requestBody).length > 4) {
            return res.status(400).send({ status: false, message: "invalid entries" })
        }

        if (!Validator.isValidInputValue(userId)) {
            return res.status(400).send({ status: false, message: "userId is required " })
        }

        if (!Validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "invalid userId " })
        }

        if (userId !== userIdFromParams) {
            return res.status(403).send({ status: false, message: "unauthorize access: cart details is not of this user" })
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).send({ status: false, message: "Items required to place order" })
        }

        if (typeof(totalPrice) !== 'number') {
            return res.status(400).send({ status: false, message: "total price should be a number" })
        }

        if (typeof(totalItems) !== 'number' || totalItems === 0) {
            return res.status(400).send({ status: false, message: "total items should be a non zero number" })
        }

        let totalQuantity = 0

        for (let i = 0; i < items.length; i++) {
            const element = items[i];

            totalQuantity = totalQuantity + element.quantity

        }

        const orderData = {
            userId: userId,
            items: items,
            totalItems: totalItems,
            totalPrice: totalPrice,
            totalQuantity: totalQuantity,
            cancellable: true,
            status: "pending",
            isDeleted: false,
            deletedAt: null
        }

        const order = await OrderModel.create(orderData)
        res.status(201).send({ status: true, message: "order placed", data: order })


    } catch (error) {
        res.status(500).send({ error: error.message })
    }
}

//***************************************UPDATE ORDER STATUS********************************************** */


const updateOrderStatus = async function(req, res) {
    try {
        const requestBody = req.body
        const queryParams = req.query
        const userIdFromParams = req.params.userId

        // query params must be empty
        if (Validator.isValidInputBody(queryParams)) {
            return res
                .status(404)
                .send({ status: false, message: " page not found" });
        }


        if (!Validator.isValidInputBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Order data is required " })
        }

        const { orderId, status } = requestBody

        if (Object.keys(requestBody).length > 2) {
            return res.status(400).send({ status: false, message: "invalid entries" })
        }

        if (!Validator.isValidInputValue(orderId)) {
            return res.status(400).send({ status: false, message: "orderId is required " })
        }

        if (!Validator.isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, message: "invalid orderId " })
        }

        const orderDetailsByOrderId = await OrderModel.findOne({ _id: orderId, isDeleted: false, deletedAt: null })

        if (!orderDetailsByOrderId) {
            return res.status(400).send({ status: false, message: `no order found by ${orderId} ` })
        }

        if (orderDetailsByOrderId.userId.toString() !== userIdFromParams) {
            return res.status(403).send({ status: false, message: "unauthorize access: order is not of this user" })
        }

        if (!["pending", "completed", "cancelled"].includes(status)) {
            return res.status(400).send({ status: false, message: "status should be from [pending, completed, cancelled]" })
        }

        if (orderDetailsByOrderId.status === "completed") {
            return res.status(400).send({ status: false, message: "Order completed, now its status can not be updated" })
        }

        if (status === "cancelled" && orderDetailsByOrderId.cancellable === false) {
            return res.status(400).send({ status: false, message: "This order can not be cancelled" })
        }

        const updateStatus = await OrderModel.findOneAndUpdate({ _id: orderId }, { $set: { status: status } }, { new: true })

        res.status(200).send({ status: true, message: "order status updated", data: updateStatus })

    } catch (error) {
        res.status(500).send({ error: error.message })
    }
}


//****************************************EXPORTING HANDLERS************************************************ */
module.exports = {
    createOrder,
    updateOrderStatus

}