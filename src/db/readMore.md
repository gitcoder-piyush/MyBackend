# Handling process termination
1. Retry the Connection
You can implement a retry mechanism to attempt reconnecting to the database before deciding to terminate the process.
```javascript
const connectDB = async (retries = 5, delay = 5000) => {
    while (retries > 0) {
        try {
            const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
            console.log(`\n MongoDB connected! Host: ${connectionInstance.connection.host}`);
            return; // Exit the loop on successful connection
        } catch (error) {
            console.error(`Failed to connect to MongoDB. Retries left: ${retries - 1}`);
            console.error(error.message);

            retries -= 1;
            if (retries === 0) {
                console.error("All retries failed. Exiting application.");
                process.exit(1);
            }

            // Wait for the specified delay before retrying
            await new Promise(res => setTimeout(res, delay));
        }
    }
};

connectDB();
```
How it works:

Attempts to reconnect retries times.
Waits for delay milliseconds between each attempt using setTimeout.
Logs errors and retries before ultimately exiting if all attempts fail.

2. Graceful Shutdown
Instead of terminating the process immediately, you can allow for cleanup operations before exiting.

```javascript
const gracefulShutdown = () => {
    console.log("Performing cleanup tasks...");
    // Perform necessary cleanup, e.g., closing connections
    mongoose.disconnect(() => {
        console.log("MongoDB connection closed.");
        process.exit(0); // Use 0 for successful shutdown
    });
};

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected! Host: ${connectionInstance.connection.host}`);

        // Handle application termination signals
        process.on('SIGINT', gracefulShutdown); // Ctrl+C
        process.on('SIGTERM', gracefulShutdown); // Termination signal
    } catch (error) {
        console.error("MongoDB connection error:", error.message);

        // Perform cleanup if needed before exiting
        gracefulShutdown();
    }
};

connectDB();
```
How it works:

Uses process.on() to listen for termination signals like SIGINT (Ctrl+C) or SIGTERM (used by process managers).
Cleans up the MongoDB connection using mongoose.disconnect().
Gracefully exits with an appropriate exit code.

3. Fallback to Limited Functionality
If your application can work partially without a database, you can log the error, set a fallback mode, and continue running.

javascript
Copy
Edit


```javascript
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected! Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("Failed to connect to MongoDB. Running in fallback mode.");
        console.error(error.message);

        // Set the application to fallback mode
        global.fallbackMode = true; // Example: A global flag
    }
};

connectDB();
```
How it works:

Logs the error and continues the application in "fallback mode."
You can implement different application behavior when fallbackMode is enabled.

4. Use a Process Manager
Instead of handling termination directly in the app, rely on a process manager like PM2 or Docker to restart your application when it crashes.
```javascript
const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected! Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("MongoDB connection error:", error.message);

        // Allow process manager to handle restarts
        throw new Error("Exiting application due to database connection failure");
    }
};

connectDB();
```
How it works:

Use a process manager like PM2:

```javascript
pm2 start app.js --restart-delay=5000
```
The process manager will attempt to restart the app after a failure.

Which One Should You Use?
Retry Logic: Best if the connection issue might be temporary (e.g., network instability).
Graceful Shutdown: Ideal when you want to ensure proper cleanup before exiting.
Fallback Mode: Suitable for applications that can run partially without the database.
Process Manager: Works well in production to ensure automatic restarts.

# Exit codes
### Standard exit codes

| Exit Code | Meaning |
|-----------|---------|
|0| Success: The process completed without any errors. |
|1| General Error: A generic error occurred, often used for unhandled exceptions. |
|2| Misuse of Shell Builtins: A reserved exit code, used for invalid command usage. |
|126| Command Invoked Cannot Execute: The command cannot execute, e.g., permission issues. |
|127| 	Command Not Found: The command you tried to execute does not exist. |
|128| Invalid Exit Argument: Exit called with an invalid argument. |
|130| Script Terminated by Control-C: The process was terminated via Ctrl + C. |
|137| Process Killed: The process was killed with a signal (SIGKILL). |
|143| Process Terminated: The process was terminated via SIGTERM. |

### NodeJS specific exit codes
| Exit Code | Meaning |
|-----------|---------|
|3| Internal JavaScript Parse Error: A JavaScript file failed to parse correctly. |
|4| General Error: A generic error occurred, ofteInternal JavaScript Evaluation Failure: A JavaScript error occurred during evaluation. |
|5| Fatal Initialization Error: Node.js failed during the initialization phase. |
|6| Invalid Argument: A Node.js command-line argument was invalid or malformed. |
|7| Internal Exception Handler Run-Time Failure: The process failed while handling an exception. |
|8| Uncaught Exception: An unhandled exception caused the process to exit. |
|9| Invalid Module: A module required by the application could not be found or was invalid. |
|10| Internal Error: A fatal internal error occurred within Node.js itself. |
|12| Invalid Debug Argument: A debugger argument was invalid or unrecognized. |


