"""
Soil Health & Fertility Assessment API
---------------------------------------
FastAPI service that wraps the pre-trained Random Forest classifier
to predict soil fertility and provide actionable biological recommendations.

Runs on port 8002 (separate from crop recommendation API on 8001).
"""

import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

import os
import pickle
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uvicorn

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="Soil Health & Fertility API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Load model
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "soil_fertility_model.pkl")

try:
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    MODEL_LOADED = True
    print("[OK] Soil fertility model loaded successfully")
except FileNotFoundError:
    MODEL_LOADED = False
    print(f"[WARN] Model file not found at {MODEL_PATH}")
except Exception as e:
    MODEL_LOADED = False
    print(f"[ERR] Failed to load model: {e}")

# ---------------------------------------------------------------------------
# Constants — thresholds derived from dataset analysis
# ---------------------------------------------------------------------------
FERTILITY_LABELS = {0: "Less Fertile", 1: "Fertile", 2: "Highly Fertile"}

# Optimal ranges for each parameter (based on agronomic standards & dataset)
OPTIMAL_RANGES = {
    "N":  {"low": 150, "high": 300, "unit": "kg/ha",  "name": "Nitrogen"},
    "P":  {"low": 7,   "high": 15,  "unit": "kg/ha",  "name": "Phosphorous"},
    "K":  {"low": 300, "high": 600, "unit": "kg/ha",  "name": "Potassium"},
    "ph": {"low": 6.5, "high": 7.5, "unit": "",       "name": "pH"},
    "ec": {"low": 0.3, "high": 0.8, "unit": "dS/m",   "name": "Electrical Conductivity"},
    "oc": {"low": 0.5, "high": 1.0, "unit": "%",      "name": "Organic Carbon"},
    "S":  {"low": 5,   "high": 15,  "unit": "mg/kg",  "name": "Sulfur"},
    "zn": {"low": 0.3, "high": 0.8, "unit": "mg/kg",  "name": "Zinc"},
    "fe": {"low": 2.0, "high": 8.0, "unit": "mg/kg",  "name": "Iron"},
    "cu": {"low": 0.5, "high": 1.5, "unit": "mg/kg",  "name": "Copper"},
    "Mn": {"low": 2.0, "high": 10,  "unit": "mg/kg",  "name": "Manganese"},
    "B":  {"low": 0.3, "high": 1.5, "unit": "mg/kg",  "name": "Boron"},
}

