const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const fs = require("fs");
const path = require("path");

// Replace with your bot token
const BOT_TOKEN = "6467677826:AAExW1aAdrT3Q8aKgIr7HOVAP0YVrxY1kc0";
const bot = new TelegramBot(BOT_TOKEN);

// Define the upload directory and disk limit
const UPLOAD_DIR = path.join(__dirname, "upload");
const DISK_LIMIT_MB = 900;

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Function to calculate the directory size in MB
const getDirectorySize = (directory) => {
  let totalSize = 0;
  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  });

  return totalSize / (1024 * 1024); // Convert bytes to MB
};

// Handle file uploads
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.document || msg.video || msg.photo) {
    try {
      let fileId, fileName;

      if (msg.document) {
        fileId = msg.document.file_id;
        fileName = msg.document.file_name;
      } else if (msg.video) {
        fileId = msg.video.file_id;
        fileName = `video_${fileId}.mp4`;
      } else if (msg.photo) {
        fileId = msg.photo[msg.photo.length - 1].file_id;
        fileName = `photo_${fileId}.jpg`;
      }

      // Check disk space usage
      const currentSize = getDirectorySize(UPLOAD_DIR);
      if (currentSize >= DISK_LIMIT_MB) {
        bot.sendMessage(chatId, "Disk space limit exceeded! Cannot upload more files.");
        return;
      }

      // Get the file and download it
      const fileUrl = await bot.getFileLink(fileId);
      const filePath = path.join(UPLOAD_DIR, fileName);

      const response = await fetch(fileUrl);
      const buffer = await response.buffer();

      // Save the file locally
      fs.writeFileSync(filePath, buffer);
      bot.sendMessage(chatId, `File saved successfully as ${fileName}!`);
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, "An error occurred while processing your file.");
    }
  } else {
    bot.sendMessage(chatId, "Please send a document, video, or photo to save.");
  }
});

// Express server for webhook
const app = express();
app.use(express.json());

// Set the webhook endpoint
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  // Set webhook URL (replace <YOUR_DEPLOYMENT_URL> with your Vercel deployment URL)
  const webhookUrl = `<YOUR_DEPLOYMENT_URL>/bot${BOT_TOKEN}`;
  await bot.setWebHook(webhookUrl);
  console.log(`Webhook set to ${webhookUrl}`);
});
