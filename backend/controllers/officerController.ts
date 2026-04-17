import { Request, Response } from 'express';
import Officer from '../models/Officer';
import Consultation from '../models/Consultation';
import { getCurrentKey, executeWithModelAndKeyFallback } from '../utils/geminiClient';

// ─── Officer name banks per state language ──────────────────────────
const STATE_NAMES: Record<string, any> = {
  'Andhra Pradesh':    { first: ['Venkata','Srinivas','Ramesh','Lakshmi','Padma','Raja','Suresh','Anand','Krishna','Vijay'], last: ['Reddy','Naidu','Rao','Sharma','Kumar','Prasad'] },
  'Arunachal Pradesh': ['Tashi Dorji','Nabam Tuki','Pema Khandu','Kiren Rijiju','Rina Tao','Bamin Yani','Takam Pario','Jarjum Ete','Chowna Mein','Taba Hali'],
  'Assam':             { first: ['Bhupen','Jyoti','Hemen','Pranjal','Dimbeswar','Lakshmi','Ritu','Kamal','Debajit','Parag'], last: ['Bora','Das','Hazarika','Sarma','Kalita','Baruah'] },
  'Bihar':             { first: ['Rajesh','Anil','Sunil','Vinod','Manoj','Priya','Sanjay','Ravi','Deepak','Ashok'], last: ['Kumar','Singh','Prasad','Chaudhary','Yadav','Mishra'] },
  'Chhattisgarh':      { first: ['Ramesh','Bhupesh','Tamradhwaj','Champa','Kavita','Sunil','Anil','Renu','Devendra','Prem'], last: ['Sahu','Verma','Patel','Tiwari','Nag','Dewangan'] },
  'Goa':               { first: ['Pramod','Francis','Antonio','Maria','Savio','Fatima','Rajesh','Deepak','Sunita','Nandini'], last: ['Sawant','D\'Souza','Fernandes','Naik','Gawas','Desai'] },
  'Gujarat':           { first: ['Mukesh','Jagdish','Hasmukh','Bharat','Ramesh','Jyoti','Divya','Komal','Tushar','Nitin'], last: ['Patel','Shah','Desai','Modi','Chauhan','Parmar'] },
  'Haryana':           { first: ['Suresh','Ramesh','Satish','Rajbir','Naresh','Sunita','Anita','Sandeep','Vikas','Anil'], last: ['Kumar','Singh','Yadav','Malik','Hooda','Tanwar'] },
  'Himachal Pradesh':  { first: ['Jai','Prem','Virbhadra','Shanta','Suresh','Anil','Rattan','Mukesh','Kamlesh','Asha'], last: ['Singh','Sharma','Thakur','Verma','Chauhan','Negi'] },
  'Jharkhand':         { first: ['Hemant','Babulal','Champa','Draupadi','Raghubar','Suresh','Anil','Binod','Manoj','Sanjay'], last: ['Soren','Murmu','Singh','Oraon','Mahto','Kumar'] },
  'Karnataka':         { first: ['Basavaraj','Siddaramaiah','Yediyurappa','Kumaraswamy','Reshma','Deepa','Venkatesh','Suresh','Raghav','Mahesh'], last: ['Gowda','Shetty','Naik','Patil','Hegde','Rao'] },
  'Kerala':            { first: ['Pinarayi','Oommen','Shashi','Thomas','Rosamma','Deepa','Rajesh','Suresh','Anil','Kumari'], last: ['Vijayan','Chandy','Tharoor','Isaac','Nair','Menon','Pillai','Kurup'] },
  'Madhya Pradesh':    { first: ['Shivraj','Kamal','Digvijay','Uma','Jyoti','Rajesh','Sandeep','Umesh','Anil','Mohan'], last: ['Chouhan','Nath','Singh','Tiwari','Mishra','Patel'] },
  'Maharashtra':       { first: ['Uddhav','Devendra','Ajit','Sharad','Supriya','Amruta','Rajesh','Sachin','Anil','Vinod'], last: ['Thackeray','Fadnavis','Pawar','Patil','Deshmukh','Jadhav'] },
  'Manipur':           { first: ['Biren','Ibobi','Okram','Tomba','Ibemhal','Chanu','Laishram','Yumnam','Thokchom','Akoijam'], last: ['Singh','Devi','Meitei','Sharma','Luwang'] },
  'Meghalaya':         { first: ['Conrad','Mukul','Donkupar','Pynhun','Balajied','Hambok','Kyrmen','Lasborn','Wanjop','Khraw'], last: ['Sangma','Syiemlieh','Lyngdoh','Marbaniang','Rymbai'] },
  'Mizoram':           { first: ['Zoramthanga','Lalduhoma','Lalthanhawla','Vanlalzawma','Zothanpuii','Lalremsiami','Lalbiakzuala','Malsawma','Lalchhuanawma','R.Tlanghmingthanga'], last: [] },
  'Nagaland':          { first: ['Neiphiu','T.R.','Temjen','Shurhozelie','Hekani','Visasolie','Tokheho','Keneizhakho','Neidonuo','Vitshu'], last: ['Rio','Zeliang','Imna','Liezietsu','Jakhalu','Angami'] },
  'Odisha':            { first: ['Naveen','Bijay','Dharmendra','Pratap','Jyoti','Mamata','Dibya','Sasmita','Sudhansu','Brundaban'], last: ['Patnaik','Mohanty','Pradhan','Nayak','Behera','Das'] },
  'Punjab':            { first: ['Bhagwant','Amarinder','Parkash','Sukhbir','Harsimrat','Navjot','Gurpreet','Manpreet','Jaswinder','Kulwinder'], last: ['Mann','Singh','Badal','Kaur','Sidhu','Brar'] },
  'Rajasthan':         { first: ['Ashok','Vasundhara','Sachin','Hanuman','Diya','Raghu','Govind','Babu','Jyoti','Madan'], last: ['Gehlot','Raje','Pilot','Beniwal','Sharma','Meena','Gurjar'] },
  'Sikkim':            { first: ['Prem','Pawan','Bina','Mingma','Tshering','Karma','Sonam','Dawa','Phurba','Nima'], last: ['Tamang','Gurung','Sherpa','Lepcha','Bhutia','Subba'] },
  'Tamil Nadu':        { first: ['Muthuvel','Edappadi','Jayalalithaa','Karunanidhi','Kanimozhi','Sudha','Senthil','Arun','Karthik','Lakshmi'], last: ['Stalin','Palaniswami','Panneerselvam','Ramachandran','Murugan','Kumar'] },
  'Telangana':         { first: ['Kalvakuntla','Bandi','Revanth','Harish','Kavitha','Padma','Suresh','Venkat','Ravi','Srinivas'], last: ['Rao','Reddy','Sagar','Gupta','Naidu','Sharma'] },
  'Tripura':           { first: ['Biplab','Manik','Jishnu','Pratima','Ratan','Bhanulal','Sudip','Nabakumar','Tinku','Sanjay'], last: ['Deb','Sarkar','Debbarma','Saha','Roy','Das'] },
  'Uttar Pradesh':     { first: ['Yogi','Akhilesh','Mayawati','Priyanka','Rajnath','Dinesh','Anita','Suresh','Ramesh','Brij'], last: ['Adityanath','Yadav','Singh','Sharma','Mishra','Verma'] },
  'Uttarakhand':       { first: ['Pushkar','Trivendra','Harish','Tirath','Harak','Indira','Satpal','Madan','Pritam','Kunwar'], last: ['Dhami','Rawat','Singh','Negi','Chauhan','Bisht'] },
  'West Bengal':       { first: ['Mamata','Subhas','Dilip','Abhishek','Mala','Partha','Sourav','Debashis','Tapas','Ananya'], last: ['Banerjee','Ghosh','Chatterjee','Bose','Roy','Mukherjee','Das'] },
};

