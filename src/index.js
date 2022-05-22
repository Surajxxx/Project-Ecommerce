const express = require('express')
const bodyParser = require('body-parser')
const multer = require('multer')
const route = require('../src/routes/route')
const mongoose = require('mongoose')
const env = require('dotenv').config()

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(multer().any())

mongoose.connect(process.env.MONGO_DB, {
        useNewUrlParser: true
    })
    .then(() => console.log("MongoDb is connected"))
    .catch(err => console.log(err))


app.use('/', route)

app.listen(process.env.PORT, function() {
    console.log("Express app is running on port " + (process.env.PORT))
})