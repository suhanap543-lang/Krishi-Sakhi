import { Request, Response, NextFunction } from 'express';
import Reminder from '../models/Reminder';

// ─── GET /api/reminders/ — List reminders (with filters) ────────────
export const listReminders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: any = {};

    const farmerId = req.query.farmer_id || req.query.farmer;
    if (farmerId) filter.farmer = farmerId;

    if (req.query.category) filter.category = req.query.category;
    if (req.query.priority) filter.priority = req.query.priority;

    if (req.query.is_completed !== undefined && req.query.is_completed !== '') {
      filter.is_completed = req.query.is_completed === 'true';
    }

    const limit = parseInt(req.query.limit as string) || 100;

    const reminders = await Reminder.find(filter)
      .populate('farmer', 'name phone district state')
      .populate('farm', 'name')
      .sort({ due_date: 1 } as any)
      .limit(limit);

    const result = reminders.map((r: any) => {
      const obj = r.toJSON();
      obj.farmer_name = r.farmer?.name || 'Unknown';
      obj.farm_name = r.farm?.name || 'Unknown Farm';
      return obj;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/reminders/ — Create reminder ─────────────────────────
export const createReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { farmer, farm, title, description, due_date, category, priority } = req.body;

    if (!farmer) {
      return res.status(400).json({ message: 'Farmer ID is required' });
    }
    if (!farm) {
      return res.status(400).json({ message: 'Farm ID is required' });
    }

    const reminder = await Reminder.create({
      farmer,
      farm,
      title,
      description: description || '',
      due_date: new Date(due_date),
      category: category || 'general',
      priority: priority || 'medium',
    });

    await reminder.populate('farmer', 'name phone district state');
    await reminder.populate('farm', 'name');
    const result = reminder.toJSON() as any;
    result.farmer_name = (reminder.farmer as any)?.name || 'Unknown';
    result.farm_name = (reminder.farm as any)?.name || 'Unknown Farm';

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/reminders/:id/mark_completed/ — Toggle completion ────
export const markCompleted = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    const updated = await Reminder.findByIdAndUpdate(
      req.params.id,
      { is_completed: !reminder.is_completed },
      { new: true }
    )
      .populate('farmer', 'name phone district state')
      .populate('farm', 'name');

    if (!updated) {
        return res.status(404).json({ message: 'Reminder not found' });
    }

    const result = updated.toJSON() as any;
    result.farmer_name = (updated.farmer as any)?.name || 'Unknown';
    result.farm_name = (updated.farm as any)?.name || 'Unknown Farm';

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/reminders/:id/ — Delete reminder ────────────────────
export const deleteReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminder = await Reminder.findByIdAndDelete(req.params.id);

    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }

    res.json({ message: 'Reminder deleted successfully' });
  } catch (err) {
    next(err);
  }
};