const DESIGNATIONS = [
  'District Agricultural Officer (DAO)',
  'Block Development Officer (BDO)',
  'Assistant Director of Agriculture',
  'Deputy Director of Agriculture',
  'Agricultural Extension Officer',
  'Horticulture Development Officer',
  'Soil Conservation Officer',
  'Plant Protection Officer',
  'District Horticulture Officer',
  'Krishi Vigyan Kendra (KVK) Head',
  'State Agricultural Research Station Head',
  'Agricultural Technology Manager'
];

const SPECIALIZATIONS = [
  'Crop Production & Management',
  'Soil Health & Fertility Management',
  'Plant Protection & Pest Management',
  'Horticulture Development',
  'Organic Farming & Certification',
  'Water Management & Irrigation',
  'Post-Harvest Technology',
  'Agricultural Marketing',
  'Farm Mechanization',
  'Seed Quality & Certification',
  'Rice Cultivation',
  'Spice Cultivation'
];

const DEPARTMENTS = [
  'Department of Agriculture & Farmers Welfare',
  'Directorate of Agriculture',
  'Krishi Vigyan Kendra',
  'Indian Council of Agricultural Research',
  'State Horticulture Mission',
  'National Horticulture Board'
];

// ─── Deterministic hash for consistent officer data ─────────────────
function simpleHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateOfficerName(state: string, index: number) {
  const nameData = STATE_NAMES[state] || STATE_NAMES['Uttar Pradesh'];
  if (Array.isArray(nameData)) {
    return nameData[index % nameData.length];
  }
  const first = nameData.first[index % nameData.first.length];
  const last = nameData.last[(index + 3) % nameData.last.length];
  return `${first} ${last}`;
}

