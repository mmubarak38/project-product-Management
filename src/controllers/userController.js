const userModel = require('../models/userModel')
const validator = require('../utils/validator')
const config = require('../utils/awsConfig')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const saltRounds = 10
const secretKey = 'group3-Project5-Products_management'


const userCreation = async(req, res) => {
    try {
        let files = req.files;
        let requestBody = req.body;
        let {
            fname,
            lname,
            email,
            profileImage,
            phone,
            password,
            address
        } = requestBody

        if (!validator.isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "please provide valid request body" })
        }
        if (!validator.isValid(fname)) {
            return res.status(400).send({ status: false, message: "fname is required" })
        }
        if (!validator.isValid(lname)) {
            return res.status(400).send({ status: false, message: "lname is required" })
        }
        if (!validator.isValid(email)) {
            return res.status(400).send({ status: false, message: "email is required" })
        }
        const isEmailAleadyUsed = await userModel.findOne({ email })
        if (isEmailAleadyUsed) {
            return res.status(400).send({
                status: false,
                message: `${email} is alraedy in use. Please try another email Id.`
            })
        }

        //validating email using RegEx.
        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))
            return res.status(400).send({ status: false, message: "Invalid Email id." })

        if (!validator.isValidRequestBody(files)) {
            return res.status(400).send({ status: false, message: "Profile Image is required" })
        }
        if (!validator.isValid(phone)) {
            return res.status(400).send({ status: false, message: "phone number is required" })
        }
        const isPhoneAleadyUsed = await userModel.findOne({ phone })
        if (isPhoneAleadyUsed) {
            return res.status(400).send({
                status: false,
                message: `${phone} is already in use, Please try a new phone number.`
            })
        }

        //validating phone number of 10 digits only.
        if (!(/^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/.test(phone))) return res.status(400).send({ status: false, message: "Phone number must be a valid Indian number." })

        if (!validator.isValid(password)) {
            return res.status(400).send({ status: false, message: "password is required" })
        }
        if (password.length < 8 || password.length > 15) {
            return res.status(400).send({ status: false, message: "Password must be of 8-15 letters." })
        }
        if (!validator.isValid(address)) {
            return res.status(400).send({ status: false, message: "Address is required" })
        }
        //shipping address validation
        if (address.shipping.street) {
            if (!validator.isValidRequestBody(address.shipping.street)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address's Street Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: " Invalid request parameters. Shipping address's street cannot be empty" })
        }

        if (address.shipping.city) {
            if (!validator.isValidRequestBody(address.shipping.city)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address city Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid request parameters. Shipping address's city cannot be empty" })
        }
        if (address.shipping.pincode) {
            if (!validator.isValidRequestBody(address.shipping.pincode)) {
                return res.status(400).send({
                    status: false,
                    message: "Shipping address's pincode Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid request parameters. Shipping address's pincode cannot be empty" })
        }
        // Billing Adress validation
        if (address.billing.street) {
            if (!validator.isValidRequestBody(address.billing.street)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address's Street Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: " Invalid request parameters. Billing address's street cannot be empty" })
        }
        if (address.billing.city) {
            if (!validator.isValidRequestBody(address.billing.city)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address's city Required"
                })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid request parameters. Billing address's city cannot be empty" })
        }
        if (address.billing.pincode) {
            if (!validator.isValidRequestBody(address.billing.pincode)) {
                return res.status(400).send({
                    status: false,
                    message: "Billing address's pincode Required "
                })
            }
        } else {
            return res.status(400).send({ status: false, message: "Invalid request parameters. Billing address's pincode cannot be empty" })
        }
        profileImage = await config.uploadFile(files[0]);
        const encryptedPassword = await bcrypt.hash(password, saltRounds)
        userData = {
            fname,
            lname,
            email,
            profileImage,
            phone,
            password: encryptedPassword,
            address
        }
        const saveUserData = await userModel.create(userData);
        return res
            .status(201)
            .send({
                status: true,
                message: "user created successfully.",
                data: saveUserData
            });
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is : " + err
        })
    }
}


const userLogin = async function(req, res) {
    try {
        const requestBody = req.body;

        // Extract params
        const { email, password } = requestBody;

        // Validation starts
        if (!validator.isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide login details' })
        }
        if (!validator.isValid(requestBody.email.trim())) {
            return res.status(400).send({ status: false, message: 'Email Id is required' })
        }

        if (!validator.isValid(requestBody.password)) {
            return res.status(400).send({ status: false, message: 'Password is required' })
        }
        // Validation ends

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(401).send({ status: false, message: `Invalid login credentials` });
        }
        let hashedPassword = user.password
        const encryptedPassword = await bcrypt.compare(password, hashedPassword)
        if (!encryptedPassword) return res.status(401).send({ status: false, message: `Invalid login credentials` });

        const userId = user._id
        const token = await jwt.sign({
            userId: userId,
            iat: Math.floor(Date.now() / 1000), //time of issuing the token.
            exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 7 //setting token expiry time limit.
        }, 'secretKey')

        return res.status(200).send({
            status: true,
            message: `user login successfull `,
            data: {
                userId,
                token
            }
        });
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message });
    }
}

const getProfile = async(req, res) => {
    try {
        const userId = req.params.userId
        const userIdFromToken = req.userId
            //validation starts
        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId in params." })
        }
        //validation ends

        const findUserProfile = await userModel.findOne({ _id: userId })
        if (!findUserProfile) {
            return res.status(400).send({
                status: false,
                message: `User doesn't exists by ${userId}`
            })
        }
        //Checking the authorization of the user -> Whether user's Id matches with the book creater's Id or not.
        if (userIdFromToken != findUserProfile._id) {
            return res.status(403).send({
                status: false,
                message: "Unauthorized access."
            })
        }

        return res.status(200).send({ status: true, message: "Profile found successfully.", data: findUserProfile })
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is: " + err.message
        })
    }
}

