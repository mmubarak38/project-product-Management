const userModel = require('../models/userModel')
const validator = require('../utils/validator')
const bcrypt = require('bcrypt')
const salt = 10
const aws = require("aws-sdk");

//!---------------------------------//

const config = aws.config.update({
    accessKeyId: "AKIAY3L35MCRRMC6253G", // id
    secretAccessKey: "88NOFLHQrap/1G2LqUy9YkFbFRe/GNERsCyKvTZA", // like your secret password
    region: "ap-south-1" // Mumbai region
});

let uploadFile = async(file) => {
    return new Promise(function(resolve, reject) { // exactly 
        // Create S3 service object
        let s3 = new aws.S3({ apiVersion: "2006-03-01" });
        var uploadParams = {
            ACL: "public-read", // this file is publically readable
            Bucket: "classroom-training-bucket",
            Key: "group3/products_management/" + new Date() + file.originalname,
            Body: file.buffer,
        };
        // Callback - function provided as the second parameter ( most oftenly)
        s3.upload(uploadParams, function(err, data) {
            if (err) {
                return reject({ "error": err });
            }
            console.log(data)
            console.log(`File uploaded successfully. ${data.Location}`);
            return resolve(data.Location); //HERE 
        });
    });
};

const userCreation = async(req, res) => {
    try {
        let files = req.files;
        if (files && files.length > 0) {
            let uploadedFileURL = await uploadFile(files[0]);
            return res.status(201).send({ status: true, data: uploadedFileURL });
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
            if (address.shipping) {
                if (!validator.isValid(address.shipping.street || address.shipping.city || address.shipping.pincode)) {
                    return res.status(400).send({ status: false, message: "Shipping address must contain Street, City and Pincode." })
                }
            }
            if (address.billing) {
                if (!validator.isValid(address.billing.street || address.billing.city || address.billing.pincode)) {
                    return res.status(400).send({ status: false, message: "Billing address must contain Street, City and Pincode." })
                }
            }
        }
        const encryptedPassword = await bcrypt.hash(password, salt);
        const userData = {
            fname,
            lname,
            email,
            profileImage,
            phone,
            encryptedPassword,
            address
        }
        const createUser = await userModel.create(userData);
        return res
            .status(201)
            .send({
                status: true,
                message: "user created successfully.",
                data: createUser
            });
    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is : " + err.message
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
        const token = await jwt.sign({ userId: user._id }, 'group3', {
                iat: Date.now(),
                exp: "24*7h"
            })
            //res.header('Bearer Token', token);
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