# Expanded biological recommendations — multiple products per nutrient
BIO_RECOMMENDATIONS = {
    "N": [
        {"product": "Azotobacter Biofertilizer", "type": "biofertilizer", "dosage": "2-3 kg/acre mixed with 50 kg FYM", "timing": "At sowing or transplanting", "description": "Free-living nitrogen-fixing bacteria that convert atmospheric N₂ into plant-available ammonium (NH₄⁺). Fixes 20-40 kg N/ha/year. Produces growth-promoting hormones (IAA, gibberellins) that enhance root development.", "mechanism": "Biological N₂ fixation via nitrogenase enzyme complex"},
        {"product": "Azospirillum Inoculant", "type": "biofertilizer", "dosage": "2 kg/acre as seed treatment or soil drench", "timing": "Before sowing; re-apply at 30 days", "description": "Associative nitrogen-fixing bacteria effective for cereals (rice, wheat, maize). Fixes 20-25 kg N/ha and produces phytohormones promoting root elongation and tillering.", "mechanism": "Rhizosphere colonization + N₂ fixation + auxin production"},
        {"product": "Rhizobium Legume Inoculant", "type": "biofertilizer", "dosage": "200g per 10 kg seed as slurry treatment", "timing": "Seed treatment before sowing legumes", "description": "Symbiotic N-fixer for legumes (soybean, chickpea, lentil, groundnut). Forms root nodules fixing 50-300 kg N/ha. Most efficient biological N source for pulse crops.", "mechanism": "Root nodule symbiosis via nod factor signaling"},
        {"product": "Neem Cake Organic Amendment", "type": "organic", "dosage": "250-500 kg/ha as basal application", "timing": "2-3 weeks before sowing", "description": "Slow-release organic nitrogen source (5-6% N). Acts as nitrification inhibitor, keeping N in ammonium form longer for better plant uptake. Also controls soil-borne nematodes and insects.", "mechanism": "Organic N mineralization + nitrification inhibition"},
    ],
    "P": [
        {"product": "Phosphorus Solubilizing Bacteria (PSB)", "type": "biofertilizer", "dosage": "2-3 kg/acre as soil application", "timing": "At sowing; mix with FYM or compost", "description": "Bacillus megaterium and Pseudomonas striata cultures solubilize inorganic phosphates by producing organic acids (citric, gluconic, oxalic). Makes 15-25% of fixed P available to plants.", "mechanism": "Organic acid secretion dissolving Ca₃(PO₄)₂, FePO₄, AlPO₄"},
        {"product": "Vesicular Arbuscular Mycorrhiza (VAM)", "type": "biofertilizer", "dosage": "5-10 kg/acre mixed into root zone", "timing": "At transplanting or sowing", "description": "Symbiotic fungi (Glomus spp.) extending root surface area by 100-1000x through hyphal networks. Enhances P uptake from larger soil volume. Also improves drought tolerance and soil aggregation.", "mechanism": "Extraradical mycelium network + phosphatase enzyme production"},
        {"product": "Rock Phosphate + PSB Combo", "type": "organic", "dosage": "Rock phosphate: 200-400 kg/ha + PSB: 2 kg/acre", "timing": "Rock phosphate 3-4 weeks before sowing; PSB at sowing", "description": "Slow-release natural P source activated by PSB. The bacteria produce acids that dissolve rock phosphate, providing sustained P availability over the cropping season. Cost-effective for acidic soils.", "mechanism": "Microbial solubilization of mineral phosphate"},
    ],
    "K": [
        {"product": "Potassium Mobilizing Bacteria (KMB)", "type": "biofertilizer", "dosage": "2-3 kg/acre with 50 kg FYM", "timing": "At sowing or first irrigation", "description": "Frateuria aurantia-based formulation that solubilizes fixed potassium from feldspar and mica minerals. Mobilizes 25-30 kg K/ha from soil reserves. Produces organic acids and capsular polysaccharides.", "mechanism": "Acid-mediated dissolution of K-bearing silicate minerals"},
        {"product": "Wood Ash Application", "type": "organic", "dosage": "500-1000 kg/ha as broadcast", "timing": "Before field preparation; mix into top 15cm", "description": "Natural potassium source containing 3-7% K₂O plus calcium, magnesium, and trace minerals. Also raises soil pH (useful for acidic soils). Rich in carbonates that improve soil structure.", "mechanism": "Direct K₂CO₃ dissolution + pH improvement"},
        {"product": "Banana Stem Compost", "type": "organic", "dosage": "2-3 tonnes/acre", "timing": "During field preparation, 2-3 weeks before sowing", "description": "Extremely rich in potassium (3-5% K₂O). Adds organic matter, improves water retention, and provides slow-release K. Excellent circular economy practice in banana-growing regions.", "mechanism": "Organic matter decomposition releasing K⁺ ions"},
    ],
    "ph": [
        {"product": "Agricultural Lime (for acidic soils)", "type": "amendment", "dosage": "2-4 tonnes/ha based on buffer pH", "timing": "3-4 weeks before sowing; incorporate into top 20cm", "description": "Calcitic limestone (CaCO₃) neutralizes soil acidity by consuming H⁺ ions. Raises pH by 0.5-1.0 units. Releases Ca²⁺ which improves soil structure and reduces aluminum toxicity.", "mechanism": "CaCO₃ + 2H⁺ → Ca²⁺ + H₂O + CO₂"},
        {"product": "Dolomite Lime (for acidic + Mg-deficient)", "type": "amendment", "dosage": "2-3 tonnes/ha", "timing": "4-6 weeks before sowing", "description": "CaMg(CO₃)₂ corrects both acidity and magnesium deficiency simultaneously. Slower acting than calcitic lime but provides dual benefits. Essential when soil Mg < 50 ppm.", "mechanism": "Dual acid neutralization + Mg²⁺ supplementation"},
        {"product": "Elemental Sulfur (for alkaline soils)", "type": "amendment", "dosage": "200-500 kg/ha based on pH", "timing": "6-8 weeks before sowing (needs microbial oxidation)", "description": "Thiobacillus bacteria oxidize S⁰ to H₂SO₄, lowering pH. Slow-acting but long-lasting. Most effective at reducing pH from 8.5+ to below 7.5 in calcareous soils.", "mechanism": "S⁰ → SO₄²⁻ + 2H⁺ via Thiobacillus oxidation"},
        {"product": "Gypsum (for sodic/alkaline soils)", "type": "amendment", "dosage": "3-5 tonnes/ha based on ESP", "timing": "Before monsoon rains for natural leaching", "description": "Calcium sulfate (CaSO₄·2H₂O) replaces Na⁺ on clay particles with Ca²⁺, reducing soil sodicity. Does not change pH directly but improves soil permeability and reduces dispersion.", "mechanism": "Na⁺ displacement from exchange complex by Ca²⁺"},
    ],
    "oc": [
        {"product": "Trichoderma viride Culture", "type": "biofertilizer", "dosage": "2-3 kg/acre mixed with 200 kg FYM", "timing": "Apply enriched FYM 2-3 weeks before sowing", "description": "Cellulolytic fungus accelerating decomposition of crop residues and organic matter. Produces enzymes (cellulase, chitinase) that break down complex organics. Also suppresses soil-borne pathogens (Fusarium, Rhizoctonia).", "mechanism": "Enzymatic cellulose/hemicellulose degradation + biocontrol"},
        {"product": "Vermicompost Application", "type": "organic", "dosage": "3-5 tonnes/acre", "timing": "During field preparation; incorporate into root zone", "description": "Earthworm-processed organic matter with 1.5-2.5% N, 0.8-1.5% P₂O₅, 0.8-1.2% K₂O. Rich in humic acids, beneficial microbes, and plant growth hormones. Improves soil CEC and water-holding capacity by 20-30%.", "mechanism": "Humification + microbial enrichment + enzyme-rich castings"},
        {"product": "Green Manuring (Dhaincha/Sunhemp)", "type": "practice", "dosage": "Seed rate: 40-50 kg/ha; incorporate at 45-60 days", "timing": "Before main crop season (pre-monsoon ideal)", "description": "Fast-growing legumes (Sesbania/Crotalaria) adding 8-15 tonnes fresh biomass/ha. Fixes 60-80 kg N/ha via Rhizobium symbiosis. Increases OC by 0.1-0.2% per season. Suppresses weeds and improves soil biology.", "mechanism": "In-situ biomass addition + biological N fixation"},
        {"product": "Biochar Application", "type": "amendment", "dosage": "2-5 tonnes/ha", "timing": "Once during field preparation; long-lasting effect", "description": "Pyrolyzed biomass with extremely stable carbon (100+ year residence time). Increases soil OC, CEC, water retention, and provides habitat for beneficial microbes. Adsorbs nutrients reducing leaching losses.", "mechanism": "Recalcitrant C sequestration + microporous microbial habitat"},
    ],
    "S": [
        {"product": "Thiobacillus Biofertilizer", "type": "biofertilizer", "dosage": "2 kg/acre with 25-50 kg elemental S", "timing": "At sowing or basal application", "description": "Sulfur-oxidizing bacteria converting elemental S to plant-available sulfate (SO₄²⁻). Accelerates S oxidation 3-5x compared to natural rate. Effective in neutral-alkaline soils.", "mechanism": "S⁰ → H₂SO₃ → SO₄²⁻ via enzymatic oxidation"},
        {"product": "Gypsum (CaSO₄) Application", "type": "amendment", "dosage": "200-400 kg/ha", "timing": "Before sowing; broadcast and incorporate", "description": "Provides both sulfur (18% S) and calcium (23% Ca). Immediately plant-available sulfate form. Also improves soil structure in sodic soils and supplies calcium for fruit crops.", "mechanism": "Direct SO₄²⁻ dissolution in soil solution"},
    ],
    "zn": [
        {"product": "Zinc Solubilizing Bacteria (ZSB)", "type": "biofertilizer", "dosage": "2-3 kg/acre as soil drench", "timing": "At sowing; re-apply at 30 days", "description": "Bacillus and Pseudomonas strains solubilizing ZnO, ZnCO₃, and Zn₃(PO₄)₂ through organic acid production. Makes native soil Zn available without chemical inputs. Effective in alkaline calcareous soils.", "mechanism": "Chelation + acid dissolution of insoluble Zn compounds"},
        {"product": "Zinc Sulfate (ZnSO₄) Application", "type": "chemical", "dosage": "Soil: 25 kg/ha; Foliar: 0.5% solution", "timing": "Basal at sowing + 2 foliar sprays at 25 & 45 DAS", "description": "Most common Zn source (33% Zn, 15% S). Soil application lasts 2-3 seasons. Foliar spray gives rapid correction of visible deficiency symptoms (white banding in cereals).", "mechanism": "Direct Zn²⁺ supply via ionic dissolution"},
        {"product": "Zn-EDTA Chelated Micronutrient", "type": "chemical", "dosage": "Foliar: 0.1-0.2% solution; Soil: 5-10 kg/ha", "timing": "Foliar spray at critical growth stages", "description": "Chelated zinc stays available across wide pH range (4-9). Superior foliar absorption compared to inorganic salts. 2-3x more efficient than ZnSO₄ on per-unit basis.", "mechanism": "EDTA chelation preventing Zn precipitation"},
    ],
    "fe": [
        {"product": "Iron Chelate (Fe-EDDHA)", "type": "chemical", "dosage": "Soil: 5-10 kg/ha; Foliar: 0.1% solution", "timing": "Soil at planting; Foliar at deficiency onset", "description": "Most effective Fe source for alkaline soils (pH > 7.5). EDDHA chelate remains stable up to pH 11, unlike EDTA (stable only to pH 6.5). Prevents iron chlorosis in fruit trees, grapes, and ornamentals.", "mechanism": "EDDHA chelation maintaining Fe³⁺ solubility at high pH"},
        {"product": "Ferrous Sulfate (FeSO₄)", "type": "chemical", "dosage": "Soil: 25-50 kg/ha; Foliar: 1% solution + 0.1% citric acid", "timing": "Soil at field prep; Foliar every 15 days until correction", "description": "Cost-effective Fe source (19% Fe). Foliar application with citric acid as chelating agent improves absorption. Soil application effective only in acidic soils (pH < 6.5).", "mechanism": "Direct Fe²⁺ supply (acidic conditions) or foliar uptake"},
        {"product": "Siderophore-Producing Bacteria", "type": "biofertilizer", "dosage": "2 kg/acre as root zone application", "timing": "At transplanting; re-apply monthly", "description": "Pseudomonas fluorescens strains producing siderophores (pyoverdine) that chelate Fe³⁺ from insoluble oxides. Makes iron available while suppressing Fe-dependent pathogens. Dual nutrition + biocontrol benefit.", "mechanism": "Microbial siderophore-mediated Fe³⁺ solubilization"},
    ],
    "cu": [
        {"product": "Copper Sulfate (CuSO₄)", "type": "chemical", "dosage": "Soil: 5-10 kg/ha; Foliar: 0.2-0.3% solution", "timing": "Soil at field prep; Foliar at vegetative stage", "description": "Standard Cu source (25% Cu). Essential for photosynthesis, lignin formation, and pollen viability. Deficiency common in organic/peaty soils and sandy soils with high pH.", "mechanism": "Direct Cu²⁺ ionic supply"},
        {"product": "Cu-EDTA Chelated Micronutrient", "type": "chemical", "dosage": "Foliar: 0.05-0.1% solution", "timing": "2-3 sprays during active growth", "description": "Chelated copper for efficient foliar uptake. Stays in solution across pH range. More effective than CuSO₄ for rapid deficiency correction.", "mechanism": "EDTA chelation improving Cu translocation in phloem"},
    ],
    "Mn": [
        {"product": "Manganese Sulfate (MnSO₄)", "type": "chemical", "dosage": "Soil: 10-25 kg/ha; Foliar: 0.5% solution", "timing": "Foliar preferred at 25 and 45 DAS", "description": "Primary Mn source (30% Mn). Foliar application more effective than soil in alkaline soils where Mn rapidly oxidizes to unavailable MnO₂. Critical for photosynthesis (water-splitting in PSII).", "mechanism": "Direct Mn²⁺ supply via foliar/soil route"},
        {"product": "Mn-EDTA Chelated Micronutrient", "type": "chemical", "dosage": "Foliar: 0.2% solution", "timing": "At early vegetative + pre-flowering stages", "description": "Chelated form remains available in alkaline conditions where MnSO₄ would precipitate. Superior crop response in calcareous soils. Prevents interveinal chlorosis.", "mechanism": "Protected Mn²⁺ delivery via chelation"},
        {"product": "Soil Acidification (for alkaline soils)", "type": "practice", "dosage": "Elemental S: 100-200 kg/ha + organic acids", "timing": "Before planting season", "description": "In alkaline soils (pH > 8), Mn converts to insoluble MnO₂. Acidifying the root zone with sulfur or organic acids mobilizes native Mn reserves. Combine with Mn foliar spray for immediate + long-term correction.", "mechanism": "pH reduction increasing Mn²⁺ solubility"},
    ],
    "B": [
        {"product": "Borax (Na₂B₄O₇·10H₂O)", "type": "chemical", "dosage": "Soil: 5-10 kg/ha; Foliar: 0.1-0.2% solution", "timing": "Soil at field prep; Foliar at pre-flowering", "description": "Standard boron source (11% B). Critical for pollen germination, cell wall integrity, sugar transport, and flowering. Deficiency causes hollow stem in brassicas, heart rot in beet, and poor fruit set.", "mechanism": "Direct borate ion supply for cell wall pectin cross-linking"},
        {"product": "Solubor (Na₂B₈O₁₃·4H₂O)", "type": "chemical", "dosage": "Foliar: 0.15-0.25% solution", "timing": "2-3 sprays: pre-bloom, full bloom, fruit set", "description": "Highly soluble boron (20.5% B) designed for foliar application. Faster uptake than borax. Ideal for fruit crops, vegetables, and oilseeds where B demand peaks at flowering.", "mechanism": "Rapid foliar absorption of borate"},
        {"product": "Organic Boron (Humic-B Complexes)", "type": "organic", "dosage": "2-3 L/acre as soil drench", "timing": "At planting + 30 days", "description": "Boron complexed with humic/fulvic acids for sustained release. Reduces B leaching in sandy soils. The humic carrier improves overall nutrient uptake and soil microbial activity.", "mechanism": "Controlled-release B via humic acid chelation"},
    ],
    "ec": [
        {"product": "Gypsum Soil Conditioner", "type": "amendment", "dosage": "3-5 tonnes/ha based on soil ESP", "timing": "Before monsoon; broadcast + incorporate", "description": "Replaces sodium on clay exchange sites with calcium, reducing sodicity and improving water infiltration. Provides Ca²⁺ and SO₄²⁻ without raising pH. The gold standard for saline-sodic soil reclamation.", "mechanism": "Na⁺ displacement + flocculation of dispersed clay"},
        {"product": "Organic Mulching + Leaching", "type": "practice", "dosage": "5-8 cm mulch layer + 3-4 leaching irrigations", "timing": "Post-harvest period before next season", "description": "Mulch reduces surface evaporation that concentrates salts. Sequential leaching with good quality water flushes salts below root zone. Combine with sub-surface drainage for permanent solution.", "mechanism": "Evaporation reduction + salt leaching below root zone"},
        {"product": "Halophyte Cover Cropping", "type": "practice", "dosage": "Seed rate varies by species", "timing": "During fallow period or as intercrop", "description": "Salt-tolerant crops (Suaeda, Salicornia, salt-tolerant barley) extract Na⁺/Cl⁻ from soil via bioaccumulation. Biomass removed physically extracts salts. Also adds organic matter and improves soil biology.", "mechanism": "Phytoremediation via Na⁺/Cl⁻ hyperaccumulation"},
    ],
}

