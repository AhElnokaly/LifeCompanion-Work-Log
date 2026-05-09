const fs = require('fs');

const extractAndTranslate = (file, prefix) => {
  let content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/[\u0600-\u06FF]+/g) || [];
  // some matches might include spaces if we regex properly, let's just use exact string replacement
};

// We know the strings. We can use our created LanguageContext strings.
