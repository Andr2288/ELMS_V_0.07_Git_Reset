// backend/src/controllers/openai.controller.js

import OpenAI from "openai";
import UserSettings from "../models/userSettings.model.js";

const generateFlashcardContent = async (req, res) => {
    try {
        const { text, englishLevel, promptType } = req.body;
        const userId = req.user._id;

        if (!text) {
            return res.status(400).json({ message: "Text is required" });
        }

        if (!englishLevel) {
            return res.status(400).json({ message: "English level is required" });
        }

        // Get user settings to check API key preference and get the effective key
        let userSettings = await UserSettings.findOne({ userId });

        // Create default settings if none exist
        if (!userSettings) {
            userSettings = new UserSettings({
                userId,
                apiKeySource: "system",
                ttsSettings: {
                    model: "tts-1",
                    voice: "alloy",
                    speed: 1.0,
                    responseFormat: "mp3",
                    voiceStyle: "neutral",
                    customInstructions: ""
                },
                generalSettings: {
                    cacheAudio: true,
                    defaultEnglishLevel: "B1"
                },
                aiSettings: {
                    chatgptModel: "gpt-4.1-mini"
                }
            });
            await userSettings.save();
        }

        // FIXED: Use the new getEffectiveApiKey method
        const effectiveApiKey = userSettings.getEffectiveApiKey();
        const apiKeyInfo = userSettings.getApiKeyInfo();

        if (!effectiveApiKey) {
            return res.status(500).json({
                message: "No OpenAI API key available",
                details: "Please configure an API key in Settings",
                apiKeyInfo
            });
        }

        console.log(`AI Generation: Using ${apiKeyInfo.effectiveSource} API key for user ${userId}`);

        // Create OpenAI client with effective API key
        const openai = new OpenAI({ apiKey: effectiveApiKey });

        // Get the user's preferred model or use default
        const modelToUse = userSettings.aiSettings?.chatgptModel || "gpt-4.1-mini";

        // Generate the prompt based on the request type
        let prompt = "";
        switch (promptType) {
            case "definition":
                prompt = `English level: ${englishLevel}. Provide a detailed definition/explanation for: ${text}`;
                break;
            case "shortDescription":
                prompt = `English level: ${englishLevel}. Write a very short description (2-3 sentences max, under 150 characters) for English word/phrase: "${text}". The description should be concise, clear and appropriate for ${englishLevel} level learners.`;
                break;
            case "example":
                prompt = `Create a sentence. English level: ${englishLevel}. Word to use: ${text}`;
                break;
            case "transcription":
                prompt = `Provide me with the transcription for: ${text}. Resources: 1) Oxford Learner's Dictionaries. Format for output: Transcription for 'University' (Oxford Learner's Dictionaries):UK: [ˌjuːnɪˈvɜːsəti]; US: [ˌjuːnɪˈvɜːrsəti];`;
                break;
            case "translateToUkrainian":
                prompt = `Provide translation to Ukrainian for: ${text}.`;
                break;
            case "translateFromUkrainian":
                prompt = `Provide translation from Ukrainian to English for: ${text}`;
                break;
            case "completeFlashcard":
            default:
                prompt = `Create a complete flashcard for an English vocabulary word/phrase. Word: "${text}".
                English level: ${englishLevel}.
                
                Return JSON format:
                {
                  "text": "${text}",
                  "transcription": "Resources: Oxford Learner's Dictionaries. Format for output: Transcription for 'University' (Oxford Learner's Dictionaries):UK: [ˌjuːnɪˈvɜːsəti] US: [ˌjuːnɪˈvɜːrsəti];",
                  "translation": "Some variants of Ukrainian translation",
                  "shortDescription": "Very brief 2-3 sentences description (under 150 characters), clear and concise",
                  "explanation": "A detailed definition/explanation of meaning and usage (can be longer and more comprehensive)",
                  "example": "Example sentence using the word",
                  "notes": ""
                }
                
                Make sure to provide:
                - Accurate phonetic transcription
                - Clear explanation (in English) appropriate for ${englishLevel} English level
                - Short description that's concise but informative for quick reference
                - Detailed explanation for comprehensive understanding
                - Natural example sentence
                - Ukrainian translation`;
                break;
        }

        console.log(`Generating AI content for: "${text}" using ${apiKeyInfo.effectiveSource} API key with model ${modelToUse}`);

        // Call OpenAI API with the user's preferred model and effective API key
        const chatCompletion = await openai.chat.completions.create({
            model: modelToUse,
            messages: [
                { role: "system", content: "You are a helpful assistant for language learning, specializing in English and Ukrainian." },
                { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 600, // Increased for more content
        });

        const aiResponse = chatCompletion.choices[0].message.content;

        // For complete flashcard, try to parse JSON response
        let parsedResponse = aiResponse;
        if (promptType === "completeFlashcard" || promptType === undefined) {
            try {
                // Extract JSON if it's wrapped in code blocks or text
                const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) ||
                    aiResponse.match(/```\n([\s\S]*?)\n```/) ||
                    aiResponse.match(/{[\s\S]*?}/);

                const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
                parsedResponse = JSON.parse(jsonStr.replace(/```json|```/g, ''));

                // Ensure the text field matches the original input
                parsedResponse.text = text;
            } catch (error) {
                console.log("Error parsing AI response as JSON:", error);
                return res.status(200).json({
                    raw: aiResponse,
                    parsed: false,
                    message: "Couldn't parse AI response as JSON",
                    apiKeyInfo
                });
            }
        }

        return res.status(200).json({
            result: parsedResponse,
            raw: aiResponse,
            parsed: promptType === "completeFlashcard" || promptType === undefined,
            apiKeyInfo,
            modelUsed: modelToUse
        });

    } catch (error) {
        console.log("Error in generateFlashcardContent controller:", error);

        // Enhanced error handling
        let errorResponse = {
            message: "Error generating content",
            details: "Error occurred while generating content with AI"
        };

        if (error.status === 401) {
            errorResponse = {
                message: "Invalid OpenAI API key",
                details: "API key may be expired, invalid, or have insufficient permissions",
                action: "Check your API key in Settings"
            };
        } else if (error.status === 429) {
            errorResponse = {
                message: "OpenAI API rate limit exceeded",
                details: "Too many requests to OpenAI API",
                action: "Please try again later"
            };
        } else if (error.status === 402 || error.message?.includes('quota')) {
            errorResponse = {
                message: "OpenAI API quota exceeded",
                details: "Insufficient credits or billing issue",
                action: "Please check your OpenAI billing"
            };
        }

        return res.status(error.status || 500).json(errorResponse);
    }
};

export default {
    generateFlashcardContent
};