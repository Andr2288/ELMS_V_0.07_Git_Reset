// frontend/src/pages/ProfilePage.jsx

import { useState, useEffect } from "react";
import {
    User, Edit3, Calendar, TrendingUp, BarChart3, Sparkles,
    BookOpen, Folder, Trophy, Target, Activity, Clock,
    Camera, Save, X, Zap, Brain, Award, Star
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.js";
import { useFlashcardStore } from "../store/useFlashcardStore.js";
import { useCategoryStore } from "../store/useCategoryStore.js";
import { useUserSettingsStore } from "../store/useUserSettingsStore.js";
import toast from "react-hot-toast";

const ProfilePage = () => {
    const { authUser, updateProfile, isUpdatingProfile } = useAuthStore();
    const { flashcards, getFlashcards } = useFlashcardStore();
    const { categories, getCategories } = useCategoryStore();
    const { settings, loadSettings } = useUserSettingsStore();

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({
        fullName: "",
        profilePic: ""
    });
    const [statsLoading, setStatsLoading] = useState(true);
    const [stats, setStats] = useState(null);

    // Load data on component mount
    useEffect(() => {
        loadAllData();
    }, []);

    // Update edit data when authUser changes
    useEffect(() => {
        if (authUser) {
            setEditData({
                fullName: authUser.fullName || "",
                profilePic: authUser.profilePic || ""
            });
        }
    }, [authUser]);

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

        // Monthly activity (last 6 months)
        const monthlyActivity = Array.from({ length: 6 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthCards = flashcards.filter(card => {
                const cardDate = new Date(card.createdAt);
                return cardDate >= monthStart && cardDate <= monthEnd;
            }).length;

            return {
                month: date.toLocaleDateString('uk-UA', { month: 'short' }),
                year: date.getFullYear(),
                count: monthCards
            };
        }).reverse();

        // Learning streaks and achievements
        const achievements = calculateAchievements(totalCards, aiGeneratedCards, categoryStats, cardsThisWeek);

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

    const calculateAchievements = (totalCards, aiCards, categoryStats, weekCards) => {
        const achievements = [];

        // Card count achievements
        if (totalCards >= 1000) {
            achievements.push({ id: 'master', icon: '👑', title: 'Майстер вивчення', description: '1000+ карток створено', color: 'text-yellow-600' });
        } else if (totalCards >= 500) {
            achievements.push({ id: 'expert', icon: '🎓', title: 'Експерт', description: '500+ карток створено', color: 'text-purple-600' });
        } else if (totalCards >= 100) {
            achievements.push({ id: 'scholar', icon: '📚', title: 'Вчений', description: '100+ карток створено', color: 'text-blue-600' });
        } else if (totalCards >= 10) {
            achievements.push({ id: 'beginner', icon: '🌱', title: 'Початківець', description: '10+ карток створено', color: 'text-green-600' });
        }

        // AI usage achievements
        if (aiCards >= 50) {
            achievements.push({ id: 'ai_master', icon: '🤖', title: 'ШІ-асистент', description: '50+ карток згенеровано ШІ', color: 'text-purple-600' });
        }

        // Organization achievements
        if (categoryStats.length >= 10) {
            achievements.push({ id: 'organizer', icon: '📁', title: 'Організатор', description: '10+ папок створено', color: 'text-blue-600' });
        }

        // Activity achievements
        if (weekCards >= 20) {
            achievements.push({ id: 'productive', icon: '⚡', title: 'Продуктивний тиждень', description: '20+ карток за тиждень', color: 'text-orange-600' });
        }

        return achievements;
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleSave = async () => {
        try {
            await updateProfile(editData);
            setIsEditing(false);
        } catch (error) {
            // Error handling is done in the store
        }
    };

    const handleCancel = () => {
        setEditData({
            fullName: authUser?.fullName || "",
            profilePic: authUser?.profilePic || ""
        });
        setIsEditing(false);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setEditData(prev => ({
                    ...prev,
                    profilePic: e.target.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    if (!authUser) {
        return null;
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

                    {/* Profile Card - Minimalist Design */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                {/* Profile Picture */}
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden">
                                        {editData.profilePic ? (
                                            <img
                                                src={editData.profilePic}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <User className="w-10 h-10 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {isEditing && (
                                        <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                                            <Camera className="w-4 h-4 text-white" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* Profile Info */}
                                <div>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editData.fullName}
                                            onChange={(e) => setEditData(prev => ({ ...prev, fullName: e.target.value }))}
                                            className="text-2xl font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:outline-none focus:border-blue-500"
                                            placeholder="Ваше ім'я"
                                        />
                                    ) : (
                                        <h2 className="text-2xl font-semibold text-gray-900">{authUser.fullName}</h2>
                                    )}
                                    <p className="text-gray-600 text-sm mt-1">{authUser.email}</p>
                                    <p className="text-gray-500 text-xs mt-1">
                                        З нами з {new Date(authUser.createdAt || Date.now()).toLocaleDateString('uk-UA')}
                                    </p>
                                </div>
                            </div>

                            {/* Edit Button */}
                            <div>
                                {isEditing ? (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={handleSave}
                                            disabled={isUpdatingProfile}
                                            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md text-sm flex items-center space-x-1"
                                        >
                                            {isUpdatingProfile ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            <span>Зберегти</span>
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            disabled={isUpdatingProfile}
                                            className="bg-gray-400 hover:bg-gray-500 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm flex items-center space-x-1"
                                        >
                                            <X className="w-4 h-4" />
                                            <span>Скасувати</span>
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleEdit}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-sm flex items-center space-x-2"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        <span>Редагувати</span>
                                    </button>
                                )}
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

                                {/* Monthly Trend */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <Calendar className="w-5 h-5 text-purple-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">Динаміка створення</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {stats.monthlyActivity.map((month, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <span className="text-sm text-gray-600">
                                                    {month.month} {month.year}
                                                </span>
                                                <div className="flex items-center space-x-2">
                                                    <div className="w-32 bg-gray-200 rounded-full h-2">
                                                        <div
                                                            className="bg-purple-500 h-full rounded-full"
                                                            style={{
                                                                width: `${Math.max(5, (month.count / Math.max(...stats.monthlyActivity.map(m => m.count), 1)) * 100)}%`
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700 w-6 text-right">
                                                        {month.count}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Achievements */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center space-x-3 mb-6">
                                        <Trophy className="w-5 h-5 text-yellow-600" />
                                        <h3 className="text-lg font-semibold text-gray-900">Досягнення</h3>
                                    </div>
                                    {stats.achievements.length > 0 ? (
                                        <div className="space-y-4">
                                            {stats.achievements.map((achievement) => (
                                                <div key={achievement.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                                    <div className="text-2xl">{achievement.icon}</div>
                                                    <div className="flex-1">
                                                        <h4 className={`font-medium ${achievement.color}`}>
                                                            {achievement.title}
                                                        </h4>
                                                        <p className="text-sm text-gray-600">
                                                            {achievement.description}
                                                        </p>
                                                    </div>
                                                    <Award className={`w-5 h-5 ${achievement.color}`} />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-500">Створіть свою першу картку для отримання досягнень!</p>
                                        </div>
                                    )}
                                </div>
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
        </div>
    );
};

export default ProfilePage;