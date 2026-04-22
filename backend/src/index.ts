import './env';

import cors from 'cors';
import express from 'express';

import sheetsRouter from './routes/sheets';
import transposeRouter from './routes/transpose';

const app = express();
const port = process.env.PORT || 5001;

app.use(
  cors({
    origin: ['https://andytule.github.io', 'http://localhost:5173', 'http://localhost:3000'],
  })
);
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'ChordShift API is running' });
});

app.use('/sheets', sheetsRouter);
app.use('/transpose', transposeRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
