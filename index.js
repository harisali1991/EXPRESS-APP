const express = require('express');
const app = express();
const PORT = 3000;

// define a simple route
app.get('/',(req, res)=>{
    res.send('hello express!');
});

app.get('/about',(req,res)=>{
    res.send("this is about route");
});

app.get('/user/:username',(req,res)=>{
    const username = req.params.username;

    res.send(`Welcom, ${username}`);
});

app.get('/search',(req,res)=>{
    const keyword = req.query.keyword;
    res.send(`query keyword ${keyword}`);
});


app.listen(PORT,()=>{
    console.log(`Server is running on http://localhost:${PORT}`);
});