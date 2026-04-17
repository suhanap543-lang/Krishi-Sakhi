import { Request, Response } from 'express';
import Scheme from '../models/Scheme';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGenAI, getCurrentKey, GEMINI_MODELS } from '../utils/geminiClient';

// ─── Comprehensive static scheme data ───────────────────────────────
const NATIONAL_SCHEMES = [
  {
    name: 'Pradhan Mantri Kisan Samman Nidhi (PM-KISAN)',
    category: 'national', state: 'All India',
    department: 'Ministry of Agriculture & Farmers Welfare',
    description: 'Direct income support of ₹6,000 per year to small and marginal farmer families, paid in three equal instalments of ₹2,000 every four months.',
    highlights: ['₹6,000/year direct transfer', '3 instalments of ₹2,000 each', 'Over 11 crore beneficiaries', 'No land size restriction since 2019', 'Linked to Aadhaar for verification'],
    eligibility: 'All farmer families with cultivable land regardless of size of land holding',
    benefits: 'Direct cash transfer of ₹6,000 per annum in 3 instalments',
    official_url: 'https://pmkisan.gov.in',
    launch_year: '2019', status: 'active',
    tags: ['income support', 'direct benefit', 'PM scheme']
  },
  {
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    category: 'national', state: 'All India',
    department: 'Ministry of Agriculture & Farmers Welfare',
    description: 'Comprehensive crop insurance scheme providing financial support to farmers suffering crop loss due to natural calamities, pest attacks, and diseases.',
    highlights: ['Premium: 2% for Kharif, 1.5% for Rabi', 'Coverage from sowing to post-harvest', 'Use of satellite imagery & drones for assessment', 'Claim settlement within 2 months', 'Covers all food & oilseed crops'],
    eligibility: 'All farmers growing notified crops in notified areas, both loanee and non-loanee',
    benefits: 'Full insured sum coverage against crop loss with minimal premium',
    official_url: 'https://pmfby.gov.in',
    launch_year: '2016', status: 'active',
    tags: ['crop insurance', 'risk management', 'disaster protection']
  },
  {
    name: 'PM Kisan Maandhan Yojana',
    category: 'national', state: 'All India',
    department: 'Ministry of Agriculture & Farmers Welfare',
    description: 'Pension scheme for small and marginal farmers providing ₹3,000 per month pension after the age of 60 years.',
    highlights: ['₹3,000/month pension after age 60', 'Contribution: ₹55-200/month based on age', 'Equal government contribution', 'Voluntary scheme', 'Covers small & marginal farmers'],
    eligibility: 'Small and marginal farmers aged 18-40 years with cultivable land up to 2 hectares',
    benefits: 'Monthly pension of ₹3,000 after attaining the age of 60 years',
    official_url: 'https://maandhan.in/shramyogi',
    launch_year: '2019', status: 'active',
    tags: ['pension', 'social security', 'old age']
  },
  {
    name: 'Soil Health Card Scheme',
    category: 'national', state: 'All India',
    department: 'Department of Agriculture, Cooperation & Farmers Welfare',
    description: 'Scheme to provide soil health cards to farmers with crop-wise recommendations of nutrients and fertilizers required for individual farms.',
    highlights: ['Free soil testing every 2 years', 'Crop-wise nutrient recommendations', 'GPS-based soil sampling', 'Over 23 crore cards issued', 'Reduces fertilizer wastage by 8-10%'],
    eligibility: 'All farmers across India',
    benefits: 'Free soil health card with detailed soil analysis and fertilizer recommendations',
    official_url: 'https://soilhealth.dac.gov.in',
    launch_year: '2015', status: 'active',
    tags: ['soil health', 'fertilizer', 'testing']
  },
  {
    name: 'Kisan Credit Card (KCC)',
    category: 'national', state: 'All India',
    department: 'Ministry of Finance / NABARD',
    description: 'Provides farmers with affordable credit for crop production, post-harvest expenses, and maintenance of farm assets at subsidized interest rates.',
    highlights: ['Interest rate: 4% with prompt repayment', 'Credit limit up to ₹3 lakh', 'Coverage for crop, dairy, fisheries', 'Personal accident insurance of ₹50,000', 'ATM-enabled smart card'],
    eligibility: 'All farmers, tenant farmers, sharecroppers, SHGs, and joint liability groups',
    benefits: 'Short-term crop loans at subsidized 4% interest rate',
    official_url: 'https://www.pmkisan.gov.in/KCC.aspx',
    launch_year: '1998', status: 'active',
    tags: ['credit', 'loans', 'finance']
  },
  {
    name: 'National Mission For Sustainable Agriculture (NMSA)',
    category: 'national', state: 'All India',
    department: 'Ministry of Agriculture & Farmers Welfare',
    description: 'Promotes sustainable agriculture through integrated farming, water use efficiency, soil health management, and climate change adaptation.',
    highlights: ['Rainfed area development', 'On-farm water management', 'Soil Health Management', 'Climate change adaptation', 'Subsidy up to 50% on micro-irrigation'],
    eligibility: 'All farmers, with priority to rain-fed and resource-poor farmers',
    benefits: 'Subsidies for micro-irrigation, organic farming, and capacity building',
    official_url: 'https://nmsa.dac.gov.in',
    launch_year: '2014', status: 'active',
    tags: ['sustainable', 'irrigation', 'organic']
  },
  {
    name: 'Paramparagat Krishi Vikas Yojana (PKVY)',
    category: 'national', state: 'All India',
    department: 'Ministry of Agriculture & Farmers Welfare',
    description: 'Promotes organic farming across India by forming cluster-based groups and providing financial support for organic certification and inputs.',
    highlights: ['₹50,000/hectare over 3 years', 'Organic certification support', 'Cluster-based approach (50 farmers)', 'PGS certification', 'Market linkage support'],
    eligibility: 'Farmer groups willing to adopt organic farming in clusters of 20-50 hectares',
    benefits: '₹50,000 per hectare for 3 years for organic farming adoption',
    official_url: 'https://pgsindia-ncof.gov.in/PKVY/index.aspx',
    launch_year: '2015', status: 'active',
    tags: ['organic farming', 'certification', 'cluster']
  },
  {
    name: 'e-NAM (National Agriculture Market)',
    category: 'national', state: 'All India',
    department: 'Ministry of Agriculture & Farmers Welfare',
    description: 'Pan-India electronic trading portal networking existing APMCs to create a unified national market for agricultural commodities.',
    highlights: ['1,361 mandis connected', 'Online transparent bidding', 'Direct payment to farmers', 'Real-time price discovery', 'Reduces intermediary costs'],
    eligibility: 'All farmers, traders, and commission agents in e-NAM connected mandis',
    benefits: 'Better price discovery and direct digital payment for produce',
    official_url: 'https://enam.gov.in',
    launch_year: '2016', status: 'active',
    tags: ['market', 'e-commerce', 'mandi']
  },
  {
    name: 'Pradhan Mantri Krishi Sinchai Yojana (PMKSY)',
    category: 'national', state: 'All India',
    department: 'Ministry of Agriculture & Ministry of Jal Shakti',
    description: 'Aims to provide irrigation to every farm (Har Khet Ko Pani) through water use efficiency and micro-irrigation promotion.',
    highlights: ['55% subsidy on micro-irrigation', '90% subsidy for drip (small farmers)', 'Per Drop More Crop component', 'Watershed development', 'Command area development'],
    eligibility: 'All farmers with focus on small and marginal farmers',
    benefits: 'Subsidized drip and sprinkler irrigation systems',
    official_url: 'https://pmksy.gov.in',
    launch_year: '2015', status: 'active',
    tags: ['irrigation', 'water', 'drip', 'sprinkler']
  },
  {
    name: 'Agriculture Infrastructure Fund (AIF)',
    category: 'national', state: 'All India',
    department: 'Ministry of Agriculture & Farmers Welfare',
    description: '₹1 lakh crore financing facility for post-harvest management infrastructure and community farming assets.',
    highlights: ['3% interest subvention', 'Credit guarantee up to ₹2 crore', '₹1 lakh crore fund', 'Cold storage, warehouses', 'FPOs and cooperatives eligible'],
    eligibility: 'Farmers, FPOs, PACS, agri-entrepreneurs, startups',
    benefits: 'Subsidized loans for farm infrastructure with 3% interest subvention',
    official_url: 'https://agriinfra.dac.gov.in',
    launch_year: '2020', status: 'active',
    tags: ['infrastructure', 'cold storage', 'warehouse', 'post-harvest']
  }
];

