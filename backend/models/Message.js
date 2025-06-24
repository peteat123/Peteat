const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Text content – only required if there are **no** attachments
  content: {
    type: String,
    required: function () {
      // `this` refers to the document being validated
      return !this.attachments || this.attachments.length === 0;
    },
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  attachments: [{
    type: String
  }]
});

// Index to find conversations between users
messageSchema.index({ sender: 1, receiver: 1 });

module.exports = mongoose.model('Message', messageSchema); 