import { Request, Response } from 'express';
import Officer from '../models/Officer';
import Consultation from '../models/Consultation';
import crypto from 'crypto';

// ─── 1) Consultant Login (via Officer collection) ───────────────────
export const consultantLogin = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Consultant name is required' });
    }

    // Try a case-insensitive regex match for the name
    const officer = await Officer.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });

    if (!officer) {
      return res.status(404).json({ success: false, message: 'No consultant found with this name.' });
    }

    res.json({
      success: true,
      data: officer,
      message: `Welcome back, ${officer.name}!`
    });
  } catch (error) {
    console.error('consultantLogin error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 1.5) Consultant Signup (Adds to Officer collection) ────────────
export const consultantSignup = async (req: Request, res: Response) => {
  try {
    const { name, state, district, designation, specialization, email, phone } = req.body;

    if (!name || !state || !district) {
      return res.status(400).json({ success: false, message: 'Name, state, and district are required' });
    }

    // Check if consultant exists
    const existing = await Officer.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A consultant with this name already exists.' });
    }

    const newOfficer = await Officer.create({
      name: name.trim(),
      state: state.trim(),
      district: district.trim(),
      designation: designation || 'Agricultural Consultant',
      specialization: specialization || 'General Agriculture',
      email: email || '',
      phone: phone || '',
      is_available: true
    });

    res.status(201).json({
      success: true,
      data: newOfficer,
      message: `Successfully registered as ${newOfficer.name}!`
    });
  } catch (error) {
    console.error('consultantSignup error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 2) List ALL consultations for an officer (across all states) ───
export const listConsultationsForOfficer = async (req: Request, res: Response) => {
  try {
    const { officer_id, status } = req.query as { officer_id: string; status?: string };

    if (!officer_id) {
      return res.status(400).json({ success: false, message: 'officer_id is required' });
    }

    const query: any = { officer: officer_id };
    if (status && status !== 'all') query.status = status;

    const consultations = await Consultation.find(query)
      .sort({ preferred_date: 1, createdAt: -1 } as any)
      .limit(100)
      .populate('farmer', 'name phone email state district preferred_language')
      .populate('officer', 'name designation phone specialization');

    res.json({ success: true, data: consultations });
  } catch (error) {
    console.error('listConsultationsForOfficer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 3) Approve a consultation ──────────────────────────────────────
export const approveConsultation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    // Generate a room ID for video consultations
    const roomId = `room_${crypto.randomBytes(6).toString('hex')}`;

    consultation.status = 'confirmed';
    if (consultation.consultation_type === 'video') {
      consultation.room_id = roomId;
      consultation.video_call_status = 'waiting';
    }
    await consultation.save();

    const populated = await Consultation.findById(id)
      .populate('farmer', 'name phone email state district')
      .populate('officer', 'name designation phone');

    res.json({ success: true, data: populated, message: 'Consultation approved successfully' });
  } catch (error) {
    console.error('approveConsultation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 4) Reject a consultation ───────────────────────────────────────
export const rejectConsultation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const consultation = await Consultation.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        notes: reason ? `Rejected: ${reason}` : 'Rejected by consultant'
      },
      { new: true }
    ).populate('farmer', 'name phone email state district')
     .populate('officer', 'name designation phone');

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    res.json({ success: true, data: consultation, message: 'Consultation rejected' });
  } catch (error) {
    console.error('rejectConsultation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 5) Mark consultation as completed ──────────────────────────────
export const completeConsultation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findByIdAndUpdate(
      id,
      { status: 'completed', video_call_status: 'ended' },
      { new: true }
    ).populate('farmer', 'name phone email state district')
     .populate('officer', 'name designation phone');

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    res.json({ success: true, data: consultation, message: 'Consultation completed' });
  } catch (error) {
    console.error('completeConsultation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 6) Get consultant profile ──────────────────────────────────────
export const getConsultantProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const officer = await Officer.findById(id);

    if (!officer) {
      return res.status(404).json({ success: false, message: 'Consultant not found' });
    }

    // Get consultation stats
    const [total, pending, confirmed, completed] = await Promise.all([
      Consultation.countDocuments({ officer: id }),
      Consultation.countDocuments({ officer: id, status: 'pending' }),
      Consultation.countDocuments({ officer: id, status: 'confirmed' }),
      Consultation.countDocuments({ officer: id, status: 'completed' }),
    ]);

    res.json({
      success: true,
      data: {
        ...officer.toJSON(),
        stats: { total, pending, confirmed, completed }
      }
    });
  } catch (error) {
    console.error('getConsultantProfile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 7) Start video call ────────────────────────────────────────────
export const startVideoCall = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findById(id);
    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    if (!consultation.room_id) {
      consultation.room_id = `room_${crypto.randomBytes(6).toString('hex')}`;
    }
    consultation.video_call_status = 'active';
    await consultation.save();

    res.json({
      success: true,
      data: {
        room_id: consultation.room_id,
        consultation_id: consultation._id,
      }
    });
  } catch (error) {
    console.error('startVideoCall error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 8) Get video call info (for farmer side) ───────────────────────
export const getVideoCallInfo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const consultation = await Consultation.findById(id)
      .populate('farmer', 'name phone')
      .populate('officer', 'name designation phone');

    if (!consultation) {
      return res.status(404).json({ success: false, message: 'Consultation not found' });
    }

    res.json({
      success: true,
      data: {
        room_id: consultation.room_id,
        video_call_status: consultation.video_call_status,
        consultation_id: consultation._id,
        farmer: consultation.farmer,
        officer: consultation.officer,
      }
    });
  } catch (error) {
    console.error('getVideoCallInfo error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