const updateProfile = async(req, res) => {
    try {
        let files = req.files;
        const userId = req.params.userId
        const requestUpdateBody = req.body
        const userIdFromToken = req.userId

        const { fname, lname, email, phone, password, address } = requestUpdateBody
        //validation starts
        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId in params." })
        }

        if (validator.isValidRequestBody(files)) {
            if (!(files && files.length > 0)) {
                return res.status(400).send({ status: false, message: "Invalid request parameter, please provide profile image" })
            }
            var updateProfileImage = await config.uploadFile(files[0]);
        }
        if (requestUpdateBody) {
            if (!validator.isValidRequestBody(requestUpdateBody)) {
                return res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide user details to update.' })
            }
            //validation ends

            if (fname || lname || email || phone || password || address) {
                //validation for empty strings/values.
                if (!validator.validString(fname)) {
                    return res.status(400).send({ status: false, message: "fname is missing ! Please provide the fname details to update." })
                }
                if (!validator.validString(lname)) {
                    return res.status(400).send({ status: false, message: "lname is missing ! Please provide the lname details to update." })
                }
                if (!validator.validString(email)) {
                    return res.status(400).send({ status: false, message: "email is missing ! Please provide the email details to update." })
                }
                if (!validator.validString(phone)) {
                    return res.status(400).send({ status: false, message: "phone number is missing ! Please provide the phone number to update." })
                }
                if (!validator.validString(password)) {
                    return res.status(400).send({ status: false, message: "password is missing ! Please provide the password to update." })
                }
                //  console.log(address)

                // if (!validator.isValidRequestBody(address)) {
                //     return res.status(400).send({ status: false, message: "Address is missing ! Please provide the Address to update." })
                // }
                //shipping address validation
                if (address.shipping.street) {
                    if (!validator.validString(address.shipping.street)) {
                        return res.status(400).send({
                            status: false,
                            message: "Shipping address's Street Required"
                        })
                    }
                } //else {
                //     return res.status(400).send({ status: false, message: " Invalid request parameters. Shipping address's street cannot be empty" })
                // }

                if (address.shipping.city) {
                    if (!validator.validString(address.shipping.city)) {
                        return res.status(400).send({
                            status: false,
                            message: "Shipping address city Required"
                        })
                    }
                } //else {
                //     return res.status(400).send({ status: false, message: "Invalid request parameters. Shipping address's city cannot be empty" })
                // }
                if (address.shipping.pincode) {
                    if (!validator.validString(address.shipping.pincode)) {
                        return res.status(400).send({
                            status: false,
                            message: "Shipping address's pincode Required"
                        })
                    }
                } //else {
                //     return res.status(400).send({ status: false, message: "Invalid request parameters. Shipping address's pincode cannot be empty" })
                // }
                // Billing Adress validation
                if (address.billing.street) {
                    if (!validator.validString(address.billing.street)) {
                        return res.status(400).send({
                            status: false,
                            message: "Billing address's Street Required"
                        })
                    }
                } //else {
                //     return res.status(400).send({ status: false, message: " Invalid request parameters. Billing address's street cannot be empty" })
                // }
                if (address.billing.city) {
                    if (!validator.validString(address.billing.city)) {
                        return res.status(400).send({
                            status: false,
                            message: "Billing address's city Required"
                        })
                    }
                } //else {
                //     return res.status(400).send({ status: false, message: "Invalid request parameters. Billing address's city cannot be empty" })
                // }
                if (address.billing.pincode) {
                    if (!validator.validString(address.billing.pincode)) {
                        return res.status(400).send({
                            status: false,
                            message: "Billing address's pincode Required"
                        })
                    }
                } //else {
                //     return res.status(400).send({ status: false, message: "Invalid request parameters. Billing address's pincode cannot be empty" })
                // }
            }
            const findUserProfile = await userModel.findOne({ _id: userId })
            if (!findUserProfile) {
                return res.status(400).send({
                    status: false,
                    message: `User profile doesn't exists by ${userId}`
                })
            }

            //Authorizing user -> only the owner of the profile can update the details.
            if (findUserProfile._id != userIdFromToken) {
                return res.status(403).send({
                    status: false,
                    message: "Unauthorized access."
                })
            }

            //finding email and phone in DB to maintain their uniqueness.
            const findEmail = await userModel.findOne({ email: email })
            if (findEmail) {
                return res.status(400).send({
                    status: false,
                    message: `${email} already exists. Cannot update!`
                })
            }
            const findPhone = await userModel.findOne({ phone: phone })
            if (findPhone) {
                return res.status(400).send({
                    status: false,
                    message: `${phone} already exists. Cannot update!`
                })
            }

            if (requestUpdateBody.password) {
                var encryptedPassword = await bcrypt.hash(requestUpdateBody.password, saltRounds)
            }
        }
        const changeProfileDetails = await userModel.findOneAndUpdate({ _id: userId }, { fname: fname, lname: lname, email: email, phone: phone, password: encryptedPassword, profileImage: updateProfileImage, address: address }, { new: true })

        return res.status(200).send({ status: true, message: "Successfully updated profile details.", data: changeProfileDetails })

    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is: " + err.message
        })
    }
}
module.exports = {
    userCreation,
    userLogin,
    getProfile,
    updateProfile
}