# Crop suitability based on soil parameter combinations
CROP_SUITABILITY_MATRIX = {
    "high_N_high_K": {"crops": ["Rice", "Wheat", "Maize", "Sugarcane", "Banana"], "note": "Heavy feeders suit your high N+K soil"},
    "high_N_low_K":  {"crops": ["Leafy Vegetables", "Spinach", "Amaranth", "Lettuce"], "note": "Leafy crops thrive on high N; supplement K"},
    "low_N_high_K":  {"crops": ["Pulses", "Groundnut", "Soybean", "Chickpea"], "note": "Legumes fix their own N; your high K supports pod development"},
    "low_N_low_K":   {"crops": ["Millets", "Sorghum", "Pearl Millet", "Cowpea"], "note": "Hardy, low-input crops suited to nutrient-poor soils"},
    "acidic":        {"crops": ["Tea", "Coffee", "Blueberry", "Potato", "Sweet Potato"], "note": "Acid-loving crops thrive at your soil pH"},
    "alkaline":      {"crops": ["Barley", "Cotton", "Beet", "Asparagus", "Date Palm"], "note": "Alkaline-tolerant crops for your high pH soil"},
    "high_oc":       {"crops": ["Vegetables", "Strawberry", "Herbs", "Flowers"], "note": "High organic carbon supports intensive horticulture"},
    "low_oc":        {"crops": ["Dryland Crops", "Bajra", "Jowar", "Castor"], "note": "Low organic matter suits dryland farming systems"},
    "saline":        {"crops": ["Barley", "Beet", "Date Palm", "Cotton", "Mustard"], "note": "Salt-tolerant crops for your high EC soil"},
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class SoilInput(BaseModel):
    N: float = Field(..., ge=0, description="Nitrogen (kg/ha)")
    P: float = Field(..., ge=0, description="Phosphorous (kg/ha)")
    K: float = Field(..., ge=0, description="Potassium (kg/ha)")
    ph: float = Field(..., ge=0, le=14, description="Soil pH")
    ec: float = Field(..., ge=0, description="Electrical Conductivity (dS/m)")
    oc: float = Field(..., ge=0, description="Organic Carbon (%)")
    S: float = Field(..., ge=0, description="Sulfur (mg/kg)")
    zn: float = Field(..., ge=0, description="Zinc (mg/kg)")
    fe: float = Field(..., ge=0, description="Iron (mg/kg)")
    cu: float = Field(..., ge=0, description="Copper (mg/kg)")
    Mn: float = Field(..., ge=0, description="Manganese (mg/kg)")
    B: float = Field(..., ge=0, description="Boron (mg/kg)")


class NutrientStatus(BaseModel):
    parameter: str
    name: str
    value: float
    unit: str
    status: str          # "low", "optimal", "high"
    optimal_range: str   # e.g. "150-300"
    severity: str = ""   # "mild", "moderate", "severe" for deficiencies/excesses
    impact: str = ""     # what this means for crops


class BioProduct(BaseModel):
    product: str
    type: str            # "biofertilizer", "organic", "chemical", "amendment", "practice"
    dosage: str
    timing: str
    description: str
    mechanism: str


class BioRecommendation(BaseModel):
    parameter: str
    name: str
    status: str          # "low" or "high"
    severity: str        # "mild", "moderate", "severe"
    products: List[BioProduct]
    crop_impact: str     # how this deficiency affects crops


class MicrobialAssessment(BaseModel):
    overall_microbial_health: str     # "Poor", "Fair", "Good", "Excellent"
    microbial_score: float            # 0-100
    organic_matter_status: str
    biological_activity_indicators: List[Dict[str, str]]
    recommended_microbial_inputs: List[Dict[str, str]]


class NPKBalance(BaseModel):
    n_p_ratio: float
    n_k_ratio: float
    p_k_ratio: float
    balance_status: str               # "Balanced", "N-dominant", "P-deficient", etc.
    interpretation: str
    correction_advice: str


class CropSuitability(BaseModel):
    category: str
    crops: List[str]
    note: str
    match_score: str  # "High", "Medium", "Low"


class HealthReport(BaseModel):
    report_grade: str                 # "A", "B", "C", "D", "F"
    report_title: str
    microbial_assessment: MicrobialAssessment
    npk_balance: NPKBalance
    crop_suitability: List[CropSuitability]
    soil_type_inference: str
    remediation_priority: List[Dict[str, str]]
    estimated_recovery_timeline: str
    seasonal_calendar: List[Dict[str, str]]
    soil_biology_tips: List[str]


class SoilHealthOutput(BaseModel):
    fertility_class: str
    fertility_code: int
    confidence: float
    class_probabilities: Dict[str, float]
    soil_health_index: float
    nutrient_analysis: List[NutrientStatus]
    deficiencies: List[str]
    excesses: List[str]
    bio_recommendations: List[BioRecommendation]
    health_report: HealthReport
    summary: str


# ---------------------------------------------------------------------------
# Analysis logic
# ---------------------------------------------------------------------------
# Impact descriptions for each nutrient
NUTRIENT_IMPACTS = {
    "N":  {"low": "Stunted growth, yellowing of older leaves, poor tillering in cereals, reduced protein content in grains", "high": "Excessive vegetative growth, delayed maturity, lodging risk, increased pest/disease susceptibility"},
    "P":  {"low": "Poor root development, delayed flowering, purple/bronze leaf discoloration, reduced seed/fruit formation", "high": "Zinc and iron uptake interference, potential water pollution through runoff"},
    "K":  {"low": "Weak stems, leaf margin scorching, poor drought tolerance, reduced fruit quality and storage life", "high": "Calcium and magnesium uptake suppression, potential salt stress"},
    "ph": {"low": "Aluminum/manganese toxicity, phosphorus lockout, reduced microbial activity, poor nutrient availability", "high": "Iron/zinc/manganese deficiency, phosphorus fixation with calcium, reduced B and Cu availability"},
    "ec": {"low": "Generally OK — indicates low dissolved salts", "high": "Salt stress, plasmolysis, osmotic drought, poor germination, leaf burn, reduced yields"},
    "oc": {"low": "Poor soil structure, low water-holding capacity, reduced microbial diversity, nutrient leaching, compaction", "high": "Generally beneficial; may temporarily immobilize N during decomposition"},
    "S":  {"low": "Uniform leaf yellowing (unlike N, affects young leaves first), reduced oil content in oilseeds, poor protein quality", "high": "Rarely toxic; may indicate industrial contamination"},
    "zn": {"low": "Interveinal chlorosis, stunted internodes, white banding in cereals, poor grain filling, reduced disease resistance", "high": "Root damage, Fe and Mn uptake interference"},
    "fe": {"low": "Interveinal chlorosis in young leaves (lime-induced chlorosis), poor chlorophyll formation, white/yellow new growth", "high": "Fe toxicity (bronzing) especially in waterlogged rice paddies"},
    "cu": {"low": "Wilting of young leaves, poor pollen viability, dieback in fruit trees, lightening of leaf color", "high": "Root growth inhibition, Fe deficiency symptoms"},
    "Mn": {"low": "Interveinal chlorosis (checkerboard pattern), grey speck in oats, marsh spot in peas, poor seed set", "high": "Mn toxicity: brown spots, crinkled leaves (common in acid waterlogged soils)"},
    "B":  {"low": "Hollow stem in brassicas, heart rot in beet, corky core in apple, poor pollen tube growth, blossom drop", "high": "Leaf tip/margin necrosis (boron toxicity), reduced growth"},
}


def get_severity(value: float, low: float, high: float, status: str) -> str:
    """Categorize deviation severity."""
    if status == "optimal":
        return ""
    range_width = high - low if high > low else 1
    if status == "low":
        deficit_pct = ((low - value) / range_width) * 100 if range_width > 0 else 0
        if deficit_pct > 60:
            return "severe"
        elif deficit_pct > 25:
            return "moderate"
        return "mild"
    else:  # high
        excess_pct = ((value - high) / range_width) * 100 if range_width > 0 else 0
        if excess_pct > 60:
            return "severe"
        elif excess_pct > 25:
            return "moderate"
        return "mild"


def analyze_nutrients(data: SoilInput) -> tuple:
    """Analyze each nutrient against optimal ranges with severity and impact."""
    analysis = []
    deficiencies = []
    excesses = []

    for param, ranges in OPTIMAL_RANGES.items():
        value = getattr(data, param)
        low = ranges["low"]
        high = ranges["high"]

        if value < low:
            status = "low"
            deficiencies.append(param)
        elif value > high:
            status = "high"
            excesses.append(param)
        else:
            status = "optimal"

        severity = get_severity(value, low, high, status)
        impact_data = NUTRIENT_IMPACTS.get(param, {})
        impact = impact_data.get(status, "") if status != "optimal" else "Within optimal range — no corrective action needed"

        analysis.append(NutrientStatus(
            parameter=param,
            name=ranges["name"],
            value=round(value, 3),
            unit=ranges["unit"],
            status=status,
            optimal_range=f"{low}-{high}",
            severity=severity,
            impact=impact,
        ))

    return analysis, deficiencies, excesses


def compute_soil_health_index(probabilities: Dict[str, float], deficiencies: list, excesses: list) -> float:
    """
    Compute a 0-100 Soil Health Index:
    - 60% weight from model probability distribution
    - 40% weight from nutrient balance (penalty for deficiencies/excesses)
    """
    model_score = (
        probabilities.get("Less Fertile", 0) * 20 +
        probabilities.get("Fertile", 0) * 60 +
        probabilities.get("Highly Fertile", 0) * 100
    )
    total_params = len(OPTIMAL_RANGES)
    optimal_count = total_params - len(deficiencies) - len(excesses)
    balance_score = (optimal_count / total_params) * 100
    shi = (0.6 * model_score) + (0.4 * balance_score)
    return round(min(max(shi, 0), 100), 1)


def get_bio_recommendations(deficiencies: list, excesses: list, data: SoilInput) -> List[BioRecommendation]:
    """Generate expanded biological product recommendations with multiple products per nutrient."""
    recs = []

    for param in deficiencies:
        if param not in BIO_RECOMMENDATIONS:
            continue
        value = getattr(data, param)
        low = OPTIMAL_RANGES[param]["low"]
        high = OPTIMAL_RANGES[param]["high"]
        severity = get_severity(value, low, high, "low")
        impact = NUTRIENT_IMPACTS.get(param, {}).get("low", "")
        products_data = BIO_RECOMMENDATIONS[param]

        products = [BioProduct(**p) for p in products_data]
        recs.append(BioRecommendation(
            parameter=param,
            name=OPTIMAL_RANGES[param]["name"],
            status="low",
            severity=severity,
            products=products,
            crop_impact=impact,
        ))

    for param in excesses:
        if param not in BIO_RECOMMENDATIONS:
            continue
        value = getattr(data, param)
        low = OPTIMAL_RANGES[param]["low"]
        high = OPTIMAL_RANGES[param]["high"]
        severity = get_severity(value, low, high, "high")
        impact = NUTRIENT_IMPACTS.get(param, {}).get("high", "")
        products_data = BIO_RECOMMENDATIONS[param]

        # For excess, provide correction products + reduce advice
        excess_products = [
            BioProduct(
                product=f"Reduce {OPTIMAL_RANGES[param]['name']} Inputs",
                type="practice",
                dosage="Reduce/stop relevant fertilizer application",
                timing="Immediate — reassess after next soil test",
                description=f"Current {OPTIMAL_RANGES[param]['name']} is {value} {OPTIMAL_RANGES[param]['unit']} (optimal: {low}-{high}). "
                            f"Stop or reduce {param}-containing fertilizers. Consider crop rotation with {param}-demanding crops to draw down excess.",
                mechanism="Reduced input + phytoextraction by high-demand crops",
            )
        ]
        # Add a remediation product from the database if applicable
        if len(products_data) > 0:
            last = products_data[-1]
            excess_products.append(BioProduct(**last))

        recs.append(BioRecommendation(
            parameter=param,
            name=OPTIMAL_RANGES[param]["name"],
            status="high",
            severity=severity,
            products=excess_products,
            crop_impact=impact,
        ))

    return recs


def assess_microbial_health(data: SoilInput, deficiencies: list) -> MicrobialAssessment:
    """Assess soil microbial health based on organic carbon, pH, and nutrient indicators."""
    score = 50  # baseline

    # OC is the primary driver of microbial activity
    if data.oc >= 1.0:
        score += 25
        om_status = "Excellent — rich in organic matter supporting diverse microbial communities"
    elif data.oc >= 0.5:
        score += 10
        om_status = "Moderate — adequate organic matter; could benefit from compost/green manure additions"
    else:
        score -= 15
        om_status = "Poor — low organic carbon severely limits microbial diversity and activity"

    # pH affects microbial diversity
    if 6.0 <= data.ph <= 7.5:
        score += 15
    elif 5.5 <= data.ph <= 8.0:
        score += 5
    else:
        score -= 10

    # High EC (salinity) suppresses microbial activity
    if data.ec > 1.5:
        score -= 15
    elif data.ec > 0.8:
        score -= 5

    # Micronutrients like Zn, Fe, Cu essential for microbial enzymes
    micro_ok = sum(1 for p in ["zn", "fe", "cu", "Mn"] if p not in deficiencies)
    score += micro_ok * 3

    score = max(0, min(100, score))

    if score >= 80:
        health = "Excellent"
    elif score >= 60:
        health = "Good"
    elif score >= 40:
        health = "Fair"
    else:
        health = "Poor"

    indicators = [
        {"indicator": "Organic Carbon Level", "value": f"{data.oc}%", "status": "Adequate" if data.oc >= 0.5 else "Low", "detail": "Primary energy source for soil microbes; drives decomposition and nutrient cycling"},
        {"indicator": "pH Suitability for Microbes", "value": f"{data.ph}", "status": "Optimal" if 6.0 <= data.ph <= 7.5 else "Suboptimal", "detail": "Most bacteria thrive at pH 6.5-7.5; fungi tolerate wider range (4-8)"},
        {"indicator": "Salinity Stress (EC)", "value": f"{data.ec} dS/m", "status": "Safe" if data.ec < 0.8 else "Stressful", "detail": "High EC causes osmotic stress reducing microbial cell viability"},
        {"indicator": "Nitrogen Availability", "value": f"{data.N} kg/ha", "status": "Sufficient" if data.N >= 150 else "Limiting", "detail": "N fuels microbial protein synthesis; low N limits population growth"},
        {"indicator": "Micronutrient Enzyme Cofactors", "value": f"{micro_ok}/4 adequate", "status": "Good" if micro_ok >= 3 else "Limited", "detail": "Zn, Fe, Cu, Mn are essential cofactors for microbial metalloenzymes"},
    ]

    microbial_inputs = []
    if data.oc < 0.5:
        microbial_inputs.append({"product": "Jeevamrutha / Indigenous Microorganism (IMO)", "description": "Fermented cow dung + jaggery culture containing billions of native beneficial microbes. Apply 200L/acre every 15 days to rapidly boost soil biology.", "benefit": "Restores microbial diversity"})
    microbial_inputs.append({"product": "Effective Microorganisms (EM-1)", "description": "Consortium of lactic acid bacteria, yeasts, and photosynthetic bacteria. Apply 2L/acre diluted 1:500. Improves decomposition and suppresses pathogens.", "benefit": "Broad-spectrum microbial inoculant"})
    microbial_inputs.append({"product": "Pseudomonas fluorescens", "description": "Rhizosphere-colonizing bacteria producing siderophores, HCN, and antibiotics. Excellent biocontrol agent + phosphorus solubilizer. Apply 2-3 kg/acre.", "benefit": "Biocontrol + nutrient mobilization"})
    microbial_inputs.append({"product": "Trichoderma harzianum", "description": "Antagonistic fungus suppressing Fusarium, Rhizoctonia, Pythium. Produces cellulase enzymes for residue decomposition. Apply 2-3 kg/acre with FYM.", "benefit": "Pathogen suppression + decomposition"})
    if data.N < 150:
        microbial_inputs.append({"product": "Acetobacter diazotrophicus", "description": "Endophytic N-fixer for sugarcane, sweet potato, and grasses. Colonizes plant tissues fixing 40-60 kg N/ha. Apply as sett/seedling treatment.", "benefit": "Endophytic nitrogen fixation"})

    return MicrobialAssessment(
        overall_microbial_health=health,
        microbial_score=round(score, 1),
        organic_matter_status=om_status,
        biological_activity_indicators=indicators,
        recommended_microbial_inputs=microbial_inputs,
    )


def analyze_npk_balance(data: SoilInput) -> NPKBalance:
    """Analyze NPK ratios and balance."""
    # Normalize to comparable scale
    n_norm = data.N / 280  # midpoint of optimal
    p_norm = data.P / 11   # midpoint of optimal
    k_norm = data.K / 450  # midpoint of optimal

    n_p = round(n_norm / p_norm, 2) if p_norm > 0 else 99
    n_k = round(n_norm / k_norm, 2) if k_norm > 0 else 99
    p_k = round(p_norm / k_norm, 2) if k_norm > 0 else 99

    # Determine balance
    ratios_ok = all(0.6 <= r <= 1.6 for r in [n_p, n_k, p_k])
    if ratios_ok:
        status = "Balanced"
        interp = f"Your NPK ratios are well-balanced (N:P={n_p}, N:K={n_k}, P:K={p_k}). All macronutrients are in proportion for efficient uptake."
        advice = "Maintain current fertilization practices. Apply balanced NPK fertilizers to sustain this ratio across cropping seasons."
    else:
        dominant = []
        deficient = []
        if n_norm > max(p_norm, k_norm) * 1.4:
            dominant.append("Nitrogen")
        if p_norm < min(n_norm, k_norm) * 0.6:
            deficient.append("Phosphorus")
        if k_norm < min(n_norm, p_norm) * 0.6:
            deficient.append("Potassium")
        if n_norm < min(p_norm, k_norm) * 0.6:
            deficient.append("Nitrogen")

        parts = []
        if dominant:
            parts.append(f"{', '.join(dominant)}-dominant")
        if deficient:
            parts.append(f"{', '.join(deficient)}-deficient")
        status = " & ".join(parts) if parts else "Imbalanced"

        interp = f"NPK ratio is imbalanced (N:P={n_p}, N:K={n_k}, P:K={p_k}). "
        if deficient:
            interp += f"Key gaps in {', '.join(deficient)} limit nutrient synergy and crop response."
        advice = "Apply targeted fertilizers to correct the imbalance. "
        if "Phosphorus" in deficient:
            advice += "Prioritize DAP/SSP for P. "
        if "Potassium" in deficient:
            advice += "Add MOP/SOP for K. "
        if "Nitrogen" in deficient:
            advice += "Use urea/CAN in split doses for N. "
        advice += "Retest soil after one season to verify correction."

    return NPKBalance(
        n_p_ratio=n_p, n_k_ratio=n_k, p_k_ratio=p_k,
        balance_status=status, interpretation=interp, correction_advice=advice,
    )


def get_crop_suitability(data: SoilInput) -> List[CropSuitability]:
    """Determine crop suitability categories based on soil parameters."""
    results = []

    # NPK-based suitability
    high_n = data.N >= 200
    high_k = data.K >= 400
    key = f"{'high' if high_n else 'low'}_N_{'high' if high_k else 'low'}_K"
    if key in CROP_SUITABILITY_MATRIX:
        item = CROP_SUITABILITY_MATRIX[key]
        results.append(CropSuitability(
            category="Based on NPK Profile",
            crops=item["crops"], note=item["note"],
            match_score="High" if high_n and high_k else "Medium",
        ))

    # pH-based
    if data.ph < 6.0:
        item = CROP_SUITABILITY_MATRIX["acidic"]
        results.append(CropSuitability(category="Acid-Loving Crops", crops=item["crops"], note=item["note"], match_score="High"))
    elif data.ph > 7.8:
        item = CROP_SUITABILITY_MATRIX["alkaline"]
        results.append(CropSuitability(category="Alkaline-Tolerant Crops", crops=item["crops"], note=item["note"], match_score="High"))

    # OC-based
    if data.oc >= 0.75:
        item = CROP_SUITABILITY_MATRIX["high_oc"]
        results.append(CropSuitability(category="High Organic Matter Crops", crops=item["crops"], note=item["note"], match_score="High"))
    elif data.oc < 0.4:
        item = CROP_SUITABILITY_MATRIX["low_oc"]
        results.append(CropSuitability(category="Dryland / Low-Input Crops", crops=item["crops"], note=item["note"], match_score="Medium"))

    # EC-based
    if data.ec > 1.0:
        item = CROP_SUITABILITY_MATRIX["saline"]
        results.append(CropSuitability(category="Salt-Tolerant Crops", crops=item["crops"], note=item["note"], match_score="High"))

    return results


def infer_soil_type(data: SoilInput) -> str:
    """Infer probable soil type from chemical indicators."""
    if data.oc >= 1.5 and data.ec < 0.5:
        return "Organic / Peaty Soil — High in carbon, likely dark colored with excellent water retention"
    elif data.ec > 1.5:
        return "Saline / Saline-Sodic Soil — High salt content limiting crop growth; needs reclamation"
    elif data.ph < 5.5 and data.fe > 5:
        return "Laterite / Red Soil — Acidic, iron-rich, typically found in high-rainfall regions"
    elif data.ph > 7.5 and data.K > 500:
        return "Black Cotton Soil (Vertisol) — Alkaline, K-rich, heavy clay with high CEC and cracking behavior"
    elif data.N < 150 and data.oc < 0.4 and data.ec < 0.4:
        return "Sandy / Light Soil — Low nutrient retention, needs frequent but light fertilization"
    elif data.N > 200 and data.P > 8 and 6.5 <= data.ph <= 7.5:
        return "Alluvial Soil — Fertile, well-balanced, deposited by river systems"
    elif data.K > 400 and data.ph > 7.0:
        return "Silty Clay Loam — Good nutrient retention with moderate drainage"
    return "Medium-textured Loam — Moderate characteristics; further physical analysis recommended"


def build_health_report(data: SoilInput, shi: float, fertility_class: str,
                        deficiencies: list, excesses: list) -> HealthReport:
    """Build comprehensive health assessment report."""
    # Grade
    if shi >= 80:
        grade, title = "A", "Excellent Soil Health — Minimal Intervention Needed"
    elif shi >= 65:
        grade, title = "B", "Good Soil Health — Minor Improvements Recommended"
    elif shi >= 50:
        grade, title = "C", "Moderate Soil Health — Targeted Remediation Required"
    elif shi >= 35:
        grade, title = "D", "Poor Soil Health — Significant Intervention Needed"
    else:
        grade, title = "F", "Critical Soil Health — Urgent Remediation Required"

    microbial = assess_microbial_health(data, deficiencies)
    npk = analyze_npk_balance(data)
    crop_suit = get_crop_suitability(data)
    soil_type = infer_soil_type(data)

    # Remediation priority
    priority = []
    severity_order = {"severe": 0, "moderate": 1, "mild": 2}
    items = []
    for p in deficiencies + excesses:
        val = getattr(data, p)
        low = OPTIMAL_RANGES[p]["low"]
        high = OPTIMAL_RANGES[p]["high"]
        st = "low" if p in deficiencies else "high"
        sev = get_severity(val, low, high, st)
        items.append((severity_order.get(sev, 2), p, st, sev))
    items.sort()
    for rank, (_, p, st, sev) in enumerate(items, 1):
        priority.append({
            "rank": str(rank),
            "parameter": OPTIMAL_RANGES[p]["name"],
            "issue": f"{'Deficient' if st == 'low' else 'Excess'} ({sev})",
            "action": f"{'Increase' if st == 'low' else 'Reduce'} {OPTIMAL_RANGES[p]['name']} — see biological recommendations",
        })

    # Recovery timeline
    if shi >= 65:
        timeline = "Your soil is in good shape. With maintenance practices, expect stable or improving fertility within 1 cropping season (3-4 months)."
    elif shi >= 45:
        timeline = "With targeted remediation, expect noticeable improvement within 2 cropping seasons (6-8 months). Organic carbon improvements take 1-2 years."
    else:
        timeline = "Significant improvement requires 2-3 cropping seasons (8-18 months) of consistent organic amendments, cover cropping, and targeted fertilization. Annual soil testing recommended."

    # Seasonal calendar
    calendar = [
        {"season": "Pre-Kharif (May-Jun)", "actions": "Apply organic compost, green manuring, basal fertilizers. Incorporate lime/gypsum if needed. Inoculate seeds with biofertilizers."},
        {"season": "Kharif (Jul-Oct)", "actions": "Apply split-dose N fertilizers. Monitor for pest/disease aided by humidity. Install drainage for waterlogging-prone soils."},
        {"season": "Post-Kharif (Nov)", "actions": "Soil testing after harvest. Incorporate crop residues with Trichoderma culture. Apply potash and phosphorus for Rabi."},
        {"season": "Rabi (Nov-Mar)", "actions": "Apply micronutrient foliar sprays. Use mulching for moisture conservation. Practice intercropping with legumes for N fixation."},
        {"season": "Summer Fallow (Apr-May)", "actions": "Deep ploughing to break hardpan. Summer ploughing for pest control. Apply FYM/vermicompost. Grow green manure crop (Dhaincha/Sunhemp)."},
    ]

    # Soil biology tips
    bio_tips = [
        "Avoid excessive tillage — it disrupts fungal hyphae networks (mycorrhizal highways) that transport nutrients to plant roots",
        "Maintain soil cover (mulch/cover crops) — bare soil loses microbial activity due to UV exposure and temperature extremes",
        "Reduce chemical pesticide use — fumigants and broad-spectrum fungicides kill beneficial soil organisms along with pathogens",
        "Apply diverse organic inputs — each type (FYM, vermicompost, green manure, crop residues) feeds different microbial guilds",
        "Rotate crops — monoculture builds pathogen-specific organisms while reducing beneficial diversity",
        "Integrate livestock if possible — manure application introduces billions of diverse microbes per gram",
        "Use fermented inputs (Jeevamrutha, Panchagavya) — these contain active microbial cultures adapted to tropical conditions",
        "Minimize synthetic N overuse — excess urea shifts soil biology toward nitrifiers while suppressing N-fixers and decomposers",
    ]

    return HealthReport(
        report_grade=grade,
        report_title=title,
        microbial_assessment=microbial,
        npk_balance=npk,
        crop_suitability=crop_suit,
        soil_type_inference=soil_type,
        remediation_priority=priority,
        estimated_recovery_timeline=timeline,
        seasonal_calendar=calendar,
        soil_biology_tips=bio_tips,
    )


def generate_summary(fertility_class: str, shi: float, deficiencies: list, excesses: list) -> str:
    """Generate a human-readable summary."""
    def_names = [OPTIMAL_RANGES[d]["name"] for d in deficiencies]
    exc_names = [OPTIMAL_RANGES[e]["name"] for e in excesses]

    summary = f"Your soil is classified as **{fertility_class}** with a Soil Health Index of **{shi}/100**. "

    if not deficiencies and not excesses:
        summary += "All nutrient parameters are within optimal ranges. Maintain current soil management practices."
    else:
        parts = []
        if deficiencies:
            parts.append(f"Deficiencies detected in: {', '.join(def_names)}")
        if excesses:
            parts.append(f"Excess levels of: {', '.join(exc_names)}")
        summary += ". ".join(parts) + ". "
        summary += "See the biological recommendations and health report below for targeted remediation."

    return summary


# ---------------------------------------------------------------------------
# Fallback rule-based predictor
# ---------------------------------------------------------------------------
def fallback_predict(data: SoilInput) -> tuple:
    """Simple rule-based fertility classification when model is unavailable."""
    score = 0

    # Score based on NPK
    if data.N >= 200:
        score += 2
    elif data.N >= 100:
        score += 1

    if data.P >= 8:
        score += 1
    if data.K >= 400:
        score += 1

    # Score based on pH
    if 6.5 <= data.ph <= 7.5:
        score += 2
    elif 6.0 <= data.ph <= 8.0:
        score += 1

    # Score based on OC
    if data.oc >= 0.75:
        score += 2
    elif data.oc >= 0.5:
        score += 1

    # Score based on micronutrients
    if data.zn >= 0.5:
        score += 1
    if data.fe >= 3.0:
        score += 1

    # Map to fertility class
    if score >= 8:
        fertility = 2  # Highly Fertile
        probs = {"Less Fertile": 0.05, "Fertile": 0.25, "Highly Fertile": 0.70}
    elif score >= 5:
        fertility = 1  # Fertile
        probs = {"Less Fertile": 0.10, "Fertile": 0.70, "Highly Fertile": 0.20}
    else:
        fertility = 0  # Less Fertile
        probs = {"Less Fertile": 0.70, "Fertile": 0.25, "Highly Fertile": 0.05}

    return fertility, probs


# ---------------------------------------------------------------------------
# Crop nutrient requirement database (per ha, agronomic standards)
# ---------------------------------------------------------------------------
CROP_NUTRIENT_REQUIREMENTS = {
    "rice":       {"N": (80, 120),  "P": (30, 50),  "K": (30, 60),  "ph": (5.5, 7.0), "ideal_oc": 0.75},
    "wheat":      {"N": (80, 120),  "P": (40, 70),  "K": (40, 80),  "ph": (6.0, 7.5), "ideal_oc": 0.60},
    "maize":      {"N": (80, 120),  "P": (30, 60),  "K": (30, 60),  "ph": (5.5, 7.5), "ideal_oc": 0.60},
    "chickpea":   {"N": (10, 30),   "P": (40, 80),  "K": (20, 60),  "ph": (6.0, 8.0), "ideal_oc": 0.50},
    "cotton":     {"N": (80, 120),  "P": (30, 60),  "K": (30, 60),  "ph": (6.0, 8.0), "ideal_oc": 0.50},
    "sugarcane":  {"N": (100, 140), "P": (50, 100), "K": (60, 100), "ph": (6.5, 7.5), "ideal_oc": 0.80},
    "soybean":    {"N": (15, 30),   "P": (40, 80),  "K": (30, 60),  "ph": (6.0, 7.0), "ideal_oc": 0.60},
    "groundnut":  {"N": (10, 25),   "P": (30, 60),  "K": (20, 50),  "ph": (5.5, 7.0), "ideal_oc": 0.50},
    "mungbean":   {"N": (10, 25),   "P": (20, 50),  "K": (20, 50),  "ph": (6.0, 7.5), "ideal_oc": 0.50},
    "lentil":     {"N": (10, 25),   "P": (40, 80),  "K": (20, 50),  "ph": (6.0, 7.5), "ideal_oc": 0.50},
    "banana":     {"N": (100, 140), "P": (50, 100), "K": (100, 200),"ph": (5.5, 7.0), "ideal_oc": 0.80},
    "pomegranate":{"N": (20, 50),   "P": (20, 50),  "K": (30, 80),  "ph": (6.5, 7.5), "ideal_oc": 0.60},
    "grapes":     {"N": (20, 50),   "P": (50, 100), "K": (80, 150), "ph": (6.0, 7.5), "ideal_oc": 0.70},
    "mango":      {"N": (20, 50),   "P": (20, 60),  "K": (30, 80),  "ph": (5.5, 7.5), "ideal_oc": 0.60},
    "potato":     {"N": (80, 120),  "P": (50, 80),  "K": (80, 120), "ph": (5.0, 6.5), "ideal_oc": 0.70},
    "tomato":     {"N": (80, 120),  "P": (50, 80),  "K": (60, 100), "ph": (6.0, 7.0), "ideal_oc": 0.70},
    "onion":      {"N": (60, 100),  "P": (40, 70),  "K": (50, 80),  "ph": (6.0, 7.5), "ideal_oc": 0.60},
    "mustard":    {"N": (60, 80),   "P": (30, 50),  "K": (20, 40),  "ph": (6.0, 8.0), "ideal_oc": 0.50},
    "barley":     {"N": (50, 80),   "P": (30, 50),  "K": (20, 50),  "ph": (6.0, 8.5), "ideal_oc": 0.50},
    "sorghum":    {"N": (40, 80),   "P": (20, 40),  "K": (15, 40),  "ph": (5.5, 8.0), "ideal_oc": 0.40},
    "pearl millet":{"N": (40, 80),  "P": (20, 40),  "K": (15, 40),  "ph": (6.0, 8.0), "ideal_oc": 0.40},
}

# Approximate bio-product cost per acre (INR)
BIO_PRODUCT_COSTS = {
    "biofertilizer": 150,
    "organic": 800,
    "chemical": 400,
    "amendment": 1200,
    "practice": 500,
}

# Average yield per hectare (quintals) under good conditions
CROP_YIELD_POTENTIAL = {
    "rice": 50, "wheat": 45, "maize": 55, "chickpea": 18, "cotton": 20,
    "sugarcane": 700, "soybean": 22, "groundnut": 20, "mungbean": 10,
    "lentil": 12, "banana": 350, "pomegranate": 120, "grapes": 200,
    "mango": 100, "potato": 250, "tomato": 300, "onion": 200,
    "mustard": 15, "barley": 35, "sorghum": 25, "pearl millet": 20,
}


class CropCompatibilityInput(BaseModel):
    N: float = Field(..., ge=0)
    P: float = Field(..., ge=0)
    K: float = Field(..., ge=0)
    ph: float = Field(..., ge=0, le=14)
    ec: float = Field(..., ge=0)
    oc: float = Field(..., ge=0)
    S: float = Field(..., ge=0)
    zn: float = Field(..., ge=0)
    fe: float = Field(..., ge=0)
    cu: float = Field(..., ge=0)
    Mn: float = Field(..., ge=0)
    B: float = Field(..., ge=0)
    target_crops: Optional[List[str]] = None  # if None, checks all crops


def compute_crop_compatibility(data, crop_name: str, crop_req: dict) -> dict:
    """Compute compatibility score and nutrient gap for a single crop."""
    # Nutrient gap: how far each nutrient is from the crop's ideal range
    gaps = {}
    scores = {}
    for nutrient in ["N", "P", "K"]:
        val = getattr(data, nutrient)
        lo, hi = crop_req[nutrient]
        mid = (lo + hi) / 2
        if lo <= val <= hi:
            scores[nutrient] = 100
            gaps[nutrient] = {"current": round(val, 1), "ideal_range": f"{lo}-{hi}", "status": "optimal", "gap_kg_ha": 0}
        elif val < lo:
            deficit = lo - val
            scores[nutrient] = max(0, 100 - (deficit / mid) * 100)
            gaps[nutrient] = {"current": round(val, 1), "ideal_range": f"{lo}-{hi}", "status": "deficient", "gap_kg_ha": round(deficit, 1)}
        else:
            excess = val - hi
            scores[nutrient] = max(0, 100 - (excess / mid) * 60)
            gaps[nutrient] = {"current": round(val, 1), "ideal_range": f"{lo}-{hi}", "status": "excess", "gap_kg_ha": round(-excess, 1)}

    # pH compatibility
    ph_lo, ph_hi = crop_req["ph"]
    ph_mid = (ph_lo + ph_hi) / 2
    if ph_lo <= data.ph <= ph_hi:
        ph_score = 100
        gaps["ph"] = {"current": round(data.ph, 2), "ideal_range": f"{ph_lo}-{ph_hi}", "status": "optimal", "gap": 0}
    else:
        ph_dev = min(abs(data.ph - ph_lo), abs(data.ph - ph_hi))
        ph_score = max(0, 100 - ph_dev * 30)
        gaps["ph"] = {"current": round(data.ph, 2), "ideal_range": f"{ph_lo}-{ph_hi}", "status": "too_acidic" if data.ph < ph_lo else "too_alkaline", "gap": round(ph_dev, 2)}

    # OC compatibility
    ideal_oc = crop_req.get("ideal_oc", 0.5)
    oc_score = min(100, (data.oc / ideal_oc) * 100) if ideal_oc > 0 else 80
    gaps["oc"] = {"current": round(data.oc, 2), "ideal_min": ideal_oc, "status": "optimal" if data.oc >= ideal_oc else "low"}

    # Micronutrient score
    micro_keys = ["S", "zn", "fe", "cu", "Mn", "B"]
    micro_ok = 0
    for mk in micro_keys:
        val = getattr(data, mk)
        r = OPTIMAL_RANGES.get(mk, {})
        if r and r["low"] <= val <= r["high"]:
            micro_ok += 1
    micro_score = (micro_ok / len(micro_keys)) * 100

    # Weighted overall compatibility
    compat_score = (
        0.30 * ((scores["N"] + scores["P"] + scores["K"]) / 3) +
        0.20 * ph_score +
        0.20 * oc_score +
        0.15 * micro_score +
        0.15 * (100 if data.ec <= 0.8 else max(0, 100 - (data.ec - 0.8) * 50))
    )
    compat_score = round(min(100, max(0, compat_score)), 1)

    # Yield potential estimation
    base_yield = CROP_YIELD_POTENTIAL.get(crop_name, 30)
    yield_factor = compat_score / 100
    best_yield = round(base_yield * min(1.1, yield_factor + 0.15), 1)
    avg_yield = round(base_yield * yield_factor, 1)
    worst_yield = round(base_yield * max(0.3, yield_factor - 0.2), 1)

    # Bio-investment calculation
    bio_actions = []
    total_cost = 0
    for nutrient_key in ["N", "P", "K", "ph", "oc"]:
        gap_info = gaps.get(nutrient_key, {})
        if gap_info.get("status") in ("deficient", "low", "too_acidic", "too_alkaline"):
            products = BIO_RECOMMENDATIONS.get(nutrient_key, [])
            if products:
                top_product = products[0]
                cost = BIO_PRODUCT_COSTS.get(top_product.get("type", "organic"), 500)
                total_cost += cost
                bio_actions.append({
                    "nutrient": nutrient_key,
                    "product": top_product["product"],
                    "type": top_product["type"],
                    "dosage": top_product["dosage"],
                    "cost_per_acre_inr": cost,
                    "expected_improvement": f"Corrects {OPTIMAL_RANGES.get(nutrient_key, {}).get('name', nutrient_key)} deficiency within 1-2 seasons",
                })

    # ROI calculation
    yield_uplift_pct = round(max(0, (1.0 - yield_factor) * 100 * 0.6), 1)  # 60% of gap recoverable
    potential_revenue_gain = round(yield_uplift_pct * base_yield * 18, 0)  # ~18 INR/kg average

    return {
        "crop": crop_name,
        "compatibility_score": compat_score,
        "compatibility_grade": "A" if compat_score >= 85 else "B" if compat_score >= 70 else "C" if compat_score >= 55 else "D" if compat_score >= 40 else "F",
        "nutrient_gaps": gaps,
        "component_scores": {
            "npk_score": round((scores["N"] + scores["P"] + scores["K"]) / 3, 1),
            "ph_score": round(ph_score, 1),
            "oc_score": round(oc_score, 1),
            "micronutrient_score": round(micro_score, 1),
        },
        "yield_potential": {
            "best_case_q_per_ha": best_yield,
            "average_q_per_ha": avg_yield,
            "worst_case_q_per_ha": worst_yield,
            "yield_uplift_with_remediation_pct": yield_uplift_pct,
        },
        "bio_investment": {
            "actions": bio_actions,
            "total_cost_per_acre_inr": total_cost,
            "potential_revenue_gain_inr": potential_revenue_gain,
            "roi_ratio": round(potential_revenue_gain / total_cost, 1) if total_cost > 0 else 0,
            "breakeven_seasons": 1 if yield_uplift_pct > 15 else 2,
        },
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": MODEL_LOADED, "service": "soil-health"}


@app.post("/crop-compatibility")
def crop_compatibility(data: CropCompatibilityInput):
    """Compute soil-crop compatibility for target crops or all known crops."""
    target_crops = data.target_crops
    if not target_crops:
        target_crops = list(CROP_NUTRIENT_REQUIREMENTS.keys())
    else:
        target_crops = [c.lower().strip() for c in target_crops]

    results = []
    for crop_name in target_crops:
        req = CROP_NUTRIENT_REQUIREMENTS.get(crop_name)
        if not req:
            continue
        result = compute_crop_compatibility(data, crop_name, req)
        results.append(result)

    # Sort by compatibility score descending
    results.sort(key=lambda x: x["compatibility_score"], reverse=True)

    return {
        "soil_profile": {
            "N": data.N, "P": data.P, "K": data.K, "ph": data.ph,
            "ec": data.ec, "oc": data.oc, "S": data.S, "zn": data.zn,
            "fe": data.fe, "cu": data.cu, "Mn": data.Mn, "B": data.B,
        },
        "crop_compatibility": results,
        "best_match": results[0]["crop"] if results else None,
        "total_crops_analyzed": len(results),
    }


@app.post("/assess", response_model=SoilHealthOutput)
def assess_soil(data: SoilInput):
    """Main endpoint: assess soil health from 12 biological/chemical indicators."""

    # 1. Analyze nutrients
    nutrient_analysis, deficiencies, excesses = analyze_nutrients(data)

    # 2. Predict fertility
    features = np.array([[
        data.N, data.P, data.K, data.ph, data.ec, data.oc,
        data.S, data.zn, data.fe, data.cu, data.Mn, data.B,
    ]])

    if MODEL_LOADED:
        try:
            prediction = int(model.predict(features)[0])

            # Get probabilities if available
            if hasattr(model, "predict_proba"):
                proba = model.predict_proba(features)[0]
                class_probs = {}
                for idx, label in FERTILITY_LABELS.items():
                    if idx < len(proba):
                        class_probs[label] = round(float(proba[idx]), 4)
                    else:
                        class_probs[label] = 0.0
                confidence = round(float(max(proba)), 4)
            else:
                class_probs = {label: (1.0 if idx == prediction else 0.0)
                               for idx, label in FERTILITY_LABELS.items()}
                confidence = 1.0

            print(f"[OK] Soil prediction: {FERTILITY_LABELS[prediction]} (conf: {confidence})")

        except Exception as e:
            print(f"[ERR] Model prediction error: {e}, using fallback")
            prediction, class_probs = fallback_predict(data)
            confidence = max(class_probs.values())
    else:
        prediction, class_probs = fallback_predict(data)
        confidence = max(class_probs.values())

    fertility_class = FERTILITY_LABELS.get(prediction, "Unknown")

    # 3. Compute Soil Health Index
    shi = compute_soil_health_index(class_probs, deficiencies, excesses)

    # 4. Get biological recommendations
    bio_recs = get_bio_recommendations(deficiencies, excesses, data)

    # 5. Build comprehensive health report
    health_report = build_health_report(data, shi, fertility_class, deficiencies, excesses)

    # 6. Generate summary
    summary = generate_summary(fertility_class, shi, deficiencies, excesses)

    return SoilHealthOutput(
        fertility_class=fertility_class,
        fertility_code=prediction,
        confidence=confidence,
        class_probabilities=class_probs,
        soil_health_index=shi,
        nutrient_analysis=nutrient_analysis,
        deficiencies=[OPTIMAL_RANGES[d]["name"] for d in deficiencies],
        excesses=[OPTIMAL_RANGES[e]["name"] for e in excesses],
        bio_recommendations=bio_recs,
        health_report=health_report,
        summary=summary,
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("[START] Starting Soil Health & Fertility API on port 8002...")
    uvicorn.run(app, host="0.0.0.0", port=8002)
