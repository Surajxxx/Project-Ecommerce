const jwt = require('jsonwebtoken')
const UserModel = require('../models/userModel')
const Validator = require('../utilities/validator')

//********************************AUTHENTICATION********************************** */

const authentication = async function(req, res, next){

    const bearerToken = req.headers["authorization"]

    if(!Validator.isValidInputValue(bearerToken)){
        return res.status(401).send({status : false, message : "token is missing"})
    }
    const token = bearerToken.split(" ")[1]
    

    const secretKey = '123451214654132466ASDFGwnweruhkwerbjhiHJKL!@#$%^&'

    if(!token){
        return res.status(401).send({status : false, message : "authentication failed : token not found"})
    }

    try{
        const decodedToken = jwt.verify(token, secretKey, {ignoreExpiration: true})

        if(Date.now() > decodedToken.exp * 1000){
            return res.status(401).send({status : false, message : "authentication failed : Session expired"})
        }

        req.decodedToken = decodedToken

        next()

    }catch{
        res.status(401).send({status : false, message : "authentication failed"})
    }


}
//! authorization to be switched to handler

const authorization = async function(req, res, next){
    const userId = req.params.userId
    const decodedToken = req.decodedToken

    if(!Validator.isValidObjectId(userId)){
        return res.status(400).send({status :false , message : " enter a valid userId"})
    }

    const userByUserId = await UserModel.findById(userId)
  

    if(!userByUserId){
        return res.status(404).send({status :false , message : " user not found"}) 
    }

    if(userId !== decodedToken.userId){
        return res.status(403).send({status :false , message : "unauthorized access"})  
    }

    next()
}

module.exports = {authentication, authorization}