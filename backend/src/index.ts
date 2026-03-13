import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import sheetsRouter from './routes/sheets';
import transposeRouter from './routes/transpose';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'ChordShift API is running' });
});

app.use('/sheets', sheetsRouter);
app.use('/transpose', transposeRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
