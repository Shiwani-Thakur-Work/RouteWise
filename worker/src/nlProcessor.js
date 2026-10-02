/**
 * nlProcessor.js
 * Calls Gemini API to extract structured route requirements
 * from a natural-language user prompt.
 *
 * Gemini is ONLY responsible for intent extraction.
 * The application algorithm handles all decisions afterward.
 */

const SYSTEM_PROMPT = `You are a route planning assistant.
Extract the following from the user's input and return ONLY valid JSON — no explanation, no markdown.

{
  "from": "string (origin location)",
  "to": "string (destination location)",
  "tasks": [
    {
      "category": "string",
      "preferences": ["string"],
      "budget_inr": number | null
    }
  ],
  "constraints": {
    "max_detour_minutes": number | null
  }
}

Valid category values: pharmacy, grocery, restaurant, gift_shop, coffee, atm, petrol_station, other.
For restaurant preferences, include dietary preferences like "vegetarian", "vegan", "non-veg" in the preferences array.
If no detour constraint is mentioned, set max_detour_minutes to 60.
Return only the JSON object. No explanation.`;

/**
 * @param {string} userInput - Raw natural language from user
 * @param {string} geminiApiKey
 * @returns {Promise<{from, to, tasks, constraints}>}
 */
export async function extractRequirements(userInput, geminiApiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [
      {
        parts: [{ text: userInput }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('Gemini returned no candidates');
  }

  const raw = data.candidates[0].content.parts[0].text;
  // Strip possible markdown code fences
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${cleaned}`);
  }
}
