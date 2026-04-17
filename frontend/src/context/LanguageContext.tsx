// @refresh reset
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { getLanguage, setLanguage } from '../utils/translate';
import { translateToUserLanguage, translateInputToEnglish, sarvamTranslateBatch, getSarvamLangCode, clearTranslationCache } from '../utils/sarvamApi';

// Create a context for language
const LanguageContext = createContext<any>(null);

/**
 * Provider component for language context
 * Provides language state + Sarvam AI translation functions app-wide
 */
export function LanguageProvider({ children }) {
  const [language, setCurrentLanguage] = useState(getLanguage());
  // Cache of dynamically translated UI strings: { [englishText]: translatedText }
  const [uiTranslations, setUiTranslations] = useState({});
  const pendingRef = useRef(new Set()); // track in-flight translations
  const batchTimerRef = useRef(null);
  const batchQueueRef = useRef([]);

  const changeLanguage = useCallback((newLanguage) => {
    setCurrentLanguage(newLanguage);
    setLanguage(newLanguage);
    // Clear cached translations when language changes
    setUiTranslations({});
    clearTranslationCache();
  }, []);

  useEffect(() => {
    const storedLanguage = localStorage.getItem('ammachi_language');
    if (storedLanguage) {
      setCurrentLanguage(storedLanguage);
      setLanguage(storedLanguage);
    }
  }, []);

  /**
   * Translate a UI string from English to the current language.
   * Returns the translated text from cache if available, otherwise queues for batch translation.
   * For English, returns the original text immediately.
   */
  const translateUI = useCallback((englishText) => {
    if (!englishText || language === 'English') return englishText;

    // Skip numbers-only
    if (/^[\d\s.,₹$%+\-/*=()°:;]+$/.test(englishText.trim())) return englishText;

    // Return from cache if available
    if (uiTranslations[englishText]) return uiTranslations[englishText];

    // Queue for batch translation
    if (!pendingRef.current.has(englishText)) {
      pendingRef.current.add(englishText);
      batchQueueRef.current.push(englishText);

      // Debounce: batch translate after 100ms of no new requests
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = setTimeout(async () => {
        const batch = [...batchQueueRef.current];
        batchQueueRef.current = [];

        if (batch.length === 0) return;

        try {
          const tgtCode = getSarvamLangCode(language);
          const translated = await sarvamTranslateBatch(batch, 'en-IN', tgtCode);

          setUiTranslations(prev => {
            const next = { ...prev };
            batch.forEach((text, i) => {
              next[text] = translated[i] || text;
              pendingRef.current.delete(text);
            });
            return next;
          });
        } catch (err) {
          console.error('Batch UI translation error:', err);
          batch.forEach(t => pendingRef.current.delete(t));
        }
      }, 100);
    }

    // Return original text while translation is in-flight
    return englishText;
  }, [language, uiTranslations]);

  /**
   * Translate user input text to English (for sending to backend/Gemini)
   */
  const toEnglish = useCallback(async (text) => {
    return translateInputToEnglish(text, language);
  }, [language]);

  /**
   * Translate English text to user's language (for displaying responses)
   */
  const fromEnglish = useCallback(async (text) => {
    return translateToUserLanguage(text, language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{
      language,
      changeLanguage,
      translateUI,
      toEnglish,
      fromEnglish,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Custom hook to use the language context
 * @returns {{ language: string, changeLanguage: (lang: string) => void, translateUI: (text: string) => string, toEnglish: (text: string) => Promise<string>, fromEnglish: (text: string) => Promise<string> }}
 */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
