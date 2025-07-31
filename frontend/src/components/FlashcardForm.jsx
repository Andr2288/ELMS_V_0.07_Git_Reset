// frontend/src/components/FlashcardForm.jsx - ВИПРАВЛЕНИЙ

import { useState, useEffect, useCallback, useRef } from "react";
import { Save, X, Folder, Settings, Sparkles, RotateCcw, AlertCircle, Loader, StickyNote, Zap, Plus, Trash2 } from "lucide-react";
import { axiosInstance } from "../lib/axios.js";
import { useCategoryStore } from "../store/useCategoryStore.js";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";
import toast from "react-hot-toast";

const FlashcardForm = ({
                         isOpen,
                         onClose,
                         onSubmit,
                         editingCard,
                         isLoading,
                         preselectedCategoryId,
                       }) => {
  const { categories, getCategories } = useCategoryStore();
  const {
    loadSettings,
    hasUserApiKey,
    getDefaultEnglishLevel,
    getChatGPTModel
  } = useUserSettingsStore();

  // State for form data
  const [formData, setFormData] = useState({
    text: "",
    transcription: "",
    translation: "",
    shortDescription: "",
    explanation: "",
    examples: ["", "", ""], // Масив з 3 прикладів
    notes: "",
    isAIGenerated: false,
    categoryId: "",
  });

  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // AI mode states
  const [isAIMode, setIsAIMode] = useState(false);
  const [englishLevel, setEnglishLevel] = useState(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Individual field generation states - ВИПРАВЛЕНО
  const [isGeneratingField, setIsGeneratingField] = useState({
    shortDescription: false,
    explanation: false,
    definition: false, // для детального пояснення
    examples: false,
    transcription: false,
    translation: false,
    translateToUkrainian: false // для перекладу на українську
  });

  // Auto-save state for quick creation
  const [isQuickCreating, setIsQuickCreating] = useState(false);

  // Ref for auto-focus
  const textInputRef = useRef(null);

  // Load categories and settings when form opens
  useEffect(() => {
    if (isOpen) {
      getCategories();
      initializeSettings();

      // Auto-focus on text field after a small delay
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen, getCategories]);

  const initializeSettings = async () => {
    try {
      await loadSettings();
      setSettingsLoaded(true);
      setEnglishLevel(getDefaultEnglishLevel());
    } catch (error) {
      console.error("Failed to load settings:", error);
      setSettingsLoaded(true);
      setEnglishLevel("B1");
    }
  };

  useEffect(() => {
    if (editingCard) {
      // Обробляємо examples як масив
      let examples = ["", "", ""];
      if (editingCard.examples && Array.isArray(editingCard.examples)) {
        examples = [...editingCard.examples];
        // Доповнюємо до 3 елементів якщо менше
        while (examples.length < 3) {
          examples.push("");
        }
        // Обрізаємо до 3 елементів якщо більше
        examples = examples.slice(0, 3);
      } else if (editingCard.example) {
        // Зворотна сумісність зі старим форматом
        examples[0] = editingCard.example;
      }

      setFormData({
        text: editingCard.text || "",
        transcription: editingCard.transcription || "",
        translation: editingCard.translation || "",
        shortDescription: editingCard.shortDescription || "",
        explanation: editingCard.explanation || "",
        examples: examples,
        notes: editingCard.notes || "",
        isAIGenerated: editingCard.isAIGenerated || false,
        categoryId: editingCard.categoryId?._id || "",
      });
      setIsAIMode(false);
    } else {
      setFormData({
        text: "",
        transcription: "",
        translation: "",
        shortDescription: "",
        explanation: "",
        examples: ["", "", ""],
        notes: "",
        isAIGenerated: false,
        categoryId: preselectedCategoryId || "",
      });
      setIsAIMode(false);
    }
  }, [editingCard, isOpen, preselectedCategoryId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.text.trim()) return;

    try {
      const submitData = {
        ...formData,
        categoryId: formData.categoryId || null,
        // Фільтруємо порожні приклади
        examples: formData.examples.filter(ex => ex.trim())
      };

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  const handleInputChange = (field, value) => {
    // Капіталізація першої букви для перекладу
    if (field === 'translation' && value) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Обробка зміни прикладів
  const handleExampleChange = (index, value) => {
    const newExamples = [...formData.examples];
    newExamples[index] = value;
    setFormData((prev) => ({
      ...prev,
      examples: newExamples,
    }));
  };

  // Додавання нового приклада
  const addExample = () => {
    if (formData.examples.length < 5) { // Максимум 5 прикладів
      setFormData((prev) => ({
        ...prev,
        examples: [...prev.examples, ""]
      }));
    }
  };

  // Видалення приклада
  const removeExample = (index) => {
    if (formData.examples.length > 1) { // Мінімум 1 приклад
      const newExamples = formData.examples.filter((_, i) => i !== index);
      setFormData((prev) => ({
        ...prev,
        examples: newExamples
      }));
    }
  };

  const handleClose = () => {
    onClose();
  };

  const toggleAIMode = () => {
    setIsAIMode(!isAIMode);
    setAiError(null);
  };

  // Генерація окремого поля - ВИПРАВЛЕНО
  const generateField = async (fieldType) => {
    if (!formData.text.trim()) {
      toast.error("Введіть слово або фразу спочатку");
      return;
    }

    if (!englishLevel) {
      setEnglishLevel("B1");
    }

    setIsGeneratingField(prev => ({ ...prev, [fieldType]: true }));

    try {
      console.log(`Generating field: ${fieldType} for text: "${formData.text.trim()}"`);

      const response = await axiosInstance.post("/openai/generate-flashcard", {
        text: formData.text.trim(),
        englishLevel: englishLevel,
        promptType: fieldType
      });

      const result = response.data.result;
      console.log(`Generated result for ${fieldType}:`, result);

      // ВИПРАВЛЕНО: Спеціальна обробка різних типів полів
      if (fieldType === "examples") {
        // Обробляємо масив прикладів
        if (Array.isArray(result)) {
          const newExamples = ["", "", ""];
          result.forEach((example, index) => {
            if (index < 3 && example) {
              newExamples[index] = example;
            }
          });
          setFormData(prev => ({
            ...prev,
            examples: newExamples,
            isAIGenerated: true
          }));
        } else {
          // Fallback якщо результат не масив
          setFormData(prev => ({
            ...prev,
            examples: [result || "", "", ""],
            isAIGenerated: true
          }));
        }
      } else if (fieldType === "translateToUkrainian") {
        // Спеціальна обробка для перекладу на українську
        setFormData(prev => ({
          ...prev,
          translation: result,
          isAIGenerated: true
        }));
      } else if (fieldType === "definition") {
        // Спеціальна обробка для детального пояснення
        setFormData(prev => ({
          ...prev,
          explanation: result,
          isAIGenerated: true
        }));
      } else {
        // Стандартна обробка для інших полів
        setFormData(prev => ({
          ...prev,
          [fieldType]: result,
          isAIGenerated: true
        }));
      }

      toast.success(`${getFieldName(fieldType)} згенеровано!`);

    } catch (error) {
      console.error(`Error generating ${fieldType}:`, error);

      // Детальна обробка помилок
      if (error.response?.status === 401) {
        toast.error("API ключ недійсний");
      } else if (error.response?.status === 402) {
        toast.error("Недостатньо кредитів OpenAI");
      } else if (error.response?.status === 429) {
        toast.error("Перевищено ліміт запитів OpenAI");
      } else if (error.response?.status === 500) {
        toast.error("OpenAI API не налаштований");
      } else {
        toast.error(`Помилка генерації ${getFieldName(fieldType).toLowerCase()}`);
      }
    } finally {
      setIsGeneratingField(prev => ({ ...prev, [fieldType]: false }));
    }
  };

  // ВИПРАВЛЕНО: Додано нові типи полів
  const getFieldName = (fieldType) => {
    const names = {
      shortDescription: "Короткий опис",
      explanation: "Детальне пояснення",
      definition: "Детальне пояснення",
      examples: "Приклади",
      transcription: "Транскрипцію",
      translation: "Переклад",
      translateToUkrainian: "Переклад"
    };
    return names[fieldType] || fieldType;
  };

  // Generate complete flashcard with AI
  const generateWithAI = async () => {
    if (!formData.text.trim()) {
      toast.error("Введіть слово або фразу спочатку");
      return;
    }

    if (!englishLevel) {
      setEnglishLevel("B1");
    }

    setIsGeneratingAI(true);
    setAiError(null);

    try {
      const response = await axiosInstance.post("/openai/generate-flashcard", {
        text: formData.text.trim(),
        englishLevel: englishLevel,
        promptType: "completeFlashcard"
      });

      if (response.data.parsed) {
        const aiContent = response.data.result;

        // Обробляємо examples як масив
        let examples = ["", "", ""];
        if (aiContent.examples && Array.isArray(aiContent.examples)) {
          aiContent.examples.forEach((example, index) => {
            if (index < 3 && example) {
              examples[index] = example;
            }
          });
        } else if (aiContent.example) {
          // Зворотна сумісність
          examples[0] = aiContent.example;
        }

        setFormData(prev => ({
          ...prev,
          transcription: aiContent.transcription || "",
          translation: aiContent.translation || "",
          shortDescription: aiContent.shortDescription || "",
          explanation: aiContent.explanation || "",
          examples: examples,
          notes: aiContent.notes || "",
          isAIGenerated: true
        }));

        toast.success("Контент успішно згенеровано!");
      } else {
        console.log("Raw AI response:", response.data.raw);

        const rawText = response.data.raw;
        const translationMatch = rawText.match(/translation["']?\s*:\s*["']([^"']+)["']/i);
        const shortDescMatch = rawText.match(/shortDescription["']?\s*:\s*["']([^"']+)["']/i);
        const explanationMatch = rawText.match(/explanation["']?\s*:\s*["']([^"']+)["']/i);
        const transcriptionMatch = rawText.match(/transcription["']?\s*:\s*["']([^"']+)["']/i);
        const notesMatch = rawText.match(/notes["']?\s*:\s*["']([^"']+)["']/i);

        // Намагаємося витягти examples як масив
        let examples = ["", "", ""];
        const examplesMatch = rawText.match(/examples["']?\s*:\s*\[([\s\S]*?)\]/i);
        if (examplesMatch) {
          try {
            const examplesArray = JSON.parse(`[${examplesMatch[1]}]`);
            examplesArray.forEach((example, index) => {
              if (index < 3 && example) {
                examples[index] = example.replace(/^["']|["']$/g, '');
              }
            });
          } catch (e) {
            console.log("Error parsing examples array:", e);
          }
        } else {
          // Fallback на старий формат
          const exampleMatch = rawText.match(/example["']?\s*:\s*["']([^"']+)["']/i);
          if (exampleMatch) {
            examples[0] = exampleMatch[1];
          }
        }

        setFormData(prev => ({
          ...prev,
          transcription: transcriptionMatch ? transcriptionMatch[1] : "",
          translation: translationMatch ? translationMatch[1] : "",
          shortDescription: shortDescMatch ? shortDescMatch[1] : "",
          explanation: explanationMatch ? explanationMatch[1] : "",
          examples: examples,
          notes: notesMatch ? notesMatch[1] : "",
          isAIGenerated: true
        }));

        toast.success("Контент згенеровано, але з помилками парсингу");
      }
    } catch (error) {
      console.error("Error generating AI content:", error);
      setAiError(error.response?.data?.message || "Помилка генерації контенту");

      if (error.response?.status === 401) {
        toast.error("API ключ недійсний");
      } else if (error.response?.status === 402) {
        toast.error("Недостатньо кредитів OpenAI");
      } else if (error.response?.status === 429) {
        toast.error("Перевищено ліміт запитів OpenAI");
      } else {
        toast.error("Помилка генерації контенту");
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const resetAIContent = () => {
    if (confirm("Ви впевнені, що хочете скинути згенерований контент?")) {
      setFormData(prev => ({
        ...prev,
        transcription: "",
        translation: "",
        shortDescription: "",
        explanation: "",
        examples: ["", "", ""],
        notes: "",
        isAIGenerated: false
      }));
      toast.success("Контент скинуто");
    }
  };

  // Validate text field
  const validateTextField = () => {
    const text = formData.text.trim();

    if (!text) {
      toast.error("Введіть слово або фразу для створення картки");
      return false;
    }

    if (text.length < 1) {
      toast.error("Слово або фраза занадто коротка");
      return false;
    }

    if (text.length > 200) {
      toast.error("Слово або фраза занадто довга (максимум 200 символів)");
      return false;
    }

    return true;
  };

  // Quick create flashcard with AI (Ctrl + Space)
  const quickCreateFlashcard = async () => {
    if (!validateTextField()) {
      return;
    }

    if (!englishLevel) {
      setEnglishLevel("B1");
    }

    setIsQuickCreating(true);

    try {
      // Generate AI content
      const response = await axiosInstance.post("/openai/generate-flashcard", {
        text: formData.text.trim(),
        englishLevel: englishLevel,
        promptType: "completeFlashcard"
      });

      let aiContent = {};

      if (response.data.parsed) {
        aiContent = response.data.result;
      } else {
        // Fallback parsing if JSON parsing failed
        const rawText = response.data.raw;
        const translationMatch = rawText.match(/translation["']?\s*:\s*["']([^"']+)["']/i);
        const shortDescMatch = rawText.match(/shortDescription["']?\s*:\s*["']([^"']+)["']/i);
        const explanationMatch = rawText.match(/explanation["']?\s*:\s*["']([^"']+)["']/i);
        const transcriptionMatch = rawText.match(/transcription["']?\s*:\s*["']([^"']+)["']/i);
        const notesMatch = rawText.match(/notes["']?\s*:\s*["']([^"']+)["']/i);

        // Обробляємо examples
        let examples = [];
        const examplesMatch = rawText.match(/examples["']?\s*:\s*\[([\s\S]*?)\]/i);
        if (examplesMatch) {
          try {
            const examplesArray = JSON.parse(`[${examplesMatch[1]}]`);
            examples = examplesArray.map(ex => ex.replace(/^["']|["']$/g, '')).slice(0, 3);
          } catch (e) {
            console.log("Error parsing examples:", e);
            const exampleMatch = rawText.match(/example["']?\s*:\s*["']([^"']+)["']/i);
            if (exampleMatch) {
              examples = [exampleMatch[1]];
            }
          }
        }

        aiContent = {
          transcription: transcriptionMatch ? transcriptionMatch[1] : "",
          translation: translationMatch ? translationMatch[1] : "",
          shortDescription: shortDescMatch ? shortDescMatch[1] : "",
          explanation: explanationMatch ? explanationMatch[1] : "",
          examples: examples,
          notes: notesMatch ? notesMatch[1] : "",
        };
      }

      // Обробляємо examples в submitData
      let examples = [];
      if (aiContent.examples && Array.isArray(aiContent.examples)) {
        examples = aiContent.examples.filter(ex => ex && ex.trim());
      } else if (aiContent.example) {
        examples = [aiContent.example];
      }

      // Prepare data for submission
      const submitData = {
        text: formData.text.trim(),
        transcription: aiContent.transcription || "",
        translation: aiContent.translation || "",
        shortDescription: aiContent.shortDescription || "",
        explanation: aiContent.explanation || "",
        examples: examples,
        notes: aiContent.notes || "",
        isAIGenerated: true,
        categoryId: formData.categoryId || null,
      };

      // Auto-save the flashcard
      await onSubmit(submitData);

      // Close the form
      onClose();

    } catch (error) {

      console.error("Error in quick create:", error);

      let errorMessage = "Помилка швидкого створення картки";

      if (error.response?.status === 401) {
        errorMessage = "API ключ недійсний. Перевірте налаштування";
      } else if (error.response?.status === 402) {
        errorMessage = "Недостатньо кредитів OpenAI";
      } else if (error.response?.status === 429) {
        errorMessage = "Перевищено ліміт запитів OpenAI";
      } else if (error.response?.status === 500) {
        errorMessage = "OpenAI API не налаштований";
      }

      toast.error(errorMessage);
    } finally {
      setIsQuickCreating(false);
    }
  };

  // Обробка клавіш
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (event) => {
      // ESC для закриття форми
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isQuickCreating && !isGeneratingAI) {
          handleClose();
        }
        return;
      }

      // Ctrl + Space для швидкого створення картки
      if (event.ctrlKey && event.code === "Space") {
        event.preventDefault();
        if (!isQuickCreating && !isGeneratingAI) {
          quickCreateFlashcard();
        }
        return;
      }

      const activeElement = document.activeElement;
      const isInputField =
          activeElement &&
          (activeElement.tagName === "INPUT" ||
              activeElement.tagName === "TEXTAREA" ||
              activeElement.tagName === "SELECT" ||
              activeElement.contentEditable === "true");

      if (isInputField) return;
    };

    window.addEventListener("keydown", handleKeyPress, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isOpen, formData.text, isQuickCreating, isGeneratingAI]);

  if (!isOpen) return null;

  const selectedCategory = categories.find(
      (cat) => cat._id === formData.categoryId
  );

  return (
      <div className="fixed inset-0 bg-gray-600/80 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Fixed Header */}
          <div className="sticky top-0 bg-white p-6 border-b border-gray-200 rounded-t-2xl z-10 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCard ? "Редагувати картку" : "Створити нову картку"}
                </h2>
                {settingsLoaded && (
                    <p className="text-xs text-gray-500 mt-1">
                      Рівень англійської: {englishLevel}
                    </p>
                )}
              </div>
              <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 p-2 transition-colors"
                  title="Закрити (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Mode Toggle */}
              {!editingCard && (
                  <div className="flex justify-center mb-4">
                    <div className="bg-gray-100 p-1 rounded-lg flex">
                      <button
                          type="button"
                          onClick={() => setIsAIMode(false)}
                          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${
                              !isAIMode
                                  ? "bg-white text-blue-600 shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        <span>Ручний режим</span>
                      </button>
                      <button
                          type="button"
                          onClick={() => setIsAIMode(true)}
                          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${
                              isAIMode
                                  ? "bg-white text-purple-600 shadow-sm"
                                  : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>ШІ допомога</span>
                      </button>
                    </div>
                  </div>
              )}

              {/* AI Generation Section */}
              {isAIMode && (
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 mb-6">
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-purple-800 mb-2 flex items-center">
                        <Sparkles className="w-4 h-4 mr-1" />
                        Повна генерація за допомогою ШІ
                      </h3>
                      <p className="text-xs text-purple-600 mb-3">
                        Штучний інтелект створить всі поля картки автоматично на основі введеного слова (включаючи 3 приклади)
                      </p>

                      <div className="mb-3 text-sm text-purple-800">
                        <span className="font-medium">Рівень англійської: </span>
                        <span>{englishLevel || "Завантаження..."}</span>
                        <p className="text-xs text-purple-600 mt-1">
                          Ви можете змінити рівень в налаштуваннях застосунку
                        </p>
                      </div>

                      <div className="flex space-x-2">
                        <button
                            type="button"
                            onClick={generateWithAI}
                            disabled={isGeneratingAI || !formData.text.trim() || isQuickCreating}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                        >
                          {isGeneratingAI || isQuickCreating ? (
                              <>
                                <Loader className="w-4 h-4 animate-spin" />
                                <span>{isQuickCreating ? "Швидке створення..." : "Генерація..."}</span>
                              </>
                          ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                <span>Згенерувати всі поля</span>
                              </>
                          )}
                        </button>

                        {formData.isAIGenerated && (
                            <button
                                type="button"
                                onClick={resetAIContent}
                                disabled={isGeneratingAI || isQuickCreating}
                                className="px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                title="Скинути згенерований контент"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                      </div>

                      {/* AI Error Display */}
                      {aiError && (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">Помилка генерації</p>
                              <p className="text-xs mt-1">{aiError}</p>
                            </div>
                          </div>
                      )}

                      {/* AI Generated Badge */}
                      {formData.isAIGenerated && (
                          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-600 flex items-center space-x-2 justify-center">
                            <Sparkles className="w-3 h-3" />
                            <span>Згенеровано з допомогою ШІ</span>
                          </div>
                      )}
                    </div>
                  </div>
              )}

              {/* Word/Text - БЕЗ ОЗВУЧКИ */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Слово/Фраза <span className="text-red-500">*</span>
                  </label>
                  <div className="text-xs text-gray-500">
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl</kbd>
                    +
                    <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded ml-1">Space</kbd>
                    <span className="ml-1">швидке створення</span>
                  </div>
                </div>
                <textarea
                    ref={textInputRef}
                    value={formData.text}
                    onChange={(e) => {
                      const value = e.target.value;
                      const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
                      handleInputChange("text", capitalized);
                    }}
                    placeholder="Введіть слово або фразу..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows="1"
                    required
                    disabled={isQuickCreating}
                />

                {/* Quick creation indicator */}
                {isQuickCreating && (
                    <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      <div className="text-sm text-green-700">
                        <p className="font-medium">Швидке створення картки...</p>
                        <p className="text-xs">Генерація ШІ контенту та автоматичне збереження</p>
                      </div>
                    </div>
                )}
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Папка
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Folder className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                      value={formData.categoryId}
                      onChange={(e) =>
                          handleInputChange("categoryId", e.target.value)
                      }
                      className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                  >
                    <option value="">Без папки</option>
                    {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Transcription with AI button */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Транскрипція
                      </label>
                      <button
                          type="button"
                          onClick={() => generateField("transcription")}
                          disabled={isGeneratingField.transcription || !formData.text.trim() || isQuickCreating}
                          className="text-xs bg-purple-100 hover:bg-purple-200 disabled:bg-gray-100 text-purple-700 px-2 py-1 rounded flex items-center space-x-1"
                      >
                        {isGeneratingField.transcription ? (
                            <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                            <Zap className="w-3 h-3" />
                        )}
                        <span>ШІ</span>
                      </button>
                    </div>
                    <textarea
                        value={formData.transcription}
                        onChange={(e) =>
                            handleInputChange("transcription", e.target.value)
                        }
                        placeholder="[trænsˈkrɪpʃən] - фонетична транскрипція"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono resize-none disabled:bg-gray-100"
                        rows="3"
                        disabled={isQuickCreating}
                    />
                  </div>

                  {/* Translation with AI button - ВИПРАВЛЕНО */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Переклад
                      </label>
                      <button
                          type="button"
                          onClick={() => generateField("translateToUkrainian")}
                          disabled={isGeneratingField.translateToUkrainian || !formData.text.trim() || isQuickCreating}
                          className="text-xs bg-purple-100 hover:bg-purple-200 disabled:bg-gray-100 text-purple-700 px-2 py-1 rounded flex items-center space-x-1"
                      >
                        {isGeneratingField.translateToUkrainian ? (
                            <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                            <Zap className="w-3 h-3" />
                        )}
                        <span>ШІ</span>
                      </button>
                    </div>
                    <textarea
                        value={formData.translation}
                        onChange={(e) => handleInputChange("translation", e.target.value)}
                        placeholder="Український переклад слова..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100"
                        rows="3"
                        disabled={isQuickCreating}
                    />
                  </div>

                  {/* Short Description with AI button */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Короткий опис
                      </label>
                      <button
                          type="button"
                          onClick={() => generateField("shortDescription")}
                          disabled={isGeneratingField.shortDescription || !formData.text.trim() || isQuickCreating}
                          className="text-xs bg-purple-100 hover:bg-purple-200 disabled:bg-gray-100 text-purple-700 px-2 py-1 rounded flex items-center space-x-1"
                      >
                        {isGeneratingField.shortDescription ? (
                            <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                            <Zap className="w-3 h-3" />
                        )}
                        <span>ШІ</span>
                      </button>
                    </div>
                    <textarea
                        value={formData.shortDescription}
                        onChange={(e) => handleInputChange("shortDescription", e.target.value)}
                        placeholder="Короткий опис слова для відображення в списку карток..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100"
                        rows="3"
                        maxLength="200"
                        disabled={isQuickCreating}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.shortDescription.length}/200 символів. Використовується для відображення в сітці карток.
                    </p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Explanation with AI button - ВИПРАВЛЕНО */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Детальне пояснення
                      </label>
                      <button
                          type="button"
                          onClick={() => generateField("definition")}
                          disabled={isGeneratingField.definition || !formData.text.trim() || isQuickCreating}
                          className="text-xs bg-purple-100 hover:bg-purple-200 disabled:bg-gray-100 text-purple-700 px-2 py-1 rounded flex items-center space-x-1"
                      >
                        {isGeneratingField.definition ? (
                            <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                            <Zap className="w-3 h-3" />
                        )}
                        <span>ШІ</span>
                      </button>
                    </div>
                    <textarea
                        value={formData.explanation}
                        onChange={(e) => handleInputChange("explanation", e.target.value)}
                        placeholder="Детальне пояснення значення, контексту використання..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100"
                        rows="3"
                        disabled={isQuickCreating}
                    />
                  </div>

                  {/* Examples with AI button */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Приклади вживання
                      </label>
                      <button
                          type="button"
                          onClick={() => generateField("examples")}
                          disabled={isGeneratingField.examples || !formData.text.trim() || isQuickCreating}
                          className="text-xs bg-purple-100 hover:bg-purple-200 disabled:bg-gray-100 text-purple-700 px-2 py-1 rounded flex items-center space-x-1"
                      >
                        {isGeneratingField.examples ? (
                            <Loader className="w-3 h-3 animate-spin" />
                        ) : (
                            <Zap className="w-3 h-3" />
                        )}
                        <span>ШІ (3 приклади)</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formData.examples.map((example, index) => (
                          <div key={index} className="flex space-x-2">
                            <div className="flex-1">
                              <textarea
                                  value={example}
                                  onChange={(e) => handleExampleChange(index, e.target.value)}
                                  placeholder={`Приклад ${index + 1}...`}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100"
                                  rows="2"
                                  disabled={isQuickCreating}
                              />
                            </div>
                            {formData.examples.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeExample(index)}
                                    disabled={isQuickCreating}
                                    className="px-2 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Видалити приклад"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                          </div>
                      ))}

                      {formData.examples.length < 5 && (
                          <button
                              type="button"
                              onClick={addExample}
                              disabled={isQuickCreating}
                              className="w-full px-4 py-2 border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Додати ще один приклад</span>
                          </button>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Особисті нотатки
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        placeholder="Ваші особисті нотатки, підказки для запам'ятовування..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100"
                        rows="3"
                        disabled={isQuickCreating}
                    />
                  </div>
                </div>
              </div>

              {/* API Warning */}
              {settingsLoaded && !hasUserApiKey() && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start space-x-2">
                      <Settings className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-700">
                        <p className="font-medium">
                          Використовується системний API ключ
                        </p>
                        <p>
                          Встановіть власний API ключ в налаштуваннях для необмеженого
                          доступу до ШІ-генерації
                        </p>
                      </div>
                    </div>
                  </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                    type="submit"
                    disabled={isLoading || !formData.text.trim() || isQuickCreating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {isLoading || isQuickCreating ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>
                    {editingCard ? "Зберегти зміни" : "Створити картку"}
                  </span>
                      </>
                  )}
                </button>
                <button
                    type="button"
                    onClick={handleClose}
                    disabled={isQuickCreating}
                    className="px-6 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  Скасувати
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
  );
};

export default FlashcardForm;