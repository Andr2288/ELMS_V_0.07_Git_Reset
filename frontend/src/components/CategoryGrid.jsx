// frontend/src/components/CategoryGrid.jsx

import { useState, useEffect } from "react";
import { Folder, Edit, Trash2, Plus } from "lucide-react";
import { useCategoryStore } from "../store/useCategoryStore.js";
import CategoryForm from "./CategoryForm.jsx";
import ConfirmDeleteCategoryModal from "./ConfirmDeleteCategoryModal.jsx";

const CategoryGrid = ({ onCategorySelect, selectedCategoryId, uncategorizedCount = 0 }) => {
    const { categories, isLoading, deleteCategory } = useCategoryStore();

    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Delete confirmation modal states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleEdit = (category, e) => {
        e.stopPropagation();
        setEditingCategory(category);
        setShowForm(true);
    };

    const handleDeleteClick = (category, e) => {
        e.stopPropagation();
        setCategoryToDelete(category);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!categoryToDelete) return;

        setIsDeleting(true);
        try {
            await deleteCategory(categoryToDelete._id);
            setShowDeleteModal(false);
            setCategoryToDelete(null);
        } catch (error) {
            // Error handling is done in the store
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDeleteCancel = () => {
        if (!isDeleting) {
            setShowDeleteModal(false);
            setCategoryToDelete(null);
        }
    };

    const handleFormSubmit = async () => {
        setIsSubmitting(true);
        try {
            // The actual submit is handled by CategoryForm
            // This just manages the loading state
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingCategory(null);
    };

    const handleCategoryClick = (category) => {
        onCategorySelect(category);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyPress = (event) => {
            // Перевіряємо, чи є відкрита модальна форма в DOM
            const isModalOpen = document.querySelector('.fixed.inset-0.bg-gray-600\\/80');
            if (isModalOpen) return;

            // Перевіряємо, чи користувач не вводить текст
            const activeElement = document.activeElement;
            const isInputField =
                activeElement &&
                (activeElement.tagName === "INPUT" ||
                    activeElement.tagName === "TEXTAREA" ||
                    activeElement.tagName === "SELECT" ||
                    activeElement.contentEditable === "true");

            if (isInputField) return;

            // Ctrl + Space для створення нової папки
            if (event.ctrlKey && event.code === "Space") {
                event.preventDefault();
                setShowForm(true);
                return;
            }
        };

        window.addEventListener("keydown", handleKeyPress);
        return () => window.removeEventListener("keydown", handleKeyPress);
    }, []);

    // Unified Category Card Component
    const CategoryCard = ({
                              categoryData,
                              isSelected,
                              onClick,
                              canEdit = false,
                              onEdit = null,
                              onDelete = null
                          }) => {
        return (
            <div
                onClick={onClick}
                className={`rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer border-2 relative group ${
                    isSelected
                        ? 'ring-2 ring-opacity-50'
                        : 'border-transparent'
                }`}
                style={{
                    backgroundColor: categoryData.color + '15',
                    borderColor: isSelected ? categoryData.color : undefined,
                    '--tw-ring-color': categoryData.color + '40',
                    '--hover-border-color': categoryData.color
                }}
                onMouseEnter={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.borderColor = categoryData.color + '60';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.borderColor = 'transparent';
                    }
                }}
            >
                {/* Action Buttons - Only for editable categories */}
                {canEdit && (
                    <div className="absolute top-3 right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => onEdit(categoryData, e)}
                            className="p-1.5 bg-white hover:bg-gray-50 text-blue-600 rounded-lg shadow-sm transition-colors"
                            title="Редагувати"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => onDelete(categoryData, e)}
                            className="p-1.5 bg-white hover:bg-gray-50 text-red-600 rounded-lg shadow-sm transition-colors"
                            title="Видалити"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: categoryData.color }}
                        >
                            <Folder className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 truncate">
                                {categoryData.name}
                            </h3>
                            <p className="text-gray-600 text-sm line-clamp-2">
                                {categoryData.description || ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="text-gray-700">
                            <span className="text-md font-bold">
                                {categoryData.flashcardsCount} {
                                categoryData.flashcardsCount % 100 >= 11 && categoryData.flashcardsCount % 100 <= 14
                                    ? 'карток'
                                    : categoryData.flashcardsCount % 10 === 1
                                        ? 'картка'
                                        : categoryData.flashcardsCount % 10 >= 2 && categoryData.flashcardsCount % 10 <= 4
                                            ? 'картки'
                                            : 'карток'
                            }
                            </span>
                        </div>
                        <span className={`text-xs ${categoryData._id === 'all' ? 'text-transparent select-none' : 'text-gray-500'}`}>
                            {categoryData.dateText || new Date().toLocaleDateString('uk-UA')}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Prepare system categories data
    const allCategoriesData = {
        _id: 'all',
        name: 'Всі картки',
        description: 'Показати всі флешкартки',
        color: '#6B7280',
        flashcardsCount: categories.reduce((total, cat) => total + (cat.flashcardsCount || 0), 0),
        dateText: new Date().toLocaleDateString('uk-UA') // Date for structure, but will be invisible
    };

    const uncategorizedData = {
        _id: 'uncategorized',
        name: 'Без папки',
        description: 'Картки без категорії',
        color: '#059669', // Emerald-600 - приємний зелений колір
        flashcardsCount: uncategorizedCount,
        dateText: 'Системна'
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center px-2 py-1">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Папки</h2>
                    <p className="text-gray-600">Організуйте свої флешкартки по папках</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
                    title="Створити нову папку (Ctrl + Space)"
                >
                    <Plus className="w-5 h-5" />
                    <span>Нова папка</span>
                </button>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* All Categories Card */}
                <CategoryCard
                    categoryData={allCategoriesData}
                    isSelected={!selectedCategoryId}
                    onClick={() => onCategorySelect(null)}
                    canEdit={false}
                />

                {/* Uncategorized Card */}
                <CategoryCard
                    categoryData={uncategorizedData}
                    isSelected={selectedCategoryId === 'uncategorized'}
                    onClick={() => onCategorySelect({ _id: 'uncategorized', name: 'Без папки' })}
                    canEdit={false}
                />

                {/* Regular Categories */}
                {categories.map((category) => {
                    const categoryData = {
                        ...category,
                        flashcardsCount: category.flashcardsCount || 0,
                        dateText: new Date(category.createdAt).toLocaleDateString('uk-UA')
                    };

                    return (
                        <CategoryCard
                            key={category._id}
                            categoryData={categoryData}
                            isSelected={selectedCategoryId === category._id}
                            onClick={() => handleCategoryClick(category)}
                            canEdit={true}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                        />
                    );
                })}

                {/* Empty State */}
                {categories.length === 0 && (
                    <div className="col-span-full text-center py-12">
                        <div className="text-gray-400 mb-4">
                            <Folder className="w-16 h-16 mx-auto" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">Немає папок</h3>
                        <p className="text-gray-600 mb-4">Створіть свою першу папку для організації карток</p>

                        {/* Keyboard shortcut hint */}
                        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mb-4">
                            <span>Швидке створення:</span>
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Space</kbd>
                        </div>

                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center space-x-2 transition-colors"
                            title="Створити папку (Ctrl + Space)"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Створити папку</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Category Form Modal */}
            <CategoryForm
                isOpen={showForm}
                onClose={closeForm}
                editingCategory={editingCategory}
                isLoading={isSubmitting}
                onSubmit={handleFormSubmit}
            />

            {/* Delete Confirmation Modal for Categories */}
            <ConfirmDeleteCategoryModal
                isOpen={showDeleteModal}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                category={categoryToDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
};

export default CategoryGrid;