# Token and Auth
🔹 Steps Covered

1️⃣ User Model → Add methods for token generation

2️⃣ Auth Routes → Implement login, refresh token, and logout

3️⃣ Middleware → Protect routes using JWT authentication

4️⃣ Testing the Flow

## User Model

```javascript
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

// ✅ Hash password before saving the user
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// ✅ Generate Access Token (Short-lived)
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        { _id: this._id, email: this.email, username: this.username },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" } // Adjust as needed
    );
};

// ✅ Generate Refresh Token (Long-lived)
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        { _id: this._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" } // Adjust as needed
    );
};

const User = mongoose.model("User", userSchema);
module.exports = User;

```

## Authentication Routes

```javascript
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

let refreshTokens = []; // Temporary storage (use DB in production)

// ✅ User Login (Issue Access & Refresh Token)
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    refreshTokens.push(refreshToken); // Store refresh token

    res.json({ accessToken, refreshToken });
});

// ✅ Refresh Access Token using Refresh Token
router.post("/refresh", (req, res) => {
    const { token } = req.body;
    if (!token || !refreshTokens.includes(token)) return res.sendStatus(403);

    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const newAccessToken = jwt.sign(
            { _id: user._id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );

        res.json({ accessToken: newAccessToken });
    });
});

// ✅ Logout (Invalidate Refresh Token)
router.post("/logout", (req, res) => {
    const { token } = req.body;
    refreshTokens = refreshTokens.filter(t => t !== token);
    res.json({ message: "Logged out successfully" });
});

module.exports = router;

```

## Middleware to Protect Routes
```javascript
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return res.sendStatus(401);

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

```

## Protect Routes 
```javascript
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Protected Route (Only accessible with valid access token)
router.get("/dashboard", authMiddleware, (req, res) => {
    res.json({ message: `Welcome ${req.user.username}, this is your dashboard!` });
});

module.exports = router;

```