function generateEmail(name: string, dept: string) {
  const clean = name.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, '.');
  const domains = ['gov.in', 'nic.in', 'agriculture.gov.in'];
  return `${clean}@${domains[simpleHash(name) % domains.length]}`;
}

function generatePhone(state: string, index: number) {
  const prefixes = ['94', '98', '97', '96', '95', '70', '88', '91', '99', '87'];
  const prefix = prefixes[(simpleHash(state) + index) % prefixes.length];
  const num = String(simpleHash(state + index + 'ph') % 100000000).padStart(8, '0');
  return `+91 ${prefix}${num}`;
}

function getLanguages(state: string) {
    const langMap: Record<string, string> = {
      'Andhra Pradesh': 'Telugu, Hindi, English',
      'Assam': 'Assamese, Hindi, English',
      'Bihar': 'Hindi, Bhojpuri, English',
      'Gujarat': 'Gujarati, Hindi, English',
      'Haryana': 'Hindi, English',
      'Karnataka': 'Kannada, Hindi, English',
      'Kerala': 'Malayalam, Hindi, English',
      'Madhya Pradesh': 'Hindi, English',
      'Maharashtra': 'Marathi, Hindi, English',
      'Punjab': 'Punjabi, Hindi, English',
      'Rajasthan': 'Hindi, Rajasthani, English',
      'Tamil Nadu': 'Tamil, Hindi, English',
      'Telangana': 'Telugu, Hindi, English',
      'Uttar Pradesh': 'Hindi, English',
      'West Bengal': 'Bengali, Hindi, English',
    };
    return langMap[state] || 'Hindi, English';
}

// ─── Seed officers for a state/district ─────────────────────────────
export async function seedOfficersForLocation(state: string, district?: string) {
  const count = district ? 6 : 10;
  const officers = [];

  for (let i = 0; i < count; i++) {
    const seed = simpleHash(`${state}${district || ''}${i}`);
    const name = generateOfficerName(state, i);
    const designation = DESIGNATIONS[i % DESIGNATIONS.length];
    const specialization = SPECIALIZATIONS[i % SPECIALIZATIONS.length];
    const department = DEPARTMENTS[i % DEPARTMENTS.length];

    const districtName = district || state;
    const address = `${designation.split('(')[0].trim()} Office, ${districtName}, ${state} - ${String(500000 + (seed % 50000)).padStart(6, '0')}`;

    const officer = await Officer.create({
      name,
      designation,
      department,
      specialization,
      state,
      district: district || 'State Level',
      office_address: address,
      phone: generatePhone(state, i),
      email: generateEmail(name, department),
      available_hours: i % 3 === 0 ? '9:00 AM - 5:00 PM' : i % 3 === 1 ? '10:00 AM - 4:00 PM' : '10:00 AM - 6:00 PM',
      experience_years: 5 + (seed % 25),
      languages: getLanguages(state),
      rating: parseFloat((3.5 + (seed % 15) / 10).toFixed(1)),
      is_available: i % 5 !== 4,
      consultation_fee: i % 4 === 0 ? '₹100' : 'Free'
    });
    officers.push(officer);
  }
  return officers;
}
// ─── Global Seed for startup (Ensures some consultants always exist) ─
export async function seedGlobalConsultants() {
  const count = await Officer.countDocuments();
  if (count < 10) {
    console.log('🌱 Seeding default consultants for main states...');
    const states = ['Uttar Pradesh', 'Maharashtra', 'Karnataka', 'Rajasthan', 'Madhya Pradesh'];
    for (const s of states) {
      await seedOfficersForLocation(s);
    }
    console.log('✅ Default consultants seeded.');
  }
}

