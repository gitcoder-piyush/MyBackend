import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema({
    videoFile: {
        type: String,
        required: true
    }, 
    thumbnail:{
        typoe: String,
        required: true
    },
    title:{
        type: String,
        required: true
    },
     description:{
        type: String,
        required: true
     },
     duration: {
        type: Number,
        required: true
     },
     views: {
        type: Number,
        default: 0
     },
     owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
     }


},{timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate) 
//aggregation is required to aggregate all the videos watched by the user into the history section.

export const Video = mongoose.model("Video", videoSchema )