const STATE_SCHEMES: Record<string, any[]> = {
  'Andhra Pradesh': [
    { name: 'YSR Rythu Bharosa', description: 'Investment support of ₹13,500/year for farmer families for crop investment, combining state support with PM-KISAN', highlights: ['₹13,500/year per farmer family', 'Covers tenant farmers too', 'Direct digital bank transfer', 'Covers Kharif & Rabi seasons'], official_url: 'https://ysrrythubharosa.ap.gov.in', launch_year: '2019', tags: ['income support', 'investment'] },
    { name: 'YSR Free Crop Insurance', description: 'Free crop insurance for all farmers in Andhra Pradesh without any premium payment — state government pays 100% premium on behalf of farmers.', highlights: ['Zero premium for farmers', 'Covers all major crops', 'Automatic enrollment via AP Agri Portal', 'State pays full PMFBY premium'], official_url: 'https://apagrisnet.gov.in', launch_year: '2020', tags: ['insurance', 'free'] },
    { name: 'Anna Canteen Scheme (for beneficiaries)', description: 'Subsidized food for farm laborers and underprivileged rural workers', highlights: ['₹5 meals for agricultural workers', 'State-operated canteens', 'Over 200 canteen locations'], official_url: 'https://ap.gov.in', launch_year: '2019', tags: ['welfare', 'food'] },
  ],
  'Assam': [
    { name: 'Mukhya Mantri Krishi Sa-Sajuli Yojana', description: 'Free farm equipment (power tiller, sprayer, weeder etc.) to small and marginal farmers in Assam for mechanization of agriculture', highlights: ['Free farm tools worth ₹5,000-₹1 lakh', 'Targets small & marginal farmers', 'Power tiller at subsidized rate', 'Covers weeding and spraying equipment'], official_url: 'https://agri.assam.gov.in', launch_year: '2017', tags: ['mechanization', 'tools'] },
    { name: 'Chief Minister Samagra Gramya Unnayan Yojana', description: 'Holistic rural development scheme covering agriculture, fisheries, dairy, piggery and rural livelihood across all village clusters in Assam', highlights: ['Multi-sector rural development', '₹10 lakh per village', 'Farm mechanization support', 'Livelihood & SHG support'], official_url: 'https://cmsguy.assam.gov.in', launch_year: '2017', tags: ['rural development'] },
  ],
  'Bihar': [
    { name: 'Bihar Rajya Fasal Sahayata Yojana', description: 'State crop assistance providing financial aid for crop damage exceeding 20%, as an alternative to PMFBY', highlights: ['₹7,500/hectare for 20% crop damage', '₹10,000/hectare for >20% damage', 'Max 2 hectares per farmer', 'Covers rice, wheat, maize, lentils'], official_url: 'https://pacsonline.bih.nic.in/fsy', launch_year: '2018', tags: ['crop assistance', 'disaster'] },
    { name: 'Bihar Diesel Anudan Yojana', description: 'Subsidy on diesel for irrigation pumps used by small and marginal farmers for paddy and other crops', highlights: ['₹50/litre diesel subsidy', 'Max ₹400 per acre per season', 'Direct transfer to bank account', 'Covers 3 irrigations per season'], official_url: 'https://dbtagriculture.bihar.gov.in', launch_year: '2016', tags: ['irrigation', 'diesel', 'subsidy'] },
  ],
  'Chhattisgarh': [
    { name: 'Rajiv Gandhi Kisan Nyay Yojana', description: 'Input subsidy for paddy, maize, sugarcane, soybean, groundnut, sesame, arhar, kodo-kutki and other crops in Chhattisgarh', highlights: ['₹9,000/acre for paddy farmers', '₹10,000-₹13,000/acre for other crops', 'Direct bank payment in 4 instalments', 'Benefits 18+ lakh farmer families'], official_url: 'https://rgkny.cg.nic.in', launch_year: '2020', tags: ['input subsidy', 'direct benefit'] },
    { name: 'Godhan Nyay Yojana', description: 'Purchase of cow dung from farmers and cattle herders to promote natural / organic farming and generate additional income', highlights: ['₹2/kg cow dung purchase', 'Income for animal rearing farmers', 'Promotes organic farming', 'Vermi-compost production'], official_url: 'https://cgstate.gov.in', launch_year: '2020', tags: ['organic', 'animal husbandry'] },
  ],
  'Goa': [
    { name: 'Bhatkari Scheme', description: 'Special scheme for paddy field farming support in Goa with input subsidies and mechanization support', highlights: ['Input cost subsidy for paddy', 'Mechanization support', 'SHG-based farming encouraged', 'Conservation of traditional paddy varieties'], official_url: 'https://agri.goa.gov.in', launch_year: '2016', tags: ['paddy', 'mechanization'] },
    { name: 'Goa Cashew Development Program', description: 'Financial assistance for cashew plantation rejuvenation, planting material, and value addition for cashew farmers of Goa', highlights: ['Free cashew grafts', '50% subsidy on irrigation equipment', 'Processing unit support', 'Market linkage through GDCL'], official_url: 'https://agri.goa.gov.in', launch_year: '2018', tags: ['cashew', 'horticulture', 'plantation'] },
  ],
  'Gujarat': [
    { name: 'Kisan Suryoday Yojana', description: 'Dedicated power lines providing 16-hour daytime electricity (5 AM to 9 PM) to farmers for irrigation pumps across Gujarat', highlights: ['16 hours daytime electricity', 'Dedicated HT agriculture feeder', 'Reduces diesel generator costs', 'Over 3,500 sub-stations covered'], official_url: 'https://guj-epd.gov.in', launch_year: '2020', tags: ['electricity', 'irrigation'] },
    { name: 'IKHEDUT Farmer Welfare Portal', description: 'Online portal providing subsidies on agricultural equipment, seeds, irrigation infrastructure, and farm inputs to Gujarat farmers', highlights: ['Single window for all agriculture subsidies', 'Online application process', 'Covers 36+ types of subsidy schemes', 'Real-time application tracking'], official_url: 'https://ikhedut.gujarat.gov.in', launch_year: '2011', tags: ['subsidy', 'portal', 'equipment'] },
  ],
  'Haryana': [
    { name: 'Meri Fasal Mera Byora', description: 'Online crop registration portal linking farmers to MSP procurement, crop insurance, and input subsidy through a single platform', highlights: ['Online crop & land registration', 'MSP procurement linkage', 'Automatic crop insurance enrollment', 'Direct input subsidy transfer'], official_url: 'https://fasal.haryana.gov.in', launch_year: '2019', tags: ['registration', 'MSP', 'insurance'] },
    { name: 'Mukhya Mantri Bagwani Bima Yojana', description: 'Horticulture crop insurance scheme for vegetable and fruit farmers in Haryana at very minimal premium', highlights: ['Very low premium (2.5-5%)', 'Covers 21 vegetable crops', 'Covers 8 fruit crops', 'Compensation up to ₹30,000/acre'], official_url: 'https://hortharyana.gov.in', launch_year: '2021', tags: ['horticulture', 'insurance', 'vegetables'] },
  ],
  'Himachal Pradesh': [
    { name: 'Mukhyamantri Khet Sanrakshan Yojana', description: 'Financial assistance for fencing of farm land to protect crops from wildlife and stray animals in Himachal Pradesh hills', highlights: ['50% subsidy on solar fencing', 'Covers barbed wire fencing', 'Max ₹1.5 lakh per beneficiary', 'Priority to apple and vegetable growers'], official_url: 'https://hpagriculture.com', launch_year: '2017', tags: ['crop protection', 'fencing', 'wildlife'] },
    { name: 'HP Prakritik Kheti Khushhal Kisaan Yojana', description: 'Natural farming promotion scheme in Himachal Pradesh providing training, inputs, and certification support for zero-budget natural farming', highlights: ['Free natural farming training', 'Cow rearing incentive', 'PGS organic certification', 'Market premium support', 'State subsidy for bio-inputs'], official_url: 'https://hpnaturalfarming.gov.in', launch_year: '2018', tags: ['natural farming', 'organic', 'certification'] },
  ],
  'Jharkhand': [
    { name: 'Jharkhand Fasal Rahat Yojana', description: 'Crop relief scheme for Jharkhand farmers replacing PMFBY, providing direct compensation for crop loss due to drought, flood, and other natural calamities', highlights: ['State-funded crop relief scheme', 'No premium payment by farmer', 'Coverage for all major crops', 'Direct transfer to bank account'], official_url: 'https://jrfry.jharkhand.gov.in', launch_year: '2022', tags: ['crop relief', 'disaster', 'compensation'] },
    { name: 'Mukhyamantri Sukha Rahat Yojana', description: 'Drought relief scheme providing financial assistance to drought-affected farmers in Jharkhand', highlights: ['₹3,500 per hectare drought compensation', 'Covers all crop-producing farmers', 'Online registration via JJB portal', 'Linked to Aadhaar verification'], official_url: 'https://msry.jharkhand.gov.in', launch_year: '2022', tags: ['drought', 'relief', 'compensation'] },
  ],
  'Karnataka': [
    { name: 'Raitha Siri Scheme', description: 'Integrated farming system approach for sustainable agriculture providing ₹50,000 to farmers for multi-component farm development in Karnataka', highlights: ['₹50,000 per farmer', 'Covers 5 components of integrated farming', 'Training and capacity building', 'Soil health and water conservation focus'], official_url: 'https://raitamitra.karnataka.gov.in', launch_year: '2018', tags: ['integrated farming'] },
    { name: 'Bhoosampada — Karnataka Land Records', description: 'Digital land records and farm data management for Karnataka farmers for subsidy and scheme access', highlights: ['Online RTC and mutation records', 'Farm land digitization', 'Linked to scheme eligibility', 'Instant RTC download'], official_url: 'https://landrecords.karnataka.gov.in', launch_year: '2015', tags: ['land records', 'digital', 'RTC'] },
  ],
  'Kerala': [
    { name: 'Kerala State Paddy Cultivation Promotion', description: 'Special package for paddy cultivation with MSP bonus of ₹13/kg above central MSP, free seeds, and mechanization to revive rice farming in Kerala', highlights: ['MSP bonus of ₹13/kg above central MSP', 'Free certified seeds and fertilizers', 'Mechanization subsidy', 'Group farming encouragement'], official_url: 'https://www.keralaagriculture.gov.in', launch_year: '2016', tags: ['paddy', 'rice', 'MSP'] },
    { name: 'SUBHIKSHA Keralam', description: 'Mission for food security through diversified agriculture including vegetable cultivation in all available land including homesteads and fallow lands', highlights: ['Vegetable self-sufficiency mission', 'Coconut development program', 'Organic farming promotion', 'Fallow land cultivation incentive'], official_url: 'https://keralaagriculture.gov.in/subhiksha-keralam', launch_year: '2020', tags: ['food security', 'organic', 'vegetable'] },
  ],
  'Madhya Pradesh': [
    { name: 'Mukhyamantri Kisan Kalyan Yojana', description: 'Additional ₹4,000/year over PM-KISAN for all PM-KISAN eligible farmers of MP, making total support ₹10,000/year to each farmer family', highlights: ['₹4,000/year over PM-KISAN', 'Total ₹10,000/year per family', '2 instalments of ₹2,000 each', 'Direct bank transfer'], official_url: 'https://mpkrishi.mp.gov.in', launch_year: '2020', tags: ['income support', 'direct benefit'] },
    { name: 'MP eUparjan — MSP Procurement Portal', description: 'Online wheat and paddy MSP procurement portal for MP farmers to register and sell their produce directly to government at MSP', highlights: ['Online crop registration for MSP', 'Time-slot based procurement', 'Within 48 hours of weighment', 'Direct payment to bank account'], official_url: 'https://mpeuparjan.nic.in', launch_year: '2016', tags: ['MSP', 'procurement', 'wheat'] },
  ],
  'Maharashtra': [
    { name: 'Nanaji Deshmukh Krushi Sanjeevani Yojana (PoCRA)', description: 'Climate-resilient agriculture project for 15 drought-prone districts of Vidarbha and Marathwada, World Bank funded', highlights: ['Climate-resilient farming techniques', '15 drought-prone districts covered', '₹4,000 crore World Bank project', 'Farm pond scheme', 'Crop diversification support'], official_url: 'https://mahapocra.gov.in', launch_year: '2018', tags: ['climate', 'drought', 'resilience'] },
    { name: 'Mahatma Jyotirao Phule Shetkari Karja Mukti Yojana', description: 'Crop loan waiver scheme for eligible farmers in Maharashtra covering short-term crop loans up to ₹2 lakh', highlights: ['Loan waiver up to ₹2 lakh', 'Covers short-term crop loans', '₹25,000 incentive for timely repayment', 'Covers 50+ lakh farmers'], official_url: 'https://kvmy.mahaonline.gov.in', launch_year: '2019', tags: ['loan waiver', 'debt relief'] },
  ],
  'Manipur': [
    { name: 'Chief Minister Faydakari Yojana', description: 'Comprehensive farmer welfare scheme providing income support and crop insurance to farmers in Manipur', highlights: ['₹5,000/acre input support', 'Free crop insurance', 'Farm mechanization subsidy', 'Priority to marginal farmers'], official_url: 'https://agri.manipur.gov.in', launch_year: '2019', tags: ['income support', 'insurance'] },
    { name: 'Manipur Hill Area Development Programme', description: 'Agricultural development for hill district farmers with focus on horticulture and traditional crop promotion', highlights: ['Jhum cultivation support', 'Horticulture promotion', 'Organic farming incentive', 'Traditional crop preservation'], official_url: 'https://agri.manipur.gov.in', launch_year: '2017', tags: ['hill farming', 'horticulture', 'organic'] },
  ],
  'Meghalaya': [
    { name: 'Meghalaya Chief Minister Agriculture Mission (CMAM)', description: 'Comprehensive agricultural development mission to double farmer income through productivity enhancement and market access in Meghalaya', highlights: ['End-to-end farming support', 'Market linkage for tribal farmers', 'FPO formation support', 'Integrated pest management'], official_url: 'https://agri.meghalaya.gov.in', launch_year: '2018', tags: ['mission', 'income doubling', 'market'] },
  ],
  'Mizoram': [
    { name: 'New Land Use Policy (NLUP)', description: 'Comprehensive livelihood scheme replacing jhum cultivation with settled irrigation farming, horticulture and plantation crops in Mizoram', highlights: ['Shift from jhum/slash-burn farming', '₹1 lakh per family for alternative farming', 'Plantation crop development', 'Irrigation infrastructure support'], official_url: 'https://nlupmz.nic.in', launch_year: '2011', tags: ['land use', 'horticulture', 'plantation'] },
  ],
  'Nagaland': [
    { name: 'Nagaland State Agriculture Budget — Farmer Support', description: 'Integrated farmer support covering seeds, fertilizers, pest management and capacity building for Nagaland farmers', highlights: ['Free improved variety seeds', 'Subsidized fertilizers', 'Farmer training programs', 'Focus on terrace farming'], official_url: 'https://agri.nagaland.gov.in', launch_year: '2015', tags: ['seeds', 'fertilizer', 'training'] },
  ],
  'Odisha': [
    { name: 'KALIA (Krushak Assistance for Livelihood and Income Augmentation)', description: 'Comprehensive support scheme providing ₹10,000/year for crop cultivation + livelihood support + insurance for all farming and landless families in Odisha', highlights: ['₹10,000/year for cultivation', '₹12,500 for vulnerable farmers', '₹2 lakh life insurance cover', 'Interest-free crop loans'], official_url: 'https://kalia.odisha.gov.in', launch_year: '2019', tags: ['income support', 'insurance'] },
    { name: 'Odisha Millets Mission', description: 'State mission to promote cultivation of millets (ragi, bajra, jowar) with MSP procurement and nutritional awareness', highlights: ['MSP procurement of millets', 'Input subsidy for millet cultivation', 'Processing and value addition support', 'Nutritional awareness campaigns'], official_url: 'https://omm.odisha.gov.in', launch_year: '2017', tags: ['millets', 'MSP', 'nutrition'] },
  ],
  'Punjab': [
    { name: 'Punjab Mandi Board Direct Payment', description: 'Direct MSP payment to wheat and paddy farmers within 48 hours of sale through digital platform linked to Aadhaar', highlights: ['48-hour MSP payment guarantee', 'Direct digital transfer', 'Linked to Aadhaar', 'Covers wheat and paddy'], official_url: 'https://www.mandiboard.punjab.gov.in', launch_year: '2020', tags: ['MSP', 'digital payment'] },
    { name: 'Punjab Crop Residue Management Scheme', description: 'Financial incentive and equipment support for farmers to avoid stubble burning and manage crop residue in an eco-friendly way', highlights: ['₹2,500/acre for in-situ management', 'Free equipment through PRTC', 'Happy Seeder promotion', 'Reduces air pollution'], official_url: 'https://agripb.gov.in', launch_year: '2018', tags: ['residue management', 'environment', 'stubble'] },
  ],
  'Rajasthan': [
    { name: 'Mukhyamantri Krishak Sathi Yojana', description: 'Accident insurance scheme providing ₹2 lakh death benefit and disability compensation to farmers and agricultural workers in Rajasthan', highlights: ['₹2 lakh accident death benefit', '₹50,000-₹1.5 lakh disability cover', 'Free enrollment for all farmers', 'Covers agricultural laborers'], official_url: 'https://rajkisan.rajasthan.gov.in', launch_year: '2021', tags: ['accident insurance', 'safety'] },
    { name: 'Rajasthan Kisan Sathi App & Raj Kisan Portal', description: 'Single digital platform for Rajasthan farmers to apply for all government agriculture schemes, subsidies and services', highlights: ['Single-window for 150+ schemes', 'Online application tracking', 'Mandi price information', 'Government subsidy calculator'], official_url: 'https://rajkisan.rajasthan.gov.in', launch_year: '2019', tags: ['portal', 'digital', 'subsidy'] },
  ],
  'Sikkim': [
    { name: 'Sikkim Organic Mission', description: 'Sikkim has achieved 100% organic state status. This mission supports farmers with organic inputs, certification and marketing for their produce', highlights: ['100% organic certified state', 'Free organic inputs', 'PGS organic certification', 'Premium market access'], official_url: 'https://sikkim.gov.in/departments/agriculture', launch_year: '2010', tags: ['organic', 'certification', '100% organic'] },
  ],
  'Tamil Nadu': [
    { name: 'Tamil Nadu Mission on Sustainable Dryland Agriculture', description: 'Comprehensive scheme for dryland farming with farm ponds, drought-resistant seed varieties, and soil moisture conservation in TN', highlights: ['Farm pond construction subsidy', 'Drought-resistant variety distribution', 'Micro-irrigation subsidy', 'Soil moisture conservation techniques'], official_url: 'https://www.tn.gov.in/scheme/data_view/agriculture', launch_year: '2017', tags: ['dryland', 'water conservation'] },
    { name: 'Uzhavar Sandhai (Farmer Markets)', description: 'Government-backed direct-to-consumer farmer markets across Tamil Nadu allowing farmers to sell directly without middlemen', highlights: ['Zero middleman commission', '240+ markets across TN', 'Government storage support', 'Fair pricing for consumers and farmers'], official_url: 'https://www.tn.gov.in/dept/agriculture', launch_year: '2005', tags: ['market linkage', 'direct sell'] },
  ],
  'Telangana': [
    { name: 'Rythu Bandhu', description: 'Investment support of ₹10,000/acre/year for all land-owning farmer families in Telangana, paid before every sowing season', highlights: ['₹10,000/acre/year (₹5,000 per season)', 'No income cap', 'Pre-sowing distribution', 'Over 60 lakh farmer beneficiaries'], official_url: 'https://rythubandhu.telangana.gov.in', launch_year: '2018', tags: ['investment support', 'direct benefit'] },
    { name: 'Rythu Bima (Farmer Life Insurance)', description: 'Free life and accident insurance for all farmer families in Telangana — state pays entire premium', highlights: ['₹5 lakh life insurance', 'State pays 100% premium', 'Covers 58 lakh farmers', 'No age restriction'], official_url: 'https://rythubima.telangana.gov.in', launch_year: '2018', tags: ['insurance', 'life cover'] },
  ],
  'Tripura': [
    { name: 'Muktidhara Tripura Water Resource Scheme', description: 'Irrigation development scheme for paddy and vegetable farmers in Tripura providing water resource infrastructure', highlights: ['Small lift irrigation units', 'Low-cost drip irrigation', 'Tank renovation for water storage', 'Fish-paddy integrated farming'], official_url: 'https://agri.tripura.gov.in', launch_year: '2017', tags: ['irrigation', 'water', 'paddy'] },
  ],
  'Uttar Pradesh': [
    { name: 'UP Kisan Uday Yojana', description: 'Free solar pump sets to farmers in UP for irrigation replacing diesel pumps, targeting 10 lakh farmers', highlights: ['Free solar pump sets (2-10 HP)', 'Reduces electricity & diesel cost', 'No grid dependency', 'Priority to small farmers'], official_url: 'https://upagriculture.com', launch_year: '2022', tags: ['solar', 'irrigation', 'energy'] },
    { name: 'Pardarshi Kisan Seva Yojana (UP)', description: 'Transparent farmer service portal of UP providing subsidies on seeds, fertilizer, farm equipment & agrochemicals via DBT', highlights: ['Online subsidy application', 'Direct bank transfer (DBT)', 'Seed, fertilizer & equipment subsidy', 'Farmer registration & tracking'], official_url: 'https://upagriculture.com', launch_year: '2014', tags: ['subsidy', 'DBT', 'portal'] },
  ],
  'Uttarakhand': [
    { name: 'Uttarakhand Parvatiya Agriculture Package', description: 'Special agricultural development package for hill district farmers in Uttarakhand covering seed, irrigation and mechanization support', highlights: ['Subsidized polyhouse for vegetable farming', 'Terrace farming support', 'Hill area micro-irrigation scheme', 'Horticulture development subsidy'], official_url: 'https://agriculture.uk.gov.in', launch_year: '2016', tags: ['hill farming', 'horticulture', 'polyhouse'] },
    { name: 'Mukhyamantri Krishi Protsahan Yojana (Uttarakhand)', description: 'Incentive scheme encouraging youth to take up agriculture in Uttarakhand with startup support and input subsidies', highlights: ['₹50,000 for young farmer startups', 'Agri entrepreneur development', 'Organic farm promotion', 'Market linkage support'], official_url: 'https://agriculture.uk.gov.in', launch_year: '2020', tags: ['youth', 'startup', 'organic'] },
  ],
  'West Bengal': [
    { name: 'Krishak Bandhu', description: 'Financial assistance of ₹10,000/year per acre for all cultivating farmers in West Bengal (min ₹2,000 for <1 acre) with ₹2 lakh death benefit', highlights: ['₹10,000/acre/year (2 instalments)', '₹2 lakh death/accident benefit', 'Covers 72 lakh farmer families', 'Minimum ₹2,000 for smallest holdings'], official_url: 'https://krishakbandhu.net', launch_year: '2019', tags: ['income support', 'death benefit'] },
    { name: 'Sabar Shasya Bima Yojana', description: 'State crop insurance scheme for West Bengal farmers providing coverage beyond PMFBY with easier claim settlement', highlights: ['Simple claim settlement process', 'Covers all notified crops', 'Premium subsidy from state govt', 'Mobile-based loss reporting'], official_url: 'https://wb.gov.in/government-schemes.aspx', launch_year: '2020', tags: ['crop insurance', 'claim'] },
  ],
};



