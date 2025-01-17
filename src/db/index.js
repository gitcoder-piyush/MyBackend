import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async()=>{
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        // console.log(connectionInstance);

        /*connectionInstance:
        This is the object returned by the mongoose.connect() method.
        It represents the connection to the MongoDB instance established by Mongoose.
        The connectionInstance contains various properties and methods that allow you to interact with the database, such as managing connections, retrieving information about the connection, and handling events.*/
        

        console.log(`\n mongoDB connected !! ${connectionInstance.connection.host}`)

        /* Explanation of connectionInstance.connection.host
        connectionInstance.connection:

        This is the actual Connection object associated with Mongoose.
        It contains details about the connection, such as the hostname, port, database name, and connection status.
        connectionInstance.connection.host:

        The host property specifically provides the hostname or IP address of the MongoDB server you are connected to. */

    } catch (error) {
        console.log("MongoDb error", error);
         process.exit(1)
         //readmore in readMore.md file
    }
}

export default connectDB