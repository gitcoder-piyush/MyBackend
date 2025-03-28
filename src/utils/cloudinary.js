import {v2 as cloudinary} from "cloudinary";
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath) return null
        const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto"
    })

    //file uploaded successfully

    // console.log("file uploaded successfully on cloudinary", response.url);

    fs.unlinkSync(localFilePath)

    return response
    

    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved file if upload fails
        return null
    }
}

const deleteFromCloudinary = async (oldFilePath)=>{
try {
        if(!oldFilePath) return null
        await cloudinary.uploader.destroy(oldFilePath);
        console.log(`Deleted old avatar: ${oldFilePath}`);
} catch (error) {
    console.error("Error deleting old avatar:", error);
}

}

export {uploadOnCloudinary, deleteFromCloudinary}