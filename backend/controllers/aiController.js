const asyncHandler = require("../middlewares/asyncHandler");
const { generateAiResponse } = require("../utils/aiResponses");

exports.chat = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    res.status(400);
    throw new Error("Message is required");
  }

  const result = await generateAiResponse(message);

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
