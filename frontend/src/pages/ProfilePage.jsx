// frontend/src/pages/ProfilePage.jsx

import { useState, useEffect } from "react";
import {
    User, Edit3, TrendingUp, BarChart3, Sparkles,
    BookOpen, Folder, Trophy, Target, Activity,
    Brain, Award, Star
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useFlashcardStore } from "../store/useFlashcardStore.js";
import { useCategoryStore } from "../store/useCategoryStore.js";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";
import ProfileEditModal from "../components/ProfileEditModal.jsx";
import toast from "react-hot-toast";

const ProfilePage = () => {
    const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
    const { flashcards, getFlashcards } = useFlashcardStore();
    const { categories, getCategories } = useCategoryStore();
    const { settings, loadSettings } = useUserSettingsStore();

    // Modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [statsLoading, setStatsLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [previousAchievements, setPreviousAchievements] = useState(null); // Для відстеження нових досягнень

    // Load data on component mount
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setStatsLoading(true);
        try {
            await Promise.all([
                getFlashcards(), // Load all flashcards for stats
                getCategories(),
                loadSettings()
            ]);
        } catch (error) {
            console.error("Error loading profile data:", error);
            toast.error("Помилка завантаження даних профілю");
        } finally {
            setStatsLoading(false);
        }
    };

    // Calculate statistics whenever data changes
    useEffect(() => {
        if (flashcards && categories && !statsLoading) {
            calculateStats();
        }
    }, [flashcards, categories, statsLoading]);

    // Check for new achievements and show toast
    useEffect(() => {
        if (stats?.achievements && previousAchievements) {
            // Перевіряємо чи є нові досягнення
            Object.keys(stats.achievements).forEach(groupKey => {
                const currentGroup = stats.achievements[groupKey];
                const previousGroup = previousAchievements[groupKey];

                if (previousGroup) {
                    currentGroup.achievements.forEach(achievement => {
                        const previousAchievement = previousGroup.achievements.find(a => a.id === achievement.id);

                        // Якщо досягнення було розблоковано зараз, але не було раніше
                        if (achievement.isUnlocked && previousAchievement && !previousAchievement.isUnlocked) {
                            // Показуємо toast з досягненням
                            toast.success(
                                <div className="flex items-center space-x-3">
                                    <div className="text-2xl">{achievement.icon}</div>
                                    <div>
                                        <div className="font-semibold text-gray-900">🎉 Нове досягнення!</div>
                                        <div className="text-sm text-gray-600">{achievement.title}</div>
                                    </div>
                                </div>,
                                {
                                    duration: 5000,
                                    style: {
                                        background: '#f0f9ff',
                                        border: '1px solid #0ea5e9',
                                        borderRadius: '12px',
                                        padding: '16px',
                                    }
                                }
                            );
                        }
                    });
                }
            });
        }

        // Зберігаємо поточні досягнення для наступної перевірки
        if (stats?.achievements) {
            setPreviousAchievements(JSON.parse(JSON.stringify(stats.achievements)));
        }
    }, [stats?.achievements]);

    const calculateStats = () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Basic counts
        const totalCards = flashcards.length;
        const totalCategories = categories.length;
        const aiGeneratedCards = flashcards.filter(card => card.isAIGenerated).length;
        const manualCards = totalCards - aiGeneratedCards;

        // Time-based stats
        const cardsThisMonth = flashcards.filter(card =>
            new Date(card.createdAt) >= startOfMonth
        ).length;

        const cardsThisYear = flashcards.filter(card =>
            new Date(card.createdAt) >= startOfYear
        ).length;

        // Weekly activity starting from Monday
        const today = new Date();
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ...
        const daysFromMonday = (currentDay === 0) ? 6 : currentDay - 1; // Convert Sunday to 6, others to day-1

        const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(date.getDate() - daysFromMonday + i); // Start from Monday

            const dayCards = flashcards.filter(card => {
                const cardDate = new Date(card.createdAt);
                return cardDate.toDateString() === date.toDateString();
            }).length;

            const isToday = date.toDateString() === today.toDateString();

            return {
                day: date.toLocaleDateString('uk-UA', { weekday: 'short' }),
                date: date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }),
                count: dayCards,
                isToday: isToday
            };
        });

        const cardsThisWeek = weeklyActivity.reduce((sum, day) => sum + day.count, 0);

        // Category distribution
        const categoryStats = categories.map(category => {
            const cardsInCategory = flashcards.filter(card =>
                card.categoryId?._id === category._id
            ).length;
            return {
                id: category._id,
                name: category.name,
                color: category.color,
                count: cardsInCategory,
                percentage: totalCards > 0 ? (cardsInCategory / totalCards * 100) : 0
            };
        }).sort((a, b) => b.count - a.count);

        // Uncategorized cards
        const uncategorizedCount = flashcards.filter(card => !card.categoryId).length;
        if (uncategorizedCount > 0) {
            categoryStats.push({
                id: 'uncategorized',
                name: 'Без папки',
                color: '#6B7280',
                count: uncategorizedCount,
                percentage: totalCards > 0 ? (uncategorizedCount / totalCards * 100) : 0
            });
        }

        // Learning streaks and achievements
        const achievements = calculateAchievements(totalCards, aiGeneratedCards, categoryStats, cardsThisWeek, flashcards);

        setStats({
            totalCards,
            totalCategories,
            aiGeneratedCards,
            manualCards,
            cardsThisWeek,
            cardsThisMonth,
            cardsThisYear,
            categoryStats: categoryStats.slice(0, 5), // Top 5 categories
            weeklyActivity,
            achievements
        });
    };

    const calculateAchievements = (totalCards, aiCards, categoryStats, weekCards, flashcards) => {
        // Всі можливі досягнення з групуванням
        const allAchievements = {
            creation: {
                title: "Створення карток",
                icon: "📚",
                color: "blue",
                achievements: [
                    { id: 'first_card', icon: '🌱', title: 'Перші кроки', description: 'Створіть свою першу картку', threshold: 1, color: 'text-green-600' },
                    { id: 'getting_started', icon: '🚀', title: 'Початківець', description: '10+ карток створено', threshold: 10, color: 'text-green-600' },
                    { id: 'steady_learner', icon: '📖', title: 'Постійний учень', description: '50+ карток створено', threshold: 50, color: 'text-blue-600' },
                    { id: 'scholar', icon: '🎓', title: 'Вчений', description: '100+ карток створено', threshold: 100, color: 'text-blue-600' },
                    { id: 'expert', icon: '👨‍🏫', title: 'Експерт', description: '500+ карток створено', threshold: 500, color: 'text-purple-600' },
                    { id: 'master', icon: '👑', title: 'Майстер вивчення', description: '1000+ карток створено', threshold: 1000, color: 'text-yellow-600' },
                ]
            },
            ai: {
                title: "ШІ асистент",
                icon: "🤖",
                color: "purple",
                achievements: [
                    { id: 'ai_curious', icon: '🔍', title: 'Цікавий до ШІ', description: 'Використайте ШІ для створення першої картки', threshold: 1, color: 'text-purple-600' },
                    { id: 'ai_user', icon: '⚡', title: 'Користувач ШІ', description: '10+ карток згенеровано ШІ', threshold: 10, color: 'text-purple-600' },
                    { id: 'ai_enthusiast', icon: '🧠', title: 'Ентузіаст ШІ', description: '50+ карток згенеровано ШІ', threshold: 50, color: 'text-purple-600' },
                    { id: 'ai_master', icon: '🤖', title: 'ШІ-майстер', description: '100+ карток згенеровано ШІ', threshold: 100, color: 'text-purple-600' },
                ]
            },
            organization: {
                title: "Організація",
                icon: "📁",
                color: "emerald",
                achievements: [
                    { id: 'first_folder', icon: '📂', title: 'Перша папка', description: 'Створіть свою першу папку', threshold: 1, color: 'text-emerald-600' },
                    { id: 'organizer', icon: '🗂️', title: 'Організатор', description: '5+ папок створено', threshold: 5, color: 'text-emerald-600' },
                    { id: 'categorizer', icon: '📚', title: 'Категоризатор', description: '10+ папок створено', threshold: 10, color: 'text-emerald-600' },
                    { id: 'architect', icon: '🏗️', title: 'Архітектор знань', description: '20+ папок створено', threshold: 20, color: 'text-emerald-600' },
                ]
            },
            activity: {
                title: "Активність",
                icon: "⚡",
                color: "orange",
                achievements: [
                    { id: 'daily_learner', icon: '☀️', title: 'Щоденний учень', description: '3+ картки за день', threshold: 3, color: 'text-orange-600' },
                    { id: 'weekly_active', icon: '📅', title: 'Активний тиждень', description: '10+ карток за тиждень', threshold: 10, color: 'text-orange-600' },
                    { id: 'productive_week', icon: '🔥', title: 'Продуктивний тиждень', description: '20+ карток за тиждень', threshold: 20, color: 'text-orange-600' },
                    { id: 'super_active', icon: '💪', title: 'Супер активний', description: '50+ карток за тиждень', threshold: 50, color: 'text-orange-600' },
                    { id: 'month_champion', icon: '🏆', title: 'Чемпіон місяця', description: '100+ карток за місяць', threshold: 100, color: 'text-orange-600' },
                ]
            },
            special: {
                title: "Спеціальні",
                icon: "⭐",
                color: "pink",
                achievements: [
                    { id: 'balanced', icon: '⚖️', title: 'Збалансований', description: '50% карток створено з ШІ, 50% вручну', threshold: 'balanced', color: 'text-pink-600' },
                    { id: 'completionist', icon: '✅', title: 'Завершувач', description: 'Всі картки мають переклад і приклади', threshold: 'complete', color: 'text-pink-600' },
                    { id: 'linguist', icon: '🌍', title: 'Лінгвіст', description: 'Картки з 3+ різних мов', threshold: 'multilingual', color: 'text-pink-600' },
                ]
            }
        };

        // Обчислюємо які досягнення досягнуті
        const monthCards = flashcards.filter(card => {
            const cardDate = new Date(card.createdAt);
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return cardDate >= monthAgo;
        }).length;

        // Перевіряємо досягнення для кожної групи
        Object.keys(allAchievements).forEach(groupKey => {
            const group = allAchievements[groupKey];
            group.achievements = group.achievements.map(achievement => {
                let isUnlocked = false;

                switch (groupKey) {
                    case 'creation':
                        isUnlocked = totalCards >= achievement.threshold;
                        break;
                    case 'ai':
                        isUnlocked = aiCards >= achievement.threshold;
                        break;
                    case 'organization':
                        isUnlocked = categoryStats.length >= achievement.threshold;
                        break;
                    case 'activity':
                        if (achievement.id === 'daily_learner') {
                            // Перевіряємо сьогоднішню активність
                            const today = new Date().toDateString();
                            const todayCards = flashcards.filter(card =>
                                new Date(card.createdAt).toDateString() === today
                            ).length;
                            isUnlocked = todayCards >= achievement.threshold;
                        } else if (achievement.id === 'month_champion') {
                            isUnlocked = monthCards >= achievement.threshold;
                        } else {
                            isUnlocked = weekCards >= achievement.threshold;
                        }
                        break;
                    case 'special':
                        if (achievement.threshold === 'balanced' && totalCards >= 20) {
                            const aiPercentage = (aiCards / totalCards) * 100;
                            isUnlocked = aiPercentage >= 40 && aiPercentage <= 60;
                        } else if (achievement.threshold === 'complete' && totalCards >= 10) {
                            const completeCards = flashcards.filter(card =>
                                card.translation && (card.examples?.length > 0 || card.example)
                            ).length;
                            isUnlocked = completeCards === totalCards;
                        } else if (achievement.threshold === 'multilingual') {
                            // Це складніше перевірити без додаткових даних, поки що false
                            isUnlocked = false;
                        }
                        break;
                }

                return {
                    ...achievement,
                    isUnlocked
                };
            });
        });

        return allAchievements;
    };

    // Функція для отримання поточного значення для досягнення
    const getCurrentValueForAchievement = (achievement, stats) => {
        if (!stats) return 0;

        switch (achievement.id) {
            // Creation achievements
            case 'first_card':
            case 'getting_started':
            case 'steady_learner':
            case 'scholar':
            case 'expert':
            case 'master':
                return stats.totalCards;

            // AI achievements
            case 'ai_curious':
            case 'ai_user':
            case 'ai_enthusiast':
            case 'ai_master':
                return stats.aiGeneratedCards;

            // Organization achievements
            case 'first_folder':
            case 'organizer':
            case 'categorizer':
            case 'architect':
                return stats.totalCategories;

            // Activity achievements
            case 'daily_learner':
                const today = new Date().toDateString();
                const todayCards = flashcards.filter(card =>
                    new Date(card.createdAt).toDateString() === today
                ).length;
                return todayCards;

            case 'weekly_active':
            case 'productive_week':
            case 'super_active':
                return stats.cardsThisWeek;

            case 'month_champion':
                return stats.cardsThisMonth;

            // Special achievements
            case 'balanced':
                if (stats.totalCards < 20) return 0;
                const aiPercentage = (stats.aiGeneratedCards / stats.totalCards) * 100;
                // Прогрес = наскільки близько до 50% (ідеального балансу)
                const distanceFrom50 = Math.abs(aiPercentage - 50);
                return Math.max(0, 100 - distanceFrom50 * 2); // Чим ближче до 50%, тим більший прогрес

            case 'completionist':
                if (stats.totalCards < 10) return stats.totalCards * 10; // 10% за кожну картку до 10
                const completeCards = flashcards.filter(card =>
                    card.translation && (card.examples?.length > 0 || card.example)
                ).length;
                return (completeCards / stats.totalCards) * 100;

            case 'linguist':
                // Поки що завжди 0, бо не маємо логіки для різних мов
                return 0;

            default:
                return 0;
        }
    };

    // Open edit modal
    const handleEdit = () => {
        setShowEditModal(true);
    };

    // Handle profile update from modal
    const handleProfileUpdate = async (formData) => {
        try {
            console.log("Updating profile with data:", formData);
            await updateProfile(formData);
            setShowEditModal(false);
        } catch (error) {
            console.error("Profile update error:", error);
            // Error is handled in the store and modal
            throw error; // Re-throw so modal can handle it
        }
    };

    // Close edit modal
    const handleCloseModal = () => {
        setShowEditModal(false);
    };

    if (!authUser) {
        return (
            <div className="ml-64 min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Завантаження профілю...</p>
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
                                <User className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Профіль</h1>
                                <p className="text-gray-600 mt-1">Ваша статистика та налаштування профілю</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Profile Card - Clean Design */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {/* Profile Picture */}
                                <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden">
                                    {authUser.profilePic ? (
                                        <img
                                            src={authUser.profilePic}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-10 h-10 text-gray-400" />
                                        </div>
                                    )}
                                </div>

                                {/* Profile Info */}
                                <div>
                                    <h2 className="text-2xl font-semibold text-gray-900">
                                        {authUser.fullName}
                                    </h2>
                                    <p className="text-gray-600 text-sm mt-1">{authUser.email}</p>
                                    <p className="text-gray-500 text-xs mt-1">
                                        З нами з {new Date(authUser.createdAt || Date.now()).toLocaleDateString('uk-UA')}
                                    </p>
                                </div>
                            </div>

                            {/* Edit Button */}
                            <div>
                                <button
                                    onClick={handleEdit}
                                    disabled={isUpdatingProfile}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg text-sm flex items-center space-x-2 transition-colors disabled:cursor-not-allowed"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    <span>
                                        {isUpdatingProfile ? "Збереження..." : "Редагувати"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {statsLoading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Завантаження статистики...</p>
                        </div>
                    ) : stats ? (
                        <>
                            {/* Quick Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Всього карток</p>
                                            <p className="text-3xl font-bold text-blue-600">{stats.totalCards}</p>
                                        </div>
                                        <div className="p-3 bg-blue-100 rounded-lg">
                                            <BookOpen className="w-6 h-6 text-blue-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        +{stats.cardsThisMonth} цього місяця
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Папок</p>
                                            <p className="text-3xl font-bold text-green-600">{stats.totalCategories}</p>
                                        </div>
                                        <div className="p-3 bg-green-100 rounded-lg">
                                            <Folder className="w-6 h-6 text-green-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Організація матеріалів
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">ШІ-генерація</p>
                                            <p className="text-3xl font-bold text-purple-600">{stats.aiGeneratedCards}</p>
                                        </div>
                                        <div className="p-3 bg-purple-100 rounded-lg">
                                            <Sparkles className="w-6 h-6 text-purple-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {stats.totalCards > 0 ? Math.round(stats.aiGeneratedCards / stats.totalCards * 100) : 0}% від усіх карток
                                    </p>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600">Цього тижня</p>
                                            <p className="text-3xl font-bold text-orange-600">{stats.cardsThisWeek}</p>
                                        </div>
                                        <div className="p-3 bg-orange-100 rounded-lg">
                                            <TrendingUp className="w-6 h-6 text-orange-600" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Активність за 7 днів
                                    </p>
                                </div>
                            </div>

                            {/* Charts and detailed stats */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                                {/* Weekly Activity */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <Activity className="w-5 h-5 text-blue-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">Активність за тиждень</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {stats.weeklyActivity.map((day, index) => (
                                            <div key={index} className="flex items-center space-x-3">
                                                <div className={`w-12 text-sm text-right font-medium ${
                                                    day.isToday
                                                        ? 'text-blue-600 bg-blue-50 px-2 py-1 rounded-md'
                                                        : 'text-gray-600'
                                                }`}>
                                                    {day.day}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                day.isToday
                                                                    ? 'bg-blue-600 shadow-md'
                                                                    : 'bg-blue-500'
                                                            }`}
                                                            style={{
                                                                width: `${Math.max(5, (day.count / Math.max(...stats.weeklyActivity.map(d => d.count), 1)) * 100)}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className={`w-8 text-sm font-medium text-right ${
                                                    day.isToday ? 'text-blue-600' : 'text-gray-700'
                                                }`}>
                                                    {day.count}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Category Distribution */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <BarChart3 className="w-5 h-5 text-green-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">Топ категорії</h3>
                                    </div>
                                    <div className="space-y-4">
                                        {stats.categoryStats.slice(0, 5).map((category, index) => (
                                            <div key={category.id} className="flex items-center space-x-3">
                                                <div className="flex items-center space-x-2 flex-1">
                                                    <div
                                                        className="w-4 h-4 rounded"
                                                        style={{ backgroundColor: category.color }}
                                                    ></div>
                                                    <span className="text-sm font-medium text-gray-700 truncate">
                                                        {category.name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                backgroundColor: category.color,
                                                                width: `${Math.max(5, category.percentage)}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-600 w-8 text-right">
                                                        {category.count}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>


                            </div>

                            {/* Achievements - Full Width */}
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center space-x-3 mb-6">
                                    <Trophy className="w-5 h-5 text-yellow-600" />
                                    <h3 className="text-lg font-semibold text-gray-900">Досягнення</h3>
                                </div>

                                {stats.achievements && Object.keys(stats.achievements).length > 0 ? (
                                    <div className="space-y-8">
                                        {Object.entries(stats.achievements).map(([groupKey, group]) => {
                                            const unlockedCount = group.achievements.filter(a => a.isUnlocked).length;
                                            const totalCount = group.achievements.length;

                                            return (
                                                <div key={groupKey} className="space-y-4">
                                                    {/* Group Header */}
                                                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                                        <div className="flex items-center space-x-3">
                                                            <span className="text-2xl">{group.icon}</span>
                                                            <div>
                                                                <h4 className="font-bold text-gray-900 text-xl">
                                                                    {group.title}
                                                                </h4>
                                                                <p className="text-sm text-gray-500">
                                                                    {unlockedCount} з {totalCount} виконано
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-2xl font-bold text-blue-600">
                                                                {Math.round((unlockedCount / totalCount) * 100)}%
                                                            </div>
                                                            <div className="text-xs text-gray-500">завершено</div>
                                                        </div>
                                                    </div>

                                                    {/* Achievements List */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {group.achievements.map((achievement) => {
                                                            const currentValue = getCurrentValueForAchievement(achievement, stats);
                                                            const progress = achievement.isUnlocked ? 100 :
                                                                typeof achievement.threshold === 'number' ?
                                                                    Math.min((currentValue / achievement.threshold) * 100, 100) :
                                                                    currentValue;

                                                            const getTaskDescription = () => {
                                                                if (achievement.isUnlocked) {
                                                                    return "✅ Завдання виконано!";
                                                                }

                                                                switch (achievement.id) {
                                                                    case 'first_card':
                                                                        return `Створіть свою першу флешкартку (${currentValue}/1)`;
                                                                    case 'getting_started':
                                                                        return `Створіть 10 флешкарток (${currentValue}/10)`;
                                                                    case 'steady_learner':
                                                                        return `Створіть 50 флешкарток (${currentValue}/50)`;
                                                                    case 'scholar':
                                                                        return `Створіть 100 флешкарток (${currentValue}/100)`;
                                                                    case 'expert':
                                                                        return `Створіть 500 флешкарток (${currentValue}/500)`;
                                                                    case 'master':
                                                                        return `Створіть 1000 флешкарток (${currentValue}/1000)`;

                                                                    case 'ai_curious':
                                                                        return `Використайте ШІ для створення першої картки (${currentValue}/1)`;
                                                                    case 'ai_user':
                                                                        return `Створіть 10 карток за допомогою ШІ (${currentValue}/10)`;
                                                                    case 'ai_enthusiast':
                                                                        return `Створіть 50 карток за допомогою ШІ (${currentValue}/50)`;
                                                                    case 'ai_master':
                                                                        return `Створіть 100 карток за допомогою ШІ (${currentValue}/100)`;

                                                                    case 'first_folder':
                                                                        return `Створіть свою першу папку (${currentValue}/1)`;
                                                                    case 'organizer':
                                                                        return `Створіть 5 папок для організації (${currentValue}/5)`;
                                                                    case 'categorizer':
                                                                        return `Створіть 10 папок (${currentValue}/10)`;
                                                                    case 'architect':
                                                                        return `Створіть 20 папок (${currentValue}/20)`;

                                                                    case 'daily_learner':
                                                                        return `Створіть 3 картки сьогодні (${currentValue}/3)`;
                                                                    case 'weekly_active':
                                                                        return `Створіть 10 карток цього тижня (${currentValue}/10)`;
                                                                    case 'productive_week':
                                                                        return `Створіть 20 карток цього тижня (${currentValue}/20)`;
                                                                    case 'super_active':
                                                                        return `Створіть 50 карток цього тижня (${currentValue}/50)`;
                                                                    case 'month_champion':
                                                                        return `Створіть 100 карток цього місяця (${currentValue}/100)`;

                                                                    case 'balanced':
                                                                        if (stats.totalCards < 20) {
                                                                            return `Створіть мінімум 20 карток для розблокування (${stats.totalCards}/20)`;
                                                                        }
                                                                        const aiPercentage = Math.round((stats.aiGeneratedCards / stats.totalCards) * 100);
                                                                        return `Досягніть балансу: 40-60% ШІ карток (зараз ${aiPercentage}%)`;

                                                                    case 'completionist':
                                                                        if (stats.totalCards < 10) {
                                                                            return `Створіть мінімум 10 карток (${stats.totalCards}/10)`;
                                                                        }
                                                                        const completeCards = flashcards.filter(card =>
                                                                            card.translation && (card.examples?.length > 0 || card.example)
                                                                        ).length;
                                                                        return `Додайте переклад і приклади до всіх карток (${completeCards}/${stats.totalCards})`;

                                                                    case 'linguist':
                                                                        return `Додайте картки з 3 різних мов (функція в розробці)`;

                                                                    default:
                                                                        return achievement.description;
                                                                }
                                                            };

                                                            return (
                                                                <div
                                                                    key={achievement.id}
                                                                    className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 hover:shadow-lg ${
                                                                        achievement.isUnlocked
                                                                            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-md'
                                                                            : progress > 0
                                                                                ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-300'
                                                                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                                                    }`}
                                                                >
                                                                    {/* Achievement Content */}
                                                                    <div className="p-6">
                                                                        <div className="flex items-start space-x-4">
                                                                            {/* Icon */}
                                                                            <div className={`text-4xl flex-shrink-0 ${
                                                                                achievement.isUnlocked ? '' : progress < 10 ? 'grayscale opacity-60' : 'opacity-80'
                                                                            }`}>
                                                                                {achievement.icon}
                                                                            </div>

                                                                            {/* Content */}
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center justify-between mb-2">
                                                                                    <h5 className={`text-lg font-bold ${
                                                                                        achievement.isUnlocked
                                                                                            ? 'text-green-800'
                                                                                            : progress > 0
                                                                                                ? 'text-blue-800'
                                                                                                : 'text-gray-600'
                                                                                    }`}>
                                                                                        {achievement.title}
                                                                                    </h5>

                                                                                    {/* Status Badge */}
                                                                                    {achievement.isUnlocked ? (
                                                                                        <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                                                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                                            </svg>
                                                                                            <span>Виконано</span>
                                                                                        </div>
                                                                                    ) : progress > 0 ? (
                                                                                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium hidden">
                                                                                            {Math.round(progress)}%
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                                                                            Заблоковано
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Task Description */}
                                                                                <p className={`text-sm mb-3 ${
                                                                                    achievement.isUnlocked
                                                                                        ? 'text-green-700 font-medium'
                                                                                        : progress > 0
                                                                                            ? 'text-blue-700'
                                                                                            : 'text-gray-500'
                                                                                }`}>
                                                                                    {getTaskDescription()}
                                                                                </p>

                                                                                {/* Progress Bar */}
                                                                                {!achievement.isUnlocked && (
                                                                                    <div className="space-y-2">
                                                                                        <div className="flex justify-between text-xs text-gray-600">
                                                                                            <span>Прогрес</span>
                                                                                            <span>{Math.round(progress)}%</span>
                                                                                        </div>
                                                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                                                            <div
                                                                                                className={`h-2 rounded-full transition-all duration-500 ${
                                                                                                    progress > 50 ? 'bg-blue-500' : 'bg-blue-400'
                                                                                                }`}
                                                                                                style={{ width: `${Math.max(progress, 2)}%` }}
                                                                                            ></div>
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Completed Overlay */}
                                                                    {achievement.isUnlocked && (
                                                                        <div className="absolute top-0 right-0 w-0 h-0 border-l-[40px] border-l-transparent border-t-[40px] border-t-green-500">

                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                        <p className="text-gray-500">Створіть свою першу картку для отримання досягнень!</p>
                                    </div>
                                )}
                            </div>

                            {/* Learning Insights */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
                                <div className="flex items-center space-x-3 mb-4">
                                    <Brain className="w-6 h-6 text-blue-600" />
                                    <h3 className="text-xl font-semibold text-gray-900">Аналітика навчання</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-blue-600 mb-1">
                                            {stats.totalCards > 0 ? Math.round(stats.aiGeneratedCards / stats.totalCards * 100) : 0}%
                                        </div>
                                        <p className="text-sm text-gray-700">ШІ-асистент</p>
                                        <p className="text-xs text-gray-500 mt-1">Картки створені з допомогою ШІ</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-green-600 mb-1">
                                            {stats.cardsThisWeek > 0 ? Math.round(stats.cardsThisWeek / 7) : 0}
                                        </div>
                                        <p className="text-sm text-gray-700">Карток/день</p>
                                        <p className="text-xs text-gray-500 mt-1">Середня активність тижня</p>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-purple-600 mb-1">
                                            {stats.totalCategories > 0 ? Math.round(stats.totalCards / stats.totalCategories * 10) / 10 : 0}
                                        </div>
                                        <p className="text-sm text-gray-700">Карток/папка</p>
                                        <p className="text-xs text-gray-500 mt-1">Середня кількість в папці</p>
                                    </div>
                                </div>
                            </div>

                        </>
                    ) : (
                        <div className="text-center py-12">
                            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-xl font-medium text-gray-900 mb-2">Ще немає даних</h3>
                            <p className="text-gray-600">Створіть свої перші флешкартки, щоб побачити статистику</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Profile Edit Modal */}
            <ProfileEditModal
                isOpen={showEditModal}
                onClose={handleCloseModal}
                onSave={handleProfileUpdate}
                initialData={authUser}
                isLoading={isUpdatingProfile}
            />
        </div>
    );
};

export default ProfilePage;