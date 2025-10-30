// This script serves as a secure proxy to the OpenAI API.
// It must be deployed to a serverless platform (like Vercel or Netlify) 
// to securely manage the OPENAI_API_KEY environment variable.

// NOTE: This implementation assumes the environment provides a response object (res)
// from the underlying server framework (e.g., Express or a similar wrapper).

export default async function handler(req, res) {
  // Ensure the client is sending a POST request to avoid the 405 error.
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Only POST requests are supported.' });
  }

  // The client will request 10 questions per game.
  const questionCount = 10; 
  const topic = 'Halloween trivia and spooky horror themes';
  
  // The system instruction defines the desired JSON structure for the AI
  const systemInstruction = `You are a quiz master for a hackathon called "Hack or Treat". 
  Your task is to generate exactly ${questionCount} multiple-choice questions about ${topic}. 
  The response MUST be a single JSON object containing a key named "questions" which holds 
  an array of ${questionCount} question objects. 
  Each question object MUST have the following keys: "question" (string), "options" (array of 4 strings), and "answer" (string, which is one of the options).
  `;

  // The OpenAI API call to generate the content
  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: `Generate ${questionCount} questions now.` }
        ],
        response_format: { type: "json_object" } 
      })
    });

    const data = await aiRes.json();

    if (data.error) {
        console.error("OpenAI API Error:", data.error);
        return res.status(500).json({ error: 'Failed to generate quiz from AI.', details: data.error.message });
    }

    // Parse the JSON string from the AI response
    const jsonString = data.choices[0].message.content;
    const quizDataObject = JSON.parse(jsonString);
    
    // Check if the expected 'questions' array exists and return it
    if (quizDataObject.questions && Array.isArray(quizDataObject.questions)) {
        res.status(200).json(quizDataObject.questions);
    } else {
        // Handle cases where the AI output doesn't match the required schema
        res.status(500).json({ error: 'AI output structure is incorrect.' });
    }

  } catch (error) {
    console.error("Serverless Function Error:", error);
    res.status(500).json({ error: 'Internal Server Error during AI call.' });
  }
}
