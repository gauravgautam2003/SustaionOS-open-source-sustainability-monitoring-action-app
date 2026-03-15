const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  notifications: {
    type: Boolean,
    default: true
  },

  theme: {
    type: String,
    enum: ["light", "dark"],
    default: "dark"
  }

}, {
  timestamps: true
});


/*
HASH PASSWORD BEFORE SAVE
*/
userSchema.pre("save", async function(next){

  if(!this.isModified("password"))
    return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();

});


/*
COMPARE PASSWORD
*/
userSchema.methods.comparePassword = async function(password){
  return await bcrypt.compare(password, this.password);
};


module.exports = mongoose.model("User", userSchema);