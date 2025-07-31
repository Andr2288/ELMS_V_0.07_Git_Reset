// frontend/src/components/ConfirmDeleteCategoryModal.jsx

import { useEffect } from "react";
import { AlertTriangle, X, Folder, Trash2 } from "lucide-react";

const ConfirmDeleteCategoryModal = ({
                                        isOpen,
                                        onClose,
                                        onConfirm,
                                        category,
                                        isDeleting
                                    }) => {
    // Обробка хоткізів для модального вікна
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyPress = (event) => {
            // Перевіряємо, чи не заблоковано дії через isDeleting
            if (isDeleting) return;

            // ESC для скасування
            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onClose();
                return;
            }

            // Enter для підтвердження
            if (event.key === "Enter") {
                event.preventDefault();
                event.stopPropagation();
                onConfirm();
                return;
            }
        };

        // Додаємо обробник подій
        window.addEventListener("keydown", handleKeyPress, { passive: false });

        return () => {
            window.removeEventListener("keydown", handleKeyPress);
        };
    }, [isOpen, isDeleting, onClose, onConfirm]);

    if (!isOpen || !category) return null;

    const handleConfirm = () => {
        onConfirm();
    };

    const flashcardsCount = category.flashcardsCount || 0;

    return (
        <div className="fixed inset-0 bg-gray-600/80 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Підтвердження видалення папки
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="text-gray-400 hover:text-gray-600 p-2 disabled:cursor-not-allowed"
                            title="Скасувати (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-700 mb-4">
                        Ви впевнені, що хочете видалити цю папку?
                    </p>

                    {/* Category Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 border-l-4 border-red-500">
                        <div className="flex items-center space-x-3">
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: category.color }}
                            >
                                <Folder className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    {category.name}
                                </p>
                                {category.description && (
                                    <p className="text-sm text-gray-600">
                                        {category.description}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Warning about flashcards */}
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <div className="flex items-start space-x-3">
                            <Trash2 className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-red-800 font-semibold">Увага!</h4>
                                <div className="text-red-700 text-sm mt-1">
                                    {flashcardsCount > 0 ? (
                                        <>
                                            <p>Разом з папкою будуть <strong>безповоротно видалені всі {flashcardsCount} картки</strong>, що знаходяться в ній.</p>
                                            <p className="mt-2">Це включає:</p>
                                            <ul className="list-disc list-inside mt-1 space-y-1">
                                                <li>Всі слова та переклади</li>
                                                <li>Транскрипції та пояснення</li>
                                                <li>Приклади використання</li>
                                            </ul>
                                        </>
                                    ) : (
                                        <p>Папка порожня, але її видалення <strong>неможливо скасувати</strong>.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Final warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-yellow-800 text-sm">
                            <strong>Цю дію неможливо скасувати.</strong> Всі дані будуть втрачені назавжди.
                        </p>
                    </div>

                    {/* Keyboard shortcuts hint */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-center space-x-4 text-sm text-blue-700">
                            <div className="flex items-center space-x-1">
                                <kbd className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 border border-blue-200 rounded">Esc</kbd>
                                <span>скасувати</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                                <kbd className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 border border-blue-200 rounded">Enter</kbd>
                                <span>підтвердити</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-200 flex space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                        title="Скасувати (Esc)"
                    >
                        Скасувати
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
                        title="Підтвердити видалення (Enter)"
                    >
                        {isDeleting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Видалення...</span>
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                <span>
                                    Видалити {flashcardsCount > 0 ? `папку і ${flashcardsCount} карток` : 'папку'}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteCategoryModal;