// frontend/src/store/useFlashcardStore.js

import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useFlashcardStore = create((set, get) => ({
  flashcards: [],
  isLoading: false,
  currentCategoryFilter: null, // null = all, 'uncategorized' = without category, categoryId = specific category

  getFlashcards: async (categoryId = null) => {
    set({ isLoading: true });
    try {
      let url = "/flashcards";
      if (categoryId) {
        url += `?categoryId=${categoryId}`;
      }

      const res = await axiosInstance.get(url);
      set({
        flashcards: res.data,
        currentCategoryFilter: categoryId
      });
    } catch (error) {
      console.log("Error getting flashcards:", error);
      toast.error("Помилка завантаження карток");
    } finally {
      set({ isLoading: false });
    }
  },

  createFlashcard: async (flashcardData) => {
    try {
      const res = await axiosInstance.post("/flashcards", flashcardData);

      // Add to current list if it matches the filter
      const currentFilter = get().currentCategoryFilter;
      const newFlashcard = res.data;

      const shouldAddToList =
          !currentFilter || // showing all
          (currentFilter === 'uncategorized' && !newFlashcard.categoryId) ||
          (newFlashcard.categoryId?._id === currentFilter);

      if (shouldAddToList) {
        set({ flashcards: [newFlashcard, ...get().flashcards] });
      }

      toast.success("Картку створено!");
      return res.data;
    } catch (error) {
      console.log("Error creating flashcard:", error);

      const message = error.response?.data?.message || "Помилка створення картки";
      toast.error(message);
      throw error;
    }
  },

  updateFlashcard: async (id, flashcardData) => {
    try {
      const res = await axiosInstance.put(`/flashcards/${id}`, flashcardData);
      const updatedFlashcard = res.data;

      // Update in current list
      set({
        flashcards: get().flashcards.map((card) =>
            card._id === id ? updatedFlashcard : card
        ),
      });

      // Check if the updated flashcard should still be in the current filter
      const currentFilter = get().currentCategoryFilter;
      const shouldBeInList =
          !currentFilter || // showing all
          (currentFilter === 'uncategorized' && !updatedFlashcard.categoryId) ||
          (updatedFlashcard.categoryId?._id === currentFilter);

      if (!shouldBeInList) {
        // Remove from current list if it no longer matches filter
        set({
          flashcards: get().flashcards.filter((card) => card._id !== id),
        });
      }

      toast.success("Картку оновлено!");
      return res.data;
    } catch (error) {
      console.log("Error updating flashcard:", error);

      const message = error.response?.data?.message || "Помилка оновлення картки";
      toast.error(message);
      throw error;
    }
  },

  deleteFlashcard: async (id) => {
    try {
      await axiosInstance.delete(`/flashcards/${id}`);
      set({
        flashcards: get().flashcards.filter((card) => card._id !== id),
      });
      toast.success("Картку видалено!");
    } catch (error) {
      console.log("Error deleting flashcard:", error);

      const message = error.response?.data?.message || "Помилка видалення картки";
      toast.error(message);
    }
  },

  getFlashcardsGrouped: async () => {
    set({ isLoading: true });
    try {
      const res = await axiosInstance.get("/flashcards/grouped");
      return res.data;
    } catch (error) {
      console.log("Error getting grouped flashcards:", error);
      toast.error("Помилка завантаження карток");
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Filter functions
  setCategoryFilter: (categoryId) => {
    set({ currentCategoryFilter: categoryId });
  },

  clearFilter: () => {
    set({ currentCategoryFilter: null });
  },

  // Method to refresh current flashcards (useful when called from category deletion)
  refreshFlashcards: () => {
    const currentFilter = get().currentCategoryFilter;
    get().getFlashcards(currentFilter);
  },

  // Method to handle category deletion - removes all flashcards from deleted category
  handleCategoryDeleted: (deletedCategoryId) => {
    // Remove flashcards that belonged to the deleted category
    set({
      flashcards: get().flashcards.filter((card) =>
          card.categoryId?._id !== deletedCategoryId
      ),
    });

    // If we were viewing the deleted category, switch to all flashcards
    if (get().currentCategoryFilter === deletedCategoryId) {
      get().getFlashcards(); // Load all flashcards
    }
  },

  // Generate flashcard content with AI
  generateFlashcardContent: async (text, englishLevel, promptType = "completeFlashcard") => {
    try {
      const response = await axiosInstance.post("/openai/generate-flashcard", {
        text,
        englishLevel,
        promptType
      });

      return response.data;
    } catch (error) {
      console.error("Error generating flashcard content:", error);
      throw error;
    }
  },

  // Generate specific field content
  generateFieldContent: async (text, englishLevel, fieldType) => {
    try {
      const response = await axiosInstance.post("/openai/generate-flashcard", {
        text,
        englishLevel,
        promptType: fieldType
      });

      return response.data.result;
    } catch (error) {
      console.error(`Error generating ${fieldType}:`, error);
      throw error;
    }
  },

  // Utility functions
  getFlashcardsByCategory: (categoryId) => {
    return get().flashcards.filter(card => {
      if (categoryId === 'uncategorized') {
        return !card.categoryId;
      }
      return card.categoryId?._id === categoryId;
    });
  },

  getUncategorizedFlashcards: () => {
    return get().flashcards.filter(card => !card.categoryId);
  },
}));

// Expose refresh method globally so category store can call it
if (typeof window !== 'undefined') {
  window.refreshFlashcards = () => {
    const store = useFlashcardStore.getState();
    store.refreshFlashcards();
  };
}