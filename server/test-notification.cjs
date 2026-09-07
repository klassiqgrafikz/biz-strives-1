const formData = new FormData();
formData.append('subject', 'Test with image');
formData.append('html', '<p>This is a test message with image</p>');
formData.append('recipientIds', JSON.stringify(['5']));
formData.append('imagePlacement', 'header');

const fs = require('fs');
const imageBuffer = fs.readFileSync('C:/MY WEBSITES/Biz strives 1/grok_1788789666224.jpg');
const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
formData.append('image', blob, 'grok_1788789666224.jpg');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUiLCJ1c2VybmFtZSI6Im5kdWJ1aXNpMXNvbkBnbWFpbC5jb20iLCJpYXQiOjE3ODg3OTgwNTksImV4cCI6MTc4OTQwMjg1OX0.XsGzIwDAcCjyObLUCePjHpNMULyTz7gYATHeD3XsdxE';

fetch('http://localhost:3001/api/notifications/broadcast', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(r => r.json())
.then(console.log)
.catch(console.error);