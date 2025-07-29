// frontend/src/pages/SettingsPage.jsx

import { useState, useEffect } from "react";
import {
    Settings, Key, CheckCircle, XCircle, AlertTriangle,
    Volume2, RotateCcw, Eye, EyeOff, Info, Sparkles, Server, User, Loader
} from "lucide-react";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";
import toast from "react-hot-toast";

const SettingsPage = () => {
    const {
        settings,
        availableOptions,
        isLoading: isLoadingSettings,
        isSaving,
        loadSettings,
        loadAvailableOptions,
        updateSetting,
        resetSettings,
        testApiKey,
        validateAndSaveApiKey
    } = useUserSettingsStore();

    // Local states
    const [showApiKey, setShowApiKey] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [isValidatingApi, setIsValidatingApi] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [apiValidationResult, setApiValidationResult] = useState(null);

    // Auto testing states
    const [isAutoTesting, setIsAutoTesting] = useState(false);
    const [autoTestResult, setAutoTestResult] = useState(null);

    // Load settings and options on component mount
    useEffect(() => {
        loadSettings();
        loadAvailableOptions();
    }, []);

    // Auto-test API key when apiKeySource changes or settings load
    useEffect(() => {
        if (settings?.apiKeyInfo?.hasValidKey && !isLoadingSettings) {
            performAutoTest();
        } else {
            // Очищаємо результат тесту, якщо немає валідного ключа
            setAutoTestResult(null);
        }
    }, [settings?.apiKeySource, settings?.apiKeyInfo?.effectiveSource, settings?.apiKeyInfo?.hasValidKey]);

    // Auto-test when settings first load (if there's a valid key)
    useEffect(() => {
        if (settings && !isLoadingSettings) {
            if (settings.apiKeyInfo?.hasValidKey && !autoTestResult) {
                performAutoTest();
            } else if (!settings.apiKeyInfo?.hasValidKey) {
                // Очищаємо результат тесту при завантаженні, якщо немає валідного ключа
                setAutoTestResult(null);
            }
        }
    }, [settings, isLoadingSettings]);

    // Perform automatic API test
    const performAutoTest = async () => {
        if (isAutoTesting) return; // Prevent duplicate tests

        // ДОДАНА ПЕРЕВІРКА: не тестуємо якщо немає валідного ключа
        if (!settings?.apiKeyInfo?.hasValidKey) {
            console.log("Skipping auto-test: no valid API key available");
            setAutoTestResult(null);
            return;
        }

        setIsAutoTesting(true);
        setAutoTestResult(null);

        try {
            const result = await testApiKey(false); // НЕ показуємо toast для автотестів

            setAutoTestResult({
                success: true,
                message: result.message,
                details: result.details,
                apiKeyInfo: result.apiKeyInfo
            });

            // ПРИБРАНО TOAST - він буде показаний тільки якщо є валідний ключ
            console.log("Auto-test successful:", result.message);

        } catch (error) {
            const errorData = error.response?.data;
            setAutoTestResult({
                success: false,
                message: errorData?.message || "Помилка тестування",
                details: errorData?.details || "Невідома помилка",
                apiKeyInfo: errorData?.apiKeyInfo
            });

            // ПРИБРАНО TOAST ДЛЯ ПОМИЛОК - показуємо тільки в UI
            console.log("Auto-test failed:", errorData?.message);
        } finally {
            setIsAutoTesting(false);
        }
    };

    // Auto-save handler with auto-testing for apiKeySource
    const handleSettingChange = async (path, value) => {
        try {
            await updateSetting(path, value);

            // If changing API key source, the useEffect will trigger auto-test
            // No need to manually trigger it here
        } catch (error) {
            // Error handling is done in the store
        }
    };

    // Validate and save API key
    const handleValidateApiKey = async () => {
        if (!apiKeyInput.trim()) {
            toast.error("Введіть API ключ");
            return;
        }

        setIsValidatingApi(true);
        setApiValidationResult(null);

        try {
            const result = await validateAndSaveApiKey(apiKeyInput.trim());

            setApiValidationResult({
                success: true,
                message: result.message,
                details: result.details
            });

            setApiKeyInput(""); // Clear input after successful validation
            toast.success("API ключ збережено!");

            // Auto-test the new key
            setTimeout(() => {
                performAutoTest();
            }, 500);

        } catch (error) {
            const errorData = error.response?.data;
            setApiValidationResult({
                success: false,
                message: errorData?.message || "Помилка перевірки API ключа",
                details: errorData?.details || "Невідома помилка"
            });

            // Очищаємо результат автотесту при невдалій валідації
            setAutoTestResult(null);

            toast.error(errorData?.message || "API ключ недійсний");
        } finally {
            setIsValidatingApi(false);
        }
    };

    const handleResetSettings = async () => {
        if (!confirm("Ви впевнені, що хочете скинути всі налаштування до значень за замовчуванням? Це також видалить ваш API ключ.")) {
            return;
        }

        try {
            setIsResetting(true);
            await resetSettings();
            setApiKeyInput("");
            setApiValidationResult(null);
            setAutoTestResult(null);
        } finally {
            setIsResetting(false);
        }
    };

    if (isLoadingSettings) {
        return (
            <div className="ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Завантаження налаштувань...</p>
                </div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                    <p className="text-gray-600">Помилка завантаження налаштувань</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ml-64 min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Settings className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Налаштування</h1>
                                <p className="text-gray-600 mt-1">Персональні налаштування та конфігурація</p>
                            </div>
                        </div>

                        {/* Status Indicators */}
                        <div className="flex items-center space-x-4">
                            {/* Auto-save indicator */}
                            {isSaving && (
                                <div className="flex items-center space-x-2 text-blue-600 text-sm">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span>Збереження...</span>
                                </div>
                            )}

                            {/* Reset Button */}
                            <button
                                onClick={handleResetSettings}
                                disabled={isResetting || isSaving}
                                className="flex items-center space-x-2 px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                            >
                                {isResetting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                ) : (
                                    <RotateCcw className="w-4 h-4" />
                                )}
                                <span>Скинути</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* OpenAI API Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center space-x-3">
                                <Key className="w-5 h-5 text-blue-600" />
                                <h2 className="text-xl font-semibold text-gray-900">OpenAI API Налаштування</h2>
                            </div>
                            <p className="text-gray-600 mt-1">Оберіть тип API ключа та налаштуйте доступ до OpenAI</p>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* API Key Source Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Тип API ключа
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* System Key Option */}
                                    <div
                                        onClick={() => handleSettingChange('apiKeySource', 'system')}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            settings.apiKeySource === 'system'
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className={`p-2 rounded-lg ${
                                                settings.apiKeySource === 'system' ? 'bg-blue-100' : 'bg-gray-100'
                                            }`}>
                                                <Server className={`w-5 h-5 ${
                                                    settings.apiKeySource === 'system' ? 'text-blue-600' : 'text-gray-600'
                                                }`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        checked={settings.apiKeySource === 'system'}
                                                        onChange={() => handleSettingChange('apiKeySource', 'system')}
                                                        className="text-blue-600"
                                                    />
                                                    <span className="font-medium text-gray-900">Системний ключ</span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Використовувати загальний API ключ сервера (може мати обмеження)
                                                </p>
                                                {/* Показуємо статус системного ключа */}
                                                {settings.apiKeyInfo?.hasSystemKey ? (
                                                    <p className="text-xs text-green-600 mt-1 flex items-center space-x-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span>Системний ключ доступний</span>
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-red-600 mt-1 flex items-center space-x-1">
                                                        <XCircle className="w-3 h-3" />
                                                        <span>Системний ключ відсутній або недійсний</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Key Option */}
                                    <div
                                        onClick={() => handleSettingChange('apiKeySource', 'user')}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            settings.apiKeySource === 'user'
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className={`p-2 rounded-lg ${
                                                settings.apiKeySource === 'user' ? 'bg-blue-100' : 'bg-gray-100'
                                            }`}>
                                                <User className={`w-5 h-5 ${
                                                    settings.apiKeySource === 'user' ? 'text-blue-600' : 'text-gray-600'
                                                }`} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="radio"
                                                        checked={settings.apiKeySource === 'user'}
                                                        onChange={() => handleSettingChange('apiKeySource', 'user')}
                                                        className="text-blue-600"
                                                    />
                                                    <span className="font-medium text-gray-900">Власний ключ</span>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    Використовувати ваш особистий API ключ (необмежений доступ)
                                                </p>
                                                {/* Показуємо статус користувацького ключа */}
                                                {settings.apiKeyInfo?.hasUserKey ? (
                                                    <p className="text-xs text-green-600 mt-1 flex items-center space-x-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        <span>Власний ключ встановлено</span>
                                                    </p>
                                                ) : (
                                                    <p className="text-xs text-gray-600 mt-1 flex items-center space-x-1">
                                                        <XCircle className="w-3 h-3" />
                                                        <span>Власний ключ не встановлено</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* User API Key Input - показується тільки якщо вибрано "user" */}
                            {settings.apiKeySource === 'user' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ваш OpenAI API Ключ
                                    </label>
                                    <div className="flex space-x-3">
                                        <div className="relative flex-1">
                                            <input
                                                type={showApiKey ? "text" : "password"}
                                                value={apiKeyInput}
                                                onChange={(e) => {
                                                    setApiKeyInput(e.target.value);
                                                    setApiValidationResult(null);
                                                }}
                                                placeholder={settings.hasApiKey ? "API ключ встановлено (введіть новий для заміни)" : "sk-proj-..."}
                                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                                                <Key className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                            >
                                                {showApiKey ? (
                                                    <EyeOff className="h-5 w-5 text-gray-400" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-400" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Validate Button */}
                                        <button
                                            onClick={handleValidateApiKey}
                                            disabled={isValidatingApi || !apiKeyInput.trim()}
                                            className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:cursor-not-allowed"
                                        >
                                            {isValidatingApi ? (
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            ) : (
                                                <CheckCircle className="w-5 h-5" />
                                            )}
                                            <span>{isValidatingApi ? "Перевірка..." : "Встановити"}</span>
                                        </button>
                                    </div>

                                    <p className="text-gray-500 text-xs mt-1">
                                        Отримайте ключ на platform.openai.com/account/api-keys
                                    </p>
                                </div>
                            )}

                            {/* Current API Key Status with Auto-Test Result */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="space-y-3">
                                    {/* Configuration Info */}
                                    <div>
                                        <h4 className="font-medium text-gray-900 mb-2">Поточна конфігурація</h4>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                {settings.apiKeyInfo?.hasValidKey ? (
                                                    <p className="text-sm text-green-600 flex items-center space-x-1">
                                                        <CheckCircle className="w-4 h-4" />
                                                        <span>
                                                            Використовується: {' '}
                                                            <span className="font-medium">
                                                                {settings.apiKeyInfo?.effectiveSource === 'user' ? 'власний ключ' : 'системний ключ'}
                                                            </span>
                                                        </span>
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-red-600 flex items-center space-x-1">
                                                        <XCircle className="w-4 h-4" />
                                                        <span>Немає валідного API ключа</span>
                                                    </p>
                                                )}
                                            </div>

                                            {/* Auto-testing indicator */}
                                            {isAutoTesting && (
                                                <div className="flex items-center space-x-2 text-blue-600 text-sm">
                                                    <Loader className="w-4 h-4 animate-spin" />
                                                    <span>Тестування...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Auto-Test Results - показуємо тільки якщо є валідний ключ */}
                            {autoTestResult && !isAutoTesting && settings.apiKeyInfo?.hasValidKey && (
                                <div className={`p-3 rounded-lg border ${
                                    autoTestResult.success
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-red-50 border-red-200'
                                }`}>
                                    <div className="flex items-start space-x-2">
                                        {autoTestResult.success ? (
                                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1">
                                            <h5 className={`text-sm font-medium ${
                                                autoTestResult.success ? 'text-green-900' : 'text-red-900'
                                            }`}>
                                                {autoTestResult.success
                                                    ? `${settings.apiKeySource === 'user' ? 'Власний' : 'Системний'} API ключ працює!`
                                                    : `Помилка`
                                                }
                                            </h5>
                                            {autoTestResult.details && (
                                                <p className={`text-xs mt-1 ${
                                                    autoTestResult.success ? 'text-green-700' : 'text-red-700'
                                                }`}>
                                                    {autoTestResult.details}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Validation Results */}
                            {apiValidationResult && (
                                <div className={`p-4 rounded-lg border ${
                                    apiValidationResult.success
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-red-50 border-red-200'
                                }`}>
                                    <div className="flex items-start space-x-3">
                                        {apiValidationResult.success ? (
                                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                        )}
                                        <div>
                                            <h4 className={`font-medium ${
                                                apiValidationResult.success ? 'text-green-900' : 'text-red-900'
                                            }`}>
                                                {apiValidationResult.message}
                                            </h4>
                                            {apiValidationResult.details && (
                                                <p className={`text-sm mt-1 ${
                                                    apiValidationResult.success ? 'text-green-700' : 'text-red-700'
                                                }`}>
                                                    {apiValidationResult.details}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Settings */}
                    {availableOptions && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <Sparkles className="w-5 h-5 text-purple-600" />
                                    <h2 className="text-xl font-semibold text-gray-900">Налаштування ШІ</h2>
                                </div>
                                <p className="text-gray-600 mt-1">Параметри для генерації контенту за допомогою ШІ</p>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* ChatGPT Model */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Модель ChatGPT
                                    </label>
                                    <select
                                        value={settings.aiSettings?.chatgptModel || "gpt-4.1-mini"}
                                        onChange={(e) => handleSettingChange('aiSettings.chatgptModel', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {availableOptions.chatgptModels?.map((model) => (
                                            <option key={model.id} value={model.id}>
                                                {model.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {availableOptions.chatgptModels?.find(m => m.id === settings.aiSettings?.chatgptModel)?.description ||
                                            "Модель для генерації контенту"}
                                    </p>
                                </div>

                                {/* Default English Level */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Рівень англійської за замовчуванням
                                    </label>
                                    <select
                                        value={settings.generalSettings?.defaultEnglishLevel || "B1"}
                                        onChange={(e) => handleSettingChange('generalSettings.defaultEnglishLevel', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {availableOptions.englishLevels?.map((level) => (
                                            <option key={level.id} value={level.id}>
                                                {level.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {availableOptions.englishLevels?.find(l => l.id === settings.generalSettings?.defaultEnglishLevel)?.description ||
                                            "Рівень складності англійської для генерації контенту"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TTS Settings */}
                    {availableOptions && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <Volume2 className="w-5 h-5 text-purple-600" />
                                    <h2 className="text-xl font-semibold text-gray-900">Налаштування TTS</h2>
                                </div>
                                <p className="text-gray-600 mt-1">Параметри синтезу мовлення</p>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Model */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Модель TTS
                                    </label>
                                    <select
                                        value={settings.ttsSettings?.model || "tts-1"}
                                        onChange={(e) => handleSettingChange('ttsSettings.model', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {availableOptions.models?.map((model) => (
                                            <option key={model.id} value={model.id}>
                                                {model.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {availableOptions.models?.find(m => m.id === settings.ttsSettings?.model)?.description}
                                    </p>
                                </div>

                                {/* Voice */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Голос
                                    </label>
                                    <select
                                        value={settings.ttsSettings?.voice || "alloy"}
                                        onChange={(e) => handleSettingChange('ttsSettings.voice', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {availableOptions.voices?.map((voice) => (
                                            <option key={voice.id} value={voice.id}>
                                                {voice.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {availableOptions.voices?.find(v => v.id === settings.ttsSettings?.voice)?.description}
                                    </p>
                                </div>

                                {/* Speed */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Швидкість: {settings.ttsSettings?.speed || 1.0}x
                                    </label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.10"
                                        value={settings.ttsSettings?.speed || 1.0}
                                        onChange={(e) => handleSettingChange('ttsSettings.speed', parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>0.5x</span>
                                        <span className="mr-45">1x</span>
                                        <span>2x</span>
                                    </div>
                                </div>

                                {/* Response Format */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Формат аудіо
                                    </label>
                                    <select
                                        value={settings.ttsSettings?.responseFormat || "mp3"}
                                        onChange={(e) => handleSettingChange('ttsSettings.responseFormat', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {availableOptions.responseFormats?.map((format) => (
                                            <option key={format.id} value={format.id}>
                                                {format.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {availableOptions.responseFormats?.find(f => f.id === settings.ttsSettings?.responseFormat)?.description}
                                    </p>
                                </div>

                                {/* Voice Style */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Стиль голосу
                                    </label>
                                    <select
                                        value={settings.ttsSettings?.voiceStyle || "neutral"}
                                        onChange={(e) => handleSettingChange('ttsSettings.voiceStyle', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        {availableOptions.voiceStyles?.map((style) => (
                                            <option key={style.id} value={style.id}>
                                                {style.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {availableOptions.voiceStyles?.find(s => s.id === settings.ttsSettings?.voiceStyle)?.description}
                                    </p>
                                </div>

                                {/* Custom Instructions */}
                                {settings.ttsSettings?.model === "gpt-4o-mini-tts" && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Додаткові інструкції (тільки для GPT-4o Mini TTS)
                                        </label>
                                        <textarea
                                            value={settings.ttsSettings?.customInstructions || ""}
                                            onChange={(e) => handleSettingChange('ttsSettings.customInstructions', e.target.value)}
                                            placeholder="Додаткові інструкції для стилю озвучування..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                            rows="3"
                                            maxLength="500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            {(settings.ttsSettings?.customInstructions || "").length}/500 символів
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* General Settings */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Загальні налаштування</h2>
                            <p className="text-gray-600 mt-1">Основні параметри застосунку</p>
                        </div>

                        <div className="p-6">
                            {/* Cache Audio */}
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="cacheAudio"
                                    checked={settings.generalSettings?.cacheAudio || false}
                                    onChange={(e) => handleSettingChange('generalSettings.cacheAudio', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                />
                                <label htmlFor="cacheAudio" className="ml-2 text-sm text-gray-700">
                                    Кешувати аудіо файли
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                                Збереження аудіо файлів для швидшого повторного відтворення
                            </p>
                        </div>
                    </div>

                    {/* Info Panel */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-blue-900">Автоматичне збереження та тестування</h4>
                                <div className="text-sm text-blue-700 mt-1 space-y-1">
                                    <p>• Всі зміни зберігаються автоматично</p>
                                    <p>• API ключ тестується автоматично при зміні режиму</p>
                                    <p>• <strong>Системний ключ:</strong> встановлюється адміністратором</p>
                                    <p>• <strong>Власний ключ:</strong> ваш особистий ключ з необмеженим доступом</p>
                                    <p>• API ключі зберігаються зашифровано</p>
                                    <p>• Якщо обраний тип ключа недоступний, використовується fallback</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SettingsPage;