const asyncHandler = (requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((error)=>{
           return next(error)
        })
    }
}

export {asyncHandler}



// const asyncHandler =  (requestHandler)=>{async (error, req, res, next)=>{
// try {
//     await requestHandler(error,req,res,next)
// } catch (error) {
//     res.status(error.code||500).json({
//         success: false,
//         message: error.message
//     })
    
// }
// }}
// export{asyncHandler}

