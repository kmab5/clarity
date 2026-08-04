import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// This file runs on Vercel's server, never in the browser.
// GEMINI_API_KEY is read from the environment and never sent to the client.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Model name is configurable via env var so a future Google deprecation/rename
// (like gemini-2.5-flash -> gemini-3.6-flash) is a dashboard change, not a code change.
// Set GEMINI_MODEL in Vercel's env vars to override; falls back to a known-good default.
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const SYSTEM_INSTRUCTION = `
You are a world-class decision consultant like a combination of a stoic philosopher and a data scientist. 
Your goal is to help users make decisions quickly by breaking them down into binary choices.
Be concise, insightful, and direct. Avoid waffle.
`;

const QUESTIONS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'A list of questions.',
    },
  },
  required: ['questions'],
};

const DECISION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    recommendation: {
      type: Type.STRING,
      description: "The final decision recommendation (Do it / Don't do it / Choose Option A, etc). Be definitive.",
    },
    pros: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 key reasons supporting this recommendation based on user answers.',
    },
    cons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 potential downsides or trade-offs to consider.',
    },
    closingThought: {
      type: Type.STRING,
      description: 'A short, one-sentence punchy closing advice.',
    },
  },
  required: ['recommendation', 'pros', 'cons', 'closingThought'],
};

type Answer = 'YES' | 'NO' | 'MAYBE';

function formatAnswer(a: Answer): string {
  if (a === 'NO') return 'No';
  if (a === 'MAYBE') return "Unsure/Don't Know";
  return 'Yes';
}

async function generateQuestions(topic: string) {
  const prompt = `
    The user is trying to make a decision about: "${topic}".
    Generate exactly 5 insightful Yes/No questions that will help reveal their true preferences, constraints, and values regarding this decision.
    The questions should not be generic; tailor them specifically to the nuances of "${topic}".
    Do not number the questions.
  `;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: QUESTIONS_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error('No response from AI');
  const data = JSON.parse(text);
  return data.questions || [];
}

async function generateFollowUpQuestions(topic: string, questions: string[], answers: Answer[]) {
  const history = questions.map((q, i) => `Q: ${q}\nA: ${formatAnswer(answers[i])}`).join('\n');

  const prompt = `
    The user is deciding on: "${topic}".
    Here is the Q&A session so far:
    ${history}

    The user has requested to answer more questions to refine the decision.
    Generate exactly 3 NEW, specific, and insightful Yes/No questions that dive deeper into the ambiguity or constraints revealed by the previous answers (especially where they answered "MAYBE").
    Do not repeat previous questions.
  `;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: QUESTIONS_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error('No response from AI');
  const data = JSON.parse(text);
  return data.questions || [];
}

async function generateDecision(topic: string, questions: string[], answers: Answer[]) {
  const history = questions.map((q, i) => `Q: ${q}\nA: ${formatAnswer(answers[i])}`).join('\n');

  const prompt = `
    The user needed to decide on: "${topic}".
    Here is the Q&A session:
    ${history}

    Based on these answers, provide a final recommendation. 
    If the user answered "Unsure" often, factor that uncertainty into the risk assessment.
    Be decisive. Do not say "it depends". Pick the path that aligns best with their answers.
  `;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: DECISION_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error('No response from AI');
  return JSON.parse(text);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, topic, questions, answers } = req.body ?? {};

  if (!action || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Missing action or topic' });
  }

  try {
    switch (action) {
      case 'generateQuestions': {
        const result = await generateQuestions(topic);
        return res.status(200).json({ questions: result });
      }
      case 'generateFollowUpQuestions': {
        const result = await generateFollowUpQuestions(topic, questions, answers);
        return res.status(200).json({ questions: result });
      }
      case 'generateDecision': {
        const result = await generateDecision(topic, questions, answers);
        return res.status(200).json(result);
      }
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error(`Gemini API error [${action}]:`, error);
    // TEMPORARY: exposing the real message for debugging. Revert to a generic
    // message once this is working so internal error details aren't public.
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: 'Gemini request failed', detail: message });
  }
}
