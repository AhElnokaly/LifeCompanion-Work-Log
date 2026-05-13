const hijriFormatterAR = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'numeric', day: 'numeric' });
const hijriFormatterEN = new Intl.DateTimeFormat('en-US-u-ca-islamic-nu-latn', { month: 'numeric', day: 'numeric' });
const day = new Date();
console.log("AR parts:", hijriFormatterAR.formatToParts(day));
console.log("EN parts:", hijriFormatterEN.formatToParts(day));