// ─── 1) List officers by state/district ─────────────────────────────
export const listOfficers = async (req: Request, res: Response) => {
  try {
    const { state, district, specialization } = req.query as { state?: string; district?: string; specialization?: string };

    // Check DB first
    const query: any = {};
    if (state) query.state = state;
    if (district) query.district = district;
    if (specialization && specialization !== 'All Specializations') query.specialization = specialization;

    let officers = await Officer.find(query).sort({ rating: -1 } as any).limit(30);

    if (officers.length === 0 && state) {
      // Generate officers for this state/district
      officers = await seedOfficersForLocation(state, district);
      if (specialization && specialization !== 'All Specializations') {
        officers = officers.filter(o => o.specialization === specialization);
      }
    }

    res.json({ success: true, data: officers });
  } catch (error) {
    console.error('listOfficers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 2) Get single officer ──────────────────────────────────────────
export const getOfficer = async (req: Request, res: Response) => {
  try {
    const officer = await Officer.findById(req.params.id);
    if (!officer) return res.status(404).json({ success: false, message: 'Officer not found' });
    res.json({ success: true, data: officer });
  } catch (error) {
    console.error('getOfficer error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 3) Book consultation ───────────────────────────────────────────
export const bookConsultation = async (req: Request, res: Response) => {
  try {
    const { farmer, officer, subject, description, consultation_type, preferred_date, preferred_time, farmer_phone, farmer_location, notes } = req.body;

    if (!farmer || !officer || !subject || !preferred_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields: farmer, officer, subject, preferred_date' });
    }

    const consultation = await Consultation.create({
      farmer, officer, subject, description,
      consultation_type: consultation_type || 'phone',
      preferred_date: new Date(preferred_date),
      preferred_time: preferred_time || '10:00 AM',
      farmer_phone, farmer_location, notes,
      status: 'pending'
    });

    const populated = await Consultation.findById(consultation._id)
      .populate('officer', 'name designation phone')
      .populate('farmer', 'name phone');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('bookConsultation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 4) List consultations for a farmer ─────────────────────────────
export const listConsultations = async (req: Request, res: Response) => {
  try {
    const { farmer_id, status } = req.query as { farmer_id: string; status?: string };
    if (!farmer_id) return res.status(400).json({ success: false, message: 'farmer_id is required' });

    const query: any = { farmer: farmer_id };
    if (status) query.status = status;

    const consultations = await Consultation.find(query)
      .sort({ createdAt: -1 } as any)
      .limit(30)
      .populate('officer', 'name designation phone specialization')
      .populate('farmer', 'name phone');

    res.json({ success: true, data: consultations });
  } catch (error) {
    console.error('listConsultations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 5) Cancel a consultation ───────────────────────────────────────
export const cancelConsultation = async (req: Request, res: Response) => {
  try {
    const consultation = await Consultation.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!consultation) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: consultation });
  } catch (error) {
    console.error('cancelConsultation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 5.5) Save AI expert to DB (so it gets a real ObjectId) ─────────
export const saveAIExpert = async (req: Request, res: Response) => {
  try {
    const { name, designation, department, specialization, state, district,
            office_address, phone, email, available_hours, experience_years,
            languages, rating, is_available, consultation_fee } = req.body;

    if (!name || !state) {
      return res.status(400).json({ success: false, message: 'Name and state are required' });
    }

    // Check if already saved
    let officer = await Officer.findOne({ name, state });
    if (officer) {
      return res.json({ success: true, data: officer, existing: true });
    }

    officer = await Officer.create({
      name, designation: designation || 'Agricultural Expert',
      department: department || 'Department of Agriculture',
      specialization: specialization || 'General Agriculture',
      state, district: district || 'State Level',
      office_address: office_address || '',
      phone: phone || '', email: email || '',
      available_hours: available_hours || '10:00 AM - 5:00 PM',
      experience_years: experience_years || 10,
      languages: languages || 'Hindi, English',
      rating: rating || 4.0,
      is_available: is_available !== false,
      consultation_fee: consultation_fee || 'Free'
    });

    console.log(`✅ Saved AI expert to DB: ${name} (${officer._id})`);
    res.status(201).json({ success: true, data: officer });
  } catch (error) {
    console.error('saveAIExpert error:', error);
    res.status(500).json({ success: false, message: 'Failed to save expert' });
  }
};

function getHardcodedExperts(state: string) {
    const langMap: Record<string, string> = {
      'Kerala': 'Malayalam, Hindi, English', 'Tamil Nadu': 'Tamil, Hindi, English',
      'Karnataka': 'Kannada, Hindi, English', 'Andhra Pradesh': 'Telugu, Hindi, English',
      'Telangana': 'Telugu, Hindi, English', 'Maharashtra': 'Marathi, Hindi, English',
      'Gujarat': 'Gujarati, Hindi, English', 'Punjab': 'Punjabi, Hindi, English',
      'West Bengal': 'Bengali, Hindi, English', 'Assam': 'Assamese, Hindi, English',
      'Odisha': 'Odia, Hindi, English', 'Rajasthan': 'Hindi, Rajasthani, English',
      'Bihar': 'Hindi, Bhojpuri, English', 'Madhya Pradesh': 'Hindi, English',
      'Chhattisgarh': 'Hindi, Chhattisgarhi, English', 'Jharkhand': 'Hindi, English',
      'Uttar Pradesh': 'Hindi, English', 'Haryana': 'Hindi, English',
    };
    const langs = langMap[state] || 'Hindi, English';
  
    // State-specific name prefixes
    const nameBank = STATE_NAMES[state];
    const getName = (i: number) => {
      if (!nameBank) return `Dr. Officer ${i + 1}`;
      if (Array.isArray(nameBank)) return nameBank[i % nameBank.length];
      return `Dr. ${nameBank.first[i % nameBank.first.length]} ${nameBank.last[(i + 2) % nameBank.last.length]}`;
    };
  
    const templates = [
      { designation: 'Director of Agriculture', department: `Department of Agriculture & Farmers Welfare, ${state}`, specialization: 'Crop Production & Policy', notable_work: `Leading state-wide crop diversification and soil health programs in ${state}.` },
      { designation: 'Head, Krishi Vigyan Kendra', department: `ICAR - KVK, ${state}`, specialization: 'Soil Health & Fertility Management', notable_work: `Conducted 500+ farmer training programs and soil testing camps across ${state}.` },
      { designation: 'Professor of Agronomy', department: `State Agricultural University, ${state}`, specialization: 'Agronomy & Crop Science', notable_work: `Published 50+ research papers on sustainable farming practices for ${state}'s climate.` },
      { designation: 'Principal Scientist, ICAR', department: `ICAR Regional Research Station, ${state}`, specialization: 'Plant Protection & Pest Management', notable_work: `Developed integrated pest management protocols for major crops in ${state}.` },
      { designation: 'Deputy Director of Horticulture', department: `Directorate of Horticulture, ${state}`, specialization: 'Horticulture Development', notable_work: `Expanded fruit and vegetable cultivation under National Horticulture Mission in ${state}.` },
      { designation: 'Agricultural Extension Officer', department: `District Agriculture Office, ${state}`, specialization: 'Farm Extension & Technology Transfer', notable_work: `Facilitated adoption of modern farming techniques among 10,000+ farmers in ${state}.` },
    ];
  
    return templates.map((t, i) => ({
      _id: `fb_${state.replace(/\s+/g, '_')}_${i}`,
      name: getName(i),
      ...t,
      state,
      district: 'State Level',
      office_address: `${t.designation} Office, ${state}`,
      phone: `+91 ${String(7000000000 + simpleHash(state + i) % 999999999)}`,
      email: `${getName(i).toLowerCase().replace(/[^a-z]/g, '.').replace(/\.+/g, '.').slice(0, 15)}@${i % 2 === 0 ? 'gov.in' : 'icar.gov.in'}`,
      experience_years: 12 + (i * 3),
      languages: langs,
      rating: parseFloat((4.0 + (i % 8) / 10).toFixed(1)),
      is_available: i !== 4,
      consultation_fee: i === 0 ? '₹100' : 'Free',
      available_hours: i % 3 === 0 ? '9:00 AM - 5:00 PM' : i % 3 === 1 ? '10:00 AM - 4:00 PM' : '10:00 AM - 6:00 PM',
    }));
  }

// ─── 6) AI-powered authentic experts list ───────────────────────────
export const getAIExperts = async (req: Request, res: Response) => {
  try {
    const { state } = req.query as { state: string };
    if (!state) {
      return res.status(400).json({ success: false, message: 'State is required' });
    }

    const apiKey = getCurrentKey();
    if (!apiKey) {
      return res.json({ success: true, data: getHardcodedExperts(state), source: 'fallback' });
    }

    const prompt = `You are an Indian agricultural administration expert. Generate details of 6 representative senior agricultural officers and scientists who would typically serve in ${state}, India. These should be realistic profiles based on the typical agricultural administration structure of ${state}.

Return a JSON array. No markdown, no explanation, ONLY the JSON array:
[{"name":"Dr. Example Name","designation":"Director of Agriculture","department":"Department of Agriculture, ${state}","specialization":"Crop Science","office_address":"Directorate of Agriculture, Capital City, ${state}","phone":"0755-2551234","email":"director.agri@mp.gov.in","experience_years":20,"languages":"Hindi, English","rating":4.7,"is_available":true,"consultation_fee":"Free","notable_work":"Pioneered organic farming initiatives across the state"}]

Guidelines:
- Generate culturally appropriate names for ${state}
- Include mix of: State Agriculture Director, KVK Scientist, ICAR Researcher, University Professor, District Agriculture Officer, Horticulture Officer
- Use department names like: Department of Agriculture ${state}, ICAR, Krishi Vigyan Kendra, State Agricultural University
- Use realistic STD code phone numbers for ${state}
- Emails should use domains like gov.in, nic.in, icar.gov.in
- Notable work should relate to ${state}'s key crops and agricultural challenges
- Return exactly 6 entries as a JSON array`;

    console.log(`🤖 Fetching AI experts for ${state}...`);

    const response = await executeWithModelAndKeyFallback(async (key, model) => {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 8192 }
          })
        }
      );
      if (!resp.ok && (resp.status === 429 || resp.status === 403 || resp.status === 404 || resp.status === 503)) {
        throw { status: resp.status, message: `Gemini API Error: ${resp.status}` };
      }
      return resp;
    });

    const result: any = await response.json();

    // Log full response for debugging
    if (!result.candidates || result.candidates.length === 0) {
      console.error('⚠️ Gemini returned no candidates. Full response:', JSON.stringify(result).substring(0, 500));
    }

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      console.error('⚠️ Empty Gemini text. Blocked reason:', result?.candidates?.[0]?.finishReason, 'Prompt feedback:', JSON.stringify(result?.promptFeedback || {}));
      return res.json({ success: true, data: getHardcodedExperts(state), source: 'fallback' });
    }

    let experts;
    try {
      let jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Attempt to repair truncated JSON
      if (jsonStr && !jsonStr.endsWith(']')) {
        const lastBrace = jsonStr.lastIndexOf('}');
        if (lastBrace > 0) {
          jsonStr = jsonStr.substring(0, lastBrace + 1) + ']';
        }
      }

      experts = JSON.parse(jsonStr);
      if (!Array.isArray(experts)) throw new Error('Not an array');
      console.log(`✅ Got ${experts.length} AI experts for ${state}`);
    } catch (parseErr: any) {
      console.error('Failed to parse AI experts:', parseErr.message);
      console.error('Raw text length:', text.length, 'First 300 chars:', text.substring(0, 300));
      experts = getHardcodedExperts(state);
    }

    // Add state field and IDs
    experts = experts.map((e: any, i: number) => ({
      _id: `ai_${state.replace(/\s+/g, '_')}_${i}`,
      ...e,
      state,
      district: 'State Level',
      available_hours: i % 3 === 0 ? '9:00 AM - 5:00 PM' : i % 3 === 1 ? '10:00 AM - 4:00 PM' : '10:00 AM - 6:00 PM',
      rating: e.rating || (4.0 + (i % 10) / 10),
      is_available: e.is_available !== false,
      consultation_fee: e.consultation_fee || 'Free',
      experience_years: e.experience_years || (10 + i * 2),
      languages: e.languages || getLanguages(state),
    }));

    res.json({ success: true, data: experts, source: 'gemini_ai' });
  } catch (error) {
    console.error('getAIExperts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch AI experts' });
  }
};

// ─── 7) Real Government Agriculture Helplines ───────────────────────
const NATIONAL_HELPLINES = [
  {
    name: 'Kisan Call Centre (KCC)',
    number: '1800-180-1551',
    toll_free: true,
    description: 'Free 24/7 helpline by Ministry of Agriculture. Get expert advice on crop management, pest control, fertilizers, weather and government schemes in 22 languages.',
    website: 'https://dackkms.gov.in',
    category: 'General Agriculture',
    icon: '📞',
    hours: '24/7 (All days)',
  },
  {
    name: 'PM-KISAN Helpline',
    number: '155261 / 011-24300606',
    toll_free: true,
    description: 'Helpline for PM Kisan Samman Nidhi Yojana — check payment status, registration issues, Aadhaar linking and beneficiary list queries.',
    website: 'https://pmkisan.gov.in',
    category: 'Government Schemes',
    icon: '💰',
    hours: 'Mon-Fri, 9:30 AM - 6:00 PM',
  },
  {
    name: 'Soil Health Card Helpline',
    number: '1800-180-1551',
    toll_free: true,
    description: 'Get your soil health card, understand soil testing results, and receive crop-specific fertilizer recommendations.',
    website: 'https://soilhealth.dac.gov.in',
    category: 'Soil & Fertilizer',
    icon: '🪨',
    hours: '24/7',
  },
  {
    name: 'IFFCO Kisan Helpline',
    number: '1800-103-1104',
    toll_free: true,
    description: 'Free agriculture advisory by IFFCO. Get real-time mandi prices, weather alerts, expert advice on crop management and best farming practices.',
    website: 'https://www.iffcokisan.com',
    category: 'Advisory & Prices',
    icon: '🌾',
    hours: 'Mon-Sat, 6:00 AM - 10:00 PM',
  },
  {
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    number: '1800-200-7710',
    toll_free: true,
    description: 'Crop insurance helpline — file claims, check policy status, report crop losses due to natural calamities, pests or diseases.',
    website: 'https://pmfby.gov.in',
    category: 'Crop Insurance',
    icon: '🛡️',
    hours: 'Mon-Sat, 9:00 AM - 6:00 PM',
  },
  {
    name: 'NABARD (National Bank for Agriculture)',
    number: '022-26539895 / 1800-102-2525',
    toll_free: true,
    description: 'Rural & agricultural credit, Kisan Credit Card (KCC), SHG loans, and rural development scheme queries.',
    website: 'https://www.nabard.org',
    category: 'Agricultural Finance',
    icon: '🏦',
    hours: 'Mon-Fri, 10:00 AM - 5:30 PM',
  },
  {
    name: 'National Horticulture Board',
    number: '1800-180-4244',
    toll_free: true,
    description: 'Helpline for horticulture crops — fruits, vegetables, flowers, spices, medicinal plants. Get subsidy information and technical guidance.',
    website: 'https://nhb.gov.in',
    category: 'Horticulture',
    icon: '🍎',
    hours: 'Mon-Fri, 9:30 AM - 5:30 PM',
  },
  {
    name: 'Plant Protection Helpline (DPPQ&S)',
    number: '0124-2338512',
    toll_free: false,
    description: 'Directorate of Plant Protection — pest and disease identification, pesticide usage guidelines, import-export phytosanitary certificates.',
    website: 'https://ppqs.gov.in',
    category: 'Plant Protection',
    icon: '🐛',
    hours: 'Mon-Fri, 9:30 AM - 5:30 PM',
  },
  {
    name: 'National Seeds Corporation',
    number: '011-25842360',
    toll_free: false,
    description: 'Certified seed availability, seed quality complaints, and information on latest improved crop varieties.',
    website: 'https://www.indiaseeds.com',
    category: 'Seeds',
    icon: '🌱',
    hours: 'Mon-Fri, 9:30 AM - 5:30 PM',
  },
  {
    name: 'Animal Husbandry Helpline',
    number: '1800-180-1551',
    toll_free: true,
    description: 'Livestock health, vaccination schedules, dairy management, poultry farming and fisheries advisory.',
    website: 'https://dahd.nic.in',
    category: 'Animal Husbandry',
    icon: '🐄',
    hours: '24/7',
  },
];

const STATE_HELPLINES: Record<string, { name: string; number: string; description: string }[]> = {
  'Andhra Pradesh': [
    { name: 'AP Agriculture Helpline', number: '1800-425-1110', description: 'Andhra Pradesh Dept of Agriculture free helpline' },
    { name: 'Rythu Bharosa Call Centre', number: '1902', description: 'AP farmer welfare & input subsidy' },
  ],
  'Assam': [
    { name: 'Assam Agriculture Helpline', number: '1800-345-3988', description: 'Assam Agriculture Department free advisory' },
  ],
  'Bihar': [
    { name: 'Bihar Kisan Helpline', number: '1800-345-6268', description: 'Bihar Agriculture Department free helpline' },
  ],
  'Chhattisgarh': [
    { name: 'CG Agriculture Helpline', number: '1800-233-3663', description: 'Chhattisgarh Dept of Agriculture helpline' },
  ],
  'Gujarat': [
    { name: 'Gujarat Kisan Helpline', number: '1800-180-1551', description: 'Gujarat Agriculture & horticulture advisory' },
    { name: 'iKisan Portal', number: '1800-233-5500', description: 'Gujarat Agri-tech helpline & advisory' },
  ],
  'Haryana': [
    { name: 'Haryana Kisan Helpline', number: '1800-180-2117', description: 'Haryana Dept of Agriculture advisory' },
    { name: 'Meri Fasal Mera Byora', number: '1800-180-2060', description: 'Crop registration & MSP procurement' },
  ],
  'Himachal Pradesh': [
    { name: 'HP Agriculture Helpline', number: '1800-180-8086', description: 'Himachal Pradesh Agriculture Department' },
  ],
  'Jharkhand': [
    { name: 'Jharkhand Kisan Helpline', number: '1800-345-6576', description: 'Jharkhand Agriculture Department free helpline' },
  ],
  'Karnataka': [
    { name: 'Karnataka Agriculture Helpline', number: '1800-425-1553', description: 'Karnataka Dept of Agriculture' },
    { name: 'Raitha Samparka Kendra', number: '080-22212818', description: 'Karnataka farmer contact centre' },
  ],
  'Kerala': [
    { name: 'Kerala Agriculture Helpline', number: '1800-425-1661', description: 'Kerala Agriculture Department free helpline' },
    { name: 'Kerala Karshakan Help Desk', number: '0471-2304480', description: 'State agriculture directorate' },
  ],
  'Madhya Pradesh': [
    { name: 'MP Kisan Helpline', number: '1800-233-1515', description: 'Madhya Pradesh Agriculture Department' },
  ],
  'Maharashtra': [
    { name: 'Maharashtra Krishi Helpline', number: '1800-233-4000', description: 'Maharashtra Agriculture Commissioner Office' },
    { name: 'MAHA DBT Helpline', number: '022-49150800', description: 'Maharashtra Direct Benefit Transfer for farmers' },
  ],
  'Odisha': [
    { name: 'Odisha KALIA Helpline', number: '1800-345-6776', description: 'Krushak Assistance for Livelihood & Income Augmentation' },
  ],
  'Punjab': [
    { name: 'Punjab Agriculture Helpline', number: '1800-180-1551', description: 'Punjab State Agriculture Department' },
    { name: 'Punjab Mandi Board', number: '0172-2791091', description: 'Procurement & mandi prices' },
  ],
  'Rajasthan': [
    { name: 'Rajasthan Agriculture Helpline', number: '1800-180-6127', description: 'Rajasthan Agriculture Department free helpline' },
  ],
  'Tamil Nadu': [
    { name: 'TN Agriculture Helpline', number: '1800-425-1002', description: 'Tamil Nadu Agriculture Department' },
    { name: 'UZHAVAR Call Centre', number: '044-28524894', description: 'Tamil Nadu farmer welfare helpline' },
  ],
  'Telangana': [
    { name: 'Telangana Agriculture Helpline', number: '1800-425-0005', description: 'Telangana Agriculture Department' },
    { name: 'Rythu Bandhu Helpline', number: '040-23385355', description: 'Investment support scheme' },
  ],
  'Uttar Pradesh': [
    { name: 'UP Kisan Helpline', number: '1800-180-1551', description: 'Uttar Pradesh Agriculture Department' },
    { name: 'UP Agriculture Directorate', number: '0522-2204415', description: 'State Directorate of Agriculture' },
  ],
  'West Bengal': [
    { name: 'WB Agriculture Helpline', number: '1800-345-4344', description: 'West Bengal Agriculture Department' },
  ],
};

// Useful agriculture web portals
const USEFUL_PORTALS = [
  { name: 'eNAM (National Agriculture Market)', url: 'https://enam.gov.in', description: 'Online mandi trading platform — check real-time commodity prices across India' },
  { name: 'Agmarknet', url: 'https://agmarknet.gov.in', description: 'Official APMC market prices, arrivals and commodity trends' },
  { name: 'mKisan Portal', url: 'https://mkisan.gov.in', description: 'SMS-based agriculture advisory service — register your mobile for free crop tips' },
  { name: 'Kisan Suvidha App', url: 'https://play.google.com/store/apps/details?id=in.gov.mkisan', description: 'Official government app — weather, market prices, dealers, advisory, soil health' },
  { name: 'PM-KISAN Portal', url: 'https://pmkisan.gov.in', description: 'Check your PM-KISAN payment status, registration, and beneficiary list' },
  { name: 'PMFBY Crop Insurance', url: 'https://pmfby.gov.in', description: 'Crop insurance — calculate premium, file claims, check policy status' },
  { name: 'Soil Health Dashboard', url: 'https://soilhealth.dac.gov.in', description: 'Check your soil health card, get fertilizer recommendations' },
  { name: 'India Meteorological Dept', url: 'https://mausam.imd.gov.in', description: 'Weather forecasts, rainfall data, cyclone warnings for agriculture planning' },
];

export const getGovernmentHelplines = async (req: Request, res: Response) => {
  try {
    const { state } = req.query as { state?: string };

    const stateLines = state && STATE_HELPLINES[state]
      ? STATE_HELPLINES[state].map(h => ({ ...h, toll_free: true, category: `${state} State`, icon: '🏛️' }))
      : [];

    res.json({
      success: true,
      data: {
        national: NATIONAL_HELPLINES,
        state: stateLines,
        state_name: state || null,
        portals: USEFUL_PORTALS,
      },
    });
  } catch (error) {
    console.error('getGovernmentHelplines error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch helplines' });
  }
};
