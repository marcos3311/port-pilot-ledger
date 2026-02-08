const pngToIco = require('png-to-ico');
const fs = require('fs');

pngToIco('resources/icon.png')
    .then(buf => {
        fs.writeFileSync('build/icon.ico', buf);
        console.log('Icon generated successfully!');
    })
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
