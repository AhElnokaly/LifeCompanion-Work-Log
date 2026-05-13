const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'numeric', day: 'numeric' });
const day = new Date();
const hParts = hijriFormatter.formatToParts(day);
console.log(hParts);
