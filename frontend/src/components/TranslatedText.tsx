import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { translate } from '../utils/translate';

/**
 * Component that renders text translated according to the current language setting.
 * Uses Sarvam AI dynamic translation via LanguageContext.translateUI(),
 * with fallback to static dictionary translations.
 * Numbers are never translated.
 */
interface TranslatedTextProps extends React.HTMLAttributes<HTMLElement> {
  text: string | React.ReactNode;
  as?: any;
  [key: string]: any;
}

const TranslatedText: React.FC<TranslatedTextProps> = ({ text, as = 'span', ...props }) => {
  const { language, translateUI } = useLanguage();

  // If English, just return original text
  if (language === 'English') {
    const Element = as;
    return <Element {...props}>{text}</Element>;
  }

  // First try static dictionary (instant)
  const staticTranslation = translate(text);
  // If static dictionary has a translation for this language, use it
  if (staticTranslation !== text) {
    const Element = as;
    return <Element {...props}>{staticTranslation}</Element>;
  }

  // Otherwise use Sarvam AI dynamic translation
  const dynamicTranslation = translateUI(text);
  const Element = as;
  return <Element {...props}>{dynamicTranslation}</Element>;
};

export default TranslatedText;
