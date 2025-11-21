import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DecisionResult, Answer } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// System instruction to ensure tone and quality
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
      description: "A list of questions.",
    },
  },
  required: ["questions"],
};

export const generateQuestions = async (topic: string): Promise<string[]> => {
  const prompt = `
    The user is trying to make a decision about: "${topic}".
    Generate exactly 5 insightful Yes/No questions that will help reveal their true preferences, constraints, and values regarding this decision.
    The questions should not be generic; tailor them specifically to the nuances of "${topic}".
    Do not number the questions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: QUESTIONS_SCHEMA,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);
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
  const history = questions.map((q, i) => `Q: ${q}\nA: ${answers[i]}`).join("\n");

  const prompt = `
    The user is deciding on: "${topic}".
    Here is the Q&A session so far:
    ${history}

    The user has requested to answer more questions to refine the decision.
    Generate exactly 3 NEW, specific, and insightful Yes/No questions that dive deeper into the ambiguity or constraints revealed by the previous answers (especially where they answered "MAYBE").
    Do not repeat previous questions.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: QUESTIONS_SCHEMA,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);
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
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      recommendation: {
        type: Type.STRING,
        description: "The final decision recommendation (Do it / Don't do it / Choose Option A, etc). Be definitive.",
      },
      pros: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3 key reasons supporting this recommendation based on user answers.",
      },
      cons: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3 potential downsides or trade-offs to consider.",
      },
      closingThought: {
        type: Type.STRING,
        description: "A short, one-sentence punchy closing advice.",
      },
    },
    required: ["recommendation", "pros", "cons", "closingThought"],
  };

  // Format the Q&A history for the AI
  const history = questions.map((q, i) => {
    let answerText = "Yes";
    if (answers[i] === 'NO') answerText = "No";
    if (answers[i] === 'MAYBE') answerText = "Unsure/Don't Know";
    return `Q: ${q}\nA: ${answerText}`;
  }).join("\n");

  const prompt = `
    The user needed to decide on: "${topic}".
    Here is the Q&A session:
    ${history}

    Based on these answers, provide a final recommendation. 
    If the user answered "Unsure" often, factor that uncertainty into the risk assessment.
    Be decisive. Do not say "it depends". Pick the path that aligns best with their answers.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.5, // Lower temperature for more analytical results
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as DecisionResult;
  } catch (error) {
    console.error("Error generating decision:", error);
    throw new Error("Failed to generate a decision. Please try again.");
  }
};