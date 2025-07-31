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

    const calculateStats = () => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        // Basic counts
        const totalCards = flashcards.length;
        const totalCategories = categories.length;
        const aiGeneratedCards = flashcards.filter(card => card.isAIGenerated).length;
        const manualCards = totalCards - aiGeneratedCards;

        // Time-based stats
        const cardsThisWeek = flashcards.filter(card =>
            new Date(card.createdAt) >= startOfWeek
        ).length;

        const cardsThisMonth = flashcards.filter(card =>
            new Date(card.createdAt) >= startOfMonth
        ).length;

        const cardsThisYear = flashcards.filter(card =>
            new Date(card.createdAt) >= startOfYear
        ).length;

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

        // Activity by day of week (last 7 days)
        const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayCards = flashcards.filter(card => {
                const cardDate = new Date(card.createdAt);
                return cardDate.toDateString() === date.toDateString();
            }).length;

            return {
                day: date.toLocaleDateString('uk-UA', { weekday: 'short' }),
                date: date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }),
                count: dayCards
            };
        }).reverse();



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
            monthlyActivity,
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
                                                <div className="w-12 text-sm text-gray-600 text-right">
                                                    {day.day}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="bg-gray-200 rounded-full h-3 relative overflow-hidden">
                                                        <div
                                                            className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${Math.max(5, (day.count / Math.max(...stats.weeklyActivity.map(d => d.count), 1)) * 100)}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className="w-8 text-sm font-medium text-gray-700 text-right">
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
                                    <div className="space-y-6">
                                        {Object.entries(stats.achievements).map(([groupKey, group]) => {
                                            const unlockedCount = group.achievements.filter(a => a.isUnlocked).length;
                                            const totalCount = group.achievements.length;

                                            // Мапінг кольорів для безпечного використання в Tailwind
                                            const colorMap = {
                                                blue: { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200' },
                                                purple: { bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200' },
                                                emerald: { bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200' },
                                                orange: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200' },
                                                pink: { bg: 'bg-pink-500', text: 'text-pink-700', border: 'border-pink-200' }
                                            };

                                            const colors = colorMap[group.color] || colorMap.blue;

                                            return (
                                                <div key={groupKey} className="border border-gray-100 rounded-lg p-4">
                                                    {/* Group Header */}
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-lg">{group.icon}</span>
                                                            <h4 className={`font-semibold ${colors.text}`}>
                                                                {group.title}
                                                            </h4>
                                                        </div>
                                                        <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                            {unlockedCount}/{totalCount}
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="mb-4">
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className={`${colors.bg} h-2 rounded-full transition-all duration-500`}
                                                                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    {/* Achievements Grid */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {group.achievements.map((achievement) => (
                                                            <div
                                                                key={achievement.id}
                                                                className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                                                                    achievement.isUnlocked
                                                                        ? 'bg-green-50 border border-green-200'
                                                                        : 'bg-gray-50 border border-gray-200 opacity-60'
                                                                }`}
                                                            >
                                                                <div className={`text-xl ${achievement.isUnlocked ? '' : 'grayscale'}`}>
                                                                    {achievement.icon}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h5 className={`font-medium text-sm ${
                                                                        achievement.isUnlocked
                                                                            ? achievement.color
                                                                            : 'text-gray-500'
                                                                    }`}>
                                                                        {achievement.title}
                                                                    </h5>
                                                                    <p className={`text-xs ${
                                                                        achievement.isUnlocked
                                                                            ? 'text-gray-600'
                                                                            : 'text-gray-400'
                                                                    } truncate`}>
                                                                        {achievement.description}
                                                                    </p>
                                                                </div>
                                                                {achievement.isUnlocked && (
                                                                    <div className="flex-shrink-0">
                                                                        <Award className="w-4 h-4 text-green-600" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
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
                                            {stats.cardsThisWeek > 0 ? Math.round(stats.cardsThisWeek / 7 * 10) / 10 : 0}
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