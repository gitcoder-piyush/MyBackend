import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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

export {
    registerUser,

}