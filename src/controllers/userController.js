const userModel = require('../models/userModel')
const { awsConfig, validator } = require('../utils')

const userCreation = async(req, res) => {
    try {

    } catch (err) {
        return res.status(500).send({
            status: false,
            message: "Error is" + err.message
        })
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
            message: "Error is" + err.message
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
            message: "Error is" + err.message
        })
    }
}
module.exports = {
    userCreation,
    getProfile
}