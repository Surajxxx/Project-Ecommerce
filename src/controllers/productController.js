const ProductModel = require("../models/productModel");
const AWS = require("../utilities/aws");
const Validator = require("../utilities/validator");
const getSymbolFromCurrency = require("currency-symbol-map");
const { Convert } = require("easy-currencies");

//********************************REGISTERING NEW PRODUCT****************************************** */

const registerProduct = async function(req, res) {
    try {
        const requestBody = {...req.body };
        const queryParams = req.query;
        const image = req.files;

        // data not required from query params
        if (Validator.isValidInputBody(queryParams)) {
            return res.status(404).send({ status: false, message: "Page not found" });
        }
        // request body must not be empty
        if (!Validator.isValidInputBody(requestBody)) {
            return res.status(400).send({
                status: false,
                message: "Product data is required for registration",
            });
        }

        let {
            title,
            description,
            price,
            currencyId,
            currencyFormat,
            isFreeShipping,
            style,
            availableSizes,
            installments,
        } = requestBody;

        // validation starts here
        if (!Validator.isValidInputValue(title)) {
            return res
                .status(400)
                .send({ status: false, message: "Product title is required" });
        }

        const notUniqueTitle = await ProductModel.findOne({
            title: title,
        });

        if (notUniqueTitle) {
            return res
                .status(400)
                .send({ status: false, message: "Product title already exist" });
        }

        if (!Validator.isValidInputValue(description)) {
            return res
                .status(400)
                .send({ status: false, message: "Product description is required" });
        }

        if (!Validator.isValidNumber(price) || !Validator.isValidPrice(price)) {
            return res
                .status(400)
                .send({ status: false, message: "Enter a valid product price" });
        }

        if (!Validator.isValidInputValue(currencyId) ||
            getSymbolFromCurrency(currencyId) === undefined
        ) {
            return res
                .status(400)
                .send({ status: false, message: "Enter a valid currencyId" });
        }

        //convert price to indian rupee
        if (currencyId !== "INR") {
            price = await Convert(Number(price)).from(currencyId).to("INR");
            price = Math.ceil(price)
            currencyId = "INR";
        }

        if (isFreeShipping) {
            if (["true", "false"].includes(isFreeShipping) === false) {
                return res
                    .status(400)
                    .send({ status: false, message: "isFreeShipping should be boolean" });
            }
        }

        if (style) {
            if (!Validator.isValidInputValue(style)) {
                return res.status(400).send({
                    status: false,
                    message: "product style should be in valid format",
                });
            }
        }

        if (!Validator.isValidInputValue(availableSizes)) {
            return res.status(400).send({
                status: false,
                message: "product available sizes are required ",
            });
        }

        // parsing string 
        availableSizes = JSON.parse(availableSizes);


        // available sizes should be an array
        if (!Array.isArray(availableSizes) || availableSizes.length === 0) {
            return res
                .status(400)
                .send({
                    status: false,
                    message: "enter available sizes in valid format : [X, M, L]",
                });
        }
        //validating each element of array
        for (let i = 0; i < availableSizes.length; i++) {
            const element = availableSizes[i];

            if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(element)) {
                return res.status(400).send({
                    status: false,
                    message: `available sizes should be from:  [S, XS, M, X, L, XXL, XL]`,
                });
            }
        }

        if (!Validator.isValidNumber(installments)) {
            return res.status(400).send({
                status: false,
                message: "Product installments is required and should be greater than or equal to zero",
            });
        }

        if (!image || image.length === 0) {
            return res
                .status(400)
                .send({ status: false, message: "product image is required" });
        }
        // validating image type
        if (!Validator.isValidImageType(image[0].mimetype)) {
            return res
                .status(400)
                .send({
                    status: false,
                    message: "Only images can be uploaded (jpeg/jpg/png)",
                });
        }
        // uploading image to AWS server and creating url
        const productImageUrl = await AWS.uploadFile(image[0]);

        const productData = {
            title: title.trim(),
            description: description.trim(),
            price: Number(price),
            currencyId: currencyId,
            currencyFormat: getSymbolFromCurrency(currencyId),
            isFreeShipping: isFreeShipping ? isFreeShipping : false,
            productImage: productImageUrl,
            style: style,
            availableSizes: availableSizes,
            installments: installments,
            deletedAt: null,
            isDeleted: false,
        };

        const newProduct = await ProductModel.create(productData);

        res.status(201).send({
            status: true,
            message: "new product added successfully",
            data: newProduct,
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//*****************************************GET ALL & FILTERED PRODUCTS LIST************************************* */

const filterProducts = async function(req, res) {
    try {
        const queryParams = req.query;
        const filterConditions = { isDeleted: false, deletedAt: null };
        const sorting = {};

        // destructuring filters from query params
        let { size, name, priceSort, priceGreaterThan, priceLessThan } =
        queryParams;

        // if query params has any field
        if (Validator.isValidInputBody(queryParams)) {

            // If query params has key name "size" then validating it. Here size filter is related to availableSizes
            if (queryParams.hasOwnProperty("size")) {
                //parsing string
                size = JSON.parse(size);

                // size should be an array
                if (Array.isArray(size) && size.length > 0) {
                    //validating each element of array
                    for (let i = 0; i < size.length; i++) {
                        const element = size[i];

                        if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(element)) {
                            return res.status(400).send({
                                status: false,
                                message: `available sizes should be from:  S, XS, M, X, L, XXL, XL`,
                            });
                        }
                    }

                    filterConditions["availableSizes"] = { $in: size };
                } else {
                    return res.status(400).send({
                        status: false,
                        message: "size should be in array format: [X, M,L]",
                    });
                }
            }
            // If query params has key name "priceGreaterThan" then validating it. here "priceGreaterThan" filter is related to price
            if (queryParams.hasOwnProperty("priceGreaterThan")) {
                if (!Validator.isValidPrice(priceGreaterThan)) {
                    return res
                        .status(400)
                        .send({ status: false, message: "Enter a valid price" });
                }

                filterConditions["price"] = { $gt: Number(priceGreaterThan) };
            }

            if (queryParams.hasOwnProperty("priceLessThan")) {
                if (!Validator.isValidPrice(priceLessThan)) {
                    return res
                        .status(400)
                        .send({ status: false, message: "Enter a valid price" });
                }
                if (queryParams.hasOwnProperty("priceGreaterThan")) {
                    filterConditions["price"] = {
                        $gt: Number(priceGreaterThan),
                        $lt: Number(priceLessThan),
                    };
                } else {
                    filterConditions["price"] = { $lt: Number(priceLessThan) };
                }
            }

            if (queryParams.hasOwnProperty("priceSort")) {
                if (!["-1", "1"].includes(priceSort)) {
                    return res.status(400).send({
                        status: false,
                        message: "price sort should be a number:  -1 or 1",
                    });
                }
                sorting["price"] = Number(priceSort);
            }
            // If query params has key "name" then validating it. here "name" filter is related to title
            if (queryParams.hasOwnProperty("name")) {
                if (!Validator.isValidInputValue(name)) {
                    return res.status(400).send({
                        status: false,
                        message: "product name should be in valid format",
                    });
                }
                // creating regex for name
                const regexForName = new RegExp(name, "i");

                filterConditions["title"] = { $regex: regexForName };
            }

            const filteredProducts = await ProductModel.find(filterConditions).sort(
                sorting
            );

            if (filteredProducts.length == 0) {
                return res
                    .status(404)
                    .send({ status: false, message: "no product found" });
            }

            return res.status(200).send({
                status: true,
                message: "Filtered product list is here",
                productCount: filteredProducts.length,
                data: filteredProducts,
            });
        } else {
            const allProducts = await ProductModel.find(filterConditions);

            if (allProducts.length == 0) {
                return res
                    .status(404)
                    .send({ status: false, message: "no products found" });
            }

            res.status(200).send({
                status: true,
                message: " Product list is here",
                productCount: allProducts.length,
                data: allProducts,
            });
        }
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//*************************************GET PRODUCT DETAILS*********************************************** */

const getProduct = async function(req, res) {
    try {
        const productId = req.params.productId;
        const queryParams = req.query;

        if (Validator.isValidInputBody(queryParams)) {
            return res.status(404).send({ status: false, message: "Page not found" });
        }

        if (!Validator.isValidObjectId(productId)) {
            return res
                .status(400)
                .send({ status: false, message: "Invalid product id" });
        }

        const productById = await ProductModel.findOne({
            _id: productId,
            isDeleted: false,
            deletedAt: null,
        });

        if (!productById) {
            return res
                .status(404)
                .send({
                    status: false,
                    message: "No product found by this Product id",
                });
        }

        res
            .status(200)
            .send({ status: true, message: "success", data: productById });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//*************************************UPDATE A PRODUCT DETAILS********************************************** */

const updateProductDetails = async function(req, res) {
    try {
        const queryParams = req.query;
        const requestBody = {...req.body };
        const productId = req.params.productId;
        const image = req.files;
        // no data is required from query params
        if (Validator.isValidInputBody(queryParams)) {
            return res.status(404).send({ status: false, message: "Page not found" });
        }
        // checking product exist with product ID
        const productByProductId = await ProductModel.findOne({
            _id: productId,
            isDeleted: false,
            deletedAt: null,
        });

        if (!productByProductId) {
            return res
                .status(404)
                .send({ status: false, message: "No product found by product id" });
        }

        if (!Validator.isValidInputBody(requestBody) &&
            typeof image === undefined
        ) {
            return res
                .status(400)
                .send({
                    status: false,
                    message: "Update related product data required",
                });
        }

        let {
            title,
            description,
            price,
            isFreeShipping,
            style,
            availableSizes,
            installments,
        } = requestBody;
        // creating an empty object 
        const updates = { $set: {} };


        // if request body has key name "title" then after validating its value, same is added to updates object
        if (requestBody.hasOwnProperty("title")) {
            if (!Validator.isValidInputValue(title)) {
                return res
                    .status(400)
                    .send({ status: false, message: "Invalid title" });
            }

            const notUniqueTitle = await ProductModel.findOne({
                title: title,
            });

            if (notUniqueTitle) {
                return res
                    .status(400)
                    .send({ status: false, message: "Product title already exist" });
            }

            updates["$set"]["title"] = title.trim();
        }
        // if request body has key name "description" then after validating its value, same is added to updates object
        if (requestBody.hasOwnProperty("description")) {
            if (!Validator.isValidInputValue(description)) {
                return res
                    .status(400)
                    .send({ status: false, message: "Invalid description" });
            }
            updates["$set"]["description"] = description.trim();
        }
        // if request body has key name "price" then after validating its value, same is added to updates object
        if (requestBody.hasOwnProperty("price")) {
            if (!Validator.isValidPrice(price)) {
                return res
                    .status(400)
                    .send({ status: false, message: "Invalid price" });
            }
            updates["$set"]["price"] = price;
        }
        // if request body has key name "isFreeShipping" then after validating its value, same is added to updates object
        if (requestBody.hasOwnProperty("isFreeShipping")) {
            if (["true", "false"].includes(isFreeShipping) === false) {
                return res
                    .status(400)
                    .send({ status: false, message: "isFreeShipping should be boolean" });
            }
            updates["$set"]["isFreeShipping"] = isFreeShipping;
        }
        // if request body has key name "style" then after validating its value, same is added to updates object
        if (requestBody.hasOwnProperty("style")) {
            if (!Validator.isValidInputValue(style)) {
                return res
                    .status(400)
                    .send({ status: false, message: "Invalid style" });
            }
            updates["$set"]["style"] = style;
        }
        // if request body has key name "availableSizes" then after validating its value, same is added to updates object
        if (requestBody.hasOwnProperty("availableSizes")) {
            if (!Validator.isValidInputValue(availableSizes)) {
                return res
                    .status(400)
                    .send({ status: false, message: "Invalid format of availableSizes" });
            }

            availableSizes = JSON.parse(availableSizes);

            if (Array.isArray(availableSizes) && availableSizes.length > 0) {
                for (let i = 0; i < availableSizes.length; i++) {
                    const element = availableSizes[i];

                    if (!["S", "XS", "M", "X", "L", "XXL", "XL"].includes(element)) {
                        return res.status(400).send({
                            status: false,
                            message: `available sizes should be from:  S, XS, M, X, L, XXL, XL`,
                        });
                    }
                }

                updates["$set"]["availableSizes"] = availableSizes;
            } else {
                return res
                    .status(400)
                    .send({ status: false, message: "Invalid available Sizes" });
            }
        }
        // if request body has key name "installments" then after validating its value, same is added to updates object
        if (requestBody.hasOwnProperty("installments")) {
            if (!Validator.isValidNumber(installments)) {
                return res
                    .status(400)
                    .send({ status: false, message: "invalid installments" });
            }
            updates["$set"]["installments"] = Number(installments);
        }
        // if request body has key name "image" then after validating its value, same is added to updates object
        if (typeof image !== undefined) {
            if (image && image.length > 0) {
                if (!Validator.isValidImageType(image[0].mimetype)) {
                    return res
                        .status(400)
                        .send({
                            status: false,
                            message: "Only images can be uploaded (jpeg/jpg/png)",
                        });
                }

                const productImageUrl = await AWS.uploadFile(image[0]);
                updates["$set"]["productImage"] = productImageUrl;
            }
        }

        if (Object.keys(updates["$set"]).length === 0) {
            return res.json("nothing is updated");
        }
        // updating product data of given ID by passing updates object
        const updatedProduct = await ProductModel.findOneAndUpdate({ _id: productId },
            updates, { new: true }
        );

        res.status(200).send({
            status: true,
            message: "Product data updated successfully",
            data: updatedProduct,
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//*************************************DELETE PRODUCT************************************************** */

const deleteProduct = async function(req, res) {
    try {
        const productId = req.params.productId;
        const queryParams = req.query;
        // no data is required from query params
        if (Validator.isValidInputBody(queryParams)) {
            return res.status(404).send({ status: false, message: "Page not found" });
        }
        // validating product id
        if (!Validator.isValidObjectId(productId)) {
            return res
                .status(400)
                .send({ status: false, message: "Invalid product id" });
        }
        // checking product available by given product ID 
        const productById = await ProductModel.findOne({
            _id: productId,
            isDeleted: false,
            deletedAt: null,
        });

        if (!productById) {
            return res.status(404).send({
                status: false,
                message: "No product found by this product id",
            });
        }
        // updating product isDeleted field
        const markDirty = await ProductModel.findOneAndUpdate({ _id: productId }, { $set: { isDeleted: true, deletedAt: Date.now() } });

        res
            .status(200)
            .send({ status: true, message: "Product successfully deleted" });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//**********************************EXPORTING PRODUCT RELATED HANDLER FUNCTION******************************* */
module.exports = {
    registerProduct,
    filterProducts,
    getProduct,
    updateProductDetails,
    deleteProduct,
};