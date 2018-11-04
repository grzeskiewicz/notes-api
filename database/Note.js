const mongoose = require('mongoose');
const noteSchema = new mongoose.Schema({
    content: {
        type: String,
        trim: true,
    },
    date: {
        type: Date,
        trim:true,
    }
});
module.exports = mongoose.model('Note', noteSchema);