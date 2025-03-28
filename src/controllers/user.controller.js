import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

const changeCurrentPassword = asyncHandler(async(req, res)=>{
    const{oldPassword, newPassword, confirmPassword} = req.body
    const user = User.findById(req.user?._id)
    if (!(newPassword === confirmPassword)){
        throw new ApiError(400, "password must be same")
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponse(200, {}, "password changed successfully"))

})

const getcurrentUser = asyncHandler(async(req, res)=>{
    return res.status(200).json(200, req.user, "current user fetched successfully")
})

const updateAccountDetails = asyncHandler(async(req, res)=>{
    const{fullName, email} = req.body
    //if updating files keep different end point to avoid congesstion in network.

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{$set: {
        fullName, email
    }},{new:true}).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "coverIamge file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, "error while uploading avatar")
    }

    const user = await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(400,"user not found")
    }

    const oldAvatarId = user.avatar

    const updatedUser = await User.findByIdAndUpdate(req.user?._id,{$set:{
        avatar: avatar.url
    }}, {new: true}).select("-password")

    if(oldAvatarId){
        const oldFilePath = oldAvatarId.split("/").pop().split(".")[0];
        await deleteFromCloudinary(oldFilePath)
    }

    return res.status(200).json( new ApiResponse(200, updatedUser, "updated avatar"))
})

const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "avatar file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, "error while uploading coverImage")
    }

    const user = await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(400, "user not found")
    }
    const oldCoverIamgeId = user.coverImage

    const updatedUser = await User.findByIdAndUpdate(req.user?._id,{$set:{
        coverImage: coverImage.url
    }}, {new: true}).select("-password")

    if(oldCoverIamgeId){
        const oldFilePath = oldCoverIamgeId.split("/").pop().split(".")[0];
        await deleteFromCloudinary(oldFilePath)
    }
    return res.status(200).json( new ApiResponse(200, updatedUser, "updated coverImage"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400, "username not found")
    }
    const channel = await User.aggregate([{
        $match: {
            username: username?.toLowerCase()
        }
    },{
        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"


        }
    },{
        $lookup: {
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"


        }
    },{
        $addFields:{
            subscribersCount:{
                $size: "$subscribers"
            },
            channelSubscribedToCount :{
                $size: "$subscribedTo"
            },
            isSubscribed: {
                $cond:{
                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        }
}, {
    $project:{
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1, 
        email: 1
    }
}])

console.log(channel)

if(!channel?.length){
    throw new ApiError(404, " channel does not exist")
}
return res.status(200).json(new ApiResponse(200, channel[0], "user channel fetched successfully"))

})

const getWatchHistory = asyncHandler(async (req,res)=>{
    const user = await User.aggregate([
        {$match:{
            _id: new mongoose.Types.ObjectId(req.user._id)
        }},{
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [{
                                $project:{
                                    fullName: 1,
                                    username: 1,
                                    avatar: 1
                                }
                            }]
                        }
                    },
                    {$addFields: {
                        owner:{
                            $first: "$owner"
                        }
                    }}
                ]
            }
        }
    ])
    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "watch history fetched sucessfully"))
    
})

export {
    registerUser,
    loginUser, 
    logoutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    getcurrentUser,
    updateAccountDetails, 
    updateUserAvatar,
    updateUserCoverImage, 
    getUserChannelProfile,
    getWatchHistory
}