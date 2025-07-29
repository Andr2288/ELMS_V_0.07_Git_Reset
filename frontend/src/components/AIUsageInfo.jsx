// frontend/src/components/AIUsageInfo.jsx

import { useState, useEffect } from 'react';
import { useUserSettingsStore } from '../store/useUserSettingsStore.js';
import { Sparkles, AlertTriangle, Info } from 'lucide-react';

/**
 * Компонент для показу інформації про використання AI моделей
 * та вартості генерації контенту
 */
const AIUsageInfo = () => {
    const {
        getDefaultEnglishLevel,
        getChatGPTModel,
        hasUserApiKey,
        loadSettings
    } = useUserSettingsStore();

    const [englishLevel, setEnglishLevel] = useState('');
    const [chatgptModel, setChatgptModel] = useState('');
    const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

    // Завантажуємо налаштування при першому рендері
    useEffect(() => {
        const initSettings = async () => {
            try {
                await loadSettings();
                setEnglishLevel(getDefaultEnglishLevel());
                setChatgptModel(getChatGPTModel());
                setIsSettingsLoaded(true);
            } catch (error) {
                console.error('Помилка завантаження налаштувань:', error);
                setEnglishLevel('B1'); // Дефолтний рівень
                setChatgptModel('gpt-4.1-mini'); // Дефолтна модель
                setIsSettingsLoaded(true);
            }
        };

        initSettings();
    }, []);

    // Тарифи використання різних моделей (умовні значення)
    const modelPricing = {
        'gpt-3.5-turbo': { price: '0.0005', unit: '1K токенів' },
        'gpt-4.1-mini': { price: '0.0015', unit: '1K токенів' },
        'gpt-4-turbo': { price: '0.01', unit: '1K токенів' }
    };

    // Рендерінг індикатора поточного рівня
    const renderLevelIndicator = (level) => {
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const currentIndex = levels.indexOf(level);

        return (
            <div className="flex items-center space-x-1 mt-2">
                {levels.map((lvl, index) => (
                    <div
                        key={lvl}
                        className={`h-2 w-8 rounded-sm ${
                            index <= currentIndex
                                ? 'bg-blue-500'
                                : 'bg-gray-200'
                        }`}
                        title={lvl}
                    />
                ))}
            </div>
        );
    };

    if (!isSettingsLoaded) {
        return (
            <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-100 p-4">
            <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-purple-600 mt-1" />
                <div className="flex-1">
                    <h3 className="font-semibold text-purple-800">AI налаштування</h3>

                    <div className="mt-3 space-y-4">
                        {/* Рівень англійської */}
                        <div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">Рівень англійської</span>
                                <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {englishLevel}
                </span>
                            </div>
                            {renderLevelIndicator(englishLevel)}
                            <p className="text-xs text-gray-500 mt-1">
                                Використовується для генерації відповідного рівня складності
                            </p>
                        </div>

                        {/* Модель ChatGPT */}
                        <div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700">ChatGPT Модель</span>
                                <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  {chatgptModel}
                </span>
                            </div>

                            <div className="mt-2 bg-white rounded p-2 border border-purple-100">
                                <div className="flex justify-between text-xs">
                                    <span>Вартість:</span>
                                    <span className="font-semibold">
                    ${modelPricing[chatgptModel]?.price || '0.00'} / {modelPricing[chatgptModel]?.unit || 'токен'}
                  </span>
                                </div>
                            </div>
                        </div>

                        {/* API Ключ статус */}
                        <div className="flex items-start space-x-2 mt-2">
                            {hasUserApiKey() ? (
                                <Info className="w-4 h-4 text-green-600 mt-0.5" />
                            ) : (
                                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                            )}
                            <p className="text-xs text-gray-600">
                                {hasUserApiKey()
                                    ? "Використовується ваш власний API ключ"
                                    : "Використовується системний API ключ (обмежений)"}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3 text-center">
                        <a
                            href="/settings"
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                        >
                            Змінити налаштування AI →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIUsageInfo;