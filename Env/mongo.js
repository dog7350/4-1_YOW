const mongoose = require('mongoose');
var Schema = mongoose.Schema;

var chatLogSchema = new Schema({
                                site: String,
                                id: String,
                                content: String
                                }, { timestamps: true });

module.exports = mongoose.model('chatLog', chatLogSchema);