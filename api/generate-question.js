// This script serves as a secure proxy to the OpenAI API.
// It must be deployed to a serverless platform (like Vercel or Netlify) 
// to securely manage the OPENAI_API_KEY environment variable.

export default async function handler(req, res) {
  // CORS headers - CRITICAL for frontend access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure the client is sending a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed. Only POST requests are supported.' 
    });
  }

  // Check if API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set');
    return res.status(500).json({ 
      error: 'Server configuration error.',
      details: 'API key not found. Please contact administrator.'
    });
  }

  // Quiz configuration
  const questionCount = 10; 
  const topic = 'Halloween trivia and spooky horror themes';
  
  // System instruction for OpenAI
  const systemInstruction = `You are a quiz master for a hackathon called "Hack or Treat". 
  Your task is to generate exactly ${questionCount} multiple-choice questions about ${topic}. 
  The response MUST be a single JSON object containing a key named "questions" which holds 
  an array of ${questionCount} question objects. 
  Each question object MUST have the following keys: 
  - "question" (string): The question text
  - "options" (array of 4 strings): The multiple choice options
  - "answer" (string): The correct answer, which must be one of the options
  
  Make questions varied in difficulty and cover different aspects of Halloween and horror themes.`;

  // Call OpenAI API
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
        response_format: { type: "json_object" },
        temperature: 0.8 // Add some creativity to questions
      })
    });

    const data = await aiRes.json();

    // Check for OpenAI API errors
    if (!aiRes.ok || data.error) {
      console.error("OpenAI API Error:", {
        status: aiRes.status,
        error: data.error
      });
      return res.status(aiRes.status || 500).json({ 
        error: 'Failed to generate quiz from AI.',
        details: data.error?.message || 'Unknown OpenAI error',
        code: data.error?.code || 'unknown'
      });
    }

    // Parse the AI response
    const jsonString = data.choices?.[0]?.message?.content;
    
    if (!jsonString) {
      console.error("No content in OpenAI response");
      return res.status(500).json({ 
        error: 'Invalid response from AI.',
        details: 'No content returned'
      });
    }

    const quizDataObject = JSON.parse(jsonString);
    
    // Validate the response structure
    if (!quizDataObject.questions || !Array.isArray(quizDataObject.questions)) {
      console.error("AI output structure is incorrect:", quizDataObject);
      return res.status(500).json({ 
        error: 'AI output structure is incorrect.',
        details: 'Expected "questions" array not found'
      });
    }

    // Validate we got the right number of questions
    if (quizDataObject.questions.length !== questionCount) {
      console.warn(`Expected ${questionCount} questions, got ${quizDataObject.questions.length}`);
    }

    // Validate each question has required fields
    const validQuestions = quizDataObject.questions.filter(q => {
      return q.question && 
             Array.isArray(q.options) && 
             q.options.length === 4 && 
             q.answer &&
             q.options.includes(q.answer);
    });

    if (validQuestions.length < questionCount) {
      console.warn(`Only ${validQuestions.length}/${questionCount} questions are valid`);
    }

    // Return the questions array
    res.status(200).json(validQuestions);

  } catch (error) {
    console.error("Serverless Function Error:", error);
    
    // Provide helpful error messages
    if (error.message.includes('fetch')) {
      return res.status(500).json({ 
        error: 'Failed to connect to OpenAI API.',
        details: 'Network error or API endpoint unreachable'
      });
    }
    
    if (error instanceof SyntaxError) {
      return res.status(500).json({ 
        error: 'Failed to parse AI response.',
        details: 'Invalid JSON returned from OpenAI'
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error.',
      details: error.message || 'Unknown error occurred'
    });
  }
}