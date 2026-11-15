import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = process.env.PORT || 4000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`[TeleTrack API] Running at http://localhost:${PORT}`);
  console.log(`[TeleTrack API] Health check at http://localhost:${PORT}/api/v1/health`);
});
