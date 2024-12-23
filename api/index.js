import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import Subscriber from "./model/subscribe.model.js"; // Ensure this path is correct
import nodemailer from "nodemailer";

dotenv.config();

// CORS options
const corsOptions = {
    origin: "https://newsletter-frontend-zeta.vercel.app", // Allow only your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-CSRF-Token",
        "X-Requested-With",
        "Accept",
        "Accept-Version",
        "Content-Length",
        "Content-MD5",
        "Date",
        "X-Api-Version"
    ],
    credentials: true,
};

// Initialize Express app
const app = express();

// Enable CORS with the specified options
app.use(cors(corsOptions));

// Middleware to parse JSON request bodies
app.use(express.json());

// Start the server
app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
});

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.log(err));

// In-memory storage for simplicity (consider moving this to a database for production)
const otpStorage = new Map();

// Function to send verification email
const sendVerificationEmail = (email, otp) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_PASSWORD,
        },
    });

    const mailOptions = {
        from: process.env.GMAIL_EMAIL,
        to: email,
        subject: "Email Verification",
        text: `Here is your OTP: ${otp}`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("Error sending email:", error);
        } else {
            console.log("Email sent:", info.response);
        }
    });
};

// Route to subscribe a user
app.post("/subscribe", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });

        // Check if the user is already subscribed
        const existingSubscriber = await Subscriber.findOne({ email });
        if (existingSubscriber) {
            return res.status(400).json({ message: "Email is already subscribed" });
        }

        const subscriber = new Subscriber({ email });
        await subscriber.save();

        // Generate OTP and store it
        const otp = Math.floor(10000 + Math.random() * 90000);
        otpStorage.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // Expires in 5 minutes
        console.log(`Generated OTP for ${email}:`, otp);

        // Send the OTP
        sendVerificationEmail(email, otp);

        res.status(200).json({ message: "Subscribed successfully. OTP sent to your email.", success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Route to verify OTP
app.post("/verify", (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const storedData = otpStorage.get(email);
        if (!storedData) {
            return res.status(400).json({ message: "OTP not found or expired" });
        }

        if (storedData.expiresAt < Date.now()) {
            otpStorage.delete(email);
            return res.status(400).json({ message: "OTP has expired" });
        }

        if (parseInt(otp, 10) === storedData.otp) {
            otpStorage.delete(email); // Remove OTP after successful verification
            return res.status(200).json({ message: "OTP verified successfully" });
        } else {
            return res.status(400).json({ message: "Invalid OTP" });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Handle preflight requests explicitly for all routes
app.options("*", cors(corsOptions));
