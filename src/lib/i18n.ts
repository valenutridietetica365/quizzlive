import es from "../locales/es.json";
import en from "../locales/en.json";

export type Language = 'es' | 'en';

interface TranslationsType {
    [key: string]: string | TranslationsType;
}

export const translations: Record<Language, TranslationsType> = {
    es: es as unknown as TranslationsType,
    en: en as unknown as TranslationsType
};

export const getTranslation = (lang: Language, key: string): string => {
    const keys = key.split('.');
    let current: TranslationsType | string = translations[lang];

    for (const k of keys) {
        if (typeof current !== 'object' || current === null) return key;
        const next: string | TranslationsType = (current as TranslationsType)[k];
        if (next === undefined) return key;
        current = next;
    }

    return typeof current === 'string' ? current : key;
};
