import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId)=>{
    try {
       const user =  await User.findById(userId)
       const accessToken  = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken
       await user.save({validateBeforeSave: false})

       return {accessToken, refreshToken}
       
    } catch (error) {
        throw new ApiError(500, "something went wrong while generating access and refresh token")
    }
}
const registerUser = asyncHandler(async (req,res) =>{

    
   // get user details from frontend
   // validation - not empty
   // already exist or not: username, email
   // file exist or not, ensure compulsory files are present
   // upload them to cloudinary, ensure required files are upload
   // create user object - creat entry in db
   // remove password and refresh token field from response
   // check for user creation
   // return result

  

   const {fullName, email, username, password} = req.body
   console.log("email:", email);
   if([fullName, email, username, password].some((field)=>field?.trim()==="")){
    throw new  ApiError(400, "All fields are required")
   }

   const existedUser = await User.findOne({$or:[{username}, {email}]})
   
   if (existedUser){
    throw new ApiError(409, "user with email or username already exist")
   }
//    console.log(req.files);
   const avatarLocalPath = req.files?.avatar[0]?.path;
//    const coverImageLocalPath = req.files?.coverImage[0]?.path;

   let coverImageLocalPath;
   if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path
   }



   if(!avatarLocalPath){
    throw new ApiError(400, "avatar file is required")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath)

   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
    throw new ApiError(400, "avatar file is required")
   }

   const user = await User.create({fullName,
     avatar: avatar.url, coverImage: coverImage?.url || "",
    email, password, username: username.toLowerCase() })

const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
)

if(!createdUser){
    throw new ApiError(500, "something went wrong while registering a user")
}

return res.status(201).json(
    new ApiResponse(200, createdUser, "user registered successfully")
)

})

const loginUser = asyncHandler(async(req, res)=>{
    //req.body -> data
    //username or email
    //find the user
    //password check
    //access and refresh token
    //send cookies
    
    const {email, username, password} = req.body
    console.log(email);

    //this require both username and email to login
    if(!username && !email){
        throw new ApiError(400, "username and email is required")
    }

    // To either use email or username**
     // if (!(username || email)) {
     //     throw new ApiError(400, "username or email is required")
         
     // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, "user logged in successfully"))
})

const logoutUser = asyncHandler(async(req, res)=>
    {
    await User.findByIdAndUpdate(req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        }, 

        {
            new: true
        })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options ).clearCookie("refreshToken", options ).json(new ApiResponse(200, {}, "User logged out"))
   
    })

const refreshAccessToken = asyncHandler(async(req, res)=>{
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(! incommingRefreshToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken._id)
    
        if(!user){
            throw new ApiError(401, "invalid refresh token")
        }
    
        if(incommingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh token is expired")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res.status(200).cookie("accessToken",accessToken, options ).cookie("refreshToken",newrefreshToken, options ).json(ApiResponse(200, {accessToken, refreshToken: newrefreshToken}, "Access token refresh"))
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

export {
    registerUser,
    loginUser, 
    logoutUser, 
    refreshAccessToken
}