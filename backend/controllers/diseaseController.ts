import { Request, Response } from 'express';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGenAI, rotateKey, isQuotaError, getCurrentKey, GEMINI_MODELS } from '../utils/geminiClient';
import fs from 'fs';

// CNN Model API endpoint (Python FastAPI server)
const CNN_API_URL = 'http://localhost:5050';
// Minimum confidence threshold for CNN model to be trusted
const CNN_CONFIDENCE_THRESHOLD = 0.50;

/**
 * Disease Detection Pipeline:
 *   STEP 1: Local CNN Model (ResNet34) — primary, fastest
 *   STEP 2: KindWise API — fallback if CNN fails or has low confidence
 *   STEP 3: Gemini API — last resort for identification + ALWAYS used for remedies
 */
export const detectDisease = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    const { KINDWISE_API_KEY, GEMINI_API_KEY } = process.env;
    const base64Image = req.file.buffer.toString('base64');

    let plantName: string | null = null;
    let diseaseName: string | null = null;
    let diseaseProbability = 0;
    let isHealthy = true;
    let detectionSource: string | null = null; // "cnn_model", "kindwise", or "gemini"

    // =====================================================================
    // STEP 1: Try Local CNN Model (Primary)
    // =====================================================================
    try {
      console.log('🤖 STEP 1: Attempting disease detection with local CNN model...');

      const cnnResponse = await axios.post(
        `${CNN_API_URL}/predict`,
        {
          image_base64: base64Image,
          top_k: 3,
        },
        { timeout: 15000 } // 15s timeout
      );

      const cnnData = cnnResponse.data;

      if (cnnData.success && cnnData.top_prediction) {
        const topPred = cnnData.top_prediction;
        console.log(`🤖 CNN Result: ${topPred.class_name} (${(topPred.confidence * 100).toFixed(1)}%)`);

        if (topPred.confidence >= CNN_CONFIDENCE_THRESHOLD) {
          plantName = topPred.plant_name;
          isHealthy = topPred.is_healthy;
          diseaseProbability = topPred.confidence;
          detectionSource = 'cnn_model';

          if (!isHealthy) {
            diseaseName = topPred.disease_name;
          }

          console.log(`✅ CNN model prediction accepted: ${plantName} - ${isHealthy ? 'Healthy' : diseaseName} (${(diseaseProbability * 100).toFixed(1)}%)`);
        } else {
          console.log(`⚠️ CNN model confidence too low (${(topPred.confidence * 100).toFixed(1)}%), falling back to KindWise...`);
        }
      }
    } catch (cnnError: any) {
      console.error('❌ CNN model unavailable or failed:', cnnError.message);
      console.log('Falling back to KindWise API...');
    }

    // =====================================================================
    // STEP 2: KindWise API (Fallback — only if CNN didn't produce a result)
    // =====================================================================
    if (!detectionSource && KINDWISE_API_KEY) {
      try {
        console.log('🔬 STEP 2: Attempting disease detection with KindWise API...');

        const kindwisePayload = {
          images: [`data:${req.file.mimetype};base64,${base64Image}`],
          similar_images: true,
        };

        const kindwiseResponse = await axios.post(
          'https://crop.kindwise.com/api/v1/identification?details=common_names,description,symptoms,treatment,prevention,cause',
          kindwisePayload,
          {
            headers: {
              'Api-Key': KINDWISE_API_KEY,
              'Content-Type': 'application/json',
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          }
        );

        const kindwiseResult = kindwiseResponse.data.result;

        // Parse plant identification
        if (kindwiseResult.crop && kindwiseResult.crop.suggestions.length > 0) {
          plantName = kindwiseResult.crop.suggestions[0].name;
        }

        // Parse disease detection
        if (kindwiseResult.disease && kindwiseResult.disease.suggestions && kindwiseResult.disease.suggestions.length > 0) {
          const topDisease = kindwiseResult.disease.suggestions[0];
          if (topDisease.name.toLowerCase() !== 'healthy') {
            isHealthy = false;
            diseaseName = topDisease.name;
            diseaseProbability = topDisease.probability;
            detectionSource = 'kindwise';
            console.log(`✅ KindWise detected: ${diseaseName} (${(diseaseProbability * 100).toFixed(1)}%)`);
          } else {
            isHealthy = true;
            detectionSource = 'kindwise';
            console.log('✅ KindWise says plant is healthy');
          }
        } else if (kindwiseResult.is_healthy && kindwiseResult.is_healthy.probability < 0.5) {
          isHealthy = false;
          diseaseName = 'Unknown Disease / Poor Health';
          detectionSource = 'kindwise';
        } else {
          detectionSource = 'kindwise';
        }
      } catch (kindwiseError: any) {
        console.error('❌ KindWise API failed:', kindwiseError.message);
        console.log('Falling back to Gemini API...');
      }
    }

    // =====================================================================
    // STEP 3: Gemini API — last resort for identification + ALWAYS for remedies
    // =====================================================================
    let detailedAnalysis: string | null = null;
    let remedies: string | null = null;
    let nextSteps: string | null = null;

    if (!getCurrentKey()) {
      console.error('⚠️ No Gemini API keys configured');
    } else {
      const modelsToTry = GEMINI_MODELS;

      // --- 3a: If no detection source yet, use Gemini Vision as last resort ---
      if (!detectionSource) {
        try {
          console.log('🧠 STEP 3a: Using Gemini Vision as last resort for identification...');

          for (const modelName of modelsToTry) {
            try {
              const model = getGenAI().getGenerativeModel({ model: modelName });

              const imagePart = {
                inlineData: {
                  data: base64Image,
                  mimeType: req.file!.mimetype,
                },
              };

              const visionPrompt = `You are an expert plant pathologist. Analyze this plant leaf image and identify:
1. The plant species/crop name
2. Whether the plant is healthy or diseased
3. If diseased, the specific disease name

Respond in this exact JSON format (no markdown, just pure JSON):
{
  "plant_name": "plant name here",
  "is_healthy": true or false,
  "disease_name": "disease name or null if healthy",
  "confidence": 0.0 to 1.0
}`;

              const aiResult = await model.generateContent([visionPrompt, imagePart]);
              const responseText = aiResult.response.text().trim();

              // Parse JSON from Gemini response
              const jsonMatch = responseText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                plantName = parsed.plant_name || 'Unknown Plant';
                isHealthy = parsed.is_healthy !== false;
                diseaseName = parsed.disease_name || null;
                diseaseProbability = parsed.confidence || 0.7;
                detectionSource = 'gemini';

                if (diseaseName && diseaseName.toLowerCase() !== 'null' && diseaseName.toLowerCase() !== 'none') {
                  isHealthy = false;
                }

                console.log(`✅ Gemini Vision identified: ${plantName} - ${isHealthy ? 'Healthy' : diseaseName}`);
                break;
              }
            } catch (err: any) {
              console.error(`❌ Gemini Vision model ${modelName} failed:`, err.message);
              if (isQuotaError(err)) rotateKey();
            }
          }
        } catch (geminiVisionError: any) {
          console.error('❌ Gemini Vision failed entirely:', geminiVisionError.message);
        }
      }

      // --- 3b: Use Gemini for remedies/treatment (always, if disease was found) ---
      if (plantName || diseaseName) {
        try {
          console.log(`🧠 STEP 3b: Generating AI remedies for ${plantName} - ${isHealthy ? 'Healthy' : diseaseName}...`);

          let prompt;
          if (isHealthy) {
            prompt = `
You are an expert agronomist. I have a plant identified as "${plantName || 'Unknown'}". It appears to be healthy.
Please provide:
1. A brief overview of general care for this specific plant.
2. 3 short bullet points on how to maintain its health and prevent common diseases.
            `;
          } else {
            prompt = `
You are an expert agronomist. A farmer has uploaded a photo of a "${plantName || 'Unknown'}" crop. 
An AI analysis tool has detected the disease "${diseaseName}" with a confidence of ${(diseaseProbability * 100).toFixed(1)}%.

Please provide a highly structured, informative response covering the following sections exactly:
[DESCRIPTION]
Describe what "${diseaseName}" is and how it affects the "${plantName || 'crop'}".

[REMEDIES]
List actionable, practical treatment methods (organic and chemical, if applicable) to cure or control this disease.

[NEXT_STEPS]
What immediate actions should the farmer take right now to prevent it from spreading to other crops?

Keep the response practical, concise, and formatted beautifully using Markdown. Do not include introductory conversational filler, just the requested sections.
            `;
          }

          for (const modelName of modelsToTry) {
            try {
              console.log(`Attempting Gemini remedies with model: ${modelName}...`);
              const model = getGenAI().getGenerativeModel({ model: modelName });
              const aiResult = await model.generateContent(prompt);
              const aiResponse = aiResult.response.text();

              if (aiResponse) {
                console.log(`✅ Gemini remedies generated with model: ${modelName}`);

                if (isHealthy) {
                  detailedAnalysis = aiResponse;
                } else {
                  const descSplit = aiResponse.split('[REMEDIES]');
                  detailedAnalysis = descSplit[0] ? descSplit[0].replace(/\[DESCRIPTION\]/i, '').trim() : 'No description provided.';

                  if (descSplit.length > 1) {
                    const remSplit = descSplit[1].split('[NEXT_STEPS]');
                    remedies = remSplit[0].trim();
                    nextSteps = remSplit[1] ? remSplit[1].trim() : null;
                  } else {
                    remedies = aiResponse;
                  }
                }
                break;
              }
            } catch (err: any) {
              console.error(`❌ Gemini remedies model ${modelName} failed:`, err.message);
              if (isQuotaError(err)) rotateKey();
              fs.appendFileSync('gemini_error.txt', `\n[${new Date().toISOString()}] ${modelName} Error: ${err.message}\n`);
            }
          }
        } catch (geminiRemedyError: any) {
          console.error('❌ Gemini remedies generation failed:', geminiRemedyError.message);
          remedies = 'Unable to fetch detailed remedies at this time. Please consult a local agricultural officer.';
        }
      }
    }

    // If nothing at all worked
    if (!detectionSource) {
      return res.status(500).json({
        success: false,
        message: 'All detection methods failed. Please try again with a clearer photo.',
      });
    }

    // =====================================================================
    // Construct and Return the Unified Response
    // =====================================================================
    res.json({
      success: true,
      detection_source: detectionSource, // "cnn_model", "kindwise", or "gemini"
      result: {
        is_healthy: isHealthy,
        plant_identification: {
          scientific_name: plantName || 'Unknown Plant',
          probability: diseaseProbability,
        },
        disease: isHealthy
          ? null
          : {
              suggestions: [
                {
                  name: diseaseName,
                  probability: diseaseProbability,
                  description: detailedAnalysis,
                  treatment: remedies,
                  next_steps: nextSteps,
                },
              ],
            },
        health_status: isHealthy ? 'Plant appears healthy' : 'Disease detected',
        ai_healthy_advice: isHealthy ? detailedAnalysis : null,
      },
    });
  } catch (error: any) {
    console.error('Error in disease detection:', error);

    let errorMessage = 'Failed to analyze crop image';
    if (error.response) {
      console.error('API Response Error:', error.response.data);
      errorMessage = `API Error: ${error.response.status} - ${error.response.data.message || error.message}`;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};
