require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

const userRoutes = require('./routes/userRoutes');
app.use('/', userRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on http://localhost:${PORT}`));
