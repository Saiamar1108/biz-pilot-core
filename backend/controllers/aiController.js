const asyncHandler = require("../middlewares/asyncHandler");
const { generateAiResponse } = require("../utils/aiResponses");

exports.chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  if (!message?.trim()) {
    res.status(400);
    throw new Error("Message is required");
  }

  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });

  const result = await generateAiResponse(message, req, history);

  res.json({
    success: true,
    data: {
      role: "assistant",
      reply: result.reply,
      message: result.reply,
      context: result.data,
    },
  });
});
