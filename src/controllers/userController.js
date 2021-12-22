const userModel = require('../models/userModel')
const validator = require('../utils/validator')
const config = require('../utils/awsConfig')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const saltRounds = 10


const userCreation = async(req, res) => {
    try {
        let files = req.files;
        if (files) {
            if (files && files.length > 0) {
                let uploadedFileURL = await config.uploadFile(files[0]);
                return res.status(201).send({ status: true, data: uploadedFileURL });
            } else {
                return res.status(400).send({ status: true, message: "Nothing to upload." });
            }
        }

        const requestBody = req.body;
        const {
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
            return res.status(400).send({ status: false, message: "Email is already in use, try something different" })
        }
        if (!validator.isValid(profileImage)) {
            return res.status(400).send({ status: false, message: "ProfileImage link is required" })
        }
        if (!validator.isValid(phone)) {
            return res.status(400).send({ status: false, message: "phone is required" })
        }
        const isPhoneAleadyUsed = await userModel.findOne({ phone })
        if (isPhoneAleadyUsed) {
            return res.status(400).send({ status: false, message: "Phone is already in use, try something different" })
        }
        if (!validator.isValid(password)) {
            return res.status(400).send({ status: false, message: "password is required" })
        }
        if (password.length < 8 || password.length > 15) {
            return res.status(400).send({ status: false, message: "password should be of minimum 8 and maximum 15 character" })
        }
        if (!validator.isValid(address)) {
            return res.status(400).send({ status: false, message: "address is required" })
        }
        if (address) {
            if (!address.shipping && address.billing) {
                return res.status(400).send({ status: false, message: "Address must contain both full shipping and billing address." })
            }
            if (!address.shipping.street) return res.status(400).send({ status: false, message: "Shipping address must contain complete street details." })

            if (!address.shipping.city) return res.status(400).send({ status: false, message: "Shipping address must contain city." })

            if (!address.shipping.pincode) return res.status(400).send({ status: false, message: "Shipping address must contain a valid pincode." })

            if (address.billing.street) return res.status(400).send({ status: false, message: "Billing address must contain city." })

            if (address.billing.city) return res.status(400).send({ status: false, message: "Billing address must contain Street, City and Pincode." })

            if (address.billing.pincode) return res.status(400).send({ status: false, message: "Billing address must contain a valid pincode." })
        }
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
        if (!validator.isValid(requestBody.email)) {
            res.status(400).send({ status: false, message: 'email key is required' })
            return
        }
        if (!validator.isValid(requestBody.password)) {
            res.status(400).send({ status: false, message: 'password key is required' })
            return
        }
        if (!validator.isValidRequestBody(requestBody)) {
            res.status(400).send({ status: false, message: 'Invalid request parameters. Please provide login details' })
            return
        }
        // Extract params
        const { email, password } = requestBody;
        // Validation starts
        if (!validator.isValid(email.trim())) {
            res.status(400).send({ status: false, message: `Email is required` })
            return
        }
        if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email.trim()))) {
            res.status(400).send({ status: false, message: `Email should be a valid email address` })
            return
        }
        if (!validator.isValid(password.trim())) {
            res.status(400).send({ status: false, message: `Password is required` })
            return
        }
        // Validation ends
        const user = await userModel.findOne({ email, password });
        if (!user) {
            res.status(401).send({ status: false, message: `Invalid login credentials` });
            return
        }
        const token = await jwt.sign({
            userId: id,
            iat: Math.floor(Date.now() / 1000), //time of issuing the token.
            exp: Math.floor(Date.now() / 1000) + 60 * 24 * 7 //setting token expiry time limit.
        }, 'group3Project5')

        res.status(200).send({ status: true, message: `user login successfull`, data: { token } });
    } catch (error) {
        res.status(500).send({ status: false, message: error.message });
    }
}

const getProfile = async(req, res) => {
    try {
        const userId = req.params.userId

        //validation starts
        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId in params." })
        }
        //validation ends

        const findUser = await userModel.findOne({ _id: userId, isDeleted: false })
        if (!findUser) {
            return res.status(400).send({
                status: false,
                message: `User doesn't exists by ${userId}`
            })
        }
        //Checking the authorization of the user -> Whether user's Id matches with the book creater's Id or not.
        if (findUser._id != userId) {
            return res.status(403).send({
                status: false,
                message: "Unauthorized access."
            })
        }

        const { address, _id, fname, lname, email, profileImage, password, createdAt, updatedAt } = findUser

        const userObj = {
            address: address,
            _id: _id,
            fname: fname,
            lname: lname,
            email: email,
            profileImage: profileImage,
            password: password,
            createdAt: createdAt,
            updatedAt: updatedAt
        }
        return res.status(200).send({ status: true, message: "Profile found successfully.", data: userObj })
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is: " + err.message
        })
    }
}

const updateProfile = async(req, res) => {
    try {
        const userId = req.params.userId
            //validation starts
        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId in params." })
        }
        //validation ends

        const findUser = await userModel.findOne({ _id: userId, isDeleted: false })
        if (!findUser) {
            return res.status(400).send({
                status: false,
                message: `User doesn't exists by ${userId}`
            })
        }

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