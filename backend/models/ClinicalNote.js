const mongoose = require('mongoose');

const vitalsSchema = new mongoose.Schema({
  weight: Number,          // kg
  temperature: Number,     // °C
  crt: Number,             // capillary refill time seconds
  skinTenting: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const clinicalNoteSchema = new mongoose.Schema({
  consultation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoConsultation',
    required: true
  },
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vitals: vitalsSchema,
  diagnosis: String,
  treatmentPlan: String,
  prescription: String,
  additionalNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ClinicalNote', clinicalNoteSchema); 