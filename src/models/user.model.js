import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true // make it searchable
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String, 
        required: true,
    },
    coverImage: {
        type: String, 
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref:"video"

         
        }

    ],
    password: {
        type: String,
        required: [true, "password is required"]
    },

    refreshToken: {
        type: String
    }
},{timestamps: true})

//pre middleware
/*The .pre() method in Mongoose is used to define middleware (hooks) that run before a certain operation (like save, remove, updateOne, etc.).*/

/*event:	The operation to hook into (e.g., "save", "remove", "updateOne", "findOneAndUpdate")

function:	The middleware function that runs before the event */

/* 🔹 When to Use pre()?
✅ Before saving documents ("save")
✅ Before removing a document ("remove")
✅ Before updating ("findOneAndUpdate", "updateOne")
✅ Before running queries ("find", "findOne")*/

/* 🔹 Using next() in Middleware
Always call next() to move to the next middleware or operation.
If an error occurs, pass it to next(error): */

//post middleware
/*🔹 userSchema.post() in Mongoose
The .post() method in Mongoose is used to define middleware (hooks) that run after an operation is executed, such as save, remove, updateOne, etc */

/*
event:	The operation to hook into (e.g., "save", "remove", "updateOne", "findOneAndUpdate")
doc:	The affected document (or result) after the operation
next:	Function to move to the next middleware */

/*🔹 When to Use post()?
✅ For logging actions (e.g., "User deleted")
✅ For sending notifications (e.g., email after signup)
✅ For caching updates
✅ For cleanup tasks after deletion */

userSchema.pre("save", async function(next){
    if(! this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

/*In Mongoose, .methods is used to define custom instance methods for a schema. These methods become available on all documents (instances) of a model. */

userSchema.methods.isPasswordCorrect = async function (password){
   return await bcrypt.compare(password, this.password)
}

//Access token
/*✅ What It Does?
Creates a JWT access token for the user.
Includes _id, email, username, and fullName in the payload.
Uses ACCESS_TOKEN_SECRET from .env as the secret key.
Sets an expiration time (ACCESS_TOKEN_EXPIRY).*/

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
             email: this.email,
            username: this.username,
            fullName: this.fullName

        }, process.env.ACCESS_TOKEN_SECRET,{
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        })
}

//Refresh Token
/*✅ What It Does?
Creates a JWT refresh token.
Includes only _id (for security, no sensitive data).
Uses REFRESH_TOKEN_SECRET from .env.
Sets an expiration time (REFRESH_TOKEN_EXPIRY).*/

userSchema.methods.generateRefreshToken = function(){    return jwt.sign(
    {
        _id: this._id

    }, process.env.REFRESH_TOKEN_SECRET,{
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })}

/*🔹 Summary
✅ generateAccessToken() → Creates a short-lived token for authentication.
✅ generateRefreshToken() → Creates a long-lived token for renewing access tokens.
✅ Used together for secure authentication without requiring frequent logins. */

//read more about jwt auth in readMore section.


export const User = mongoose.model("User", userSchema)