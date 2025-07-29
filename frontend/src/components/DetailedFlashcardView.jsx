// frontend/src/components/DetailedFlashcardView.jsx - ВИПРАВЛЕНА ВЕРСІЯ

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Volume2,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { axiosInstance } from "../lib/axios.js";
import { useFlashcardStore } from "../store/useFlashcardStore.js";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "./ConfirmDeleteModal.jsx";

const DetailedFlashcardView = ({ flashcards, onEdit }) => {
  const { deleteFlashcard } = useFlashcardStore();
  const {
    settings: userSettings,
    hasApiKey,
    loadSettings,
    getTTSSettings,
  } = useUserSettingsStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Delete confirmation modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings state
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // ВИПРАВЛЕННЯ: Використовуємо useRef для збереження поточного аудіо
  const currentAudioRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Load user settings on component mount
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        await loadSettings();
        setSettingsLoaded(true);
      } catch (error) {
        console.error("Failed to load settings:", error);
        setSettingsLoaded(true); // Continue with defaults
      }
    };

    initializeSettings();
  }, [loadSettings]);

  // ВИПРАВЛЕННЯ: Стабільна функція зупинки аудіо
  const stopCurrentAudio = useCallback(() => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current = null;
      } catch (error) {
        console.warn("Error stopping audio:", error);
      }
    }
    isPlayingRef.current = false;
    setIsPlayingAudio(false);
  }, []); // БЕЗ ЗАЛЕЖНОСТЕЙ!

  const handleFlip = useCallback(() => {
    if (!isChanging) {
      setIsFlipped(!isFlipped);
    }
  }, [isChanging, isFlipped]);

  const nextCard = useCallback(() => {
    if (currentIndex < flashcards.length - 1 && !isChanging) {
      setIsChanging(true);
      setIsFlipped(false);
      stopCurrentAudio();
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsChanging(false);
      }, 150);
    }
  }, [currentIndex, flashcards.length, isChanging, stopCurrentAudio]);

  const prevCard = useCallback(() => {
    if (currentIndex > 0 && !isChanging) {
      setIsChanging(true);
      setIsFlipped(false);
      stopCurrentAudio();
      setTimeout(() => {
        setCurrentIndex(currentIndex - 1);
        setIsChanging(false);
      }, 150);
    }
  }, [currentIndex, isChanging, stopCurrentAudio]);

  const goToCard = useCallback(
      (index) => {
        if (index !== currentIndex && !isChanging) {
          setIsChanging(true);
          setIsFlipped(false);
          stopCurrentAudio();
          setTimeout(() => {
            setCurrentIndex(index);
            setIsChanging(false);
          }, 150);
        }
      },
      [currentIndex, isChanging, stopCurrentAudio]
  );

  // ВИПРАВЛЕННЯ: Стабільна функція озвучки з правильною обробкою аудіо
  const speakText = useCallback(
      async (text, isAutoPlay = false) => {
        // Перевірки
        if (!text || isChanging || isPlayingRef.current) {
          console.log("Speech blocked:", { text: !!text, isChanging, isPlaying: isPlayingRef.current });
          return;
        }

        if (!settingsLoaded) {
          if (!isAutoPlay) {
            toast.error("Налаштування ще завантажуються...");
          }
          return;
        }

        try {
          // ВАЖЛИВО: Зупиняємо попереднє аудіо перед початком нового
          stopCurrentAudio();

          // Встановлюємо статус
          isPlayingRef.current = true;
          setIsPlayingAudio(true);

          console.log("Starting TTS for:", text.substring(0, 50));

          const response = await axiosInstance.post(
              "/tts/speech",
              { text: text.trim() }, // ВИПРАВЛЕННЯ: Обрізаємо текст
              {
                responseType: "blob",
                timeout: 30000,
              }
          );

          // Перевіряємо, чи ще актуальний цей запит
          if (!isPlayingRef.current) {
            console.log("TTS request cancelled");
            return;
          }

          const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);

          // Встановлюємо поточне аудіо
          currentAudioRef.current = audio;

          // Обробники подій для аудіо
          audio.onended = () => {
            console.log("Audio ended");
            isPlayingRef.current = false;
            setIsPlayingAudio(false);
            currentAudioRef.current = null;
            URL.revokeObjectURL(audioUrl);
          };

          audio.onerror = (error) => {
            console.error("Audio error:", error);
            isPlayingRef.current = false;
            setIsPlayingAudio(false);
            currentAudioRef.current = null;
            URL.revokeObjectURL(audioUrl);
            if (!isAutoPlay) {
              toast.error("Помилка відтворення звуку");
            }
          };

          audio.onabort = () => {
            console.log("Audio aborted");
            isPlayingRef.current = false;
            setIsPlayingAudio(false);
            currentAudioRef.current = null;
            URL.revokeObjectURL(audioUrl);
          };

          // Запускаємо відтворення
          await audio.play();
          console.log("Audio started playing");

        } catch (error) {

          // ВАЖЛИВО: Скидання стану при помилці
          isPlayingRef.current = false;
          setIsPlayingAudio(false);
          currentAudioRef.current = null;

          console.error("Error playing TTS:", error);

          if (!isAutoPlay) {
            if (error.response?.status === 401) {
              toast.error("API ключ недійсний. Перевірте налаштування", {
                duration: 4000,
                action: {
                  label: "Налаштування",
                  onClick: () => (window.location.href = "/settings"),
                },
              });
            } else if (error.response?.status === 402) {
              toast.error("Недостатньо кредитів OpenAI. Поповніть баланс");
            } else if (error.response?.status === 429) {
              toast.error("Перевищено ліміт запитів OpenAI. Спробуйте пізніше");
            } else if (error.response?.status === 503) {
              toast.error("Проблеми з підключенням до OpenAI API");
            } else if (error.response?.status === 500) {
              toast.error("OpenAI API не налаштований. Встановіть ключ в налаштуваннях");
            } else if (error.code === "ECONNABORTED") {
              toast.error("Тайм-аут запиту. Спробуйте ще раз");
            } else {
              toast.error("Помилка генерації озвучення");
            }
          }
        }
      },
      [isChanging, settingsLoaded, stopCurrentAudio] // МІНІМАЛЬНІ ЗАЛЕЖНОСТІ
  );

  const handleDeleteClick = (card) => {
    setCardToDelete(card);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return;

    setIsDeleting(true);
    try {
      await deleteFlashcard(cardToDelete._id);
      setShowDeleteModal(false);
      setCardToDelete(null);

      if (currentIndex >= flashcards.length - 1 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    if (!isDeleting) {
      setShowDeleteModal(false);
      setCardToDelete(null);
    }
  };

  // ВИПРАВЛЕННЯ: Покращена обробка клавіш з перевіркою дублювання
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Перевіряємо модальні вікна
      const isModalOpen = document.querySelector('.fixed.inset-0.bg-gray-600\\/80');
      if (isModalOpen) return;

      // Перевіряємо поля вводу
      const activeElement = document.activeElement;
      const isInputField =
          activeElement &&
          (activeElement.tagName === "INPUT" ||
              activeElement.tagName === "TEXTAREA" ||
              activeElement.contentEditable === "true");

      if (isInputField) return;

      // Обробляємо клавіші
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prevCard();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        nextCard();
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        handleFlip();
      } else if (
          event.key === "v" ||
          event.key === "V" ||
          event.key === "м" ||
          event.key === "М"
      ) {
        event.preventDefault();

        // ВИПРАВЛЕННЯ: Додаткові перевірки для озвучки
        const currentCard = flashcards[currentIndex];
        if (currentCard?.text && !isPlayingRef.current && !isChanging) {
          console.log("Keyboard TTS triggered for:", currentCard.text);
          speakText(currentCard.text);
        } else {
          console.log("TTS blocked by conditions:", {
            hasText: !!currentCard?.text,
            isPlaying: isPlayingRef.current,
            isChanging
          });
        }
      }
    };

    // ВАЖЛИВО: Додаємо обробник з passive: false для preventDefault
    window.addEventListener("keydown", handleKeyPress, { passive: false });

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [prevCard, nextCard, handleFlip, speakText, currentIndex, flashcards, isChanging]);

  // ВИПРАВЛЕННЯ: Очищення при зміні картки або демонтуванні
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, [currentIndex, stopCurrentAudio]);

  // ВИПРАВЛЕННЯ: Очищення при демонтуванні компонента
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  if (!flashcards || flashcards.length === 0) {
    return (
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-500 text-lg">Немає карток для відображення</p>
        </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
      <div className="max-w-4xl mx-auto">
        {/* Мінімальний лічильник карток */}
        <div className="text-center mb-3">
          <span className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium">
            {currentIndex + 1} з {flashcards.length}
          </span>
        </div>

        {/* Main Card Container */}
        <div className="relative">
          {/* Card Actions */}
          <div className="absolute top-4 right-3 flex space-x-2 z-20">
            <button
                onClick={() => {
                  if (!isChanging) onEdit(currentCard);
                }}
                disabled={isChanging}
                className="bg-white/90 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-blue-600 p-2 rounded-full shadow-sm transition-colors"
                title="Редагувати"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
                onClick={() => {
                  if (!isChanging) handleDeleteClick(currentCard);
                }}
                disabled={isChanging}
                className="bg-white/90 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed text-red-600 p-2 rounded-full shadow-sm transition-colors"
                title="Видалити"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Card Content */}
          <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 overflow-hidden h-[380px] md:h-[420px] relative">
            {/* Front Side */}
            {!isFlipped && (
                <div
                    key={`front-${currentIndex}`}
                    className={`h-full transition-all duration-300 ${
                        isChanging ? "opacity-70" : "opacity-100"
                    }`}
                >
                  <div className="h-full flex flex-col justify-center items-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                    <div className="text-center space-y-3 w-full">
                      {currentCard.isAIGenerated && (
                          <div className="inline-flex items-center space-x-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            <span>ШІ-генерація</span>
                          </div>
                      )}

                      <h2 className="text-3xl font-bold text-gray-900 mb-2 break-words max-w-md mx-auto">
                        {currentCard.text}
                      </h2>

                      {currentCard.transcription && (
                          <p className="text-base text-gray-600 font-mono mb-2">
                            [{currentCard.transcription}]
                          </p>
                      )}

                      <div className="py-3">
                        <button
                            type="button"
                            onClick={() => speakText(currentCard.text)}
                            disabled={
                                !currentCard.text ||
                                isPlayingAudio ||
                                isChanging ||
                                !settingsLoaded
                            }
                            className={`px-6 py-3 rounded-lg transition-all shadow-md ${
                                isPlayingAudio
                                    ? "bg-green-500 hover:bg-green-600 animate-pulse scale-105"
                                    : "bg-purple-500 hover:bg-purple-600 hover:scale-105"
                            } disabled:bg-gray-300 disabled:scale-100 text-white flex items-center space-x-2 mx-auto`}
                            title={
                              !settingsLoaded
                                  ? "Завантаження налаштувань..."
                                  : isPlayingAudio
                                      ? "Відтворення... (натисніть V щоб зупинити)"
                                      : "Прослухати (або натисніть V)"
                            }
                        >
                          <Volume2 className="w-5 h-5" />
                          <span>
                        {!settingsLoaded
                            ? "Завантаження..."
                            : isPlayingAudio
                                ? "Відтворення..."
                                : "Озвучити"}
                      </span>
                        </button>
                      </div>

                      <p className="text-gray-500 text-base">
                        Натисніть Пробіл / Enter, щоб побачити переклад
                      </p>
                    </div>
                  </div>
                </div>
            )}

            {/* Back Side */}
            {isFlipped && (
                <div
                    key={`back-${currentIndex}`}
                    className={`h-full transition-all duration-300 ${
                        isChanging ? "opacity-70" : "opacity-100"
                    }`}
                >
                  <div className="h-full flex flex-col bg-gradient-to-br from-stone-50 to-neutral-100 overflow-hidden">
                    {/* Header - тільки AI badge */}
                    {currentCard.isAIGenerated && (
                        <div className="flex-shrink-0 p-6 text-center">
                          <div className="inline-flex items-center space-x-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                            <Sparkles className="w-3 h-3" />
                            <span>ШІ-генерація</span>
                          </div>
                        </div>
                    )}

                    {/* Content - Scrollable with proper padding */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <div className="px-6 pt-4 space-y-6 min-h-full">
                        {/* Translation - Головний переклад */}
                        {currentCard.translation && (
                            <div className="text-center py-4">
                              <p className="text-3xl font-bold text-gray-900 leading-relaxed mb-2">
                                {currentCard.translation.charAt(0).toUpperCase() + currentCard.translation.slice(1)}
                              </p>
                              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto"></div>
                            </div>
                        )}

                        {/* Explanation */}
                        {currentCard.explanation && (
                            <div>
                              <h4 className="text-sm font-semibold text-blue-700 mb-3 uppercase tracking-wide">
                                Детальне пояснення
                              </h4>
                              <div className="bg-white/60 rounded-lg p-4 border-l-4 border-blue-300">
                                <p className="text-gray-800 leading-relaxed text-lg">
                                  {currentCard.explanation}
                                </p>
                              </div>
                            </div>
                        )}

                        {/* Notes - після пояснення */}
                        {currentCard.notes && (
                            <div>
                              <h4 className="text-sm font-semibold text-rose-700 mb-3 uppercase tracking-wide flex items-center">
                                <StickyNote className="w-4 h-4 mr-1" />
                                Особисті нотатки
                              </h4>
                              <div className="bg-rose-50/80 rounded-lg p-4 border-l-4 border-rose-300">
                                <p className="text-gray-800 leading-relaxed text-lg">
                                  {currentCard.notes}
                                </p>
                              </div>
                            </div>
                        )}

                        {/* Example - наприкінці */}
                        {currentCard.example && (
                            <div>
                              <h4 className="text-sm font-semibold text-amber-700 mb-3 uppercase tracking-wide">
                                Приклад використання
                              </h4>
                              <div className="bg-amber-50/80 rounded-lg p-4 border-l-4 border-amber-300">
                                <p className="text-gray-800 italic leading-relaxed text-lg">
                                  "{currentCard.example}"
                                </p>
                              </div>
                            </div>
                        )}

                        {/* Якщо немає жодної додаткової інформації */}
                        {!currentCard.translation &&
                            !currentCard.explanation &&
                            !currentCard.example &&
                            !currentCard.notes && (
                                <div className="flex items-center justify-center h-full min-h-[200px]">
                                  <div className="text-center text-gray-500">
                                    <p className="text-lg mb-2">Додаткової інформації немає</p>
                                    <p className="text-sm">Відредагуйте картку, щоб додати пояснення або приклади</p>
                                  </div>
                                </div>
                            )}

                        {/* Spacer для забезпечення що footer не перекриває контент */}
                        <div className="h-6"></div>
                      </div>
                    </div>

                    {/* Footer - Fixed at bottom */}
                    <div className="flex-shrink-0 p-4 border-t border-stone-200/50 bg-white/90 backdrop-blur-sm">
                      <div className="text-center">
                        <p className="text-gray-600 text-sm">
                          <kbd className="px-2 py-1 bg-white/60 rounded text-xs mr-2">Пробіл</kbd>
                          повернутися
                          <kbd className="px-2 py-1 bg-white/60 rounded text-xs mx-2">V</kbd>
                          озвучити
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-4">
          <button
              onClick={prevCard}
              disabled={currentIndex === 0 || isChanging}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Попередня</span>
          </button>

          <div className="flex space-x-1">
            {flashcards.map((_, index) => (
                <button
                    key={index}
                    onClick={() => goToCard(index)}
                    disabled={isChanging}
                    className={`w-3 h-3 rounded-full transition-colors disabled:cursor-not-allowed ${
                        index === currentIndex
                            ? "bg-blue-600"
                            : "bg-gray-300 hover:bg-gray-400"
                    }`}
                />
            ))}
          </div>

          <button
              onClick={nextCard}
              disabled={currentIndex === flashcards.length - 1 || isChanging}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <span>Наступна</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
            isOpen={showDeleteModal}
            onClose={handleDeleteCancel}
            onConfirm={handleDeleteConfirm}
            cardText={cardToDelete?.text}
            isDeleting={isDeleting}
        />
      </div>
  );
};

export default DetailedFlashcardView;