// Use this if you want to make a call to OpenAI GPT-4 for instance. userId is used to identify the user on openAI side.
export const sendOpenAi = async (messages, userId, max = 100, temp = 1) => {
  const url = "https://api.openai.com/v1/chat/completions";

  const body = {
    model: "gpt-4",
    messages,
    max_tokens: max,
    temperature: temp,
    user: userId,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      console.error("GPT Error: " + res.status, errorData);
      return null;
    }

    const data = await res.json();
    const answer = data.choices[0].message.content;
    return answer;
  } catch (e) {
    console.error("GPT Error:", e);
    return null;
  }
};
