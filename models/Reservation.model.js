const { Schema, model } = require("mongoose");

const reservationSchema = new Schema({
  name: {
    type: String,
    required: [true, "Name is required."],
  },
  email: {
    type: String,
    required: [true, "Email is required."],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: Number,
    required: [true, "Phone is required."]
  },
  date: {
    type: Date,
    required: [true, "Date is required."] 
  },
  time: {
    type: String,
    required: [true, "Time is required."],
  },
  place: {
    type: String,
    required: [true, "Place is required."],
  },
  numGuests: {
    type: Number,
    required: [true, "Guests are required."]
  },

  tableSize: {
    type: String,
  },
},
);

const Reservation = model("Reservation", reservationSchema);

module.exports = Reservation;
