/**
 * Sarvam AI API utility functions
 * All Sarvam AI calls go through the backend to keep the API key secure.
 * This module is completely separate from the Gemini AI integration.
 */
import { apiFetch } from './api';

// ── Sarvam AI language code mapping ──────────────────────────────────
// Maps display names → Sarvam 2-letter ISO codes
export const SARVAM_LANGUAGE_CODES = {
  'English':    'en-IN',
  'Hindi':      'hi-IN',
  'Bengali':    'bn-IN',
  'Tamil':      'ta-IN',
  'Telugu':     'te-IN',
  'Marathi':    'mr-IN',
  'Gujarati':   'gu-IN',
  'Kannada':    'kn-IN',
  'Malayalam':  'ml-IN',
  'Odia':       'od-IN',
  'Punjabi':    'pa-IN',
  'Assamese':   'as-IN',
  'Bodo':       'brx-IN',
  'Dogri':      'doi-IN',
  'Kashmiri':   'ks-IN',
  'Konkani':    'gom-IN',
  'Maithili':   'mai-IN',
  'Manipuri':   'mni-IN',
  'Nepali':     'ne-IN',
  'Sanskrit':   'sa-IN',
  'Santali':    'sat-IN',
  'Sindhi':     'sd-IN',
  'Urdu':       'ur-IN',
};

/**
 * Get Sarvam language code from display name
 */
export function getSarvamLangCode(displayName) {
  return SARVAM_LANGUAGE_CODES[displayName] || 'en-IN';
}

// ── Translation cache to avoid repeated API calls ───────────────────
const translationCache = new Map();
const CACHE_MAX = 500; // max entries

function getCacheKey(text, srcLang, tgtLang) {
  return `${srcLang}:${tgtLang}:${text}`;
}

function getCached(text, srcLang, tgtLang) {
  const key = getCacheKey(text, srcLang, tgtLang);
  return translationCache.get(key);
}

function setCache(text, srcLang, tgtLang, result) {
  if (translationCache.size >= CACHE_MAX) {
    // Evict oldest
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  const key = getCacheKey(text, srcLang, tgtLang);
  translationCache.set(key, result);
}

/**
 * Check if text is purely numeric / symbols (should NOT be translated)
 */
function isNumericOrSymbol(text) {
  return /^[\d\s.,₹$%+\-/*=()°:;!?@#&|<>[\]{}^~`'"\\]+$/.test(text.trim());
}

// ── Speech-to-Text Translation ──────────────────────────────────────
/**
 * Send audio blob to backend → Sarvam STT-Translate → get English text
 * @param {Blob} audioBlob - The recorded audio blob
 * @returns {Promise<{transcript: string, translated_text: string, language_detected: string}>}
 */
export async function sarvamSTTTranslate(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const response = await apiFetch('/api/sarvam/stt-translate', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'STT translation failed');
  }

  return response.json();
}

// ── Text Translation ────────────────────────────────────────────────
/**
 * Translate a single text string via Sarvam AI
 * @param {string} text - Text to translate
 * @param {string} sourceLangCode - Sarvam 2-letter source language code
 * @param {string} targetLangCode - Sarvam 2-letter target language code
 * @returns {Promise<string>} Translated text
 */
export async function sarvamTranslateText(text, sourceLangCode, targetLangCode) {
  // Don't translate empty, numeric-only, or same-language
  if (!text || !text.trim() || isNumericOrSymbol(text) || sourceLangCode === targetLangCode) {
    return text;
  }

  // Check cache
  const cached = getCached(text, sourceLangCode, targetLangCode);
  if (cached) return cached;

  try {
    const response = await apiFetch('/api/sarvam/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source_language_code: sourceLangCode,
        target_language_code: targetLangCode,
      }),
    });

    if (!response.ok) {
      console.warn('Sarvam translate failed, returning original text');
      return text;
    }

    const data = await response.json();
    const result = data.translated_text || text;
    setCache(text, sourceLangCode, targetLangCode, result);
    return result;
  } catch (err) {
    console.error('Sarvam translate error:', err);
    return text;
  }
}

/**
 * Translate an array of strings via Sarvam AI batch endpoint
 * @param {string[]} texts - Array of texts to translate
 * @param {string} sourceLangCode - Source lang code
 * @param {string} targetLangCode - Target lang code
 * @returns {Promise<string[]>} Array of translated texts
 */
export async function sarvamTranslateBatch(texts, sourceLangCode, targetLangCode) {
  if (!texts || texts.length === 0 || sourceLangCode === targetLangCode) {
    return texts;
  }

  // Check cache for each, only send uncached
  const results = new Array(texts.length);
  const uncachedIndices = [];
  const uncachedTexts = [];

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if (!t || !t.trim() || isNumericOrSymbol(t)) {
      results[i] = t;
      continue;
    }
    const cached = getCached(t, sourceLangCode, targetLangCode);
    if (cached) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(t);
    }
  }

  if (uncachedTexts.length === 0) return results;

  try {
    const response = await apiFetch('/api/sarvam/translate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        texts: uncachedTexts,
        source_language_code: sourceLangCode,
        target_language_code: targetLangCode,
      }),
    });

    if (!response.ok) {
      // Fill with originals
      uncachedIndices.forEach((idx, j) => { results[idx] = uncachedTexts[j]; });
      return results;
    }

    const data = await response.json();
    const translated = data.translated_texts || uncachedTexts;

    uncachedIndices.forEach((idx, j) => {
      results[idx] = translated[j] || uncachedTexts[j];
      setCache(uncachedTexts[j], sourceLangCode, targetLangCode, results[idx]);
    });

    return results;
  } catch (err) {
    console.error('Sarvam batch translate error:', err);
    uncachedIndices.forEach((idx, j) => { results[idx] = uncachedTexts[j]; });
    return results;
  }
}

// ── Convenience wrappers ────────────────────────────────────────────
/**
 * Translate user input to English (for sending to Gemini/backend)
 * @param {string} text - User text in their language
 * @param {string} userLanguage - Display name (e.g., 'Hindi')
 * @returns {Promise<string>} English text
 */
export async function translateInputToEnglish(text, userLanguage) {
  if (!text || userLanguage === 'English') return text;
  const srcCode = getSarvamLangCode(userLanguage);
  return sarvamTranslateText(text, srcCode, 'en-IN');
}

/**
 * Translate English text to user's language (for display)
 * @param {string} text - English text
 * @param {string} userLanguage - Display name (e.g., 'Hindi')
 * @returns {Promise<string>} Text in user's language
 */
export async function translateToUserLanguage(text, userLanguage) {
  if (!text || userLanguage === 'English') return text;
  const tgtCode = getSarvamLangCode(userLanguage);
  return sarvamTranslateText(text, 'en-IN', tgtCode);
}

/**
 * Translate a UI string from English to the user's selected language.
 * Uses Sarvam AI for dynamic translation. Falls back to original text on error.
 * @param {string} englishText - The English UI string
 * @param {string} userLanguage - The target language display name
 * @returns {Promise<string>} Translated string
 */
export async function translateUIText(englishText, userLanguage) {
  if (!englishText || userLanguage === 'English') return englishText;

  // Skip numbers-only
  if (isNumericOrSymbol(englishText)) return englishText;

  const tgtCode = getSarvamLangCode(userLanguage);
  return sarvamTranslateText(englishText, 'en-IN', tgtCode);
}

/**
 * Clear translation cache (useful when language changes)
 */
export function clearTranslationCache() {
  translationCache.clear();
}
