import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"], // Adding a custom error message
    unique: true,
    trim: true, // Automatically trims whitespace
    lowercase: true, // Converts email to lowercase
  },
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});


const Subscriber = mongoose.model("Subscriber", subscriberSchema);
export default Subscriber;
