const mongoose = require('mongoose');

const QuotationSchema = new mongoose.Schema({
    quotationNo: String,      // e.g., MGE-C-2502
    date: Date,               // e.g., 26/12/2025
    customerName: String,     // e.g., SUNIL AUTO AGENCY
    plantCapacity: Number,    // e.g., 9.52
    location: String,         // e.g., JETPUR
    systemCost: Number,       // e.g., 216580
    gstAmount: Number,        // e.g., 19275.62
    totalAmount: Number,      // e.g., 274355.62
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quotation', QuotationSchema);