import { DecisionResult, Answer } from "../types";

// The browser never talks to Google directly and never sees an API key.
// It only calls our own serverless function at /api/gemini, which holds
// the real Gemini key server-side (see api/gemini.ts).
async function callGeminiApi<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const generateQuestions = async (topic: string): Promise<string[]> => {
  try {
    const data = await callGeminiApi<{ questions: string[] }>('generateQuestions', { topic });
    return data.questions || [];
  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error("Failed to generate questions. Please try again.");
  }
};

export const generateFollowUpQuestions = async (
  topic: string,
  questions: string[],
  answers: Answer[]
): Promise<string[]> => {
  try {
    const data = await callGeminiApi<{ questions: string[] }>('generateFollowUpQuestions', {
      topic,
      questions,
      answers,
    });
    return data.questions || [];
  } catch (error) {
    console.error("Error generating follow-up questions:", error);
    throw new Error("Failed to generate more questions.");
  }
};

export const generateDecision = async (
  topic: string,
  questions: string[],
  answers: Answer[]
): Promise<DecisionResult> => {
  try {
    return await callGeminiApi<DecisionResult>('generateDecision', { topic, questions, answers });
  } catch (error) {
    console.error("Error generating decision:", error);
    throw new Error("Failed to generate a decision. Please try again.");
  }
};