// ─── Gemini fallback disabled — all schemes are verified static data ─
async function fetchSchemesFromGemini(_state: string) {
  return null; // Never use AI-generated scheme data
}

// ─── Seed schemes into DB ───────────────────────────────────────────
async function seedSchemes(state?: string) {
    const toInsert: any[] = [];
  
    // Always add national schemes
    const existingNational = await Scheme.countDocuments({ category: 'national' });
    if (existingNational === 0) {
      for (const s of NATIONAL_SCHEMES) {
        toInsert.push(s);
      }
    }
  
    // Add state-specific schemes
    if (state && state !== 'All India') {
      const existingState = await Scheme.countDocuments({ state, category: 'state' });
      if (existingState === 0) {
        // Try static data first
        const staticSchemes = STATE_SCHEMES[state] || [];
        for (const s of staticSchemes) {
          toInsert.push({
            ...s,
            category: 'state',
            state,
            department: `${state} Department of Agriculture`,
            status: 'active',
          });
        }

      }
    }
  
    if (toInsert.length > 0) {
      await Scheme.insertMany(toInsert);
    }
  
    // Fetch all
    const query: any = {};
    if (state && state !== 'All India') query.$or = [{ state }, { state: 'All India', category: 'national' }];
    return Scheme.find(query).sort({ category: 1, launch_year: -1 } as any);
}

