const https = require('https');
const fs = require('fs');

https.get('https://www.melboucierayane.com/', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    fs.writeFileSync('temp.html', data);
    console.log('done');
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
