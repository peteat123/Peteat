const express = require('express');
const router = express.Router();
const VideoConsultation = require('../models/VideoConsultation');
const { isAuthenticated } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Utility to automatically forward async errors to Express error handler
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Get all video consultations (admin only)
router.get('/admin', isAuthenticated, asyncHandler(async (req, res) => {
  // Check if user is admin (middleware should be improved to include this)
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access only' });
  }
  
  const consultations = await VideoConsultation.find()
    .populate('petOwner', 'fullName email')
    .populate('clinic', 'fullName clinicName')
    .populate('pet', 'name species breed');
  
  res.json(consultations);
}));

// Get consultations for a pet owner
router.get('/pet-owner/:ownerId', isAuthenticated, asyncHandler(async (req, res) => {
  // Check if user is authorized (same user or admin)
  if (req.user.id !== req.params.ownerId && req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Access denied' });
  }
  
  const consultations = await VideoConsultation.find({ petOwner: req.params.ownerId })
    .populate('clinic', 'fullName clinicName profilePicture')
    .populate('pet', 'name species breed profileImage')
    .sort({ scheduledTime: -1 });
  
  res.json(consultations);
}));

// Get consultations for a clinic
router.get('/clinic/:clinicId', isAuthenticated, asyncHandler(async (req, res) => {
  // Check if user is authorized (same clinic or admin)
  if (req.user.id !== req.params.clinicId && req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Access denied' });
  }
  
  const consultations = await VideoConsultation.find({ clinic: req.params.clinicId })
    .populate('petOwner', 'fullName email profilePicture')
    .populate('pet', 'name species breed profileImage')
    .sort({ scheduledTime: -1 });
  
  res.json(consultations);
}));

// Get single consultation
router.get('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const consultation = await VideoConsultation.findById(req.params.id)
    .populate('petOwner', 'fullName email profilePicture')
    .populate('clinic', 'fullName clinicName profilePicture')
    .populate('pet', 'name species breed age profileImage');
  
  if (!consultation) {
    return res.status(404).json({ message: 'Consultation not found' });
  }
  
  // Check if user is authorized (pet owner, clinic, or admin)
  if (
    req.user.id !== consultation.petOwner._id.toString() && 
    req.user.id !== consultation.clinic._id.toString() && 
    req.user.userType !== 'admin'
  ) {
    return res.status(403).json({ message: 'Unauthorized: Access denied' });
  }
  
  res.json(consultation);
}));

// Create new consultation
router.post('/', isAuthenticated,
  [
    body('petOwner').notEmpty().withMessage('petOwner is required'),
    body('clinic').notEmpty().withMessage('clinic is required'),
    body('pet').notEmpty().withMessage('pet is required'),
    body('scheduledTime').notEmpty().isISO8601().withMessage('Valid scheduledTime is required')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { petOwner, clinic, pet, scheduledTime, duration, notes } = req.body;
    
    // Check if user is authorized (pet owner, clinic, or admin)
    if (req.user.id !== petOwner && req.user.id !== clinic && req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized: Access denied' });
    }
    
    const newConsultation = new VideoConsultation({
      petOwner,
      clinic,
      pet,
      scheduledTime,
      duration: duration || 30,
      notes,
      status: 'scheduled'
    });
    
    const savedConsultation = await newConsultation.save();
    
    res.status(201).json(savedConsultation);
  })
);

// Update consultation status
router.patch('/:id/status', isAuthenticated, asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  if (!status || !['scheduled', 'in-progress', 'completed', 'cancelled', 'no-show'].includes(status)) {
    return res.status(400).json({ message: 'Please provide a valid status' });
  }
  
  const consultation = await VideoConsultation.findById(req.params.id);
  
  if (!consultation) {
    return res.status(404).json({ message: 'Consultation not found' });
  }
  
  // Check if user is authorized (pet owner for cancellations, clinic for other status changes, or admin)
  if (req.user.userType !== 'admin') {
    if (status === 'cancelled' && req.user.id !== consultation.petOwner.toString() && req.user.id !== consultation.clinic.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Access denied' });
    } else if (status !== 'cancelled' && req.user.id !== consultation.clinic.toString()) {
      return res.status(403).json({ message: 'Unauthorized: Only clinics can update this status' });
    }
  }
  
  consultation.status = status;
  
  // Generate session ID when moving to in-progress
  if (status === 'in-progress' && !consultation.sessionId) {
    consultation.sessionId = 'vc_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  const updatedConsultation = await consultation.save();
  
  res.json(updatedConsultation);
}));

// Update consultation details (notes, diagnosis, prescription)
router.patch('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  const { notes, diagnosis, prescription, followUpRecommended } = req.body;
  
  const consultation = await VideoConsultation.findById(req.params.id);
  
  if (!consultation) {
    return res.status(404).json({ message: 'Consultation not found' });
  }
  
  // Check if user is authorized (clinic or admin only)
  if (req.user.id !== consultation.clinic.toString() && req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Only clinics can update these details' });
  }
  
  // Update provided fields
  if (notes !== undefined) consultation.notes = notes;
  if (diagnosis !== undefined) consultation.diagnosis = diagnosis;
  if (prescription !== undefined) consultation.prescription = prescription;
  if (followUpRecommended !== undefined) consultation.followUpRecommended = followUpRecommended;
  
  const updatedConsultation = await consultation.save();
  
  res.json(updatedConsultation);
}));

// Delete consultation (admin only)
router.delete('/:id', isAuthenticated, asyncHandler(async (req, res) => {
  // Only admin can delete consultations
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized: Admin access only' });
  }
  
  const consultation = await VideoConsultation.findByIdAndDelete(req.params.id);
  
  if (!consultation) {
    return res.status(404).json({ message: 'Consultation not found' });
  }
  
  res.json({ message: 'Consultation deleted successfully' });
}));

module.exports = router; 