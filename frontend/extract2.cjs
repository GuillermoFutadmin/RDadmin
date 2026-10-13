const fs = require('fs');

function extract() {
  const c = fs.readFileSync('dist/assets/index-BODWGEdl.js', 'utf8');
  const lines = c.split('\n');
  const L = lines[234];
  console.log(L.substring(Math.max(0, 48509 - 200), 48509 + 200));
}
extract();
