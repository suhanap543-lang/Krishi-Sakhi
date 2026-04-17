import { Request, Response, NextFunction } from 'express';
import Farm from '../models/Farm';
import Farmer from '../models/Farmer';

// ─── GET /api/farms/ — List farms (filter by farmer_id or farmer query param) ─
export const listFarms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, any> = {};
    // Support both ?farmer_id= and ?farmer= query params
    const farmerId = req.query.farmer_id || req.query.farmer;
    if (farmerId) {
      filter.farmer = farmerId;
    }

    const farms = await Farm.find(filter)
      .populate('farmer', 'name phone district state')
      .sort({ created_at: -1 });

    // Add farmer_name for display
    const result = farms.map((f) => {
      const obj = f.toJSON() as any;
      obj.farmer_name = (f.farmer as any)?.name || 'Unknown';
      return obj;
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/farms/ — Create farm ──────────────────────────────────
export const createFarm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { farmer, name, land_size_acres, soil_type, irrigation_type, primary_crops, latitude, longitude, nitrogen_value, phosphorus_value, potassium_value, soil_ph } = req.body;

    if (!farmer) {
      return res.status(400).json({ message: 'Farmer ID is required' });
    }

    // Fetch farmer to auto-fill district/state
    const farmerDoc = await Farmer.findById(farmer);
    if (!farmerDoc) {
      return res.status(404).json({ message: 'Farmer not found' });
    }

    const farm = await Farm.create({
      farmer,
      name,
      district: farmerDoc.district,
      state: farmerDoc.state,
      land_size_acres,
      soil_type: soil_type || 'loamy',
      irrigation_type: irrigation_type || 'rain_fed',
      primary_crops: primary_crops || '',
      latitude: latitude || undefined,
      longitude: longitude || undefined,
      nitrogen_value: nitrogen_value || undefined,
      phosphorus_value: phosphorus_value || undefined,
      potassium_value: potassium_value || undefined,
      soil_ph: soil_ph || undefined,
    });

    // Populate farmer info before returning
    await farm.populate('farmer', 'name phone district state');
    const result = farm.toJSON() as any;
    result.farmer_name = (farm.farmer as any)?.name || 'Unknown';

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/farms/:id/ — Get single farm ───────────────────────────
export const getFarm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const farm = await Farm.findById(req.params.id)
      .populate('farmer', 'name phone district state');

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    const result = farm.toJSON() as any;
    result.farmer_name = (farm.farmer as any)?.name || 'Unknown';
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/farms/:id/ — Update farm ───────────────────────────────
export const updateFarm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allowedFields = [
      'name', 'land_size_acres', 'soil_type', 'irrigation_type',
      'primary_crops', 'latitude', 'longitude', 'nitrogen_value',
      'phosphorus_value', 'potassium_value', 'soil_ph'
    ];

    const updates: Record<string, any> = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const farm: any = await Farm.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('farmer', 'name phone district state');

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    const result = farm.toJSON();
    result.farmer_name = farm.farmer?.name || 'Unknown';
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/farms/:id/ — Delete farm ────────────────────────────
export const deleteFarm = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const farm = await Farm.findByIdAndDelete(req.params.id);

    if (!farm) {
      return res.status(404).json({ message: 'Farm not found' });
    }

    res.json({ message: 'Farm deleted successfully' });
  } catch (err) {
    next(err);
  }
};