// ─── 1) List schemes by state ───────────────────────────────────────
export const listSchemes = async (req: Request, res: Response) => {
  try {
    const { state, category } = req.query as { state?: string; category?: string };

    // Check if we have schemes in DB for this state
    const dbQuery: any = {};
    if (state && state !== 'All India') dbQuery.$or = [{ state }, { state: 'All India', category: 'national' }];
    if (category === 'national') dbQuery.category = 'national';
    if (category === 'state') dbQuery.category = 'state';

    let schemes = await Scheme.find(dbQuery).sort({ category: 1, launch_year: -1 } as any);

    if (schemes.length === 0) {
      // Seed from static data + optional Gemini
      schemes = await seedSchemes(state);
    }

    // Filter by category if needed
    if (category === 'national') {
      schemes = schemes.filter(s => s.category === 'national');
    } else if (category === 'state') {
      schemes = schemes.filter(s => s.category === 'state');
    }

    res.json({ success: true, data: schemes });
  } catch (error) {
    console.error('listSchemes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 2) Get single scheme details ───────────────────────────────────
export const getScheme = async (req: Request, res: Response) => {
  try {
    const scheme = await Scheme.findById(req.params.id);
    if (!scheme) return res.status(404).json({ success: false, message: 'Scheme not found' });
    res.json({ success: true, data: scheme });
  } catch (error) {
    console.error('getScheme error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── 3) Search schemes ──────────────────────────────────────────────
export const searchSchemes = async (req: Request, res: Response) => {
  try {
    const { q } = req.query as { q: string };
    if (!q) return res.json({ success: true, data: [] });

    const schemes = await Scheme.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ]
    }).limit(20);

    res.json({ success: true, data: schemes });
  } catch (error) {
    console.error('searchSchemes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
