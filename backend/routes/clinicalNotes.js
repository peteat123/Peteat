const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { isAuthenticated } = require('../middleware/auth');
const ClinicalNote = require('../models/ClinicalNote');
const VideoConsultation = require('../models/VideoConsultation');

// Helper wrapper
const asyncHandler = fn => (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);

// Create clinical note (clinic only)
router.post('/', isAuthenticated, [
  body('consultation').notEmpty(),
  body('pet').notEmpty()
], asyncHandler(async (req,res)=>{
  if (req.user.userType !== 'clinic') return res.status(403).json({ message:'Only clinics can create notes'});
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { consultation, pet, vitals, diagnosis, treatmentPlan, prescription, additionalNotes } = req.body;

  // ensure consultation exists & belongs to clinic
  const consultDoc = await VideoConsultation.findById(consultation);
  if (!consultDoc) return res.status(404).json({ message:'Consultation not found'});
  if (consultDoc.clinic.toString() !== req.user.id) return res.status(403).json({ message:'Not your consultation'});

  const note = new ClinicalNote({ consultation, pet, author: req.user.id, vitals, diagnosis, treatmentPlan, prescription, additionalNotes });
  const saved = await note.save();
  res.status(201).json(saved);
}));

// Get notes by consultation
router.get('/consultation/:id', isAuthenticated, asyncHandler(async(req,res)=>{
  const id = req.params.id;
  const notes = await ClinicalNote.find({ consultation: id }).sort({ createdAt: -1 });
  res.json(notes);
}));

// Get single note
router.get('/:id', isAuthenticated, asyncHandler(async(req,res)=>{
  const note = await ClinicalNote.findById(req.params.id);
  if (!note) return res.status(404).json({ message:'Not found'});
  res.json(note);
}));

// Get notes by pet
router.get('/pet/:id', isAuthenticated, asyncHandler(async(req,res)=>{
  const notes = await ClinicalNote.find({ pet: req.params.id }).sort({ createdAt: -1 });
  res.json(notes);
}));

module.exports = router; 