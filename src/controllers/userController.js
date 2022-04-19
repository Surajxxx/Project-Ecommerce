const UserModel = require("../models/userModel");
const utility = require("../utilities/aws");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Validator = require("../utilities/validator");
const axios = require("axios");

//*********************************************USER REGISTRATION******************************************** */

const userRegistration = async function(req, res) {
    try {
        const requestBody = {...req.body };
        const queryParams = req.query;
        const image = req.files;

        //no data is required from query params
        if (Validator.isValidInputBody(queryParams)) {
            return res.status(404).send({ status: false, message: "Page not found" });
        }

        if (!Validator.isValidInputBody(requestBody)) {
            return res.status(400).send({
                status: false,
                message: "User data is required for registration",
            });
        }

        //using destructuring
        let { fname, lname, email, phone, password, address } = requestBody;

        // each key validation starts here
        if (!Validator.isValidInputValue(fname)) {
            return res.status(400).send({
                status: false,
                message: "First name is required like : Suraj.",
            });
        }

        if (!Validator.isValidOnlyCharacters(fname)) {
            return res.status(400).send({
                status: false,
                message: "Only alphabets allowed in first name",
            });
        }

        if (!Validator.isValidInputValue(lname)) {
            return res
                .status(400)
                .send({ status: false, message: "last name is required like: DOE" });
        }

        if (!Validator.isValidOnlyCharacters(lname)) {
            return res.status(400).send({
                status: false,
                message: "Only alphabets allowed in last name",
            });
        }

        if (!Validator.isValidInputValue(email)) {
            return res
                .status(400)
                .send({ status: false, message: "email address is required" });
        }

        if (!Validator.isValidEmail(email)) {
            return res.status(400).send({
                status: false,
                message: "Please enter a valid email address like : xyz@gmail.com",
            });
        }

        const isUniqueEmail = await UserModel.findOne({ email });

        if (isUniqueEmail) {
            return res
                .status(400)
                .send({ status: false, message: "Email address already exist" });
        }

        if (!Validator.isValidInputValue(phone)) {
            return res
                .status(400)
                .send({ status: false, message: "Phone number is required" });
        }

        if (!Validator.isValidPhone(phone)) {
            return res.status(400).send({
                status: false,
                message: "Please enter a valid phone number like : 9638527410",
            });
        }

        const isUniquePhone = await UserModel.findOne({ phone });

        if (isUniquePhone) {
            return res
                .status(400)
                .send({ status: false, message: "phone number already exist" });
        }

        if (!Validator.isValidInputValue(password)) {
            return res
                .status(400)
                .send({ status: false, message: "password is required" });
        }

        if (!Validator.isValidPassword(password)) {
            return res.status(400).send({
                status: false,
                message: "Password should be of 8 to 15 characters and  must have 1 letter and 1 number",
            });
        }

        if (!Validator.isValidInputValue(address)) {
            return res
                .status(400)
                .send({ status: false, message: "address is required" });
        }

        address = JSON.parse(address);

        if (!Validator.isValidAddress(address)) {
            return res
                .status(400)
                .send({ status: false, message: "Invalid address" });
        }

        const { shipping, billing } = address;

        if (!Validator.isValidAddress(shipping)) {
            return res
                .status(400)
                .send({ status: false, message: "Shipping address is required" });
        } else {
            let { street, city, pincode } = shipping;

            if (!Validator.isValidInputValue(street)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address: street name is required ",
                });
            }

            if (!Validator.isValidInputValue(city)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address: city name is required ",
                });
            }

            if (!Validator.isValidOnlyCharacters(city)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address: only alphabets allowed in city",
                });
            }

            if (!Validator.isValidPincode(pincode)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address: pin code should be valid like: 335659 ",
                });
            }

            //Matching pincode and city by axios call

            const options = {
                method: "GET",
                url: `https://api.postalpincode.in/pincode/${pincode}`,
            };

            const pincodeDetail = await axios(options);

            if (pincodeDetail.data[0].PostOffice === null) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address: pin code should be valid like: 335659 ",
                });
            }
            const cityNameByPinCode = pincodeDetail.data[0].PostOffice[0].District;

            if (cityNameByPinCode.toLowerCase() !== city.toLowerCase()) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address: pin code is not matching with city ",
                });
            }

            address.shipping.city = cityNameByPinCode;
        }

        if (!Validator.isValidAddress(billing)) {
            return res
                .status(400)
                .send({ status: false, message: "Billing address is required" });
        } else {
            let { street, city, pincode } = billing;

            if (!Validator.isValidInputValue(street)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address: street name is required ",
                });
            }

            if (!Validator.isValidInputValue(city)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address: city name is required ",
                });
            }

            if (!Validator.isValidOnlyCharacters(city)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address: Only alphabets allowed in city",
                });
            }

            if (!Validator.isValidPincode(pincode)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address: pin code should be valid like: 335659 ",
                });
            }

            //Matching pincode and city by axios call

            const options = {
                method: "GET",
                url: `https://api.postalpincode.in/pincode/${pincode}`,
            };

            const pincodeDetail = await axios(options);

            if (pincodeDetail.data[0].PostOffice === null) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address: pin code should be valid like: 335659 ",
                });
            }
            const cityNameByPinCode = pincodeDetail.data[0].PostOffice[0].District;

            if (cityNameByPinCode.toLowerCase() !== city.toLowerCase()) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address: pin code is not matching with city ",
                });
            }

            address.billing.city = cityNameByPinCode;
        }

        if (!image || image.length == 0) {
            return res
                .status(400)
                .send({ status: false, message: "no profile image found" });
        }

        if (!Validator.isValidImageType(image[0].mimetype)) {
            return res
                .status(400)
                .send({ status: false, message: "Only images can be uploaded (jpeg/jpg/png)" });
        }

        const uploadedProfilePictureUrl = await utility.uploadFile(image[0]);

        // password encryption
        const salt = await bcrypt.genSalt(10);
        const encryptedPassword = await bcrypt.hash(password, salt);

        const userData = {
            fname: fname.trim(),
            lname: lname.trim(),
            email: email.trim(),
            profileImage: uploadedProfilePictureUrl,
            phone: phone.trim(),
            password: encryptedPassword,
            address: address,
        };

        const newUser = await UserModel.create(userData);

        res.status(201).send({
            status: true,
            message: "User successfully registered",
            data: newUser,
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//**********************************************USER LOGIN*************************************************** */

const userLogin = async function(req, res) {
    try {
        const queryParams = req.query;
        const requestBody = req.body;

        //no data is required from query params
        if (Validator.isValidInputBody(queryParams)) {
            return res.status(404).send({ status: false, message: "Page not found" });
        }

        if (!Validator.isValidInputBody(requestBody)) {
            return res.status(400).send({
                status: false,
                message: "User data is required for login",
            });
        }

        const userName = requestBody.email;
        const password = requestBody.password;

        if (!Validator.isValidInputValue(userName)) {
            return res
                .status(400)
                .send({ status: false, message: "email is required" });
        }

        if (!Validator.isValidEmail(userName)) {
            return res
                .status(400)
                .send({ status: false, message: "Enter a valid email " });
        }

        if (!Validator.isValidInputValue(password)) {
            return res
                .status(400)
                .send({ status: false, message: "password is required" });
        }

        if (!Validator.isValidPassword(password)) {
            return res.status(400).send({
                status: false,
                message: "Enter password of 8 to 15 characters and must contain one letter and digit ",
            });
        }
        // finding user by given email
        const userDetails = await UserModel.findOne({ email: userName });

        if (!userDetails) {
            return res
                .status(404)
                .send({ status: false, message: "No user found by email" });
        }
        // comparing hashed password and login password
        const isPasswordMatching = await bcrypt.compare(
            password,
            userDetails.password
        );

        if (!isPasswordMatching) {
            return res
                .status(400)
                .send({ status: false, message: "incorrect password" });
        }

        // creating JWT token
        const payload = { userId: userDetails._id };
        const expiry = { expiresIn: "1800s" };
        const secretKey = "123451214654132466ASDFGwnweruhkwerbjhiHJKL!@#$%^&";

        const token = jwt.sign(payload, secretKey, expiry);

        // setting bearer token in response header
        res.header("Authorization", "Bearer " + token);

        const data = { userId: userDetails._id, token: token };

        res
            .status(200)
            .send({ status: true, message: "login successful", data: data });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//********************************************GET USER PROFILE DETAILS***************************************** */

const profileDetails = async function(req, res) {
    try {
        const queryParams = req.query;
        const requestBody = req.body;
        const userId = req.params.userId;

        //Authorization

        const decodedToken = req.decodedToken;

        if (!Validator.isValidObjectId(userId)) {
            return res
                .status(400)
                .send({ status: false, message: " enter a valid userId" });
        }

        const userDetailByUserId = await UserModel.findById(userId);

        if (!userDetailByUserId) {
            return res
                .status(404)
                .send({ status: false, message: " user not found" });
        }

        if (userId !== decodedToken.userId) {
            return res
                .status(403)
                .send({ status: false, message: "unauthorized access" });
        }

        //no data is required from query params
        if (Validator.isValidInputBody(queryParams)) {
            return res.status(404).send({ status: false, message: "Page not found" });
        }

        if (Validator.isValidInputBody(requestBody)) {
            return res.status(400).send({
                status: false,
                message: "User data is not required",
            });
        }

        res.status(200).send({
            status: true,
            message: "user profile details",
            data: userDetailByUserId,
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//***********************************************UPDATE USER PROFILE DETAILS*****************************************/

const userProfileUpdate = async function(req, res) {
    try {
        const queryParams = req.query;

        // creating shallow copy of request body as [object: null-prototype]
        const requestBody = {...req.body };
        const userId = req.params.userId;
        const image = req.files;

        //Authorization

        const decodedToken = req.decodedToken;

        if (!Validator.isValidObjectId(userId)) {
            return res
                .status(400)
                .send({ status: false, message: " enter a valid userId" });
        }

        const userDetailByUserId = await UserModel.findById(userId);

        if (!userDetailByUserId) {
            return res
                .status(404)
                .send({ status: false, message: " user not found" });
        }

        if (userId !== decodedToken.userId) {
            return res
                .status(403)
                .send({ status: false, message: "unauthorized access" });
        }

        //no data is required from query params
        if (Validator.isValidInputBody(queryParams)) {
            return res.status(404).send({ status: false, message: "Page not found" });
        }

        if (!Validator.isValidInputBody(requestBody) &&
            typeof image === undefined
        ) {
            return res
                .status(400)
                .send({ status: false, message: "Update related data required" });
        }

        // created an empty object. now will add properties that needs to be updated
        const updates = {};

        if (typeof image !== undefined) {
            if (image && image.length > 0) {

                if (!Validator.isValidImageType(image[0].mimetype)) {
                    return res
                        .status(400)
                        .send({ status: false, message: "Only images can be uploaded (jpeg/jpg/png)" });
                }
                const updatedProfileImageUrl = await utility.uploadFile(image[0]);
                updates["profileImage"] = updatedProfileImageUrl;
            }
        }

        // using destructuring then validating keys which are present in request body then adding them to updates object
        let { fname, lname, email, phone, address, password } = requestBody;

        if (requestBody.hasOwnProperty("fname")) {
            if (!Validator.isValidInputValue(fname)) {
                return res.status(400).send({
                    status: false,
                    message: "first name should be in valid format",
                });
            }

            if (!Validator.isValidOnlyCharacters(fname)) {
                return res.status(400).send({
                    status: false,
                    message: "Only alphabets allowed in first name",
                });
            }
            updates["fname"] = fname.trim();
        }

        if (requestBody.hasOwnProperty("lname")) {
            if (!Validator.isValidInputValue(lname)) {
                return res.status(400).send({
                    status: false,
                    message: "Last name should be in valid format",
                });
            }

            if (!Validator.isValidOnlyCharacters(lname)) {
                return res.status(400).send({
                    status: false,
                    message: "Only alphabets allowed in last name",
                });
            }
            updates["lname"] = lname.trim();
        }

        if (requestBody.hasOwnProperty("email")) {
            if (!Validator.isValidInputValue(email)) {
                return res
                    .status(400)
                    .send({ status: false, message: "email should be in valid format" });
            }

            if (!Validator.isValidEmail(email)) {
                return res
                    .status(400)
                    .send({ status: false, message: "invalid email" });
            }

            const isUniqueEmail = await UserModel.findOne({ email });

            if (isUniqueEmail) {
                return res
                    .status(400)
                    .send({ status: false, message: "Email address already exist" });
            }
            updates["email"] = email.trim();
        }

        if (requestBody.hasOwnProperty("phone")) {
            if (!Validator.isValidInputValue(phone)) {
                return res.status(400).send({
                    status: false,
                    message: "phone number should be in valid format",
                });
            }

            if (!Validator.isValidPhone(phone)) {
                return res
                    .status(400)
                    .send({ status: false, message: "invalid phone number" });
            }

            const isUniquePhone = await UserModel.findOne({ phone });

            if (isUniquePhone) {
                return res
                    .status(400)
                    .send({ status: false, message: "phone number already exist" });
            }
            updates["phone"] = phone.trim();
        }

        if (requestBody.hasOwnProperty("password")) {
            if (!Validator.isValidInputValue(password)) {
                return res.status(400).send({
                    status: false,
                    message: "password should be in valid format",
                });
            }

            if (!Validator.isValidPassword(password)) {
                return res.status(400).send({
                    status: false,
                    message: "Password should be of 8 to 15 characters and  must have 1 letter and 1 number",
                });
            }

            const isOldPassword = await bcrypt.compare(
                password,
                userDetailByUserId.password
            );

            if (isOldPassword) {
                return res
                    .status(400)
                    .send({ status: false, message: "can not update same password" });
            }

            const salt = await bcrypt.genSalt(10);
            const encryptedPassword = await bcrypt.hash(password, salt);

            updates["password"] = encryptedPassword;
        }

        if (requestBody.hasOwnProperty("address")) {
            if (!Validator.isValidInputValue(address)) {
                return res.status(400).send({
                    status: false,
                    message: "Address should be in valid format ",
                });
            }
            address = JSON.parse(address);

            if (!Validator.isValidAddress(address)) {
                return res.status(400).send({
                    status: false,
                    message: "Address should be in valid format ",
                });
            }

            const { shipping, billing } = address;

            if (address.hasOwnProperty("shipping")) {
                if (!Validator.isValidAddress(shipping)) {
                    return res.status(400).send({
                        status: false,
                        message: "Shipping address should be in valid format ",
                    });
                }

                const { street, city, pincode } = shipping;

                if (shipping.hasOwnProperty("street")) {
                    if (!Validator.isValidInputValue(street)) {
                        return res.status(400).send({
                            status: false,
                            message: "shipping address: street name should be in valid format ",
                        });
                    }
                    updates["address.shipping.street"] = street.trim();
                }

                if (shipping.hasOwnProperty("city")) {
                    return res.status(400).send({
                        status: false,
                        message: "Shipping address: Please provide pin code only, city name will be updated by pincode. ",
                    });
                }

                if (shipping.hasOwnProperty("pincode")) {
                    if (!Validator.isValidPincode(pincode)) {
                        return res.status(400).send({
                            status: false,
                            message: "Shipping address: pin code should be valid like: 335659 ",
                        });
                    }

                    //Matching pincode and city by axios call

                    const options = {
                        method: "GET",
                        url: `https://api.postalpincode.in/pincode/${pincode}`,
                    };

                    const pincodeDetail = await axios(options);

                    if (pincodeDetail.data[0].PostOffice === null) {
                        return res.status(400).send({
                            status: false,
                            message: "Shipping address: pin code should be valid like: 335659 ",
                        });
                    }

                    const cityNameByPinCode =
                        pincodeDetail.data[0].PostOffice[0].District;

                    updates["address.shipping.pincode"] = pincode;
                    updates["address.shipping.city"] = cityNameByPinCode;
                }
            }

            if (address.hasOwnProperty("billing")) {
                if (!Validator.isValidAddress(billing)) {
                    return res.status(400).send({
                        status: false,
                        message: "billing address should be in valid format ",
                    });
                }

                const { street, city, pincode } = billing;

                if (billing.hasOwnProperty("street")) {
                    if (!Validator.isValidInputValue(street)) {
                        return res.status(400).send({
                            status: false,
                            message: "Billing address: street name should be in valid format ",
                        });
                    }
                    updates["address.billing.street"] = street.trim();
                }

                if (billing.hasOwnProperty("city")) {
                    return res.status(400).send({
                        status: false,
                        message: "Billing address: Please provide pin code only, city name will be updated by pincode. ",
                    });
                }

                if (billing.hasOwnProperty("pincode")) {
                    if (!Validator.isValidPincode(pincode)) {
                        return res.status(400).send({
                            status: false,
                            message: "Billing address: pin code should be valid like: 335659 ",
                        });
                    }

                    //Matching pincode and city by axios call

                    const options = {
                        method: "GET",
                        url: `https://api.postalpincode.in/pincode/${pincode}`,
                    };

                    const pincodeDetail = await axios(options);

                    if (pincodeDetail.data[0].PostOffice === null) {
                        return res.status(400).send({
                            status: false,
                            message: "Billing address: pin code should be valid like: 335659 ",
                        });
                    }

                    const cityNameByPinCode =
                        pincodeDetail.data[0].PostOffice[0].District;

                    updates["address.billing.pincode"] = pincode;
                    updates["address.billing.city"] = cityNameByPinCode;
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.json("nothing to update");
        }

        const updatedProfile = await UserModel.findByIdAndUpdate({ _id: userId }, { $set: updates }, { new: true });

        res.status(200).send({
            status: true,
            message: "user profile updated",
            data: updatedProfile,
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

//*******************************************EXPORTING ALL HANDLERS OF USER************************************** */

module.exports = {
    userRegistration,
    userLogin,
    profileDetails,
    userProfileUpdate,
};